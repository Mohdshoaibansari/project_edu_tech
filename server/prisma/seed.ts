// ============================================================================
// EduTech — Seed Script
// Phase 0 — Seeds 3 diverse school configs + templates + permissions
// ============================================================================
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding EduTech database...\n');

  // =========================================================================
  // 1. TENANTS — Three diverse schools
  // =========================================================================
  const schoolA = await prisma.tenant.upsert({
    where: { slug: 'school-a' },
    update: {},
    create: {
      id: 'tenant-school-a-0000000000000001',
      slug: 'school-a',
      name: 'Delhi Public School (CBSE)',
    },
  });
  const schoolB = await prisma.tenant.upsert({
    where: { slug: 'school-b' },
    update: {},
    create: {
      id: 'tenant-school-b-0000000000000002',
      slug: 'school-b',
      name: 'St. Xavier\'s High School (ICSE)',
    },
  });
  const schoolC = await prisma.tenant.upsert({
    where: { slug: 'school-c' },
    update: {},
    create: {
      id: 'tenant-school-c-0000000000000003',
      slug: 'school-c',
      name: 'Springfield International School',
    },
  });
  console.log('✅ Tenants created: School A (CBSE), School B (ICSE), School C (International)');

  // =========================================================================
  // 2. USERS — One admin per school
  // =========================================================================
  const adminA = await prisma.user.upsert({
    where: { email: 'admin@school-a.edu' },
    update: {},
    create: {
      id: 'user-admin-a-00000000000000000001',
      tenant_id: schoolA.id,
      email: 'admin@school-a.edu',
      password_hash: '$2b$10$placeholder', // Not used for actual auth
      first_name: 'Amit',
      last_name: 'Sharma',
      role: UserRole.ADMIN,
    },
  });
  const adminB = await prisma.user.upsert({
    where: { email: 'admin@school-b.edu' },
    update: {},
    create: {
      id: 'user-admin-b-00000000000000000002',
      tenant_id: schoolB.id,
      email: 'admin@school-b.edu',
      password_hash: '$2b$10$placeholder',
      first_name: 'Priya',
      last_name: 'Patel',
      role: UserRole.ADMIN,
    },
  });
  const adminC = await prisma.user.upsert({
    where: { email: 'admin@school-c.edu' },
    update: {},
    create: {
      id: 'user-admin-c-00000000000000000003',
      tenant_id: schoolC.id,
      email: 'admin@school-c.edu',
      password_hash: '$2b$10$placeholder',
      first_name: 'John',
      last_name: 'Smith',
      role: UserRole.ADMIN,
    },
  });
  console.log('✅ Admin users created\n');

  // =========================================================================
  // 3. ATTENDANCE STATUSES — 3 different configurations
  // =========================================================================

  // --- School A: 3-status simple (Present / Absent / Late) ---
  const schoolAStatuses = [
    { code: 'PRESENT', label: { en: 'Present', hi: 'उपस्थित' }, color: '#10B981', icon: 'check-circle', is_present: true, weight: 1.0, is_default: true, sort_order: 1 },
    { code: 'ABSENT', label: { en: 'Absent', hi: 'अनुपस्थित' }, color: '#EF4444', icon: 'x-circle', is_present: false, weight: 0.0, is_default: false, sort_order: 2 },
    { code: 'LATE', label: { en: 'Late', hi: 'देर से' }, color: '#F59E0B', icon: 'clock', is_present: true, weight: 0.5, is_default: false, sort_order: 3 },
  ];

  // --- School B: 5-status detailed (includes Half Day + Medical Leave) ---
  const schoolBStatuses = [
    { code: 'PRESENT', label: { en: 'Present' }, color: '#10B981', icon: 'check-circle', is_present: true, weight: 1.0, is_default: true, sort_order: 1 },
    { code: 'ABSENT', label: { en: 'Absent' }, color: '#EF4444', icon: 'x-circle', is_present: false, weight: 0.0, is_default: false, sort_order: 2 },
    { code: 'LATE', label: { en: 'Late' }, color: '#F59E0B', icon: 'clock', is_present: true, weight: 0.5, is_default: false, sort_order: 3 },
    { code: 'HALF_DAY', label: { en: 'Half Day' }, color: '#8B5CF6', icon: 'minus-circle', is_present: true, weight: 0.5, is_default: false, sort_order: 4 },
    { code: 'MEDICAL', label: { en: 'Medical Leave' }, color: '#EC4899', icon: 'heart', is_present: true, weight: 1.0, is_default: false, sort_order: 5 },
  ];

  // --- School C: Period-based with custom statuses ---
  const schoolCStatuses = [
    { code: 'PRESENT', label: { en: 'Present' }, color: '#10B981', icon: 'check-circle', is_present: true, weight: 1.0, is_default: true, sort_order: 1 },
    { code: 'ABSENT', label: { en: 'Absent' }, color: '#EF4444', icon: 'x-circle', is_present: false, weight: 0.0, is_default: false, sort_order: 2 },
    { code: 'LATE', label: { en: 'Late' }, color: '#F59E0B', icon: 'clock', is_present: true, weight: 0.7, is_default: false, sort_order: 3 },
    { code: 'EXCUSED', label: { en: 'Excused' }, color: '#6EE7B7', icon: 'shield-check', is_present: true, weight: 1.0, is_default: false, sort_order: 4 },
  ];

  for (const s of schoolAStatuses) {
    await prisma.attendanceStatus.upsert({
      where: { tenant_id_code: { tenant_id: schoolA.id, code: s.code } },
      update: {},
      create: { tenant_id: schoolA.id, ...s },
    });
  }
  for (const s of schoolBStatuses) {
    await prisma.attendanceStatus.upsert({
      where: { tenant_id_code: { tenant_id: schoolB.id, code: s.code } },
      update: {},
      create: { tenant_id: schoolB.id, ...s },
    });
  }
  for (const s of schoolCStatuses) {
    await prisma.attendanceStatus.upsert({
      where: { tenant_id_code: { tenant_id: schoolC.id, code: s.code } },
      update: {},
      create: { tenant_id: schoolC.id, ...s },
    });
  }
  console.log('✅ Attendance statuses: School A (3-status), School B (5-status), School C (period-based)');

  // =========================================================================
  // 4. ASSESSMENT TYPES — per school
  // =========================================================================
  const assessmentTypesForAll = [
    { code: 'UNIT_TEST', label: { en: 'Unit Test' }, sort_order: 1 },
    { code: 'MID_TERM', label: { en: 'Mid-Term Exam' }, sort_order: 2 },
    { code: 'FINAL', label: { en: 'Final Exam' }, sort_order: 3 },
    { code: 'QUIZ', label: { en: 'Quiz' }, sort_order: 4 },
    { code: 'PRACTICAL', label: { en: 'Practical' }, sort_order: 5 },
  ];

  for (const tenant of [schoolA, schoolB, schoolC]) {
    for (const t of assessmentTypesForAll) {
      await prisma.assessmentType.upsert({
        where: { tenant_id_code: { tenant_id: tenant.id, code: t.code } },
        update: {},
        create: { tenant_id: tenant.id, ...t },
      });
    }
  }
  console.log('✅ Assessment types created for all 3 schools');

  // =========================================================================
  // 5. LEAVE TYPES — per school
  // =========================================================================
  const leaveTypesForAll = [
    { code: 'SICK', label: { en: 'Sick Leave' }, max_days: 10, requires_document: true },
    { code: 'CASUAL', label: { en: 'Casual Leave' }, max_days: 5, requires_document: false },
    { code: 'EMERGENCY', label: { en: 'Emergency Leave' }, max_days: 3, requires_document: false },
    { code: 'MATERNITY', label: { en: 'Maternity Leave' }, max_days: 180, requires_document: true },
  ];

  for (const tenant of [schoolA, schoolB, schoolC]) {
    for (const t of leaveTypesForAll) {
      await prisma.leaveType.upsert({
        where: { tenant_id_code: { tenant_id: tenant.id, code: t.code } },
        update: {},
        create: { tenant_id: tenant.id, ...t },
      });
    }
  }
  console.log('✅ Leave types created for all 3 schools');

  // =========================================================================
  // 6. HOMEWORK CATEGORIES
  // =========================================================================
  const homeworkCategoriesForAll = [
    { code: 'CLASSWORK', label: { en: 'Classwork' } },
    { code: 'HOMEWORK', label: { en: 'Homework' } },
    { code: 'PROJECT', label: { en: 'Project' } },
    { code: 'PRACTICAL', label: { en: 'Practical Assignment' } },
  ];

  for (const tenant of [schoolA, schoolB, schoolC]) {
    for (const c of homeworkCategoriesForAll) {
      await prisma.homeworkCategory.upsert({
        where: { tenant_id_code: { tenant_id: tenant.id, code: c.code } },
        update: {},
        create: { tenant_id: tenant.id, ...c },
      });
    }
  }
  console.log('✅ Homework categories created');

  // =========================================================================
  // 7. NOTIFICATION TYPE DEFINITIONS
  // =========================================================================
  const notifTypes = [
    { code: 'ABSENCE_ALERT', label: { en: 'Absence Alert' }, description: 'Sent when a student is marked absent' },
    { code: 'HOMEWORK_DUE', label: { en: 'Homework Due' }, description: 'Reminder for upcoming homework deadlines' },
    { code: 'FEE_REMINDER', label: { en: 'Fee Reminder' }, description: 'Fee payment reminder' },
    { code: 'RESULT_PUBLISHED', label: { en: 'Result Published' }, description: 'Exam results are available' },
    { code: 'LEAVE_STATUS', label: { en: 'Leave Status Update' }, description: 'Leave request approved/rejected' },
    { code: 'GENERAL', label: { en: 'General Announcement' }, description: 'School-wide announcements' },
  ];

  for (const tenant of [schoolA, schoolB, schoolC]) {
    for (const n of notifTypes) {
      await prisma.notificationTypeDef.upsert({
        where: { tenant_id_code: { tenant_id: tenant.id, code: n.code } },
        update: {},
        create: { tenant_id: tenant.id, ...n },
      });
    }
  }
  console.log('✅ Notification type definitions created');

  // =========================================================================
  // 8. ACADEMIC CALENDAR — 3 different term systems
  // =========================================================================

  // Clean up existing academic years (idempotent re-run)
  await prisma.academicTerm.deleteMany({ where: { academic_year: { tenant_id: { in: [schoolA.id, schoolB.id, schoolC.id] } } } });
  await prisma.academicYear.deleteMany({ where: { tenant_id: { in: [schoolA.id, schoolB.id, schoolC.id] } } });

  // School A: Semester system
  const yearA = await prisma.academicYear.upsert({
    where: { id: 'year-school-a-00000000000000000001' },
    update: {},
    create: {
      id: 'year-school-a-00000000000000000001',
      tenant_id: schoolA.id,
      name: '2026-2027',
      start_date: new Date('2026-06-01'),
      end_date: new Date('2027-05-31'),
    },
  });
  // Delete existing terms and recreate (idempotent)
  await prisma.academicTerm.deleteMany({ where: { academic_year_id: yearA.id } });
  await prisma.academicTerm.createMany({
    data: [
      { academic_year_id: yearA.id, code: 'SEM1', name: 'Semester 1', start_date: new Date('2026-06-01'), end_date: new Date('2026-11-30'), term_type: 'semester', sort_order: 1 },
      { academic_year_id: yearA.id, code: 'SEM2', name: 'Semester 2', start_date: new Date('2026-12-01'), end_date: new Date('2027-05-31'), term_type: 'semester', sort_order: 2 },
    ],
  });

  // School B: Trimester system
  const yearB = await prisma.academicYear.upsert({
    where: { id: 'year-school-b-00000000000000000002' },
    update: {},
    create: {
      id: 'year-school-b-00000000000000000002',
      tenant_id: schoolB.id,
      name: '2026-2027',
      start_date: new Date('2026-06-01'),
      end_date: new Date('2027-05-31'),
    },
  });
  await prisma.academicTerm.deleteMany({ where: { academic_year_id: yearB.id } });
  await prisma.academicTerm.createMany({
    data: [
      { academic_year_id: yearB.id, code: 'TRI1', name: 'Trimester 1', start_date: new Date('2026-06-01'), end_date: new Date('2026-09-30'), term_type: 'trimester', sort_order: 1 },
      { academic_year_id: yearB.id, code: 'TRI2', name: 'Trimester 2', start_date: new Date('2026-10-01'), end_date: new Date('2027-01-31'), term_type: 'trimester', sort_order: 2 },
      { academic_year_id: yearB.id, code: 'TRI3', name: 'Trimester 3', start_date: new Date('2027-02-01'), end_date: new Date('2027-05-31'), term_type: 'trimester', sort_order: 3 },
    ],
  });

  // School C: Quarterly system
  const yearC = await prisma.academicYear.upsert({
    where: { id: 'year-school-c-00000000000000000003' },
    update: {},
    create: {
      id: 'year-school-c-00000000000000000003',
      tenant_id: schoolC.id,
      name: '2026-2027',
      start_date: new Date('2026-09-01'),
      end_date: new Date('2027-06-30'),
    },
  });
  await prisma.academicTerm.deleteMany({ where: { academic_year_id: yearC.id } });
  await prisma.academicTerm.createMany({
    data: [
      { academic_year_id: yearC.id, code: 'Q1', name: 'Quarter 1', start_date: new Date('2026-09-01'), end_date: new Date('2026-11-15'), term_type: 'quarter', sort_order: 1 },
      { academic_year_id: yearC.id, code: 'Q2', name: 'Quarter 2', start_date: new Date('2026-11-16'), end_date: new Date('2027-01-31'), term_type: 'quarter', sort_order: 2 },
      { academic_year_id: yearC.id, code: 'Q3', name: 'Quarter 3', start_date: new Date('2027-02-01'), end_date: new Date('2027-04-15'), term_type: 'quarter', sort_order: 3 },
      { academic_year_id: yearC.id, code: 'Q4', name: 'Quarter 4', start_date: new Date('2027-04-16'), end_date: new Date('2027-06-30'), term_type: 'quarter', sort_order: 4 },
    ],
  });
  console.log('✅ Academic calendars: School A (Semester), School B (Trimester), School C (Quarterly)');

  // =========================================================================
  // 9. GRADES — Standard K-12
  // =========================================================================
  const grades = [
    { code: 'KINDER', name: 'Kindergarten', sort_order: 0 },
    { code: 'GRADE-1', name: 'Grade 1', sort_order: 1 },
    { code: 'GRADE-2', name: 'Grade 2', sort_order: 2 },
    { code: 'GRADE-3', name: 'Grade 3', sort_order: 3 },
    { code: 'GRADE-4', name: 'Grade 4', sort_order: 4 },
    { code: 'GRADE-5', name: 'Grade 5', sort_order: 5 },
    { code: 'GRADE-6', name: 'Grade 6', sort_order: 6 },
    { code: 'GRADE-7', name: 'Grade 7', sort_order: 7 },
    { code: 'GRADE-8', name: 'Grade 8', sort_order: 8 },
    { code: 'GRADE-9', name: 'Grade 9', sort_order: 9 },
    { code: 'GRADE-10', name: 'Grade 10', sort_order: 10 },
    { code: 'GRADE-11', name: 'Grade 11', sort_order: 11 },
    { code: 'GRADE-12', name: 'Grade 12', sort_order: 12 },
  ];

  for (const tenant of [schoolA, schoolB, schoolC]) {
    for (const g of grades) {
      await prisma.grade.upsert({
        where: { tenant_id_code: { tenant_id: tenant.id, code: g.code } },
        update: {},
        create: { tenant_id: tenant.id, ...g },
      });
    }
  }
  console.log('✅ Grades created (K-12) for all schools');

  // =========================================================================
  // 10. SUBJECTS — Core + Electives
  // =========================================================================
  const subjects = [
    { code: 'MATH', name: 'Mathematics', is_core: true },
    { code: 'SCI', name: 'Science', is_core: true },
    { code: 'ENG', name: 'English', is_core: true },
    { code: 'HINDI', name: 'Hindi', is_core: false },
    { code: 'SST', name: 'Social Studies', is_core: true },
    { code: 'COMP', name: 'Computer Science', is_core: false },
    { code: 'ART', name: 'Art & Craft', is_core: false },
    { code: 'PE', name: 'Physical Education', is_core: false },
    { code: 'MUSIC', name: 'Music', is_core: false },
  ];

  for (const tenant of [schoolA, schoolB, schoolC]) {
    for (const s of subjects) {
      await prisma.subject.upsert({
        where: { tenant_id_code: { tenant_id: tenant.id, code: s.code } },
        update: {},
        create: { tenant_id: tenant.id, ...s },
      });
    }
  }
  console.log('✅ Subjects created for all schools');

  // =========================================================================
  // 11. CONFIG TEMPLATES — Pre-built templates (CBSE, ICSE, International)
  // =========================================================================

  // CBSE Template
  await prisma.configTemplate.upsert({
    where: { id: 'template-cbse-00000000000000000001' },
    update: {},
    create: {
      id: 'template-cbse-00000000000000000001',
      name: 'Default CBSE',
      description: 'Central Board of Secondary Education — standard Indian school config',
      schema_key: 'attendance.statuses',
      is_default: false,
      config_value: {
        mode: 'daily',
        attendance_formula: 'SUM(weight) / COUNT(statuses WHERE counts_toward_attendance)',
        correction_requires_approval: true,
        statuses: [
          { code: 'PRESENT', label: { en: 'Present', hi: 'उपस्थित' }, weight: 1.0, is_present: true, color: '#10B981' },
          { code: 'ABSENT', label: { en: 'Absent', hi: 'अनुपस्थित' }, weight: 0.0, is_present: false, color: '#EF4444' },
          { code: 'LATE', label: { en: 'Late', hi: 'देर से' }, weight: 0.5, is_present: true, color: '#F59E0B' },
        ],
      },
    },
  });

  // ICSE Template
  await prisma.configTemplate.upsert({
    where: { id: 'template-icse-00000000000000000002' },
    update: {},
    create: {
      id: 'template-icse-00000000000000000002',
      name: 'Default ICSE',
      description: 'Indian Certificate of Secondary Education — detailed tracking',
      schema_key: 'attendance.statuses',
      is_default: false,
      config_value: {
        mode: 'daily',
        attendance_formula: 'SUM(weight) / COUNT(statuses WHERE counts_toward_attendance)',
        correction_requires_approval: true,
        statuses: [
          { code: 'PRESENT', label: { en: 'Present' }, weight: 1.0, is_present: true, color: '#10B981' },
          { code: 'ABSENT', label: { en: 'Absent' }, weight: 0.0, is_present: false, color: '#EF4444' },
          { code: 'LATE', label: { en: 'Late' }, weight: 0.5, is_present: true, color: '#F59E0B' },
          { code: 'HALF_DAY', label: { en: 'Half Day' }, weight: 0.5, is_present: true, color: '#8B5CF6' },
          { code: 'MEDICAL', label: { en: 'Medical' }, weight: 1.0, is_present: true, color: '#EC4899' },
        ],
      },
    },
  });

  // International Template
  await prisma.configTemplate.upsert({
    where: { id: 'template-intl-00000000000000000003' },
    update: {},
    create: {
      id: 'template-intl-00000000000000000003',
      name: 'Default International',
      description: 'International school — period-based attendance, flexible grading',
      schema_key: 'attendance.statuses',
      is_default: false,
      config_value: {
        mode: 'period_based',
        attendance_formula: 'SUM(weight) / COUNT(statuses WHERE counts_toward_attendance)',
        correction_requires_approval: false,
        auto_mark_absent_after_hours: 24,
        statuses: [
          { code: 'PRESENT', label: { en: 'Present' }, weight: 1.0, is_present: true, color: '#10B981' },
          { code: 'ABSENT', label: { en: 'Absent' }, weight: 0.0, is_present: false, color: '#EF4444' },
          { code: 'LATE', label: { en: 'Late' }, weight: 0.7, is_present: true, color: '#F59E0B' },
          { code: 'EXCUSED', label: { en: 'Excused' }, weight: 1.0, is_present: true, color: '#6EE7B7' },
        ],
      },
    },
  });

  console.log('✅ Config templates: CBSE, ICSE, International');

  // =========================================================================
  // 12. CONFIGURATION ENGINE — Per-tenant grading scales
  // =========================================================================

  // School A: Grade Bands (A+ to F)
  await prisma.tenantConfig.upsert({
    where: { id: 'config-grading-a-0000000000000000001' },
    update: {},
    create: {
      id: 'config-grading-a-0000000000000000001',
      tenant_id: schoolA.id,
      schema_key: 'grading.scale',
      config_value: {
        type: 'grade_bands',
        bands: [
          { label: 'A+', min: 90, max: 100, grade_point: 4.0, color: '#10B981' },
          { label: 'A', min: 80, max: 89, grade_point: 3.6, color: '#34D399' },
          { label: 'B+', min: 70, max: 79, grade_point: 3.0, color: '#60A5FA' },
          { label: 'B', min: 60, max: 69, grade_point: 2.6, color: '#93C5FD' },
          { label: 'C+', min: 50, max: 59, grade_point: 2.0, color: '#FBBF24' },
          { label: 'C', min: 40, max: 49, grade_point: 1.6, color: '#FCD34D' },
          { label: 'D', min: 33, max: 39, grade_point: 1.0, color: '#F87171' },
          { label: 'F', min: 0, max: 32, grade_point: 0.0, color: '#EF4444' },
        ],
      },
      version: 1,
    },
  });

  // School B: Percentage-based
  await prisma.tenantConfig.upsert({
    where: { id: 'config-grading-b-0000000000000000002' },
    update: {},
    create: {
      id: 'config-grading-b-0000000000000000002',
      tenant_id: schoolB.id,
      schema_key: 'grading.scale',
      config_value: {
        type: 'percentage',
        pass_percentage: 35,
        distinction_percentage: 75,
      },
      version: 1,
    },
  });

  // School C: GPA-based (4.0 scale)
  await prisma.tenantConfig.upsert({
    where: { id: 'config-grading-c-0000000000000000003' },
    update: {},
    create: {
      id: 'config-grading-c-0000000000000000003',
      tenant_id: schoolC.id,
      schema_key: 'grading.scale',
      config_value: {
        type: 'gpa',
        scale: 4.0,
        bands: [
          { label: 'A+', min_gpa: 3.7, max_gpa: 4.0, color: '#10B981' },
          { label: 'A', min_gpa: 3.3, max_gpa: 3.69, color: '#34D399' },
          { label: 'B+', min_gpa: 3.0, max_gpa: 3.29, color: '#60A5FA' },
          { label: 'B', min_gpa: 2.7, max_gpa: 2.99, color: '#93C5FD' },
          { label: 'C+', min_gpa: 2.3, max_gpa: 2.69, color: '#FBBF24' },
          { label: 'C', min_gpa: 2.0, max_gpa: 2.29, color: '#FCD34D' },
          { label: 'D', min_gpa: 1.0, max_gpa: 1.99, color: '#F87171' },
          { label: 'F', min_gpa: 0.0, max_gpa: 0.99, color: '#EF4444' },
        ],
      },
      version: 1,
    },
  });

  console.log('✅ Grading configs: School A (Grade Bands), School B (Percentage), School C (GPA)\n');

  // =========================================================================
  // 13. WORKFLOWS — 3 different leave approval chains
  // =========================================================================

  // Clean up existing workflows (idempotent re-run)
  await prisma.workflowTransition.deleteMany({ where: { workflow: { tenant_id: { in: [schoolA.id, schoolB.id, schoolC.id] } } } });
  await prisma.workflowState.deleteMany({ where: { workflow: { tenant_id: { in: [schoolA.id, schoolB.id, schoolC.id] } } } });
  await prisma.workflowInstance.deleteMany({ where: { tenant_id: { in: [schoolA.id, schoolB.id, schoolC.id] } } });
  await prisma.workflowDefinition.deleteMany({ where: { tenant_id: { in: [schoolA.id, schoolB.id, schoolC.id] } } });

  // School A: Teacher → Principal (2-step)
  const wfA = await prisma.workflowDefinition.create({
    data: {
      tenant_id: schoolA.id,
      code: 'leave_approval',
      name: 'Leave Approval',
      description: 'Teacher to Principal — 2-step approval',
      states: {
        create: [
          { code: 'PENDING', name: 'Pending', is_initial: true, sort_order: 1 },
          { code: 'WITH_TEACHER', name: 'With Class Teacher', sort_order: 2 },
          { code: 'WITH_PRINCIPAL', name: 'With Principal', sort_order: 3 },
          { code: 'APPROVED', name: 'Approved', is_final: true, color: '#10B981', sort_order: 4 },
          { code: 'REJECTED', name: 'Rejected', is_final: true, color: '#EF4444', sort_order: 5 },
          { code: 'CANCELLED', name: 'Cancelled', is_final: true, color: '#6B7280', sort_order: 6 },
        ],
      },
    },
    include: { states: true },
  });

  // Map states for transitions
  const aStates: Record<string, string> = {};
  wfA.states.forEach(s => { aStates[s.code] = s.id; });

  await prisma.workflowTransition.createMany({
    data: [
      { workflow_id: wfA.id, from_state_id: aStates.PENDING, to_state_id: aStates.WITH_TEACHER, name: 'Submit', actor_roles: ['PARENT'], actor_type: 'role', sort_order: 1 },
      { workflow_id: wfA.id, from_state_id: aStates.WITH_TEACHER, to_state_id: aStates.WITH_PRINCIPAL, name: 'Forward to Principal', actor_roles: ['TEACHER'], actor_type: 'role', sort_order: 2 },
      { workflow_id: wfA.id, from_state_id: aStates.WITH_PRINCIPAL, to_state_id: aStates.APPROVED, name: 'Approve', actor_roles: ['PRINCIPAL'], actor_type: 'role', sort_order: 3 },
      { workflow_id: wfA.id, from_state_id: aStates.WITH_TEACHER, to_state_id: aStates.REJECTED, name: 'Reject', actor_roles: ['TEACHER'], actor_type: 'role', sort_order: 4 },
      { workflow_id: wfA.id, from_state_id: aStates.WITH_PRINCIPAL, to_state_id: aStates.REJECTED, name: 'Reject', actor_roles: ['PRINCIPAL'], actor_type: 'role', sort_order: 5 },
      { workflow_id: wfA.id, from_state_id: aStates.PENDING, to_state_id: aStates.CANCELLED, name: 'Cancel', actor_roles: ['PARENT'], actor_type: 'role', conditions: { not_states: ['APPROVED', 'REJECTED'] }, sort_order: 6 },
    ],
  });

  // School B: Teacher → Coordinator → Principal (3-step)
  const wfB = await prisma.workflowDefinition.create({
    data: {
      tenant_id: schoolB.id,
      code: 'leave_approval',
      name: 'Leave Approval',
      description: 'Teacher → Coordinator → Principal — 3-step approval',
      states: {
        create: [
          { code: 'PENDING', name: 'Pending', is_initial: true, sort_order: 1 },
          { code: 'WITH_TEACHER', name: 'With Class Teacher', sort_order: 2 },
          { code: 'WITH_COORDINATOR', name: 'With Coordinator', sort_order: 3 },
          { code: 'WITH_PRINCIPAL', name: 'With Principal', sort_order: 4 },
          { code: 'APPROVED', name: 'Approved', is_final: true, color: '#10B981', sort_order: 5 },
          { code: 'REJECTED', name: 'Rejected', is_final: true, color: '#EF4444', sort_order: 6 },
          { code: 'CANCELLED', name: 'Cancelled', is_final: true, color: '#6B7280', sort_order: 7 },
        ],
      },
    },
    include: { states: true },
  });

  const bStates: Record<string, string> = {};
  wfB.states.forEach(s => { bStates[s.code] = s.id; });

  await prisma.workflowTransition.createMany({
    data: [
      { workflow_id: wfB.id, from_state_id: bStates.PENDING, to_state_id: bStates.WITH_TEACHER, name: 'Submit', actor_roles: ['PARENT'], actor_type: 'role', sort_order: 1 },
      { workflow_id: wfB.id, from_state_id: bStates.WITH_TEACHER, to_state_id: bStates.WITH_COORDINATOR, name: 'Forward to Coordinator', actor_roles: ['TEACHER'], actor_type: 'role', sort_order: 2 },
      { workflow_id: wfB.id, from_state_id: bStates.WITH_COORDINATOR, to_state_id: bStates.WITH_PRINCIPAL, name: 'Forward to Principal', actor_roles: ['COORDINATOR'], actor_type: 'role', sort_order: 3 },
      { workflow_id: wfB.id, from_state_id: bStates.WITH_PRINCIPAL, to_state_id: bStates.APPROVED, name: 'Approve', actor_roles: ['PRINCIPAL'], actor_type: 'role', sort_order: 4 },
      { workflow_id: wfB.id, from_state_id: bStates.WITH_TEACHER, to_state_id: bStates.REJECTED, name: 'Reject', actor_roles: ['TEACHER', 'COORDINATOR'], actor_type: 'role', sort_order: 5 },
      { workflow_id: wfB.id, from_state_id: bStates.WITH_PRINCIPAL, to_state_id: bStates.REJECTED, name: 'Reject', actor_roles: ['PRINCIPAL'], actor_type: 'role', sort_order: 6 },
    ],
  });

  // School C: Conditional (≤3 days skip coordinator)
  const wfC = await prisma.workflowDefinition.create({
    data: {
      tenant_id: schoolC.id,
      code: 'leave_approval',
      name: 'Leave Approval',
      description: 'Conditional — skip Coordinator if leave ≤3 days',
      states: {
        create: [
          { code: 'PENDING', name: 'Pending', is_initial: true, sort_order: 1 },
          { code: 'WITH_TEACHER', name: 'With Class Teacher', sort_order: 2 },
          { code: 'WITH_COORDINATOR', name: 'With Coordinator', sort_order: 3 },
          { code: 'WITH_PRINCIPAL', name: 'With Principal', sort_order: 4 },
          { code: 'APPROVED', name: 'Approved', is_final: true, color: '#10B981', sort_order: 5 },
          { code: 'REJECTED', name: 'Rejected', is_final: true, color: '#EF4444', sort_order: 6 },
          { code: 'CANCELLED', name: 'Cancelled', is_final: true, color: '#6B7280', sort_order: 7 },
        ],
      },
    },
    include: { states: true },
  });

  const cStates: Record<string, string> = {};
  wfC.states.forEach(s => { cStates[s.code] = s.id; });

  await prisma.workflowTransition.createMany({
    data: [
      { workflow_id: wfC.id, from_state_id: cStates.PENDING, to_state_id: cStates.WITH_TEACHER, name: 'Submit', actor_roles: ['PARENT'], actor_type: 'role', sort_order: 1 },
      // Short leave: Teacher → Principal directly (condition: leave_days ≤ 3)
      { workflow_id: wfC.id, from_state_id: cStates.WITH_TEACHER, to_state_id: cStates.WITH_PRINCIPAL, name: 'Forward to Principal (Short Leave)', actor_roles: ['TEACHER'], actor_type: 'role', conditions: { context_leave_days_lte: 3 }, sort_order: 2 },
      // Long leave: Teacher → Coordinator (condition: leave_days > 3)
      { workflow_id: wfC.id, from_state_id: cStates.WITH_TEACHER, to_state_id: cStates.WITH_COORDINATOR, name: 'Forward to Coordinator (Long Leave)', actor_roles: ['TEACHER'], actor_type: 'role', conditions: { context_leave_days_gt: 3 }, sort_order: 3 },
      { workflow_id: wfC.id, from_state_id: cStates.WITH_COORDINATOR, to_state_id: cStates.WITH_PRINCIPAL, name: 'Forward to Principal', actor_roles: ['COORDINATOR'], actor_type: 'role', sort_order: 4 },
      { workflow_id: wfC.id, from_state_id: cStates.WITH_PRINCIPAL, to_state_id: cStates.APPROVED, name: 'Approve', actor_roles: ['PRINCIPAL'], actor_type: 'role', sort_order: 5 },
    ],
  });

  console.log('✅ Workflows: School A (2-step), School B (3-step), School C (conditional)');

  // =========================================================================
  // 14. RULE SETS — Grading, Attendance, Promotion rules per school
  // =========================================================================

  // Clean up existing rules (idempotent re-run)
  await prisma.rule.deleteMany({ where: { ruleSet: { tenant_id: { in: [schoolA.id, schoolB.id, schoolC.id] } } } });
  await prisma.ruleSet.deleteMany({ where: { tenant_id: { in: [schoolA.id, schoolB.id, schoolC.id] } } });

  // --- School A: Grade Bands rule ---
  const rsGradingA = await prisma.ruleSet.create({
    data: {
      tenant_id: schoolA.id,
      code: 'grading.convert_score',
      name: 'Grade Bands Conversion',
      description: 'Convert numeric score to grade band (A+ to F)',
    },
  });
  await prisma.rule.createMany({
    data: [
      {
        rule_set_id: rsGradingA.id, priority: 1, name: 'Score → Grade Band',
        condition: { always: true },
        action: {
          type: 'GRADE_BAND_MATCH',
          bands_source: 'tenant_config:grading.scale.bands',
          input_score: '{{score}}',
          output_grade_field: 'grade',
          output_grade_point_field: 'grade_point',
          fallback: { grade: 'N/A', grade_point: 0 },
        },
      },
    ],
  });

  // --- School B: Percentage rule ---
  const rsGradingB = await prisma.ruleSet.create({
    data: {
      tenant_id: schoolB.id,
      code: 'grading.convert_score',
      name: 'Percentage Conversion',
      description: 'Convert score to percentage and assign distinction/pass/fail',
    },
  });
  await prisma.rule.createMany({
    data: [
      {
        rule_set_id: rsGradingB.id, priority: 1, name: 'Score → Percentage',
        condition: { always: true },
        action: {
          type: 'PERCENTAGE_CALC',
          score_input: '{{score}}',
          max_score_input: '{{max_score}}',
          distinction_threshold: 'tenant_config:grading.scale.distinction_percentage',
          pass_threshold: 'tenant_config:grading.scale.pass_percentage',
          output_percentage_field: 'grade',
          output_grade_point_field: 'grade_point',
        },
      },
    ],
  });

  // --- School C: GPA rule ---
  const rsGradingC = await prisma.ruleSet.create({
    data: {
      tenant_id: schoolC.id,
      code: 'grading.convert_score',
      name: 'GPA Conversion',
      description: 'Map grade points to GPA letter grades',
    },
  });
  await prisma.rule.createMany({
    data: [
      {
        rule_set_id: rsGradingC.id, priority: 1, name: 'Grade Point → GPA Band',
        condition: { always: true },
        action: {
          type: 'GPA_BAND_MATCH',
          bands_source: 'tenant_config:grading.scale.bands',
          input_grade_point: '{{grade_point}}',
          output_grade_field: 'grade',
          output_grade_point_field: 'grade_point',
        },
      },
    ],
  });

  // --- All Schools: Attendance Rate Calculation ---
  for (const tenant of [schoolA, schoolB, schoolC]) {
    const rs = await prisma.ruleSet.create({
      data: {
        tenant_id: tenant.id,
        code: 'attendance.calculate_rate',
        name: 'Attendance Rate Calculation',
        description: 'Weighted attendance rate from status records',
      },
    });
    await prisma.rule.createMany({
      data: [
        {
          rule_set_id: rs.id, priority: 1, name: 'Weighted Rate',
          condition: { records_count_gt: 0 },
          action: {
            type: 'WEIGHTED_AVERAGE',
            weight_field: 'weight',
            records_input: '{{records}}',
            output_field: 'rate',
          },
        },
        {
          rule_set_id: rs.id, priority: 99, name: 'No Records Fallback',
          condition: { records_count_eq: 0 },
          action: { type: 'CONSTANT', value: 0, output_field: 'rate' },
        },
      ],
    });
  }

  // --- All Schools: Promotion Eligibility ---
  for (const tenant of [schoolA, schoolB, schoolC]) {
    const rs = await prisma.ruleSet.create({
      data: {
        tenant_id: tenant.id,
        code: 'promotion.eligibility',
        name: 'Promotion Eligibility',
        description: 'Check if student meets promotion criteria',
      },
    });
    await prisma.rule.createMany({
      data: [
        {
          rule_set_id: rs.id, priority: 1, name: 'Minimum Attendance Check',
          condition: { field: 'attendance_rate', operator: 'lt', value: 75 },
          action: { type: 'RESULT', eligible: false, reason: 'Attendance below 75%' },
        },
        {
          rule_set_id: rs.id, priority: 2, name: 'Minimum GPA Check',
          condition: { field: 'gpa', operator: 'lt', value: 2.0 },
          action: { type: 'RESULT', eligible: false, reason: 'GPA below 2.0' },
        },
        {
          rule_set_id: rs.id, priority: 99, name: 'Default Eligible',
          condition: { always: true },
          action: { type: 'RESULT', eligible: true, reason: 'Meets all criteria' },
        },
      ],
    });
  }
  console.log('✅ Rule sets: grading.convert_score (3 school variants), attendance.calculate_rate, promotion.eligibility');

  // =========================================================================
  // 15. ATTENDANCE CORRECTION WORKFLOW — All 3 schools
  // =========================================================================
  for (const tenant of [schoolA, schoolB, schoolC]) {
    const wfCorr = await prisma.workflowDefinition.create({
      data: {
        tenant_id: tenant.id,
        code: 'attendance_correction',
        name: 'Attendance Correction',
        description: 'Teacher requests correction → Principal approves/rejects',
        states: {
          create: [
            { code: 'PENDING', name: 'Pending Review', is_initial: true, sort_order: 1 },
            { code: 'WITH_PRINCIPAL', name: 'With Principal', sort_order: 2 },
            { code: 'APPROVED', name: 'Approved', is_final: true, color: '#10B981', sort_order: 3 },
            { code: 'REJECTED', name: 'Rejected', is_final: true, color: '#EF4444', sort_order: 4 },
          ],
        },
      },
      include: { states: true },
    });

    const corrStates: Record<string, string> = {};
    wfCorr.states.forEach(s => { corrStates[s.code] = s.id; });

    await prisma.workflowTransition.createMany({
      data: [
        { workflow_id: wfCorr.id, from_state_id: corrStates.PENDING, to_state_id: corrStates.WITH_PRINCIPAL, name: 'Request Correction', actor_roles: ['TEACHER'], actor_type: 'role', sort_order: 1 },
        { workflow_id: wfCorr.id, from_state_id: corrStates.WITH_PRINCIPAL, to_state_id: corrStates.APPROVED, name: 'Approve', actor_roles: ['PRINCIPAL'], actor_type: 'role', sort_order: 2 },
        { workflow_id: wfCorr.id, from_state_id: corrStates.WITH_PRINCIPAL, to_state_id: corrStates.REJECTED, name: 'Reject', actor_roles: ['PRINCIPAL'], actor_type: 'role', sort_order: 3 },
      ],
    });
  }
  console.log('✅ Attendance correction workflow created for all 3 schools');

  // =========================================================================
  // 16. CONFIG SCHEMAS — Define the valid configuration schemas
  // =========================================================================
  const configSchemas = [
    {
      schema_key: 'attendance.statuses',
      name: 'Attendance Statuses',
      description: 'Per-school attendance status definitions',
      json_schema: { type: 'object', properties: { mode: { enum: ['daily', 'period_based'] }, statuses: { type: 'array' } } },
    },
    {
      schema_key: 'grading.scale',
      name: 'Grading Scale',
      description: 'Per-school grading scale definition',
      json_schema: { type: 'object', properties: { type: { enum: ['grade_bands', 'percentage', 'gpa', 'rubric'] }, bands: { type: 'array' } } },
    },
    {
      schema_key: 'academic.calendar',
      name: 'Academic Calendar Settings',
      description: 'Per-school calendar configuration',
      json_schema: { type: 'object', properties: { term_system: { enum: ['semester', 'trimester', 'quarter', 'custom'] } } },
    },
  ];

  for (const schema of configSchemas) {
    await prisma.configSchema.upsert({
      where: { schema_key: schema.schema_key },
      update: {},
      create: schema,
    });
  }
  console.log('✅ Config schemas registered: attendance.statuses, grading.scale, academic.calendar');

  // =========================================================================
  // 15. PERMISSIONS — Full RBAC matrix
  // =========================================================================
  const permissions = [
    // Attendance
    { code: 'attendance:view', name: 'View Attendance', group_name: 'Attendance' },
    { code: 'attendance:mark', name: 'Mark Attendance', group_name: 'Attendance' },
    { code: 'attendance:correct', name: 'Correct Attendance', group_name: 'Attendance' },
    { code: 'attendance:export', name: 'Export Attendance', group_name: 'Attendance' },
    // Homework
    { code: 'homework:create', name: 'Create Homework', group_name: 'Homework' },
    { code: 'homework:edit', name: 'Edit Homework', group_name: 'Homework' },
    { code: 'homework:delete', name: 'Delete Homework', group_name: 'Homework' },
    { code: 'homework:view', name: 'View Homework', group_name: 'Homework' },
    { code: 'homework:submit', name: 'Submit Homework', group_name: 'Homework' },
    { code: 'homework:grade', name: 'Grade Homework', group_name: 'Homework' },
    { code: 'homework:ai-generate', name: 'AI Generate Homework', group_name: 'Homework' },
    // Exams
    { code: 'exam:create', name: 'Create Exam', group_name: 'Exam' },
    { code: 'exam:edit', name: 'Edit Exam', group_name: 'Exam' },
    { code: 'exam:delete', name: 'Delete Exam', group_name: 'Exam' },
    { code: 'exam:enter-scores', name: 'Enter Exam Scores', group_name: 'Exam' },
    { code: 'exam:view', name: 'View Exams', group_name: 'Exam' },
    // Leave
    { code: 'leave:apply', name: 'Apply Leave', group_name: 'Leave' },
    { code: 'leave:approve', name: 'Approve Leave', group_name: 'Leave' },
    { code: 'leave:view', name: 'View Leave', group_name: 'Leave' },
    // Students
    { code: 'student:view', name: 'View Students', group_name: 'Student' },
    { code: 'student:manage', name: 'Manage Students', group_name: 'Student' },
    // Subjects
    { code: 'subject:manage', name: 'Manage Subjects', group_name: 'Subject' },
    // Reports
    { code: 'report:view', name: 'View Reports', group_name: 'Report' },
    { code: 'report:export', name: 'Export Reports', group_name: 'Report' },
    // Admin
    { code: 'admin:settings', name: 'Manage Settings', group_name: 'Admin' },
    { code: 'admin:permissions', name: 'Manage Permissions', group_name: 'Admin' },
    { code: 'admin:users', name: 'Manage Users', group_name: 'Admin' },
    // Tenant
    { code: 'tenant:manage', name: 'Manage Tenant', group_name: 'Tenant' },
    // Engine operations
    { code: 'config:read', name: 'Read Config', group_name: 'Engine' },
    { code: 'config:write', name: 'Write Config', group_name: 'Engine' },
    { code: 'rules:read', name: 'Read Rules', group_name: 'Engine' },
    { code: 'rules:write', name: 'Write Rules', group_name: 'Engine' },
    { code: 'workflow:read', name: 'Read Workflows', group_name: 'Engine' },
    { code: 'workflow:write', name: 'Write Workflows', group_name: 'Engine' },
    { code: 'metadata:read', name: 'Read Metadata', group_name: 'Engine' },
    { code: 'metadata:write', name: 'Write Metadata', group_name: 'Engine' },
    { code: 'template:read', name: 'Read Templates', group_name: 'Engine' },
    { code: 'template:write', name: 'Write Templates', group_name: 'Engine' },
  ];

  const permMap: Record<string, string> = {};
  for (const p of permissions) {
    const perm = await prisma.permission.upsert({
      where: { code: p.code },
      update: {},
      create: p,
    });
    permMap[p.code] = perm.id;
  }
  console.log(`✅ ${permissions.length} permissions created`);

  // =========================================================================
  // 16. ROLE PERMISSIONS — Assign permissions to roles
  // =========================================================================
  const rolePermissions: { role: UserRole; permissions: string[] }[] = [
    {
      role: UserRole.SUPER_ADMIN,
      permissions: permissions.map(p => p.code),
    },
    {
      role: UserRole.ADMIN,
      permissions: permissions.map(p => p.code).filter(c => c !== 'tenant:manage'),
    },
    {
      role: UserRole.PRINCIPAL,
      permissions: [
        'attendance:view', 'attendance:mark', 'attendance:correct', 'attendance:export',
        'homework:create', 'homework:edit', 'homework:view', 'homework:grade', 'homework:ai-generate',
        'exam:create', 'exam:edit', 'exam:enter-scores', 'exam:view',
        'leave:apply', 'leave:approve', 'leave:view',
        'student:view', 'report:view', 'report:export',
        'config:read', 'rules:read', 'workflow:read', 'workflow:write',
        'metadata:read', 'template:read',
      ],
    },
    {
      role: UserRole.TEACHER,
      permissions: [
        'attendance:view', 'attendance:mark', 'attendance:correct',
        'homework:create', 'homework:edit', 'homework:view', 'homework:grade', 'homework:return', 'homework:ai-generate',
        'exam:create', 'exam:edit', 'exam:enter-scores', 'exam:view',
        'leave:apply', 'leave:approve', 'leave:view',
        'student:view', 'report:view',
        'config:read', 'workflow:read',
      ],
    },
    {
      role: UserRole.PARENT,
      permissions: [
        'attendance:view', 'homework:view', 'exam:view',
        'leave:apply', 'leave:view', 'student:view',
      ],
    },
    {
      role: UserRole.STUDENT,
      permissions: [
        'attendance:view', 'homework:view', 'homework:submit', 'exam:view',
      ],
    },
    {
      role: UserRole.COUNSELOR,
      permissions: [
        'attendance:view', 'homework:view', 'exam:view', 'leave:view',
        'student:view', 'report:view',
      ],
    },
  ];

  for (const rp of rolePermissions) {
    for (const permCode of rp.permissions) {
      const permId = permMap[permCode];
      if (permId) {
        await prisma.rolePermission.upsert({
          where: { role_permission_id: { role: rp.role, permission_id: permId } },
          update: {},
          create: { role: rp.role, permission_id: permId },
        });
      }
    }
  }
  console.log('✅ Role-permission mappings created\n');

  console.log('🎉 Seed complete!');
  console.log('   School A (CBSE): 3 attendance statuses, Grade Bands, Semester, 2-step approval');
  console.log('   School B (ICSE): 5 attendance statuses, Percentage, Trimester, 3-step approval');
  console.log('   School C (Intl): 4 attendance statuses, GPA, Quarterly, Conditional approval');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
