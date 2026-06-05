// ============================================================================
// Phase 1 Seed — Grading Rules & Default Configurations
// ============================================================================
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Phase 1 seed — Grading Rules...\n');

  const tenants = await prisma.tenant.findMany({ where: { is_active: true } });

  for (const tenant of tenants) {
    const config = await prisma.tenantConfig.findFirst({
      where: { tenant_id: tenant.id, schema_key: 'grading.scale', is_active: true },
    });
    if (!config) continue;

    const scale = config.config_value as any;
    console.log(`  ${tenant.slug}: grading type = ${scale.type}`);

    // Delete existing grading rules for clean seed
    const existing = await prisma.ruleSet.findFirst({
      where: { tenant_id: tenant.id, code: 'grading.convert_score', is_active: true },
    });
    if (existing) {
      await prisma.rule.deleteMany({ where: { rule_set_id: existing.id } });
    }

    // Create rule set
    const ruleSet = await prisma.ruleSet.upsert({
      where: { tenant_id_code_version: { tenant_id: tenant.id, code: 'grading.convert_score', version: 1 } },
      update: { name: 'Convert Score to Grade', is_active: true },
      create: { tenant_id: tenant.id, code: 'grading.convert_score', name: 'Convert Score to Grade', version: 1 },
    });

    if (scale.type === 'grade_bands') {
      // School A: Grade bands (A+ to F)
      const rules = (scale.bands || []).map((band: any, i: number) => ({
        rule_set_id: ruleSet.id,
        priority: i + 1,
        name: `${band.label} Grade`,
        condition: i < (scale.bands || []).length - 1
          ? { operator: 'AND', conditions: [{ field: 'score', operator: 'gte', value: band.min }, { field: 'score', operator: 'lte', value: band.max }] }
          : { operator: 'always' },
        action: { type: 'assign_grade', params: { grade: band.label, grade_point: band.grade_point } },
      }));
      await prisma.rule.createMany({ data: rules });
      console.log(`    → Created ${rules.length} grade band rules`);
    } else if (scale.type === 'percentage') {
      // School B: Percentage-based (just return percentage)
      await prisma.rule.create({
        data: {
          rule_set_id: ruleSet.id, priority: 1, name: 'Calculate Percentage',
          condition: { operator: 'always' },
          action: { type: 'calculate_formula', params: { formula: "ROUND(('score' / 'max_score') * 100, 2)" } },
        },
      });
      console.log('    → Created percentage calculation rule');
    } else if (scale.type === 'gpa') {
      // School C: GPA — convert to grade point then display
      const rules = (scale.bands || []).map((band: any, i: number) => ({
        rule_set_id: ruleSet.id,
        priority: i + 1,
        name: `GPA ${band.label}`,
        condition: i < (scale.bands || []).length - 1
          ? { operator: 'AND', conditions: [{ field: 'score', operator: 'gte', value: band.min_gpa * 25 }, { field: 'score', operator: 'lte', value: band.max_gpa * 25 }] }
          : { operator: 'always' },
        action: { type: 'assign_grade', params: { grade: band.label, grade_point: ((band.min_gpa + band.max_gpa) / 2) } },
      }));
      await prisma.rule.createMany({ data: rules });
      console.log(`    → Created ${rules.length} GPA band rules`);
    }
  }

  // Verify workflows exist for leave
  console.log('\n📋 Verifying leave workflows...');
  for (const tenant of tenants) {
    const wf = await prisma.workflowDefinition.findFirst({
      where: { tenant_id: tenant.id, code: 'leave_approval', is_active: true },
    });
    console.log(`  ${tenant.slug}: leave_approval ${wf ? '✅ found' : '❌ NOT FOUND'}`);
  }

  console.log('\n✅ Phase 1 seed complete');
}

main().then(async () => {
  await prisma.$disconnect();
}).catch(async (e) => {
  console.error('❌', e);
  await prisma.$disconnect();
  process.exit(1);
});
