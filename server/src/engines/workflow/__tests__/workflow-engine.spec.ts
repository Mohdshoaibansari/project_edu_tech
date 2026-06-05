import { describe, it, expect, vi } from 'vitest';
import { WorkflowEngine } from '../workflow-engine.service';

// Helper to create a mock Prisma with workflow data
function mockPrismaWith(workflowData: any, instanceData?: any) {
  return {
    workflowDefinition: {
      findFirst: vi.fn().mockResolvedValue(workflowData),
      findMany: vi.fn().mockResolvedValue([workflowData]),
      findUnique: vi.fn().mockResolvedValue(workflowData),
    },
    workflowInstance: {
      create: vi.fn().mockResolvedValue(instanceData || { id: 'instance-1', current_state_id: 'state-pending', context: {} }),
      findUnique: vi.fn().mockResolvedValue(instanceData || { id: 'instance-1', tenant_id: 'tenant-1', workflow_code: 'leave_approval', current_state_id: 'state-pending', context: {} }),
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({ id: 'instance-1', current_state_id: 'state-approved' }),
    },
    workflowHistory: {
      create: vi.fn().mockResolvedValue({}),
    },
    workflowTransition: {
      create: vi.fn().mockResolvedValue({}),
    },
  };
}

describe('WorkflowEngine', () => {
  const makeWorkflow = (states: any[], transitions: any[]) => ({
    id: 'wf-1',
    tenant_id: 'tenant-1',
    code: 'leave_approval',
    name: 'Leave Approval',
    version: 1,
    is_active: true,
    states: states.map((s, i) => ({ id: `state-${s.code}`, ...s, sort_order: i })),
    transitions: transitions.map((t, i) => ({
      id: `trans-${i}`,
      workflow_id: 'wf-1',
      from_state_id: `state-${t.from}`,
      to_state_id: `state-${t.to}`,
      name: t.name,
      actor_roles: t.actor_roles || null,
      actor_type: t.actor_type || 'role',
      conditions: t.conditions || null,
      actions: t.actions || null,
      sort_order: i,
    })),
  });

  describe('startWorkflow', () => {
    it('creates instance in initial state', async () => {
      const states = [
        { code: 'PENDING', is_initial: true, is_final: false },
        { code: 'APPROVED', is_initial: false, is_final: true },
      ];
      const workflow = makeWorkflow(states, []);
      const prisma = mockPrismaWith(workflow);
      const engine = new WorkflowEngine(prisma as any);

      const instance = await engine.startWorkflow(
        'tenant-1', 'leave_approval', 'LeaveRequest', 'lr-1', { leave_days: 3 }, 'user-1',
      );

      expect(prisma.workflowInstance.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            current_state_id: 'state-PENDING',
            context: { leave_days: 3 },
          }),
        }),
      );
    });

    it('throws if no initial state defined', async () => {
      const workflow = makeWorkflow([{ code: 'MIDDLE', is_initial: false, is_final: false }], []);
      const prisma = mockPrismaWith(workflow);
      const engine = new WorkflowEngine(prisma as any);

      await expect(
        engine.startWorkflow('tenant-1', 'leave_approval', 'LeaveRequest', 'lr-1'),
      ).rejects.toThrow('has no initial state');
    });
  });

  describe('transition', () => {
    it('executes valid transition', async () => {
      const states = [
        { code: 'PENDING', is_initial: true, is_final: false },
        { code: 'WITH_TEACHER', is_initial: false, is_final: false },
      ];
      const transitions = [
        { from: 'PENDING', to: 'WITH_TEACHER', name: 'Submit', actor_roles: ['PARENT'] },
      ];
      const workflow = makeWorkflow(states, transitions);
      const prisma = mockPrismaWith(workflow, {
        id: 'instance-1',
        tenant_id: 'tenant-1',
        workflow_code: 'leave_approval',
        current_state_id: 'state-PENDING',
        context: { leave_days: 2 },
      });
      const engine = new WorkflowEngine(prisma as any);

      const result = await engine.transition('instance-1', 'Submit', 'user-1', 'test', 'PARENT');

      expect(result.fromState!.code).toBe('PENDING');
      expect(result.toState!.code).toBe('WITH_TEACHER');
      expect(prisma.workflowHistory.create).toHaveBeenCalled();
      expect(prisma.workflowInstance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'instance-1' },
          data: expect.objectContaining({ current_state_id: 'state-WITH_TEACHER' }),
        }),
      );
    });

    it('rejects invalid actor role', async () => {
      const states = [
        { code: 'PENDING', is_initial: true, is_final: false },
        { code: 'APPROVED', is_initial: false, is_final: true },
      ];
      const transitions = [
        { from: 'PENDING', to: 'APPROVED', name: 'Approve', actor_roles: ['PRINCIPAL'] },
      ];
      const workflow = makeWorkflow(states, transitions);
      const prisma = mockPrismaWith(workflow, {
        id: 'instance-1',
        tenant_id: 'tenant-1',
        workflow_code: 'leave_approval',
        current_state_id: 'state-PENDING',
        context: {},
      });
      const engine = new WorkflowEngine(prisma as any);

      await expect(
        engine.transition('instance-1', 'Approve', 'user-1', '', 'TEACHER'),
      ).rejects.toThrow('not allowed');
    });

    it('rejects invalid transition name', async () => {
      const states = [{ code: 'PENDING', is_initial: true, is_final: false }];
      const workflow = makeWorkflow(states, []);
      const prisma = mockPrismaWith(workflow, {
        id: 'instance-1',
        tenant_id: 'tenant-1',
        workflow_code: 'leave_approval',
        current_state_id: 'state-PENDING',
        context: {},
      });
      const engine = new WorkflowEngine(prisma as any);

      await expect(
        engine.transition('instance-1', 'NonExistent'),
      ).rejects.toThrow('not allowed');
    });

    it('rejects when conditions not met', async () => {
      const states = [
        { code: 'WITH_TEACHER', is_initial: false, is_final: false },
        { code: 'WITH_PRINCIPAL', is_initial: false, is_final: false },
      ];
      const transitions = [
        {
          from: 'WITH_TEACHER',
          to: 'WITH_PRINCIPAL',
          name: 'Forward',
          actor_roles: ['TEACHER'],
          conditions: { context_leave_days_gt: 3 },
        },
      ];
      const workflow = makeWorkflow(states, transitions);
      const prisma = mockPrismaWith(workflow, {
        id: 'instance-1',
        tenant_id: 'tenant-1',
        workflow_code: 'leave_approval',
        current_state_id: 'state-WITH_TEACHER',
        context: { leave_days: 2 },
      });
      const engine = new WorkflowEngine(prisma as any);

      await expect(
        engine.transition('instance-1', 'Forward', 'user-1', '', 'TEACHER'),
      ).rejects.toThrow('conditions not met');
    });
  });

  describe('getAvailableTransitions', () => {
    it('returns available transitions for current state and actor', async () => {
      const states = [
        { code: 'WITH_TEACHER', is_initial: false, is_final: false },
        { code: 'WITH_PRINCIPAL', is_initial: false, is_final: false },
        { code: 'WITH_COORDINATOR', is_initial: false, is_final: false },
        { code: 'APPROVED', is_initial: false, is_final: true },
      ];
      const transitions = [
        { from: 'WITH_TEACHER', to: 'WITH_PRINCIPAL', name: 'Forward to Principal', actor_roles: ['TEACHER'] },
        { from: 'WITH_TEACHER', to: 'WITH_COORDINATOR', name: 'Forward to Coordinator', actor_roles: ['TEACHER'], conditions: { context_leave_days_gt: 3 } },
        { from: 'WITH_TEACHER', to: 'APPROVED', name: 'Approve', actor_roles: ['PRINCIPAL'] },
      ];
      const workflow = makeWorkflow(states, transitions);
      const prisma = mockPrismaWith(workflow);
      (prisma.workflowInstance.findUnique as any).mockResolvedValue({
        id: 'instance-1',
        tenant_id: 'tenant-1',
        workflow_code: 'leave_approval',
        current_state_id: 'state-WITH_TEACHER',
        context: { leave_days: 2 },
      });
      const engine = new WorkflowEngine(prisma as any);

      const available = await engine.getAvailableTransitions('instance-1', 'TEACHER');

      // Only "Forward to Principal" should be available (leave_days=2, so condition for Coordinator not met)
      const names = available.map((t) => t.name);
      expect(names).toContain('Forward to Principal');
      expect(names).not.toContain('Forward to Coordinator');
      expect(names).not.toContain('Approve'); // TEACHER can't approve
    });
  });

  describe('3-school workflow scenarios', () => {
    it('School A: 2-step — Teacher→Principal', async () => {
      const states = [
        { code: 'PENDING', is_initial: true, is_final: false },
        { code: 'WITH_TEACHER', is_initial: false, is_final: false },
        { code: 'WITH_PRINCIPAL', is_initial: false, is_final: false },
        { code: 'APPROVED', is_initial: false, is_final: true },
      ];
      const transitions = [
        { from: 'PENDING', to: 'WITH_TEACHER', name: 'Submit', actor_roles: ['PARENT'] },
        { from: 'WITH_TEACHER', to: 'WITH_PRINCIPAL', name: 'Forward to Principal', actor_roles: ['TEACHER'] },
        { from: 'WITH_PRINCIPAL', to: 'APPROVED', name: 'Approve', actor_roles: ['PRINCIPAL'] },
      ];
      const wf = makeWorkflow(states, transitions);
      const prisma = mockPrismaWith(wf);
      (prisma.workflowInstance.findUnique as any).mockResolvedValue({
        id: 'instance-1',
        tenant_id: 'tenant-1',
        workflow_code: 'leave_approval',
        current_state_id: 'state-WITH_TEACHER',
        context: {},
      });
      const engine = new WorkflowEngine(prisma as any);

      const available = await engine.getAvailableTransitions('instance-1', 'TEACHER');
      expect(available.map((t) => t.to_state_code)).toContain('WITH_PRINCIPAL');
      expect(available.map((t) => t.to_state_code)).not.toContain('APPROVED');
    });

    it('School B: 3-step — Teacher→Coordinator→Principal', async () => {
      const states = [
        { code: 'WITH_TEACHER', is_initial: false, is_final: false },
        { code: 'WITH_COORDINATOR', is_initial: false, is_final: false },
        { code: 'WITH_PRINCIPAL', is_initial: false, is_final: false },
        { code: 'APPROVED', is_initial: false, is_final: true },
      ];
      const transitions = [
        { from: 'WITH_TEACHER', to: 'WITH_COORDINATOR', name: 'Forward to Coordinator', actor_roles: ['TEACHER'] },
        { from: 'WITH_COORDINATOR', to: 'WITH_PRINCIPAL', name: 'Forward to Principal', actor_roles: ['COORDINATOR'] },
        { from: 'WITH_PRINCIPAL', to: 'APPROVED', name: 'Approve', actor_roles: ['PRINCIPAL'] },
      ];
      const wf = makeWorkflow(states, transitions);
      const prisma = mockPrismaWith(wf);
      (prisma.workflowInstance.findUnique as any).mockResolvedValue({
        id: 'instance-1',
        tenant_id: 'tenant-1',
        workflow_code: 'leave_approval',
        current_state_id: 'state-WITH_TEACHER',
        context: {},
      });
      const engine = new WorkflowEngine(prisma as any);

      const available = await engine.getAvailableTransitions('instance-1', 'TEACHER');
      expect(available.map((t) => t.to_state_code)).toContain('WITH_COORDINATOR');
      expect(available.map((t) => t.to_state_code)).not.toContain('WITH_PRINCIPAL'); // Teacher can't skip Coordinator
    });

    it('School C: Conditional — skip Coordinator if leave_days ≤ 3', async () => {
      const states = [
        { code: 'WITH_TEACHER', is_initial: false, is_final: false },
        { code: 'WITH_COORDINATOR', is_initial: false, is_final: false },
        { code: 'WITH_PRINCIPAL', is_initial: false, is_final: false },
      ];
      const transitions = [
        { from: 'WITH_TEACHER', to: 'WITH_PRINCIPAL', name: 'Forward to Principal (Short)', actor_roles: ['TEACHER'], conditions: { context_leave_days_lte: 3 } },
        { from: 'WITH_TEACHER', to: 'WITH_COORDINATOR', name: 'Forward to Coordinator (Long)', actor_roles: ['TEACHER'], conditions: { context_leave_days_gt: 3 } },
      ];
      const wf = makeWorkflow(states, transitions);

      // Short leave (2 days)
      const prisma1 = mockPrismaWith(wf);
      (prisma1.workflowInstance.findUnique as any).mockResolvedValue({
        id: 'instance-1',
        tenant_id: 'tenant-1',
        workflow_code: 'leave_approval',
        current_state_id: 'state-WITH_TEACHER',
        context: { leave_days: 2 },
      });
      const engine1 = new WorkflowEngine(prisma1 as any);
      const shortAvailable = await engine1.getAvailableTransitions('instance-1', 'TEACHER');
      expect(shortAvailable.map((t) => t.to_state_code)).toContain('WITH_PRINCIPAL');
      expect(shortAvailable.map((t) => t.to_state_code)).not.toContain('WITH_COORDINATOR');

      // Long leave (5 days)
      const prisma2 = mockPrismaWith(wf);
      (prisma2.workflowInstance.findUnique as any).mockResolvedValue({
        id: 'instance-2',
        tenant_id: 'tenant-1',
        workflow_code: 'leave_approval',
        current_state_id: 'state-WITH_TEACHER',
        context: { leave_days: 5 },
      });
      const engine2 = new WorkflowEngine(prisma2 as any);
      const longAvailable = await engine2.getAvailableTransitions('instance-2', 'TEACHER');
      expect(longAvailable.map((t) => t.to_state_code)).not.toContain('WITH_PRINCIPAL');
      expect(longAvailable.map((t) => t.to_state_code)).toContain('WITH_COORDINATOR');
    });
  });
});
