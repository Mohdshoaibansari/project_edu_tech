import { Module } from '@nestjs/common';
import { AcademicStructureService } from './academic-structure.service';
import { AcademicController } from './academic.controller';
import { AuditModule } from '@core/audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [AcademicController],
  providers: [AcademicStructureService],
  exports: [AcademicStructureService],
})
export class AcademicModule {}
