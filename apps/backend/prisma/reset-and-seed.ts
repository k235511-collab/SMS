/**
 * RESET & FRESH SEED for International School
 * 
 * Deletes ALL data for the school (students, parents, teachers, invoices,
 * payments, attendance, academic years, etc.) then re-seeds with clean
 * minimal test data:
 *   - 1 academic year (2025-2026, current)
 *   - 10 classes (Grade 1–10) × 2 sections (A, B) = 20 sections
 *   - 2 students per section = 40 students total
 *   - 8 subjects
 *   - 3 teachers
 *   - 2 parents (linked to students)
 *   - 3 fee structures + invoices + some payments
 *   - 5 expense categories + 6 expenses
 *   - Some attendance records
 */

import { PrismaClient, Gender, FeeFrequency, InvoiceStatus, PaymentMethod, AttendanceStatus, StudentStatus } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const SCHOOL_ID = '89d62487-d10a-4c6a-836c-1f37ce7c18a1'

const boyFirstNames = ['Ahmed', 'Hamza', 'Ali', 'Usman', 'Ibrahim', 'Bilal', 'Hassan', 'Zayan', 'Rayan', 'Mustafa',
  'Yahya', 'Omar', 'Aariz', 'Musa', 'Hussain', 'Fahad', 'Saad', 'Owais', 'Talha', 'Danish']
const girlFirstNames = ['Fatima', 'Aisha', 'Zainab', 'Sara', 'Hira', 'Anaya', 'Eshal', 'Inaya', 'Noor', 'Maryam',
  'Zoya', 'Sana', 'Aliza', 'Eman', 'Khadija', 'Mahnoor', 'Amber', 'Nimra', 'Areeba', 'Rabia']
const lastNames = ['Khan', 'Ahmed', 'Ali', 'Sheikh', 'Malik', 'Raza', 'Shah', 'Iqbal', 'Hassan', 'Farooq',
  'Siddiqui', 'Gillani', 'Abbas', 'Tariq', 'Lodhi', 'Ghauri', 'Mughal', 'Hashmi', 'Bhatti', 'Dar']

let nameIdx = 0
function nextStudentName(gender: 'MALE' | 'FEMALE') {
  const fNames = gender === 'MALE' ? boyFirstNames : girlFirstNames
  const first = fNames[nameIdx % fNames.length]
  const last = lastNames[nameIdx % lastNames.length]
  nameIdx++
  return { first, last }
}

async function main() {
  console.log('🗑️  Deleting ALL data for school...\n')

  // Use raw SQL with FK constraint deferral for clean delete
  await prisma.$executeRawUnsafe(`SET session_replication_role = 'replica';`)

  const tables = [
    'student_documents', 'parent_students', 'transport_assignments', 'transport_routes', 'vehicles',
    'book_issues', 'books', 'submissions', 'assignments', 'grade_records', 'exam_results', 'exams',
    'attendances', 'fee_payments', 'invoices', 'fee_structures', 'expenses', 'expense_categories',
    'resources', 'communication_logs', 'calendar_events', 'notifications', 'timetable_slots',
    'period_templates', 'student_enrollments', 'students', 'teachers', 'audit_logs',
    'subjects', 'sections', 'classes', 'academic_years',
  ]

  for (const table of tables) {
    await prisma.$executeRawUnsafe(`DELETE FROM ${table} WHERE "schoolId" = '${SCHOOL_ID}'`)
  }

  // Delete login history for school users, then non-admin users
  await prisma.$executeRawUnsafe(`DELETE FROM login_history WHERE "userId" IN (SELECT id FROM users WHERE "schoolId" = '${SCHOOL_ID}' AND email != 'admin@demo.com')`)
  await prisma.$executeRawUnsafe(`DELETE FROM users WHERE "schoolId" = '${SCHOOL_ID}' AND email != 'admin@demo.com'`)

  // Re-enable FK checks
  await prisma.$executeRawUnsafe(`SET session_replication_role = 'origin';`)

  console.log('✅ All data deleted.\n')

  // ══════════════════════════════════════════════════════════════
  // RE-SEED FRESH DATA
  // ══════════════════════════════════════════════════════════════

  const adminUser = await prisma.user.findFirst({ where: { email: 'admin@demo.com', schoolId: SCHOOL_ID } })
  if (!adminUser) {
    console.error('❌ Admin user not found! Run the main seed first.')
    return
  }

  // ─── 1. Academic Year ─────────────────────────────────────────
  console.log('📅 Creating academic year...')
  const academicYear = await prisma.academicYear.create({
    data: {
      name: '2025-2026',
      startDate: new Date('2025-04-01'),
      endDate: new Date('2026-03-31'),
      isCurrent: true,
      schoolId: SCHOOL_ID,
    },
  })

  // ─── 2. Classes & Sections ────────────────────────────────────
  console.log('📚 Creating 10 classes with 2 sections each...')
  const gradeLevels = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10']
  const classesList: any[] = []
  const sectionsList: any[] = []

  for (let i = 0; i < gradeLevels.length; i++) {
    const cls = await prisma.class.create({
      data: { name: gradeLevels[i], code: `G${i + 1}`, sortOrder: i + 1, schoolId: SCHOOL_ID },
    })
    classesList.push(cls)

    for (const sName of ['A', 'B']) {
      const sec = await prisma.section.create({
        data: { name: sName, capacity: 40, classId: cls.id, schoolId: SCHOOL_ID },
      })
      sectionsList.push(sec)
    }
  }

  // ─── 3. Subjects ──────────────────────────────────────────────
  console.log('📖 Creating subjects...')
  const subjectsData = [
    { name: 'Mathematics', code: 'MATH' }, { name: 'English', code: 'ENG' },
    { name: 'Science', code: 'SCI' }, { name: 'Urdu', code: 'URD' },
    { name: 'Social Studies', code: 'SS' }, { name: 'Computer Science', code: 'CS' },
    { name: 'Islamic Studies', code: 'ISL' }, { name: 'General Knowledge', code: 'GK' },
  ]
  for (const s of subjectsData) {
    await prisma.subject.create({
      data: { name: s.name, code: s.code, schoolId: SCHOOL_ID },
    })
  }

  // ─── 4. Teachers ──────────────────────────────────────────────
  console.log('👩‍🏫 Creating 3 teachers...')
  const teacherRole = await prisma.role.findFirst({ where: { slug: 'teacher', schoolId: SCHOOL_ID } })
  const teacherHash = await bcrypt.hash('teacher123', 10)

  const teachersData = [
    { firstName: 'Ayesha', lastName: 'Malik', employeeId: 'TCH-001', email: 'ayesha.malik@demo.com', gender: Gender.FEMALE },
    { firstName: 'Kamran', lastName: 'Sheikh', employeeId: 'TCH-002', email: 'kamran.sheikh@demo.com', gender: Gender.MALE },
    { firstName: 'Sobia', lastName: 'Khan', employeeId: 'TCH-003', email: 'sobia.khan@demo.com', gender: Gender.FEMALE },
  ]

  for (const t of teachersData) {
    const user = await prisma.user.create({
      data: {
        email: t.email, passwordHash: teacherHash,
        firstName: t.firstName, lastName: t.lastName, gender: t.gender,
        roleId: teacherRole!.id, schoolId: SCHOOL_ID,
      },
    })
    await prisma.teacher.create({
      data: {
        employeeId: t.employeeId, firstName: t.firstName, lastName: t.lastName,
        gender: t.gender, schoolId: SCHOOL_ID, userId: user.id,
      },
    })
  }

  // ─── 5. Students (2 per section = 40 total) ──────────────────
  console.log('🧑‍🎓 Creating 40 students (2 per section)...')
  const studentRole = await prisma.role.findFirst({ where: { slug: 'student', schoolId: SCHOOL_ID } })
  const studentHash = await bcrypt.hash('student123', 10)
  const allStudents: any[] = []

  let rollCounter = 1
  for (const cls of classesList) {
    const classSections = sectionsList.filter(s => s.classId === cls.id)
    for (const sec of classSections) {
      for (let s = 0; s < 2; s++) {
        const gender: 'MALE' | 'FEMALE' = (rollCounter % 2 === 0) ? 'FEMALE' : 'MALE'
        const { first, last } = nextStudentName(gender)
        const rollNumber = `STD-${String(rollCounter).padStart(3, '0')}`
        const email = `${first.toLowerCase()}.${last.toLowerCase()}${rollCounter}@student.demo.com`

        const user = await prisma.user.create({
          data: {
            email, passwordHash: studentHash,
            firstName: first, lastName: last, gender,
            roleId: studentRole!.id, schoolId: SCHOOL_ID,
          },
        })

        const student = await prisma.student.create({
          data: {
            rollNumber, firstName: first, lastName: last, gender,
            dateOfBirth: new Date(`${2010 + (rollCounter % 8)}-${String((rollCounter % 12) + 1).padStart(2, '0')}-15`),
            guardianName: `${lastNames[(rollCounter + 5) % lastNames.length]} Family`,
            guardianPhone: `+9230${String(1000000 + rollCounter).padStart(7, '0')}`,
            classId: cls.id, sectionId: sec.id,
            schoolId: SCHOOL_ID, userId: user.id,
            status: StudentStatus.ACTIVE,
          },
        })

        // Enrollment
        await prisma.studentEnrollment.create({
          data: {
            studentId: student.id, academicYearId: academicYear.id,
            classId: cls.id, sectionId: sec.id, schoolId: SCHOOL_ID,
            status: StudentStatus.ACTIVE,
          },
        })

        allStudents.push(student)
        rollCounter++
      }
    }
  }

  // ─── 6. Parents (2 parents, each linked to a few students) ───
  console.log('👨‍👩‍👦 Creating 2 parent accounts...')
  const parentRole = await prisma.role.findFirst({ where: { slug: 'parent', schoolId: SCHOOL_ID } })
  const parentHash = await bcrypt.hash('parent123', 10)

  const parent1User = await prisma.user.create({
    data: {
      email: 'parent1@demo.com', passwordHash: parentHash,
      firstName: 'Tariq', lastName: 'Khan', gender: Gender.MALE,
      phone: '+923001234567', roleId: parentRole!.id, schoolId: SCHOOL_ID,
    },
  })
  // Link parent1 to first 3 students
  for (let i = 0; i < 3 && i < allStudents.length; i++) {
    await prisma.parentStudent.create({
      data: { parentId: parent1User.id, studentId: allStudents[i].id, relationship: 'FATHER', isPrimary: true, schoolId: SCHOOL_ID },
    })
  }

  const parent2User = await prisma.user.create({
    data: {
      email: 'parent2@demo.com', passwordHash: parentHash,
      firstName: 'Sadia', lastName: 'Ahmed', gender: Gender.FEMALE,
      phone: '+923009876543', roleId: parentRole!.id, schoolId: SCHOOL_ID,
    },
  })
  // Link parent2 to students 4-5
  for (let i = 3; i < 5 && i < allStudents.length; i++) {
    await prisma.parentStudent.create({
      data: { parentId: parent2User.id, studentId: allStudents[i].id, relationship: 'MOTHER', isPrimary: true, schoolId: SCHOOL_ID },
    })
  }

  // ─── 7. Fee Structures ────────────────────────────────────────
  console.log('💰 Creating fee structures...')
  const tuitionFee = await prisma.feeStructure.create({
    data: { name: 'Monthly Tuition Fee', amount: 5000, frequency: FeeFrequency.MONTHLY, dueDay: 10, schoolId: SCHOOL_ID, isActive: true },
  })
  const examFee = await prisma.feeStructure.create({
    data: { name: 'Annual Exam Fee', amount: 2000, frequency: FeeFrequency.ANNUAL, dueDay: 1, schoolId: SCHOOL_ID, isActive: true },
  })
  const labFee = await prisma.feeStructure.create({
    data: { name: 'Lab Fee (Grade 9-10)', amount: 1500, frequency: FeeFrequency.SEMI_ANNUAL, dueDay: 5, schoolId: SCHOOL_ID, isActive: true, classId: classesList[8]?.id },
  })

  // ─── 8. Invoices & Payments ───────────────────────────────────
  console.log('🧾 Creating invoices and payments...')
  let invoiceCounter = 1

  // Monthly tuition invoices for all 40 students (Apr-Jun 2025 = 3 months)
  const months = [
    { month: '2025-04', dueDate: '2025-04-10' },
    { month: '2025-05', dueDate: '2025-05-10' },
    { month: '2025-06', dueDate: '2025-06-10' },
  ]

  for (const m of months) {
    for (const student of allStudents) {
      const invoiceNo = `INV-${String(invoiceCounter++).padStart(5, '0')}`
      const dueDate = new Date(m.dueDate)

      // 60% PAID, 20% PARTIAL, 10% UNPAID, 10% OVERDUE
      const rand = Math.random()
      let status: InvoiceStatus
      let paidAmount: number

      if (rand < 0.6) {
        status = InvoiceStatus.PAID; paidAmount = 5000
      } else if (rand < 0.8) {
        status = InvoiceStatus.PARTIAL; paidAmount = Math.floor(1000 + Math.random() * 3000)
      } else if (rand < 0.9) {
        status = InvoiceStatus.UNPAID; paidAmount = 0
      } else {
        status = InvoiceStatus.OVERDUE; paidAmount = 0
      }

      const invoice = await prisma.invoice.create({
        data: {
          invoiceNo, totalAmount: 5000, paidAmount, dueDate, status,
          studentId: student.id, feeStructureId: tuitionFee.id, schoolId: SCHOOL_ID,
        },
      })

      // Create payment record if paid/partial
      if (paidAmount > 0) {
        const methods = [PaymentMethod.CASH, PaymentMethod.BANK_TRANSFER, PaymentMethod.ONLINE, PaymentMethod.CHEQUE]
        const method = methods[Math.floor(Math.random() * methods.length)]
        const paidDate = new Date(dueDate)
        paidDate.setDate(paidDate.getDate() - Math.floor(Math.random() * 5)) // paid a few days before/on due date

        await prisma.feePayment.create({
          data: {
            amount: paidAmount, method,
            referenceNo: method !== PaymentMethod.CASH ? `REF-${invoiceCounter}` : undefined,
            paidAt: paidDate,
            invoiceId: invoice.id, studentId: student.id, schoolId: SCHOOL_ID,
          },
        })
      }
    }
  }

  // Exam fee invoices (annual, for all students, due Jul 2025)
  for (const student of allStudents) {
    const invoiceNo = `INV-${String(invoiceCounter++).padStart(5, '0')}`
    const status = Math.random() < 0.5 ? InvoiceStatus.PAID : InvoiceStatus.UNPAID
    const paidAmount = status === InvoiceStatus.PAID ? 2000 : 0

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo, totalAmount: 2000, paidAmount,
        dueDate: new Date('2025-07-01'), status,
        studentId: student.id, feeStructureId: examFee.id, schoolId: SCHOOL_ID,
      },
    })

    if (paidAmount > 0) {
      await prisma.feePayment.create({
        data: {
          amount: paidAmount, method: PaymentMethod.CASH,
          paidAt: new Date('2025-06-28'),
          invoiceId: invoice.id, studentId: student.id, schoolId: SCHOOL_ID,
        },
      })
    }
  }

  console.log(`   Created ${invoiceCounter - 1} invoices with payments`)

  // ─── 9. Expense Categories & Expenses ─────────────────────────
  console.log('📊 Creating expense categories and expenses...')
  const categories = ['Utilities', 'Office Supplies', 'Maintenance', 'Salaries', 'Transport']
  const catRecords: any[] = []
  for (const name of categories) {
    const cat = await prisma.expenseCategory.create({
      data: { name, isCustom: false, schoolId: SCHOOL_ID },
    })
    catRecords.push(cat)
  }

  const expensesData = [
    { title: 'Electricity Bill - April', amount: 45000, date: '2025-04-15', vendor: 'WAPDA', categoryIdx: 0, receiptNo: 'EXP-001' },
    { title: 'Printer Paper & Stationery', amount: 8500, date: '2025-04-20', vendor: 'Star Stationery', categoryIdx: 1, receiptNo: 'EXP-002' },
    { title: 'AC Maintenance', amount: 15000, date: '2025-05-05', vendor: 'Cool Tech Services', categoryIdx: 2, receiptNo: 'EXP-003' },
    { title: 'Staff Salaries - April', amount: 320000, date: '2025-04-30', vendor: 'Payroll', categoryIdx: 3, receiptNo: 'EXP-004' },
    { title: 'Staff Salaries - May', amount: 320000, date: '2025-05-31', vendor: 'Payroll', categoryIdx: 3, receiptNo: 'EXP-005' },
    { title: 'School Van Fuel', amount: 12000, date: '2025-05-15', vendor: 'PSO Station', categoryIdx: 4, receiptNo: 'EXP-006' },
  ]

  for (const e of expensesData) {
    await prisma.expense.create({
      data: {
        title: e.title, amount: e.amount, date: new Date(e.date),
        vendor: e.vendor, receiptNo: e.receiptNo,
        categoryId: catRecords[e.categoryIdx].id, schoolId: SCHOOL_ID,
      },
    })
  }

  // ─── 10. Attendance (sample for last week) ────────────────────
  console.log('📋 Creating attendance records...')
  const attendanceDates = ['2026-02-15', '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19']
  const statuses = [AttendanceStatus.PRESENT, AttendanceStatus.PRESENT, AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.LATE]

  for (const dateStr of attendanceDates) {
    const date = new Date(dateStr)
    for (const student of allStudents) {
      // 85% present, 10% absent, 5% late
      const rand = Math.random()
      let status: AttendanceStatus
      if (rand < 0.85) status = AttendanceStatus.PRESENT
      else if (rand < 0.95) status = AttendanceStatus.ABSENT
      else status = AttendanceStatus.LATE

      await prisma.attendance.create({
        data: {
          date, status, studentId: student.id,
          sectionId: student.sectionId, schoolId: SCHOOL_ID,
        },
      })
    }
  }

  // ─── Summary ──────────────────────────────────────────────────
  const totalStudents = await prisma.student.count({ where: { schoolId: SCHOOL_ID } })
  const totalInvoices = await prisma.invoice.count({ where: { schoolId: SCHOOL_ID } })
  const totalPayments = await prisma.feePayment.count({ where: { schoolId: SCHOOL_ID } })
  const totalExpenses = await prisma.expense.count({ where: { schoolId: SCHOOL_ID } })
  const totalAttendance = await prisma.attendance.count({ where: { schoolId: SCHOOL_ID } })

  console.log('\n✅ FRESH SEED COMPLETE!')
  console.log('═══════════════════════════════════════')
  console.log(`  📅 Academic Year: 2025-2026 (Apr 2025 – Mar 2026)`)
  console.log(`  🏫 Classes: 10 (Grade 1-10) × 2 sections = 20 sections`)
  console.log(`  🧑‍🎓 Students: ${totalStudents}`)
  console.log(`  👩‍🏫 Teachers: 3`)
  console.log(`  👨‍👩‍👦 Parents: 2`)
  console.log(`  🧾 Invoices: ${totalInvoices}`)
  console.log(`  💳 Payments: ${totalPayments}`)
  console.log(`  📊 Expenses: ${totalExpenses}`)
  console.log(`  📋 Attendance: ${totalAttendance}`)
  console.log('═══════════════════════════════════════')
  console.log('\n  Login: admin@demo.com / admin123')
  console.log('  School ID: 89d62487-d10a-4c6a-836c-1f37ce7c18a1\n')
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
