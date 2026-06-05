// DTOs for Config API endpoints
export class SetConfigDto {
  value: any;
}

export class RollbackConfigDto {
  version: number;
}

export class SetFromTemplateDto {
  template_id: string;
  overrides?: any;
}

export class CreateConfigSchemaDto {
  schema_key: string;
  name: string;
  description?: string;
  json_schema: any;
  ui_schema?: any;
}
