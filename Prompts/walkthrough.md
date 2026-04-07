# Teacher Role System — Walkthrough

> How the **Super Admin**, **Admin**, and **Teacher** roles interact with the teacher management system.

---

## Table of Contents

1. [Role Overview](#1-role-overview)
2. [Super Admin / Admin — Create & Manage Teachers](#2-super-admin--admin--create--manage-teachers)
3. [Teacher Login & Routing Flow](#3-teacher-login--routing-flow)
4. [Teacher Dashboard & Scope Enforcement](#4-teacher-dashboard--scope-enforcement)
5. [Permission Architecture](#5-permission-architecture)
6. [Entity Relationships](#6-entity-relationships)
7. [Modification Flows by Role](#7-modification-flows-by-role)

---

## 1. Role Overview

| Role | Can Create Teachers | Can Assign Classes | Can Modify Teacher Data | Can Access Teacher Dashboard | Scope |
|---|---|---|---|---|---|
| **Super Admin** | ✅ (full bypass) | ✅ | ✅ All fields | ❌ (routed to `/dashboard`) | Entire school |
| **Admin** | ✅ (needs `teachers:create`) | ✅ (needs `teachers:update`) | ✅ All fields | ❌ (routed to `/dashboard`) | Entire school / campus |
| **Teacher** | ❌ | ❌ | ✅ Limited self-service (`/me`) | ✅ `/teacher/*` | Only assigned classes/sections/subjects |

---

## 2. Super Admin / Admin — Create & Manage Teachers

### 2.1 Teacher Creation Flow

```mermaid
sequenceDiagram
    participant A as Admin / Super Admin
    participant C as TeachersController
    participant G as Guards (Tenant + Permission)
    participant S as TeachersService
    participant DB as Database (Prisma)

    A->>C: POST /teachers<br/>{ employeeId, firstName, lastName,<br/>email, password, classTeacherOfId? }
    C->>G: TenantGuard → extract schoolId from JWT
    G->>G: PermissionsGuard → check "teachers:create"
    Note over G: Super Admin bypasses all permission checks

    G->>S: create(dto, schoolId, campusId)
    S->>DB: Check subscription plan limit (maxTeachers)
    alt Limit reached
        S-->>A: 400 BadRequest "Plan limit reached"
    end

    S->>DB: Find teacher by [employeeId, schoolId]
    alt Duplicate exists
        S-->>A: 409 Conflict "Teacher already exists"
    end

    alt email + password provided (auto-create user)
        S->>DB: Check existing user by email in school
        S->>DB: Find role with slug = "teacher"
        S->>S: Hash password (bcrypt, 10 rounds)
        S->>DB: CREATE User { email, passwordHash, schoolId, roleId }
    end

    S->>DB: CREATE Teacher { employeeId, schoolId, userId, classTeacherOfId? }
    DB-->>S: Teacher record (with user + classTeacherOf)
    S-->>A: 201 Created — Teacher object
```

### 2.2 Assign Class to Teacher

```mermaid
sequenceDiagram
    participant A as Admin
    participant C as TeachersController
    participant G as Guards
    participant S as TeachersService
    participant DB as Database

    A->>C: POST /teachers/:id/class-assignments<br/>{ classId, sectionId?, subjectId?, academicYearId? }
    C->>G: TenantGuard + PermissionsGuard ("teachers:update")
    G->>S: assignClass(teacherId, schoolId, dto)

    S->>DB: Verify teacher exists
    S->>DB: Verify class belongs to school
    opt sectionId provided
        S->>DB: Verify section belongs to school
    end

    S->>DB: findFirst existing assignment<br/>matching (teacherId, classId, sectionId, academicYearId)

    alt Assignment exists
        S->>DB: UPDATE assignment (re-activate if needed)
    else No existing assignment
        S->>DB: CREATE new TeacherClassAssignment
    end

    DB-->>S: Assignment (with class, section, subject, academicYear)
    S-->>A: 200 OK — Assignment object
```

### 2.3 Update / Deactivate Teacher

```mermaid
flowchart TD
    A[Admin calls PATCH /teachers/:id] --> G{Guards Pass?}
    G -- No --> R1[403 Forbidden]
    G -- Yes --> S[TeachersService.update]

    S --> U[Update teacher fields:<br/>name, email, salary, department,<br/>classTeacherOfId, etc.]
    U --> DB[(Database)]
    DB --> RES[Return updated teacher]

    A2[Admin calls DELETE /teachers/:id] --> G2{Guards Pass?}
    G2 -- No --> R2[403 Forbidden]
    G2 -- Yes --> S2[TeachersService.remove]
    S2 --> SOFT[Soft-deactivate:<br/>set deletedAt = now<br/>deactivate all class assignments]
    SOFT --> DB
```

---

## 3. Teacher Login & Routing Flow

```mermaid
sequenceDiagram
    participant T as Teacher (Browser)
    participant FE as Next.js Frontend
    participant MW as Middleware
    participant API as AuthService (Backend)
    participant DB as Database

    T->>FE: Navigate to /login
    T->>FE: Enter email + password
    FE->>API: POST /auth/login { email, password }

    API->>DB: Find User WHERE email<br/>include: { teacher: { select: { id } }, role: true }
    DB-->>API: User + teacher.id + role.slug

    API->>API: Verify password (bcrypt compare)
    API->>API: Extract teacherId = user.teacher?.id

    API->>API: Sign JWT payload:<br/>{ sub, schoolId, roleId,<br/>role: "teacher", teacherId }

    API-->>FE: { accessToken, refreshToken,<br/>user: { teacherId, role: "teacher" } }

    FE->>FE: Store tokens in cookies<br/>(sms_access_token, sms_refresh_token)

    T->>FE: Navigate to any page
    FE->>MW: Middleware intercepts request

    MW->>MW: Decode JWT from cookie
    MW->>MW: getHomeRoute(payload)

    alt teacherId exists OR role = "teacher"
        MW->>MW: homeRoute = "/teacher"
    else admin / other role
        MW->>MW: homeRoute = "/dashboard"
    end

    alt Teacher tries /dashboard/**
        MW-->>T: 307 Redirect → /teacher
    end
    alt Teacher on /login (already authenticated)
        MW-->>T: 307 Redirect → /teacher
    end

    T->>FE: Arrives at /teacher
    FE->>FE: Teacher Layout loads
    FE->>FE: Validate: role = "teacher" OR teacherId exists
    FE->>FE: Render sidebar with 8 navigation items
```

### Teacher Sidebar Navigation

```mermaid
graph LR
    TL[Teacher Layout] --> D[Dashboard<br/>/teacher]
    TL --> MC[My Classes<br/>/teacher/classes]
    TL --> ST[Students<br/>/teacher/students]
    TL --> AS[Assignments<br/>/teacher/assignments]
    TL --> EX[Exams<br/>/teacher/exams]
    TL --> GR[Gradebook<br/>/teacher/grades]
    TL --> AT[Attendance<br/>/teacher/attendance]
    TL --> PR[My Profile<br/>/teacher/profile]
```

---

## 4. Teacher Dashboard & Scope Enforcement

### 4.1 How Teacher Scope Works

```mermaid
flowchart TD
    T[Teacher calls an API<br/>e.g. GET /attendance?classId=X] --> TG[TenantGuard<br/>extracts schoolId]
    TG --> PG{PermissionsGuard<br/>e.g. attendance:read}
    PG -- Missing permission --> F1[403 Forbidden]
    PG -- Has permission --> SVC[Service Layer<br/>e.g. AttendanceService]

    SVC --> TSS[TeacherScopeService.getScope<br/>teacherId, schoolId]

    TSS --> Q1[Query active<br/>TeacherClassAssignment records]
    TSS --> Q2[Query Teacher.classTeacherOfId]

    Q1 --> EXPAND{Any class-only<br/>assignments?<br/>sectionId = null}
    EXPAND -- Yes --> EXP[Expand to ALL sections<br/>of that class]
    EXPAND -- No --> MERGE

    Q2 --> CT{Is class teacher?}
    CT -- Yes --> CTA[Add classTeacherOfId<br/>to classIds<br/>+ expand all sections]
    CT -- No --> MERGE

    EXP --> MERGE[Merge into scope]
    CTA --> MERGE

    MERGE --> SCOPE["TeacherScope {<br/>classIds: [...]<br/>sectionIds: [...]<br/>subjectIds: [...]<br/>classTeacherOfId: ... | null<br/>}"]

    SCOPE --> VAL{validateFullAccess<br/>classId? sectionId? subjectId?}
    VAL -- NOT in scope --> F2[403 Forbidden<br/>"Not assigned to this class"]
    VAL -- In scope --> DATA[Return scoped data ✅]

    style F1 fill:#ff6b6b,color:#fff
    style F2 fill:#ff6b6b,color:#fff
    style DATA fill:#51cf66,color:#fff
```

### 4.2 Class Teacher Privilege

```mermaid
flowchart LR
    CT[Class Teacher of Class 6] --> P1[See ALL sections of Class 6]
    CT --> P2[See ALL subjects of Class 6]
    CT --> P3[Subject check BYPASSED<br/>for Class 6]

    RT[Regular Teacher<br/>assigned to 6-A Math] --> R1[See ONLY Section 6-A]
    RT --> R2[See ONLY Math subject]
    RT --> R3[Subject check ENFORCED]

    style CT fill:#4dabf7,color:#fff
    style RT fill:#ffd43b,color:#333
```

### 4.3 Teacher Self-Service Endpoints

These endpoints have **no** `@RequirePermission()` — they rely only on `teacherId` from the JWT:

```mermaid
flowchart TD
    JWT[JWT with teacherId] --> ME["GET /teachers/me<br/>→ getMyProfile()"]
    JWT --> MC["GET /teachers/my-classes<br/>→ getMyClasses()"]
    JWT --> UP["PATCH /teachers/me<br/>→ updateMyProfile()"]

    ME --> P1[Returns: teacher profile +<br/>user info + campus +<br/>active class assignments]

    MC --> P2[Returns: all active<br/>TeacherClassAssignment records<br/>with student counts]

    UP --> P3[Updates ONLY safe fields:<br/>phone, address, photo,<br/>note, religion, bloodGroup]
    UP --> BLOCK[BLOCKED fields:<br/>salary, email, password,<br/>campus, role, employeeId]

    style BLOCK fill:#ff6b6b,color:#fff
```

---

## 5. Permission Architecture

### 5.1 Two-Layer Access Control

```mermaid
flowchart TD
    REQ[Incoming API Request] --> L1

    subgraph L1 [Layer 1: RBAC Permissions]
        PG[PermissionsGuard] --> CHECK{User Role has<br/>required permission?}
        CHECK -- Yes --> PASS1[✅ Module-level access granted]
        CHECK -- No --> DENY1[❌ 403 Forbidden]
    end

    PASS1 --> L2

    subgraph L2 [Layer 2: Class Scope]
        TSS2[TeacherScopeService] --> SCOPE2{Teacher assigned<br/>to this class/section?}
        SCOPE2 -- Yes --> PASS2[✅ Row-level access granted]
        SCOPE2 -- No --> DENY2[❌ 403 Not assigned]
    end

    PASS2 --> DATA2[Return data]

    style DENY1 fill:#ff6b6b,color:#fff
    style DENY2 fill:#ff6b6b,color:#fff
    style PASS2 fill:#51cf66,color:#fff
```

### 5.2 Guard Evaluation Order

```mermaid
flowchart TD
    REQ[Request arrives] --> DEC{Has @RequirePermission<br/>decorator?}
    DEC -- No --> OPEN[Endpoint is open<br/>e.g. /teachers/me]
    DEC -- Yes --> AUTH{User authenticated?}
    AUTH -- No --> F403[403 Forbidden]
    AUTH -- Yes --> PA{isPlatformAdmin?}
    PA -- Yes --> BYPASS1[✅ Full bypass]
    PA -- No --> SA{role = super_admin?}
    SA -- Yes --> BYPASS2[✅ Full bypass<br/>returns wildcard permissions]
    SA -- No --> DB[Query DB:<br/>User → Role → RolePermission → Permission.slug]
    DB --> CACHE[Cache on request.__permissions]
    CACHE --> HAS{Has all required<br/>permission slugs?}
    HAS -- Yes --> GRANT[✅ Access granted]
    HAS -- No --> DENY[403 Forbidden<br/>with missing permission details]

    style F403 fill:#ff6b6b,color:#fff
    style DENY fill:#ff6b6b,color:#fff
    style BYPASS1 fill:#51cf66,color:#fff
    style BYPASS2 fill:#51cf66,color:#fff
    style GRANT fill:#51cf66,color:#fff
```

### 5.3 Teacher Permission Set (18 permissions)

| Module | Permissions |
|---|---|
| Students | `students:read` |
| Teachers | `teachers:read` |
| Academics | `academics:read` |
| Attendance | `attendance:create`, `attendance:read`, `attendance:update`, `attendance:delete` |
| Exams | `exams:create`, `exams:read`, `exams:update` |
| Assignments | `assignments:create`, `assignments:read`, `assignments:update`, `assignments:delete` |
| Grades | `grades:create`, `grades:read`, `grades:update` |
| Calendar | `calendar:read` |

---

## 6. Entity Relationships

```mermaid
erDiagram
    User ||--o| Teacher : "has (optional)"
    User }o--|| Role : "belongs to"
    Role ||--o{ RolePermission : "has"
    RolePermission }o--|| Permission : "grants"

    Teacher ||--o{ TeacherClassAssignment : "has many"
    Teacher |o--o| Class : "classTeacherOf (optional)"

    TeacherClassAssignment }o--|| Class : "assigned to"
    TeacherClassAssignment }o--o| Section : "optional"
    TeacherClassAssignment }o--o| Subject : "optional"
    TeacherClassAssignment }o--o| AcademicYear : "optional"

    Class ||--o{ Section : "has many"
    School ||--o{ Teacher : "has many"
    School ||--o{ Class : "has many"
    School ||--o{ User : "has many"

    Teacher {
        string id PK
        string employeeId UK
        string schoolId FK
        string userId FK
        string classTeacherOfId FK
        string firstName
        string lastName
        datetime deletedAt
    }

    TeacherClassAssignment {
        string id PK
        string teacherId FK
        string classId FK
        string sectionId FK
        string subjectId FK
        string academicYearId FK
        boolean isActive
    }

    User {
        string id PK
        string email
        string schoolId FK
        string roleId FK
    }
```

---

## 7. Modification Flows by Role

### 7.1 Super Admin Modifications

```mermaid
flowchart TD
    SA[Super Admin] --> |"All guards bypassed"| ANY

    subgraph ANY [Can do EVERYTHING]
        C1[Create any teacher]
        C2[Update any teacher field<br/>salary, role, campus, etc.]
        C3[Assign / unassign classes]
        C4[Set class teacher designation]
        C5[Deactivate / soft-delete teacher]
        C6[Manage teacher permissions<br/>via Role management]
    end

    ANY --> DB[(Database)]

    style SA fill:#e64980,color:#fff
```

### 7.2 Admin Modifications

```mermaid
flowchart TD
    AD[Admin] --> PG{Has required<br/>permission?}
    PG -- No --> DENIED[403 Forbidden]

    PG -- Yes --> WHAT

    subgraph WHAT [Allowed with permissions]
        direction TB
        W1["teachers:create → Create teacher<br/>(with auto user account)"]
        W2["teachers:update → Update teacher fields<br/>assign classes, set class teacher"]
        W3["teachers:delete → Soft-delete teacher<br/>(sets deletedAt, deactivates assignments)"]
        W4["teachers:read → View teacher list & details"]
    end

    WHAT --> SCOPE[Scoped to their school<br/>via TenantGuard + schoolId from JWT]
    SCOPE --> DB[(Database)]

    style AD fill:#4dabf7,color:#fff
    style DENIED fill:#ff6b6b,color:#fff
```

### 7.3 Teacher Self-Modifications

```mermaid
flowchart TD
    T[Teacher] --> JWT[JWT contains teacherId]
    JWT --> SELF

    subgraph SELF [Self-Service Only]
        S1["PATCH /teachers/me"]
        S1 --> ALLOWED[✅ Can update:<br/>phone, address, photo,<br/>note, religion, bloodGroup]
        S1 --> BLOCKED[❌ Cannot update:<br/>salary, email, password,<br/>campus, role, department,<br/>employeeId, classTeacherOfId]
    end

    JWT --> SCOPE

    subgraph SCOPE [Scoped Data Access]
        direction TB
        SC1[View students<br/>only in assigned classes]
        SC2[Create/manage exams<br/>only for assigned classes]
        SC3[Mark attendance<br/>only for assigned sections]
        SC4[Create assignments<br/>only for assigned classes]
        SC5[Manage grades<br/>only for assigned classes]
    end

    style T fill:#ffd43b,color:#333
    style ALLOWED fill:#51cf66,color:#fff
    style BLOCKED fill:#ff6b6b,color:#fff
```

### 7.4 Complete Modification Chain

```mermaid
sequenceDiagram
    participant SA as Super Admin
    participant AD as Admin
    participant DB as Database
    participant SCOPE as TeacherScopeService
    participant T as Teacher

    Note over SA,T: Phase 1 — Admin sets up teacher

    SA->>DB: Create Role "teacher" with 18 permissions
    AD->>DB: POST /teachers → Create teacher + user account
    AD->>DB: POST /teachers/:id/class-assignments<br/>→ Assign Class 6-A Math

    Note over SA,T: Phase 2 — Teacher logs in

    T->>DB: POST /auth/login → JWT { teacherId, role: "teacher" }
    T->>T: Frontend routes to /teacher (middleware)

    Note over SA,T: Phase 3 — Teacher accesses data

    T->>DB: GET /exams (with attendance:read permission)
    DB->>SCOPE: getScope(teacherId, schoolId)
    SCOPE-->>DB: { classIds: [6], sectionIds: [6-A], subjectIds: [Math] }
    DB-->>T: Only exams for Class 6-A Math

    Note over SA,T: Phase 4 — Admin modifies assignment

    AD->>DB: POST /teachers/:id/class-assignments<br/>→ Add Class 7-B Science
    Note over SCOPE: Scope auto-expands on next API call

    T->>DB: GET /exams
    DB->>SCOPE: getScope(teacherId, schoolId)
    SCOPE-->>DB: { classIds: [6, 7], sectionIds: [6-A, 7-B],<br/>subjectIds: [Math, Science] }
    DB-->>T: Exams for 6-A Math + 7-B Science

    Note over SA,T: Phase 5 — Admin promotes to class teacher

    AD->>DB: PATCH /teachers/:id<br/>{ classTeacherOfId: "Class-8" }
    Note over SCOPE: Class teacher gets expanded access

    T->>DB: GET /attendance?classId=8
    DB->>SCOPE: getScope → classTeacherOfId = Class-8
    SCOPE-->>DB: { classIds: [6, 7, 8],<br/>sectionIds: [6-A, 7-B, 8-A, 8-B, 8-C],<br/>subjectIds: [Math, Science] + ALL of Class 8 }
    DB-->>T: Attendance for all sections of Class 8 ✅
```

---

## Summary

| Action | Super Admin | Admin | Teacher |
|---|---|---|---|
| Create teacher & user account | ✅ Always | ✅ With `teachers:create` | ❌ |
| Update teacher (all fields) | ✅ Always | ✅ With `teachers:update` | ❌ |
| Update own profile (safe fields) | N/A | N/A | ✅ Via `/teachers/me` |
| Assign classes | ✅ Always | ✅ With `teachers:update` | ❌ |
| Set class teacher | ✅ Always | ✅ With `teachers:update` | ❌ |
| Soft-delete teacher | ✅ Always | ✅ With `teachers:delete` | ❌ |
| View scoped data (exams, grades, etc.) | N/A (uses admin dashboard) | N/A (uses admin dashboard) | ✅ Scoped to assigned classes |
| Mark attendance | N/A | N/A | ✅ Scoped to assigned sections |
| Manage permissions / roles | ✅ Always | ❌ (unless has role perms) | ❌ |
