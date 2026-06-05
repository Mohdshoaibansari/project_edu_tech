import { Module } from '@nestjs/common';
import { ExamService } from './services/exam.service';
import { ExamController } from './exam.controller';
import { EnginesModule } from '@engines/engines.module';

@Module({ imports: [EnginesModule], controllers: [ExamController], providers: [ExamService], exports: [ExamService] })
export class ExamModule {}
