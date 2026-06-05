export class CreateHomeworkDto {
  title: string;
  description?: string;
  category_code: string;
  class_id: string;
  subject_id: string;
  due_date?: string;
  max_score?: number;
}

export class SubmitHomeworkDto {
  content?: string;
  file_urls?: string[];
}

export class GradeHomeworkDto {
  score: number;
  feedback?: string;
}

export class HomeworkQueryDto {
  class_id?: string;
  subject_id?: string;
  status?: string;
  student_id?: string;
  page?: number;
  pageSize?: number;
}
