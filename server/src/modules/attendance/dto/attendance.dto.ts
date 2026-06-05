export class MarkAttendanceDto {
  class_id: string;
  date: string;
  records: {
    student_id: string;
    status_code: string;
    period?: number;
    notes?: string;
  }[];
}

export class AttendanceQueryDto {
  student_id?: string;
  class_id?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export class AttendanceRateDto {
  student_id: string;
  from: string;
  to: string;
}

export class CorrectionRequestDto {
  attendance_id: string;
  new_status_code: string;
  reason: string;
}

export class CorrectionActionDto {
  action: 'Approve' | 'Reject';
  comment?: string;
}
