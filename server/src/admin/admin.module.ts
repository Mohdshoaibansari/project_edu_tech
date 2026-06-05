import { Module } from '@nestjs/common';
import { AdminController } from './controllers/admin.controller';
import { AdminService } from './services/admin.service';
import { EnginesModule } from '@engines/engines.module';

@Module({
  imports: [EnginesModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
