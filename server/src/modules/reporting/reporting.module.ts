import { Module } from '@nestjs/common';
import { EnginesModule } from '@engines/engines.module';
import { ReportingService } from './services/reporting.service';
import { ReportingController } from './reporting.controller';

@Module({
  imports: [EnginesModule],
  controllers: [ReportingController],
  providers: [ReportingService],
  exports: [ReportingService],
})
export class ReportingModule {}
