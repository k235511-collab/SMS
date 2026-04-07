import { PrismaClient, Gender, AttendanceStatus, ExamType, FeeFrequency, InvoiceStatus, PaymentMethod, NotificationType, StudentStatus, AssignmentType, SubmissionStatus, GradeCategory, BookIssueStatus } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const DEFAULT_PERMISSIONS = [
  'users:create', 'users:read', 'users:update', 'users:delete',
  'roles:create', 'roles:read', 'roles:update', 'roles:delete',
  'schools:create', 'schools:read', 'schools:update', 'schools:delete',
  'campuses:create', 'campuses:read', 'campuses:update', 'campuses:delete',
  'students:create', 'students:read', 'students:update', 'students:delete',
  'teachers:create', 'teachers:read', 'teachers:update', 'teachers:delete',
  'parents:create', 'parents:read', 'parents:update', 'parents:delete',
  'academics:create', 'academics:read', 'academics:update', 'academics:delete',
  'timetable:create', 'timetable:read', 'timetable:update', 'timetable:delete',
  'attendance:create', 'attendance:read', 'attendance:update', 'attendance:delete',
  'exams:create', 'exams:read', 'exams:update', 'exams:delete',
  'finance:create', 'finance:read', 'finance:update', 'finance:delete',
  'audit:read',
  'platform:manage',
]

const firstNames = ['Muhammad', 'Ahmed', 'Fatima', 'Aisha', 'Zainab', 'Ali', 'Omar', 'Usman', 'Hamza', 'Sara', 'Zoya', 'Bilal', 'Hassan', 'Hussain', 'Mariam', 'Sana', 'Hira', 'Ibrahim', 'Mustafa', 'Yousaf', 'Anaya', 'Rayan', 'Aariz', 'Eshal', 'Inaya', 'Zayan', 'Musa', 'Isa', 'Yahya', 'Noor'];
const lastNames = ['Khan', 'Ahmed', 'Ali', 'Sheikh', 'Malik', 'Raza', 'Shah', 'Iqbal', 'Hassan', 'Farooq', 'Siddiqui', 'Gillani', 'Abbas', 'Tariq', 'Butt', 'Dar', 'Wattoo', 'Gujjar', 'Bhatti', 'Mirza', 'Lodhi', 'Ghauri', 'Jan', 'Mughal', 'Hashmi'];

async function main() {
  console.log('🌱 Seeding database with comprehensive demo data...\n')

  // 1. PERMISSIONS
  console.log('📋 Seeding permissions...')
  for (const slug of DEFAULT_PERMISSIONS) {
    const [module, action] = slug.split(':')
    await prisma.permission.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        name: `${action.charAt(0).toUpperCase() + action.slice(1)} ${module.charAt(0).toUpperCase() + module.slice(1)}`,
        module,
        action,
      },
    })
  }
  const allPermissions = await prisma.permission.findMany()

  // 2. SUBSCRIPTION PLANS
  console.log('💳 Seeding plans...')
  const plans = [
    { name: 'Free', slug: 'free', price: 0, maxStudents: 50, maxTeachers: 5, maxCampuses: 1, features: ['attendance', 'exams'] },
    { name: 'Basic', slug: 'basic', price: 29.99, maxStudents: 500, maxTeachers: 50, maxCampuses: 2, features: ['attendance', 'exams', 'finance'] },
    { name: 'Premium', slug: 'premium', price: 99.99, maxStudents: 5000, maxTeachers: 500, maxCampuses: 10, features: ['attendance', 'exams', 'finance', 'audit', 'timetable', 'notifications'] },
    { name: 'Enterprise', slug: 'enterprise', price: 299.99, maxStudents: null, maxTeachers: null, maxCampuses: null, features: ['attendance', 'exams', 'finance', 'audit', 'timetable', 'notifications', 'api-access'] },
  ]
  for (const p of plans) {
    await prisma.subscriptionPlan.upsert({ where: { slug: p.slug }, update: {}, create: p })
  }
  const premiumPlan = await prisma.subscriptionPlan.findUnique({ where: { slug: 'premium' } })

  // 3. PLATFORM ADMIN
  const platformHash = await bcrypt.hash('platform123', 10)
  await prisma.platformAdmin.upsert({
    where: { email: 'platform@sms.com' },
    update: {},
    create: { email: 'platform@sms.com', passwordHash: platformHash, firstName: 'Platform', lastName: 'Admin' },
  })

  // 4. DEMO SCHOOL
  console.log('🏫 Seeding demo school...')
  const school = await prisma.school.upsert({
    where: { slug: 'demo-school' },
    update: {},
    create: {
      name: 'Demo International School',
      slug: 'demo-school',
      code: 'DEMO',
      address: '123 Education Lane',
      phone: '+1234567890',
      email: 'info@demo-school.com',
      website: 'https://demo-school.com',
      subscriptionPlanId: premiumPlan?.id,
      isActive: true
    },
  })

  // 5. ROLES
  console.log('👥 Seeding roles...')
  const roles = [
    { name: 'Super Admin', slug: 'super_admin', description: 'Full access to everything', isSystem: true },
    { name: 'Admin', slug: 'admin', description: 'School administrator', isSystem: true },
    { name: 'Principal', slug: 'principal', description: 'Campus principal – full access within assigned campus', isSystem: true },
    { name: 'Teacher', slug: 'teacher', description: 'Teacher access', isSystem: true },
    { name: 'Student', slug: 'student', description: 'Student access', isSystem: true },
    { name: 'Parent', slug: 'parent', description: 'Parent/Guardian access', isSystem: true },
  ]
  const roleMap: Record<string, string> = {}
  for (const r of roles) {
    const role = await prisma.role.upsert({
      where: { slug_schoolId: { slug: r.slug, schoolId: school.id } },
      update: {},
      create: { ...r, schoolId: school.id },
    })
    roleMap[r.slug] = role.id

    // Assign permissions
    let perms = allPermissions;
    if (r.slug === 'admin') perms = allPermissions.filter(p => p.slug !== 'platform:manage')
    if (r.slug === 'principal') perms = allPermissions.filter(p => !['platform:manage', 'schools:create', 'schools:delete'].includes(p.slug))
    if (r.slug === 'teacher') perms = allPermissions.filter(p => ['students:read', 'teachers:read', 'academics:read', 'attendance:read', 'attendance:create', 'attendance:update', 'attendance:delete', 'exams:read', 'exams:create', 'exams:update', 'assignments:read', 'assignments:create', 'assignments:update', 'assignments:delete', 'grades:read', 'grades:create', 'grades:update', 'calendar:read'].includes(p.slug))

    for (const p of perms) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: p.id } },
        update: {},
        create: { roleId: role.id, permissionId: p.id }
      })
    }
  }

  // 6. USERS (Staff)
  console.log('👤 Seeding staff users...')
  const adminHash = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { email_schoolId: { email: 'admin@demo.com', schoolId: school.id } },
    update: {},
    create: { email: 'admin@demo.com', passwordHash: adminHash, firstName: 'Super', lastName: 'Admin', roleId: roleMap['super_admin'], schoolId: school.id },
  })

  // 7. CAMPUSES & ACADEMIC YEAR
  console.log('🏢 Seeding campuses...')
  const mainCampus = await prisma.campus.upsert({ where: { code_schoolId: { code: 'MAIN', schoolId: school.id } }, update: {}, create: { name: 'Main Campus', code: 'MAIN', address: '123 Education Lane', phone: '+1234567890', schoolId: school.id } })
  const northCampus = await prisma.campus.upsert({ where: { code_schoolId: { code: 'NORTH', schoolId: school.id } }, update: {}, create: { name: 'North Campus', code: 'NORTH', address: '456 North Avenue', phone: '+1234567891', schoolId: school.id } })
  const allCampuses = [mainCampus, northCampus]

  // Create principal users for each campus
  console.log('👔 Seeding campus principals...')
  const principalHash = await bcrypt.hash('principal123', 10)
  const mainPrincipal = await prisma.user.upsert({
    where: { email_schoolId: { email: 'principal.main@demo.com', schoolId: school.id } },
    update: { campusId: mainCampus.id },
    create: { email: 'principal.main@demo.com', passwordHash: principalHash, firstName: 'Khalid', lastName: 'Mahmood', roleId: roleMap['principal'], schoolId: school.id, campusId: mainCampus.id },
  })
  const northPrincipal = await prisma.user.upsert({
    where: { email_schoolId: { email: 'principal.north@demo.com', schoolId: school.id } },
    update: { campusId: northCampus.id },
    create: { email: 'principal.north@demo.com', passwordHash: principalHash, firstName: 'Ayesha', lastName: 'Siddiqui', roleId: roleMap['principal'], schoolId: school.id, campusId: northCampus.id },
  })

  const academicYear = await prisma.academicYear.upsert({ where: { name_schoolId: { name: '2025-2026', schoolId: school.id } }, update: {}, create: { name: '2025-2026', startDate: new Date('2025-04-01'), endDate: new Date('2026-03-31'), isCurrent: true, schoolId: school.id } })

  // 8. CLASSES & SECTIONS
  console.log('📚 Seeding classes & sections...')
  const gradeLevels = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'];
  const sectionNames = ['A', 'B'];
  const classesList: any[] = [];
  const sectionsList: any[] = [];

  for (let i = 0; i < gradeLevels.length; i++) {
    // First 6 grades → Main Campus, last 4 grades → North Campus
    const assignedCampus = i < 6 ? mainCampus : northCampus;
    const cls = await prisma.class.upsert({
      where: { code_schoolId: { code: `G${i + 1}`, schoolId: school.id } },
      update: { campusId: assignedCampus.id },
      create: { name: gradeLevels[i], code: `G${i + 1}`, sortOrder: i + 1, schoolId: school.id, campusId: assignedCampus.id }
    });
    classesList.push(cls);

    for (const sName of sectionNames) {
      const sec = await prisma.section.upsert({
        where: { name_classId: { name: sName, classId: cls.id } },
        update: {},
        create: { name: sName, capacity: 40, classId: cls.id, schoolId: school.id }
      });
      sectionsList.push(sec);
    }
  }

  // 9. SUBJECTS
  console.log('📖 Seeding subjects...')
  const subjectsData = [
    { name: 'Mathematics', code: 'MATH' }, { name: 'English', code: 'ENG' },
    { name: 'Science', code: 'SCI' }, { name: 'Social Studies', code: 'SS' },
    { name: 'Computer Science', code: 'CS' }, { name: 'Urdu', code: 'URD' },
    { name: 'Islamic Studies', code: 'ISL' }, { name: 'General Knowledge', code: 'GK' }
  ];
  const subjectsList: any[] = [];
  for (const s of subjectsData) {
    // Try to find existing subject by code and school first
    const existing = await prisma.subject.findFirst({
      where: { code: s.code, schoolId: school.id, classId: null }
    });
    
    if (existing) {
      subjectsList.push(existing);
    } else {
      const sub = await prisma.subject.create({
        data: { ...s, schoolId: school.id }
      });
      subjectsList.push(sub);
    }
  }

  // Assign subjects to classes (subjects link via Subject.classId directly)
  // Create per-class copies of each subject
  for (const cls of classesList) {
    for (const s of subjectsData) {
      const classCode = `${s.code}-${cls.code || cls.id.substring(0, 4)}`;
      const existing = await prisma.subject.findFirst({
        where: { code: classCode, schoolId: school.id, classId: cls.id }
      });
      if (!existing) {
        await prisma.subject.create({
          data: { name: s.name, code: classCode, schoolId: school.id, classId: cls.id }
        });
      }
    }
  }

  // 10. TEACHERS
  console.log('👨‍🏫 Seeding teachers...')
  const teachersList: any[] = [];
  const teacherPass = await bcrypt.hash('teacher123', 10);
  for (let i = 1; i <= 10; i++) {
    const email = `teacher${i}@demo.com`;
    const fName = firstNames[i % firstNames.length];
    const lName = lastNames[i % lastNames.length];

    // First 6 teachers → Main Campus, rest → North Campus
    const teacherCampus = i <= 6 ? mainCampus : northCampus;
    const user = await prisma.user.upsert({
      where: { email_schoolId: { email, schoolId: school.id } },
      update: { campusId: teacherCampus.id },
      create: { email, passwordHash: teacherPass, firstName: fName, lastName: lName, roleId: roleMap['teacher'], schoolId: school.id, campusId: teacherCampus.id }
    });

    const teacher = await prisma.teacher.upsert({
      where: { employeeId_schoolId: { employeeId: `T${String(i).padStart(3, '0')}`, schoolId: school.id } },
      update: { campusId: teacherCampus.id },
      create: {
        employeeId: `T${String(i).padStart(3, '0')}`,
        firstName: fName,
        lastName: lName,
        qualification: i % 2 === 0 ? 'M.Ed' : 'B.Ed',
        specialization: subjectsList[i % subjectsList.length].name,
        userId: user.id,
        schoolId: school.id,
        campusId: teacherCampus.id
      }
    });
    teachersList.push(teacher);
  }

  // 11. STUDENTS
  console.log('🎓 Seeding 100 students across all classes...')
  const studentsList: any[] = [];
  for (let i = 1; i <= 100; i++) {
    const fName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const roll = `S${String(i).padStart(4, '0')}`;
    const section = sectionsList[Math.floor(Math.random() * sectionsList.length)];
    const cls = classesList.find(c => c.id === section.classId);

    const student = await prisma.student.upsert({
      where: { rollNumber_schoolId: { rollNumber: roll, schoolId: school.id } },
      update: {
        classId: cls.id,
        sectionId: section.id,
      },
      create: {
        rollNumber: roll,
        firstName: fName,
        lastName: lName,
        gender: i % 2 === 0 ? Gender.MALE : Gender.FEMALE,
        guardianName: `Parent of ${fName}`,
        guardianPhone: `0300${String(i).padStart(7, '0')}`,
        address: `${i}, Education Street, City`,
        classId: cls.id,
        sectionId: section.id,
        schoolId: school.id,
        status: StudentStatus.ACTIVE,
        enrollmentDate: new Date('2025-03-01')
      }
    });
    studentsList.push(student);
  }

  // 11b. STUDENT ENROLLMENTS — link every student to the current academic year
  console.log('📋 Seeding student enrollments...')
  for (const student of studentsList) {
    await prisma.studentEnrollment.upsert({
      where: { studentId_academicYearId: { studentId: student.id, academicYearId: academicYear.id } },
      update: {},
      create: {
        studentId: student.id,
        academicYearId: academicYear.id,
        classId: student.classId,
        sectionId: student.sectionId,
        status: StudentStatus.ACTIVE,
        schoolId: school.id,
      },
    })
  }

  // 12. ATTENDANCE (Last 7 days)
  console.log('📅 Seeding attendance...')
  const today = new Date();
  for (let d = 0; d < 7; d++) {
    const date = new Date();
    date.setDate(today.getDate() - d);
    if (date.getDay() === 0) continue; // Skip Sundays

    // Sample 20 students for attendance each day to keep it fast
    const sampleStudents = studentsList.slice(0, 20);
    for (const student of sampleStudents) {
      await prisma.attendance.upsert({
        where: { studentId_date: { studentId: student.id, date: date } },
        update: {},
        create: {
          date: date,
          status: Math.random() > 0.1 ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT,
          studentId: student.id,
          sectionId: student.sectionId,
          schoolId: school.id
        }
      });
    }
  }

  // 13. FINANCE (Fee Structures & Invoices)
  console.log('💰 Seeding finance...')
  const tuitionFee = await prisma.feeStructure.upsert({
    where: { id: 'fee-monthly-tuition' },
    update: {},
    create: { id: 'fee-monthly-tuition', name: 'Monthly Tuition Fee', amount: 4500, frequency: FeeFrequency.MONTHLY, dueDay: 10, schoolId: school.id }
  });

  const activityFee = await prisma.feeStructure.upsert({
    where: { id: 'fee-activity' },
    update: {},
    create: { id: 'fee-activity', name: 'Activity Fee', amount: 1000, frequency: FeeFrequency.MONTHLY, dueDay: 15, schoolId: school.id }
  });

  // Create invoices for the last 3 months for all students
  const months = [0, 1, 2]; // current, prev, prev-prev
  for (const m of months) {
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() - m);
    dueDate.setDate(10);
    const monthName = dueDate.toLocaleString('default', { month: 'short', year: 'numeric' });

    console.log(`   Generating invoices for ${monthName}...`);
    // Seed for first 30 students to keep it manageable
    for (const student of studentsList.slice(0, 30)) {
      const invNo = `INV-${monthName}-${student.rollNumber}`;

      const statusValue = Math.random();
      const status = statusValue > 0.7 ? InvoiceStatus.PAID : statusValue > 0.4 ? InvoiceStatus.PARTIAL : InvoiceStatus.UNPAID;
      const total = 4500;
      const paid = status === InvoiceStatus.PAID ? total : status === InvoiceStatus.PARTIAL ? 2000 : 0;

      const inv = await prisma.invoice.upsert({
        where: { invoiceNo: invNo },
        update: {},
        create: {
          invoiceNo: invNo,
          totalAmount: total,
          paidAmount: paid,
          dueDate: dueDate,
          status: status,
          studentId: student.id,
          feeStructureId: tuitionFee.id,
          schoolId: school.id,
          notes: `Tuition fee for ${monthName}`
        }
      });

      if (paid > 0) {
        await prisma.feePayment.create({
          data: {
            amount: paid,
            method: PaymentMethod.CASH,
            invoiceId: inv.id,
            studentId: student.id,
            schoolId: school.id,
            paidAt: dueDate
          }
        });
      }
    }
  }

  // 14. EXAMS
  console.log('📝 Seeding exams...')
  const midExam = await prisma.exam.upsert({
    where: { id: 'exam-mid-2025' },
    update: {},
    create: { name: 'Mid Term 2025', type: ExamType.MID_TERM, startDate: new Date('2025-10-01'), totalMarks: 100, passingMarks: 33, schoolId: school.id }
  });

  // Sample results
  for (const student of studentsList.slice(0, 10)) {
    for (const sub of subjectsList.slice(0, 3)) {
      await prisma.examResult.upsert({
        where: { studentId_examId_subjectId: { studentId: student.id, examId: midExam.id, subjectId: sub.id } },
        update: {},
        create: {
          studentId: student.id,
          examId: midExam.id,
          subjectId: sub.id,
          marksObtained: 70 + Math.floor(Math.random() * 25),
          grade: 'A',
          schoolId: school.id
        }
      });
    }
  }

  // 15. LIBRARY
  console.log('📚 Seeding library books...')
  const booksData = [
    { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', category: 'Fiction' },
    { title: 'Advanced Mathematics', author: 'R.K. Sharma', category: 'Educational' },
    { title: 'Brief History of Time', author: 'Stephen Hawking', category: 'Science' },
    { title: 'English Grammar in Use', author: 'Raymond Murphy', category: 'Educational' },
    { title: 'Computer Networks', author: 'Andrew Tanenbaum', category: 'CS' }
  ];
  for (let bi = 0; bi < booksData.length; bi++) {
    const b = booksData[bi];
    // First 3 books → Main Campus, last 2 → North Campus
    const bookCampus = bi < 3 ? mainCampus : northCampus;
    await prisma.book.upsert({
      where: { isbn_schoolId: { isbn: `ISBN-${b.title.substring(0, 3).toUpperCase()}`, schoolId: school.id } },
      update: { campusId: bookCampus.id },
      create: { ...b, isbn: `ISBN-${b.title.substring(0, 3).toUpperCase()}`, totalCopies: 5, availableCopies: 5, schoolId: school.id, campusId: bookCampus.id }
    });
  }

  // 16. TRANSPORT
  console.log('🚌 Seeding transport...')
  const vehicle1 = await prisma.vehicle.upsert({
    where: { registrationNo_schoolId: { registrationNo: 'BUS-001', schoolId: school.id } },
    update: { campusId: mainCampus.id },
    create: { registrationNo: 'BUS-001', type: 'Bus', capacity: 60, driverName: 'Ahmed Driver', schoolId: school.id, campusId: mainCampus.id }
  });
  const vehicle2 = await prisma.vehicle.upsert({
    where: { registrationNo_schoolId: { registrationNo: 'BUS-002', schoolId: school.id } },
    update: { campusId: northCampus.id },
    create: { registrationNo: 'BUS-002', type: 'Van', capacity: 30, driverName: 'Bilal Driver', schoolId: school.id, campusId: northCampus.id }
  });

  await prisma.transportRoute.upsert({
    where: { id: 'route-main-1' },
    update: { campusId: mainCampus.id },
    create: { id: 'route-main-1', name: 'Main Road Route', startLocation: 'School', endLocation: 'Main City', vehicleId: vehicle1.id, schoolId: school.id, campusId: mainCampus.id }
  });
  await prisma.transportRoute.upsert({
    where: { id: 'route-north-1' },
    update: { campusId: northCampus.id },
    create: { id: 'route-north-1', name: 'North Avenue Route', startLocation: 'North Campus', endLocation: 'Satellite Town', vehicleId: vehicle2.id, schoolId: school.id, campusId: northCampus.id }
  });

  // 17. ASSIGNMENTS
  console.log('📝 Seeding assignments...')
  const assignment = await prisma.assignment.create({
    data: {
      title: 'Monthly Math Challenge',
      description: 'Solve all problems from Chapter 4.',
      dueDate: new Date(Date.now() + 86400000 * 7),
      type: AssignmentType.HOMEWORK,
      classId: classesList[0].id,
      subjectId: subjectsList[0].id,
      teacherId: teachersList[0].id,
      schoolId: school.id
    }
  });

  // 18. NOTIFICATIONS
  console.log('🔔 Seeding sample notifications...')
  await prisma.notification.create({
    data: {
      title: 'Welcome to SMS',
      message: 'Your school system is ready for use.',
      type: NotificationType.SUCCESS,
      recipientId: 'admin-id-placeholder',
      schoolId: school.id
    }
  });

  console.log('\n🎉 Seeding complete!')
  console.log('-------------------------------------------')
  console.log('  School: Demo International School')
  console.log('  Admin:           admin@demo.com / admin123')
  console.log('  Main Principal:  principal.main@demo.com / principal123')
  console.log('  North Principal: principal.north@demo.com / principal123')
  console.log('  Teachers:        teacher1-10@demo.com / teacher123')
  console.log('  100 Students, 10 Teachers, 10 Grades')
  console.log('  Main Campus:  Grade 1-6, Teachers 1-6, 3 Books, BUS-001')
  console.log('  North Campus: Grade 7-10, Teachers 7-10, 2 Books, BUS-002')
  console.log('-------------------------------------------')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
