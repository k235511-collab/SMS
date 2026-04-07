/**
 * Enterprise RBAC Permission Constants
 *
 * Every permission slug is stored as a row in the global `permissions` table.
 * Use these constants with `@RequirePermission(Permission.CREATE_STUDENT)`
 * for compile-time safety — no magic strings in controllers.
 *
 * Convention: MODULE_ACTION  →  slug: "module:action"
 */
export const Permission = {
  // ─── Users ──────────────────────────────────────────────────
  CREATE_USER: 'users:create',
  READ_USER: 'users:read',
  UPDATE_USER: 'users:update',
  DELETE_USER: 'users:delete',

  // ─── Roles ──────────────────────────────────────────────────
  CREATE_ROLE: 'roles:create',
  READ_ROLE: 'roles:read',
  UPDATE_ROLE: 'roles:update',
  DELETE_ROLE: 'roles:delete',

  // ─── Schools ────────────────────────────────────────────────
  CREATE_SCHOOL: 'schools:create',
  READ_SCHOOL: 'schools:read',
  UPDATE_SCHOOL: 'schools:update',
  DELETE_SCHOOL: 'schools:delete',

  // ─── Campuses ───────────────────────────────────────────────
  CREATE_CAMPUS: 'campuses:create',
  READ_CAMPUS: 'campuses:read',
  UPDATE_CAMPUS: 'campuses:update',
  DELETE_CAMPUS: 'campuses:delete',

  // ─── Students ───────────────────────────────────────────────
  CREATE_STUDENT: 'students:create',
  READ_STUDENT: 'students:read',
  UPDATE_STUDENT: 'students:update',
  DELETE_STUDENT: 'students:delete',

  // ─── Teachers ───────────────────────────────────────────────
  CREATE_TEACHER: 'teachers:create',
  READ_TEACHER: 'teachers:read',
  UPDATE_TEACHER: 'teachers:update',
  DELETE_TEACHER: 'teachers:delete',

  // ─── Parents ────────────────────────────────────────────────
  CREATE_PARENT: 'parents:create',
  READ_PARENT: 'parents:read',
  UPDATE_PARENT: 'parents:update',
  DELETE_PARENT: 'parents:delete',

  // ─── Academics ──────────────────────────────────────────────
  CREATE_ACADEMIC: 'academics:create',
  READ_ACADEMIC: 'academics:read',
  UPDATE_ACADEMIC: 'academics:update',
  DELETE_ACADEMIC: 'academics:delete',

  // ─── Timetable ──────────────────────────────────────────────
  CREATE_TIMETABLE: 'timetable:create',
  READ_TIMETABLE: 'timetable:read',
  UPDATE_TIMETABLE: 'timetable:update',
  DELETE_TIMETABLE: 'timetable:delete',

  // ─── Attendance ─────────────────────────────────────────────
  CREATE_ATTENDANCE: 'attendance:create',
  READ_ATTENDANCE: 'attendance:read',
  UPDATE_ATTENDANCE: 'attendance:update',
  DELETE_ATTENDANCE: 'attendance:delete',

  // ─── Exams ──────────────────────────────────────────────────
  CREATE_EXAM: 'exams:create',
  READ_EXAM: 'exams:read',
  UPDATE_EXAM: 'exams:update',
  DELETE_EXAM: 'exams:delete',

  // ─── Finance ────────────────────────────────────────────────
  CREATE_FINANCE: 'finance:create',
  READ_FINANCE: 'finance:read',
  UPDATE_FINANCE: 'finance:update',
  DELETE_FINANCE: 'finance:delete',

  // ─── Assignments ────────────────────────────────────────────
  CREATE_ASSIGNMENT: 'assignments:create',
  READ_ASSIGNMENT: 'assignments:read',
  UPDATE_ASSIGNMENT: 'assignments:update',
  DELETE_ASSIGNMENT: 'assignments:delete',

  // ─── Grades ─────────────────────────────────────────────────
  CREATE_GRADE: 'grades:create',
  READ_GRADE: 'grades:read',
  UPDATE_GRADE: 'grades:update',
  DELETE_GRADE: 'grades:delete',

  // ─── Library ────────────────────────────────────────────────
  CREATE_LIBRARY: 'library:create',
  READ_LIBRARY: 'library:read',
  UPDATE_LIBRARY: 'library:update',
  DELETE_LIBRARY: 'library:delete',

  // ─── Transport ──────────────────────────────────────────────
  CREATE_TRANSPORT: 'transport:create',
  READ_TRANSPORT: 'transport:read',
  UPDATE_TRANSPORT: 'transport:update',
  DELETE_TRANSPORT: 'transport:delete',

  // ─── Calendar ───────────────────────────────────────────────
  CREATE_CALENDAR: 'calendar:create',
  READ_CALENDAR: 'calendar:read',
  UPDATE_CALENDAR: 'calendar:update',
  DELETE_CALENDAR: 'calendar:delete',

  // ─── Communications ─────────────────────────────────────────
  CREATE_COMMUNICATION: 'communications:create',
  READ_COMMUNICATION: 'communications:read',

  // ─── Analytics ──────────────────────────────────────────────
  READ_ANALYTICS: 'analytics:read',

  // ─── Reports ────────────────────────────────────────────────
  READ_REPORT: 'reports:read',

  // ─── Resources ──────────────────────────────────────────────
  CREATE_RESOURCE: 'resources:create',
  READ_RESOURCE: 'resources:read',
  DELETE_RESOURCE: 'resources:delete',

  // ─── Notifications ──────────────────────────────────────────
  CREATE_NOTIFICATION: 'notifications:create',
  READ_NOTIFICATION: 'notifications:read',

  // ─── Backup ─────────────────────────────────────────────────
  MANAGE_BACKUP: 'backup:manage',

  // ─── Feature Flags ──────────────────────────────────────────
  MANAGE_FEATURE_FLAGS: 'feature-flags:manage',

  // ─── Audit ──────────────────────────────────────────────────
  READ_AUDIT: 'audit:read',

  // ─── Platform ───────────────────────────────────────────────
  MANAGE_PLATFORM: 'platform:manage',

  // ─── Special ────────────────────────────────────────────────
  SUPER_ADMIN_BYPASS: '*',
} as const

/** Union type of all valid permission slugs */
export type PermissionSlug = (typeof Permission)[keyof typeof Permission]
