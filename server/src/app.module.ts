import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { PrismaModule } from '@core/prisma/prisma.module';
import { EventBusModule } from '@core/event-bus/event-bus.module';
import { AuditModule } from '@core/audit/audit.module';
import { EnginesModule } from '@engines/engines.module';
import { AdminModule } from '@admin/admin.module';
import { AuthModule } from '@modules/auth/auth.module';
import { AcademicModule } from '@modules/academic/academic.module';
import { AttendanceModule } from '@modules/attendance/attendance.module';
import { HomeworkModule } from '@modules/homework/homework.module';
import { ExamModule } from '@modules/exam/exam.module';
import { LeaveModule } from '@modules/leave/leave.module';
import { NotificationModule } from '@modules/notification/notification.module';
import { ReportingModule } from '@modules/reporting/reporting.module';
import { TenantContextMiddleware } from '@core/tenant/tenant-context.middleware';

@Module({
  imports: [
    PrismaModule, EventBusModule, AuditModule, EnginesModule, AdminModule,
    AuthModule, AcademicModule, AttendanceModule, HomeworkModule,
    ExamModule, LeaveModule, NotificationModule, ReportingModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
