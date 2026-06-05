import { Module } from '@nestjs/common';
import { LeaveService } from './services/leave.service';
import { LeaveController } from './leave.controller';
import { EnginesModule } from '@engines/engines.module';
@Module({ imports: [EnginesModule], controllers: [LeaveController], providers: [LeaveService], exports: [LeaveService] })
export class LeaveModule {}
