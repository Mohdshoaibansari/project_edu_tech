import { apiClient } from '@/shared/api/client';

export interface ConfigSchema {
  schema_key: string;
  name: string;
  description?: string;
  version: number;
}

export interface ConfigValue {
  value: Record<string, unknown>;
}

export interface AttendanceStatus {
  code: string;
  label: string;
  color: string;
  icon: string;
  weight: number;
  is_present: boolean;
}

export interface GradingBand {
  grade: string;
  label: string;
  min_score: number;
  max_score: number;
  grade_point: number;
  color: string;
}

export interface GradingScale {
  mode: 'grade_bands' | 'percentage' | 'gpa' | 'rubric';
  bands?: GradingBand[];
  pass_percentage?: number;
  max_grade_point?: number;
}

export interface AcademicTerm {
  id: string;
  code: string;
  name: string;
  start_date: string;
  end_date: string;
  term_type: string;
}

export interface AcademicCalendar {
  year: string;
  terms: AcademicTerm[];
}

export interface LeaveType {
  code: string;
  label: string;
  requires_approval: boolean;
  max_days_per_year: number;
}

export const ConfigApi = {
  // Convenience endpoints
  getAttendanceStatuses: async (tenantId: string): Promise<AttendanceStatus[]> => {
    const res = await apiClient.get<{ data: AttendanceStatus[] }>(
      `/${tenantId}/config/convenience/attendance-statuses`,
    );
    return res.data.data;
  },

  getGradingScale: async (tenantId: string): Promise<GradingScale> => {
    const res = await apiClient.get<{ data: GradingScale }>(
      `/${tenantId}/config/convenience/grading-scale`,
    );
    return res.data.data;
  },

  getAcademicCalendar: async (tenantId: string): Promise<AcademicCalendar> => {
    const res = await apiClient.get<{ data: AcademicCalendar }>(
      `/${tenantId}/config/convenience/academic-calendar`,
    );
    return res.data.data;
  },

  getLeaveTypes: async (tenantId: string): Promise<LeaveType[]> => {
    const res = await apiClient.get<{ data: LeaveType[] }>(
      `/${tenantId}/config/convenience/leave-types`,
    );
    return res.data.data;
  },

  // Generic config
  getConfig: async (tenantId: string, schemaKey: string): Promise<Record<string, unknown>> => {
    const res = await apiClient.get<{ data: Record<string, unknown> }>(
      `/${tenantId}/config/${schemaKey}`,
    );
    return res.data.data;
  },
};
