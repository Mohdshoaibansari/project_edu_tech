export class CreateWorkflowDto {
  code: string;
  name: string;
  description?: string;
  states: {
    code: string;
    name: string;
    is_initial?: boolean;
    is_final?: boolean;
    color?: string;
    sort_order?: number;
  }[];
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
}

export class StartWorkflowDto {
  entity_type: string;
  entity_id: string;
  context?: Record<string, any>;
  actor_id?: string;
}

export class TransitionDto {
  transition: string;
  comment?: string;
  actor_role?: string;
}
