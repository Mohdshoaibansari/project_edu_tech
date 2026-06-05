import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';

/**
 * Workflow Engine — configurable state machine for approval chains.
 *
 * Features:
 *  - Start workflow instance
 *  - Transition between states (with actor & condition validation)
 *  - Get available transitions for current state + actor
 *  - Workflow definition CRUD
 *  - History tracking
 */
@Injectable()
export class WorkflowEngine {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================================================
  // PUBLIC API — Workflow Execution
  // ==========================================================================

  /**
   * Start a workflow instance for an entity.
   *
   * @param tenantId       - Tenant ID
   * @param workflowCode   - Workflow code ('leave_approval', 'attendance_correction')
   * @param entityType     - Entity type ('LeaveRequest', 'AttendanceCorrection')
   * @param entityId       - Entity ID
   * @param context        - Contextual data for the workflow (e.g., leave_days)
   * @param actorId        - Initial actor (optional)
   * @returns              - Created workflow instance with initial state
   */
  async startWorkflow(
    tenantId: string,
    workflowCode: string,
    entityType: string,
    entityId: string,
    context: Record<string, any> = {},
    actorId?: string,
  ) {
    // Load active workflow definition
    const workflow = await this.getWorkflowDefinition(tenantId, workflowCode);
    if (!workflow) throw new Error(`Workflow "${workflowCode}" not found for tenant ${tenantId}`);

    // Find initial state
    const initialState = workflow.states.find((s) => s.is_initial);
    if (!initialState) throw new Error(`Workflow "${workflowCode}" has no initial state`);

    // Check for existing active instance for this entity
    const existing = await this.prisma.workflowInstance.findFirst({
      where: { tenant_id: tenantId, workflow_code: workflowCode, entity_type: entityType, entity_id: entityId },
      include: { history: true },
    });

    if (existing) {
      // If there's an existing instance that isn't in a final state, return it
      const currentState = workflow.states.find((s) => s.id === existing.current_state_id);
      if (currentState && !currentState.is_final) {
        return existing;
      }
    }

    // Create new instance
    const instance = await this.prisma.workflowInstance.create({
      data: {
        tenant_id: tenantId,
        workflow_code: workflowCode,
        entity_type: entityType,
        entity_id: entityId,
        current_state_id: initialState.id,
        context,
      },
    });

    return instance;
  }

  /**
   * Execute a transition within a workflow instance.
   *
   * @param instanceId   - Workflow instance ID
   * @param transitionName - Transition name ('Approve', 'Reject', 'Forward to Principal')
   * @param actorId      - User ID performing the transition
   * @param comment      - Optional comment
   * @param actorRole    - Optional role of actor for validation
   * @returns            - Updated instance with new state
   */
  async transition(
    instanceId: string,
    transitionName: string,
    actorId?: string,
    comment?: string,
    actorRole?: string,
  ) {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
    });
    if (!instance) throw new Error(`Workflow instance ${instanceId} not found`);

    // Load workflow definition
    const workflow = await this.prisma.workflowDefinition.findFirst({
      where: { tenant_id: instance.tenant_id, code: instance.workflow_code, is_active: true },
      orderBy: { version: 'desc' },
      include: { states: true, transitions: true },
    });
    if (!workflow) throw new Error(`Workflow "${instance.workflow_code}" not found`);

    // Find transition
    const transition = workflow.transitions.find(
      (t) => t.from_state_id === instance.current_state_id && t.name === transitionName,
    );

    if (!transition) {
      const currentState = workflow.states.find((s) => s.id === instance.current_state_id);
      const availableTransitions = workflow.transitions
        .filter((t) => t.from_state_id === instance.current_state_id)
        .map((t) => t.name)
        .join(', ');

      throw new Error(
        `Transition "${transitionName}" not allowed from state "${currentState?.code}". ` +
        `Available: ${availableTransitions || 'none'}`,
      );
    }

    // Validate actor (if roles specified)
    if (transition.actor_roles && Array.isArray(transition.actor_roles)) {
      const allowedRoles = transition.actor_roles as string[];
      if (actorRole && !allowedRoles.includes(actorRole)) {
        throw new Error(
          `Actor role "${actorRole}" not allowed for transition "${transitionName}". ` +
          `Allowed roles: ${allowedRoles.join(', ')}`,
        );
      }
    }

    // Evaluate conditions
    if (transition.conditions) {
      const conditionsMet = this.evaluateTransitionConditions(
        transition.conditions as any,
        instance.context as any,
      );
      if (!conditionsMet) {
        throw new Error(`Transition conditions not met for "${transitionName}"`);
      }
    }

    // Execute actions (side effects)
    if (transition.actions) {
      // Actions are metadata — actual side effects handled by event subscribers
    }

    // Record history
    const currentState = workflow.states.find((s) => s.id === instance.current_state_id);
    const toState = workflow.states.find((s) => s.id === transition.to_state_id);

    await this.prisma.workflowHistory.create({
      data: {
        instance_id: instanceId,
        transition_id: transition.id,
        actor_id: actorId,
        from_state_code: currentState?.code ?? 'UNKNOWN',
        to_state_code: toState?.code ?? 'UNKNOWN',
        comment: comment ?? null,
      },
    });

    // Update instance
    const updated = await this.prisma.workflowInstance.update({
      where: { id: instanceId },
      data: { current_state_id: transition.to_state_id, updated_at: new Date() },
    });

    return {
      instance: updated,
      fromState: currentState,
      toState,
      transition,
    };
  }

  /**
   * Get available transitions for a workflow instance from the perspective of an actor.
   *
   * @param instanceId - Workflow instance ID
   * @param actorRole  - Optional role to filter transitions by
   * @returns           - List of available transitions with target states
   */
  async getAvailableTransitions(instanceId: string, actorRole?: string) {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
    });
    if (!instance) throw new Error(`Workflow instance ${instanceId} not found`);

    const workflow = await this.prisma.workflowDefinition.findFirst({
      where: { tenant_id: instance.tenant_id, code: instance.workflow_code, is_active: true },
      orderBy: { version: 'desc' },
      include: { states: true, transitions: true },
    });
    if (!workflow) throw new Error(`Workflow "${instance.workflow_code}" not found`);

    const context = instance.context as Record<string, any> | null;

    return workflow.transitions
      .filter((t) => {
        // Must originate from current state
        if (t.from_state_id !== instance.current_state_id) return false;

        // Must be allowed for actor role
        if (actorRole && t.actor_roles && Array.isArray(t.actor_roles)) {
          if (!(t.actor_roles as string[]).includes(actorRole)) return false;
        }

        // Must satisfy conditions
        if (t.conditions) {
          if (!this.evaluateTransitionConditions(t.conditions as any, context ?? {})) return false;
        }

        return true;
      })
      .map((t) => {
        const toState = workflow.states.find((s) => s.id === t.to_state_id);
        return {
          id: t.id,
          name: t.name,
          from_state_code: workflow.states.find((s) => s.id === t.from_state_id)?.code,
          to_state_code: toState?.code,
          to_state_name: toState?.name,
          is_final: toState?.is_final ?? false,
          actor_roles: t.actor_roles,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get workflow instance details including history.
   */
  async getInstance(instanceId: string) {
    return this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: {
        history: { orderBy: { created_at: 'asc' } },
      },
    });
  }

  // ==========================================================================
  // PUBLIC API — Workflow Definition CRUD
  // ==========================================================================

  async getWorkflowDefinitions(tenantId: string) {
    return this.prisma.workflowDefinition.findMany({
      where: { tenant_id: tenantId },
      orderBy: { code: 'asc' },
    });
  }

  async getWorkflowDefinition(tenantId: string, code: string) {
    return this.prisma.workflowDefinition.findFirst({
      where: { tenant_id: tenantId, code, is_active: true },
      orderBy: { version: 'desc' },
      include: {
        states: { orderBy: { sort_order: 'asc' } },
        transitions: {
          orderBy: { sort_order: 'asc' },
          include: {
            from_state: true,
            to_state: true,
          },
        },
      },
    });
  }

  async createWorkflowDefinition(
    tenantId: string,
    data: {
      code: string;
      name: string;
      description?: string;
      states: { code: string; name: string; is_initial?: boolean; is_final?: boolean; color?: string; sort_order?: number }[];
      transitions: {
        from_state_code: string;
        to_state_code: string;
        name: string;
        actor_roles?: string[];
        actor_type?: string;
        conditions?: any;
        actions?: any;
        sort_order?: number;
      }[];
    },
  ) {
    return this.prisma.workflowDefinition.create({
      data: {
        tenant_id: tenantId,
        code: data.code,
        name: data.name,
        description: data.description,
        states: {
          create: data.states.map((s) => ({
            code: s.code,
            name: s.name,
            is_initial: s.is_initial ?? false,
            is_final: s.is_final ?? false,
            color: s.color,
            sort_order: s.sort_order ?? 0,
          })),
        },
      },
      include: { states: true },
    });
  }

  async addTransition(
    workflowId: string,
    data: {
      from_state_code: string;
      to_state_code: string;
      name: string;
      actor_roles?: string[];
      actor_type?: string;
      conditions?: any;
      sort_order?: number;
    },
  ) {
    const workflow = await this.prisma.workflowDefinition.findUnique({
      where: { id: workflowId },
      include: { states: true },
    });
    if (!workflow) throw new Error(`Workflow ${workflowId} not found`);

    const fromState = workflow.states.find((s) => s.code === data.from_state_code);
    const toState = workflow.states.find((s) => s.code === data.to_state_code);

    if (!fromState) throw new Error(`State "${data.from_state_code}" not found in workflow`);
    if (!toState) throw new Error(`State "${data.to_state_code}" not found in workflow`);

    return this.prisma.workflowTransition.create({
      data: {
        workflow_id: workflowId,
        from_state_id: fromState.id,
        to_state_id: toState.id,
        name: data.name,
        ...(data.actor_roles && { actor_roles: data.actor_roles }),
        actor_type: data.actor_type ?? 'role',
        ...(data.conditions && { conditions: data.conditions }),
        sort_order: data.sort_order ?? 0,
      },
    });
  }

  // ==========================================================================
  // PRIVATE — Condition evaluation for transitions
  // ==========================================================================

  /**
   * Evaluate transition conditions against workflow context.
   * Supports simple conditions like: { context_leave_days_gt: 3 }
   */
  private evaluateTransitionConditions(
    conditions: Record<string, any>,
    context: Record<string, any>,
  ): boolean {
    for (const [key, expectedValue] of Object.entries(conditions)) {
      // Support: context_leave_days_gt → context.leave_days > 3
      if (key.startsWith('context_')) {
        // Extract field name and operator: context_leave_days_gt → field=leave_days, operator=gt
        const suffix = key.replace('context_', '');
        // Find last underscore prefix: leave_days_gt → field=leave_days, op=gt
        const match = suffix.match(/^(.+)_(gt|gte|lt|lte|eq|ne)$/);
        if (match) {
          const [, field, op] = match;
          const actualValue = this.resolvePath(field, context);
          if (!this.compareValues(actualValue, expectedValue, op)) {
            return false;
          }
        }
      }
    }

    // If no conditions block the transition, allow it
    return true;
  }

  /**
   * Compare actual vs expected values with operator.
   */
  private compareValues(actual: any, expected: any, op: string): boolean {
    const a = Number(actual);
    const e = Number(expected);

    if (isNaN(a) || isNaN(e)) {
      // String comparison
      switch (op) {
        case 'eq': return actual === expected;
        case 'ne': return actual !== expected;
        default: return false;
      }
    }

    switch (op) {
      case 'gt': return a > e;
      case 'gte': return a >= e;
      case 'lt': return a < e;
      case 'lte': return a <= e;
      case 'eq': return a === e;
      case 'ne': return a !== e;
      default: return false;
    }
  }

  /**
   * Resolve a dot-separated path in an object.
   */
  private resolvePath(path: string, obj: any): any {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    return current;
  }
}
