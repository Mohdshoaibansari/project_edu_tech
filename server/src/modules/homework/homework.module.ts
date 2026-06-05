import { Module } from '@nestjs/common';
import { HomeworkService } from './services/homework.service';
import { HomeworkController } from './homework.controller';
import { EnginesModule } from '@engines/engines.module';

@Module({
  imports: [EnginesModule],
  controllers: [HomeworkController],
  providers: [HomeworkService],
  exports: [HomeworkService],
})
export class HomeworkModule {}
