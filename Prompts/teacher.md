(Teacher Role, Permissions, and Academic Controls – School SaaS System)*

---

## 🎯 OBJECTIVE

First, **deeply analyze the existing project** including:

* Database schema (tables, relations, constraints)
* Role & permission system (Admin / Super Admin / Teacher)
* Authentication & authorization flow
* Current teacher dashboard functionality
* Class, Subject, Exam, Marks, Assignment, Attendance modules
* Multi-tenant structure (if implemented)

Then:

1. Detect missing tables, relationships, constraints, and permission gaps.
2. Identify logical conflicts or edge cases.
3. Refactor only where required.
4. Align the following requirements into the current system.
5. Ensure no breaking changes.
6. Avoid duplicate logic.
7. Maintain clean RBAC structure.
8. Maintain multi-tenant isolation (if SaaS).
9. Ensure zero security loopholes.

---

# 👨‍🏫 TEACHER ROLE – FUNCTIONAL REQUIREMENTS

## 1️⃣ Teacher Assignment Rules

A Teacher can have:

* ✅ Multiple Subjects across different Classes
* ✅ One Class Teacher role at a time (Class Incharge)
* ✅ One Class with multiple Subjects
* ❌ Cannot be Class Incharge of multiple classes simultaneously

System must enforce:

* Unique constraint: One teacher → One class as Class Teacher (if assigned)
* Subject assignments must be mapped via relational table

---

## 2️⃣ On Teacher Login

When a Teacher logs in via ID & Password:

System must dynamically:

* Fetch assigned Classes
* Fetch assigned Subjects
* Fetch Class Teacher status (if any)
* Load permissions from Admin configuration

Dashboard should ONLY show:

* Assigned class data
* Assigned subject data
* No unauthorized class/subject access

---

## 3️⃣ Attendance Module

Teacher can:

* Mark attendance ONLY for:

  * Classes assigned to them
* Cannot mark attendance for unassigned classes

System checks:

```
IF teacher_id is assigned to class_id
    Allow attendance marking
ELSE
    Deny
```

---

## 4️⃣ Exam Management

Teacher can:

* Create Exam (only for assigned subject & class)
* Edit Exam (only created by them OR permitted by admin)
* Delete Exam (based on permission setting)

Constraints:

* Exam must be linked:

  * class_id
  * subject_id
  * teacher_id
* Must validate subject belongs to teacher

---

## 5️⃣ Marks Management

Teacher can:

* Add student marks ONLY for their assigned subject
* Edit marks (if permission enabled)
* View marks:

  * If subject teacher → Only that subject
  * If class teacher → All subject marks for that class

Permission Logic:

```
IF teacher is subject teacher
    Show marks of that subject
IF teacher is class teacher
    Show all subject marks of that class
```

---

## 6️⃣ Assignment Module

Teacher can:

* Create assignments for:

  * Assigned subjects
  * Assigned classes
* Edit/Delete assignments (if permission allowed)

Assignment must include:

* class_id
* subject_id
* teacher_id
* due_date
* description

---

## 7️⃣ Permission Control (Admin & Super Admin)

Admin can:

* Assign teacher to:

  * Class
  * Subjects
* Enable/Disable:

  * Attendance
  * Exam Create/Edit/Delete
  * Marks Edit
  * Assignment Create/Delete

Super Admin can:

* Override all permissions
* Control tenant-level rules
* Manage Admins

RBAC must be:

* Dynamic
* Stored in DB
* Middleware validated
* Not frontend-only protected

---

# 🗄️ DATABASE ALIGNMENT REQUIREMENTS

AI must verify existence or create if missing:

### Required Tables:

* teachers
* classes
* subjects
* teacher_class_assignments
* teacher_subject_assignments
* exams
* marks
* assignments
* attendance
* role_permissions

### Required Relationships:

* Teacher → Many Subjects
* Teacher → One Class (as class teacher)
* Class → Many Subjects
* Subject → Belongs to Class
* Marks → Belongs to Exam + Student + Subject
* Assignment → Belongs to Class + Subject + Teacher

Add:

* Proper Foreign Keys
* Cascade rules carefully
* Unique constraints where required
* Indexing for performance

---

# 🔒 SECURITY & VALIDATION RULES

* Backend must validate teacher ownership
* No frontend-only filtering
* Prevent horizontal privilege escalation
* Tenant isolation must be enforced (if SaaS)
* Avoid N+1 query issues
* Use transactions for:

  * Marks submission
  * Exam creation
  * Attendance bulk save

---

# ⚠️ EDGE CASES TO HANDLE

* Teacher removed from subject → old exams?
* Teacher reassigned class → attendance visibility?
* Deleted subject → what about marks?
* Multiple subjects same name in different classes
* Bulk student promotion

---

# 🚀 FINAL OUTPUT EXPECTATION FROM AI AGENT

1. System analysis report (before changes)
2. List of missing components
3. Updated ERD (if changes required)
4. Safe migration plan
5. Updated backend logic
6. Updated middleware checks
7. Updated teacher dashboard logic
8. No breaking changes
9. Fully tested permission validation

---

# 🔥 IMPORTANT

Do NOT:

* Hardcode teacher permissions
* Break existing SaaS tenant structure
* Duplicate tables
* Remove current working features

Do:

* Refactor cleanly
* Optimize queries
* Keep code modular
* Keep system scalable

