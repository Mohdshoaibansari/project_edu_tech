import { Module } from '@nestjs/common';
import { ConfigurationEngine } from './config/configuration-engine.service';
import { ConfigController } from './config/config.controller';
import { RulesEngine } from './rules/rules-engine.service';
import { RulesController } from './rules/rules.controller';
import { WorkflowEngine } from './workflow/workflow-engine.service';
import { WorkflowController } from './workflow/workflow.controller';

@Module({
  controllers: [ConfigController, RulesController, WorkflowController],
  providers: [ConfigurationEngine, RulesEngine, WorkflowEngine],
  exports: [ConfigurationEngine, RulesEngine, WorkflowEngine],
})
export class EnginesModule {}
