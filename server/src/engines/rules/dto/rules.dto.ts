export class CreateRuleSetDto {
  code: string;
  name: string;
  description?: string;
}

export class AddRuleDto {
  priority: number;
  name: string;
  description?: string;
  condition?: any;
  action: any;
}

export class UpdateRuleDto {
  priority?: number;
  name?: string;
  condition?: any;
  action?: any;
  is_active?: boolean;
}

export class TestRuleDto {
  condition?: any;
  action: any;
  context: Record<string, any>;
}

export class EvaluateDto {
  context: Record<string, any>;
  mode?: 'first_match' | 'all_matches';
}
