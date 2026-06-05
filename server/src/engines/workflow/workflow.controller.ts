import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WorkflowEngine } from './workflow-engine.service';
import { CreateWorkflowDto, StartWorkflowDto, TransitionDto } from './dto/workflow.dto';

@Controller(':tenantId/workflows')
export class WorkflowController {
  constructor(private readonly workflowEngine: WorkflowEngine) {}

  // ==========================================================================
  // Workflow Definitions
  // ==========================================================================

  @Get()
  async listWorkflows(@Param('tenantId') tenantId: string) {
    const workflows = await this.workflowEngine.getWorkflowDefinitions(tenantId);
    return { data: workflows };
  }

  @Get(':code')
  async getWorkflow(@Param('tenantId') tenantId: string, @Param('code') code: string) {
    const workflow = await this.workflowEngine.getWorkflowDefinition(tenantId, code);
    if (!workflow) throw new Error(`Workflow "${code}" not found`);
    return { data: workflow };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createWorkflow(@Param('tenantId') tenantId: string, @Body() dto: CreateWorkflowDto) {
    // Create the workflow definition with states
    const workflow = await this.workflowEngine.createWorkflowDefinition(tenantId, {
      code: dto.code,
      name: dto.name,
      description: dto.description,
      states: dto.states,
      transitions: [], // Transitions added separately
    });

    // Add transitions
    for (const t of dto.transitions) {
      await this.workflowEngine.addTransition(workflow.id, t);
    }

    // Return full workflow
    const created = await this.workflowEngine.getWorkflowDefinition(tenantId, dto.code);
    return { data: created };
  }

  // ==========================================================================
  // Workflow Instances
  // ==========================================================================

  @Post(':code/instances')
  @HttpCode(HttpStatus.CREATED)
  async startWorkflow(
    @Param('tenantId') tenantId: string,
    @Param('code') code: string,
    @Body() dto: StartWorkflowDto,
  ) {
    const instance = await this.workflowEngine.startWorkflow(
      tenantId,
      code,
      dto.entity_type,
      dto.entity_id,
      dto.context ?? {},
      dto.actor_id,
    );
    return { data: instance };
  }

  @Get('instances/:instanceId')
  async getInstance(@Param('tenantId') tenantId: string, @Param('instanceId') instanceId: string) {
    const instance = await this.workflowEngine.getInstance(instanceId);
    if (!instance) throw new Error(`Workflow instance ${instanceId} not found`);
    return { data: instance };
  }

  @Post('instances/:instanceId/transition')
  async transition(
    @Param('tenantId') tenantId: string,
    @Param('instanceId') instanceId: string,
    @Body() dto: TransitionDto,
  ) {
    const result = await this.workflowEngine.transition(
      instanceId,
      dto.transition,
      undefined, // actorId — from JWT in production
      dto.comment,
      dto.actor_role,
    );
    return { data: result };
  }

  @Get('instances/:instanceId/transitions')
  async getAvailableTransitions(
    @Param('tenantId') tenantId: string,
    @Param('instanceId') instanceId: string,
  ) {
    const transitions = await this.workflowEngine.getAvailableTransitions(instanceId);
    return { data: transitions };
  }
}
