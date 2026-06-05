// ============================================================================
// EduTech — RBAC Permission Seed
// Phase 1: Seed all 36 permissions and 8 role-permission mappings
// ============================================================================
// Run: npx ts-node prisma/seed-rbac.ts
// ============================================================================

import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

// ==========================================================================
// Permission Definitions (36 permissions from 06-auth-spec.md)
// ==========================================================================

const PERMISSIONS = [
  // --- Attendance ---
  { code: 'attendance:view',   name: 'View Attendance',   group: 'attendance' },
  { code: 'attendance:mark',   name: 'Mark Attendance',   group: 'attendance' },
  { code: 'attendance:correct',name: 'Correct Attendance', group: 'attendance' },
  { code: 'attendance:export', name: 'Export Attendance', group: 'attendance' },

  // --- Homework ---
  { code: 'homework:create',    name: 'Create Homework',    group: 'homework' },
  { code: 'homework:edit',      name: 'Edit Homework',      group: 'homework' },
  { code: 'homework:delete',    name: 'Delete Homework',    group: 'homework' },
  { code: 'homework:view',      name: 'View Homework',      group: 'homework' },
  { code: 'homework:submit',    name: 'Submit Homework',    group: 'homework' },
  { code: 'homework:grade',     name: 'Grade Homework',     group: 'homework' },
  { code: 'homework:return',    name: 'Return Homework',    group: 'homework' },
  { code: 'homework:ai-generate', name: 'AI Generate Homework', group: 'homework' },

  // --- Exam ---
  { code: 'exam:create',        name: 'Create Exam',        group: 'exam' },
  { code: 'exam:edit',          name: 'Edit Exam',          group: 'exam' },
  { code: 'exam:delete',        name: 'Delete Exam',        group: 'exam' },
  { code: 'exam:enter-scores',  name: 'Enter Scores',       group: 'exam' },
  { code: 'exam:view',          name: 'View Exam',          group: 'exam' },

  // --- Leave ---
  { code: 'leave:apply',        name: 'Apply Leave',        group: 'leave' },
  { code: 'leave:approve',      name: 'Approve Leave',      group: 'leave' },
  { code: 'leave:view',         name: 'View Leave',         group: 'leave' },

  // --- Student ---
  { code: 'student:view',       name: 'View Student',       group: 'student' },
  { code: 'student:manage',     name: 'Manage Student',     group: 'student' },

  // --- Subject ---
  { code: 'subject:manage',     name: 'Manage Subjects',    group: 'subject' },

  // --- Reports ---
  { code: 'report:view',        name: 'View Reports',       group: 'report' },
  { code: 'report:export',      name: 'Export Reports',     group: 'report' },

  // --- Admin ---
  { code: 'admin:settings',     name: 'Admin Settings',     group: 'admin' },
  { code: 'admin:permissions',  name: 'Manage Permissions', group: 'admin' },
  { code: 'admin:users',        name: 'Manage Users',       group: 'admin' },

  // --- Tenant ---
  { code: 'tenant:manage',      name: 'Manage Tenants',     group: 'tenant' },

  // --- Config ---
  { code: 'config:read',        name: 'Read Config',        group: 'config' },
  { code: 'config:write',       name: 'Write Config',       group: 'config' },

  // --- Rules ---
  { code: 'rules:read',         name: 'Read Rules',         group: 'rules' },
  { code: 'rules:write',        name: 'Write Rules',        group: 'rules' },

  // --- Workflow ---
  { code: 'workflow:read',      name: 'Read Workflow',      group: 'workflow' },
  { code: 'workflow:write',     name: 'Write Workflow',     group: 'workflow' },

  // --- Metadata ---
  { code: 'metadata:read',      name: 'Read Metadata',      group: 'metadata' },
  { code: 'metadata:write',     name: 'Write Metadata',     group: 'metadata' },

  // --- Template ---
  { code: 'template:read',      name: 'Read Template',      group: 'template' },
  { code: 'template:write',     name: 'Write Template',     group: 'template' },
];

// ==========================================================================
// Role-Permission Mappings (from 06-auth-spec.md permission matrix)
// Each role inherits all permissions listed.
// ==========================================================================

type RolePermMap = Record<string, string[]>;

const ROLE_PERMISSIONS: RolePermMap = {
  SUPER_ADMIN: [
    'attendance:view', 'attendance:mark', 'attendance:correct', 'attendance:export',
    'homework:create', 'homework:edit', 'homework:delete', 'homework:view',
    'homework:grade', 'homework:return', 'homework:ai-generate',
    'exam:create', 'exam:edit', 'exam:delete', 'exam:enter-scores', 'exam:view',
    'leave:apply', 'leave:approve', 'leave:view',
    'student:view', 'student:manage',
    'subject:manage',
    'report:view', 'report:export',
    'admin:settings', 'admin:permissions', 'admin:users',
    'tenant:manage',
    'config:read', 'config:write',
    'rules:read', 'rules:write',
    'workflow:read', 'workflow:write',
    'metadata:read', 'metadata:write',
    'template:read', 'template:write',
  ],
  ADMIN: [
    'attendance:view', 'attendance:mark', 'attendance:correct', 'attendance:export',
    'homework:create', 'homework:edit', 'homework:delete', 'homework:view',
    'homework:grade', 'homework:return', 'homework:ai-generate',
    'exam:create', 'exam:edit', 'exam:enter-scores', 'exam:view',
    'leave:apply', 'leave:approve', 'leave:view',
    'student:view', 'student:manage',
    'subject:manage',
    'report:view', 'report:export',
    'admin:settings', 'admin:permissions', 'admin:users',
    'config:read', 'config:write',
    'rules:read', 'rules:write',
    'workflow:read', 'workflow:write',
    'metadata:read', 'metadata:write',
    'template:read', 'template:write',
  ],
  PRINCIPAL: [
    'attendance:view', 'attendance:mark', 'attendance:correct', 'attendance:export',
    'homework:create', 'homework:edit', 'homework:view',
    'homework:grade', 'homework:return', 'homework:ai-generate',
    'exam:create', 'exam:edit', 'exam:enter-scores', 'exam:view',
    'leave:apply', 'leave:approve', 'leave:view',
    'student:view',
    'report:view', 'report:export',
    'config:read',
    'rules:read',
    'workflow:read', 'workflow:write',
    'metadata:read',
    'template:read',
  ],
  TEACHER: [
    'attendance:view', 'attendance:mark', 'attendance:correct',
    'homework:create', 'homework:edit', 'homework:view',
    'homework:grade', 'homework:return', 'homework:ai-generate',
    'exam:create', 'exam:edit', 'exam:enter-scores', 'exam:view',
    'leave:apply', 'leave:approve', 'leave:view',
    'student:view',
    'report:view', 'report:export',
    'config:read',
    'workflow:read',
  ],
  PARENT: [
    'attendance:view',
    'homework:view',
    'exam:view',
    'leave:apply', 'leave:view',
    'student:view',
  ],
  STUDENT: [
    'attendance:view',
    'homework:view', 'homework:submit',
    'exam:view',
  ],
  STAFF: [
    'attendance:view',
    'homework:view',
    'leave:apply',
  ],
  COUNSELOR: [
    'attendance:view',
    'homework:view',
    'exam:view',
    'leave:apply', 'leave:view',
    'student:view',
    'report:view',
  ],
};

// ==========================================================================
// Main
// ==========================================================================

async function main() {
  console.log('🔐 Seeding RBAC permissions...\n');

  // 1. Upsert all permissions
  console.log(`Seeding ${PERMISSIONS.length} permissions...`);
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: p.code },
      create: { code: p.code, name: p.name, group_name: p.group },
      update: { name: p.name, group_name: p.group },
    });
  }
  console.log('✅ Permissions seeded\n');

  // 2. Upsert role-permission mappings
  console.log('Seeding role-permission mappings...');
  const roles = Object.keys(ROLE_PERMISSIONS) as UserRole[];
  let totalMappings = 0;

  for (const role of roles) {
    const permCodes = ROLE_PERMISSIONS[role];
    for (const code of permCodes) {
      const permission = await prisma.permission.findUnique({ where: { code } });
      if (!permission) {
        console.warn(`⚠️  Permission ${code} not found — skipping`);
        continue;
      }
      await prisma.rolePermission.upsert({
        where: { role_permission_id: { role, permission_id: permission.id } },
        create: { role, permission_id: permission.id },
        update: {},
      });
      totalMappings++;
    }
    console.log(`  ${role}: ${permCodes.length} permissions`);
  }
  console.log(`✅ ${totalMappings} role-permission mappings seeded\n`);

  // 3. Log summary
  const permCount = await prisma.permission.count();
  const rolePermCount = await prisma.rolePermission.count();
  console.log('📊 RBAC Summary:');
  console.log(`   Permissions: ${permCount}`);
  console.log(`   Role-Permission Mappings: ${rolePermCount}`);
  console.log(`   Roles: ${roles.length}`);
  console.log('\n✅ RBAC seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
