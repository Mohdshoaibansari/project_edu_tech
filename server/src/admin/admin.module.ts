import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { AdminController } from './controllers/admin.controller';
import { AdminService } from './services/admin.service';
import { AdminAuthMiddleware } from './middleware/admin-auth.middleware';
import { EnginesModule } from '@engines/engines.module';
import { AuthModule } from '@modules/auth/auth.module';

@Module({
  imports: [EnginesModule, AuthModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AdminAuthMiddleware).forRoutes(AdminController);
  }
}
