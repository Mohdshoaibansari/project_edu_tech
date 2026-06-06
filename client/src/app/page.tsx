'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardCheck, BookOpen, GraduationCap, CalendarDays } from 'lucide-react';
import { AppLayout } from '@/shared/components/AppLayout';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/Card';
import { LoadingSkeleton } from '@/shared/components/LoadingSkeleton';
import { ErrorState } from '@/shared/components/ErrorState';
import { useAuthStore } from '@/shared/store/auth.store';
import { useUIStore } from '@/shared/store/ui.store';
import { apiClient } from '@/shared/api/client';

interface DashboardData {
  attendance_overview: { rate: number; total_days: number };
  upcoming_exams: Array<{ title: string; date: string }>;
  pending_homework: Array<{ title: string; due_date: string }>;
  leave_requests: Array<{ student_name: string; status: string }>;
  notifications_count: number;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { selectedTenantId } = useUIStore();

  const tenantId = selectedTenantId ?? user?.tenant_id ?? 'demo';

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard', tenantId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: DashboardData }>(`/${tenantId}/reports/dashboard`);
      return res.data.data;
    },
  });

  const stats = [
    { label: 'Attendance Rate', value: `${data?.attendance_overview?.rate ?? '—'}%`, icon: ClipboardCheck, color: 'text-blue-500' },
    { label: 'Upcoming Exams', value: data?.upcoming_exams?.length ?? '—', icon: GraduationCap, color: 'text-purple-500' },
    { label: 'Pending Homework', value: data?.pending_homework?.length ?? '—', icon: BookOpen, color: 'text-orange-500' },
    { label: 'Leave Requests', value: data?.leave_requests?.length ?? '—', icon: CalendarDays, color: 'text-red-500' },
  ];

  return (
    <AppLayout>
      <PageHeader
        title={`Welcome, ${user?.first_name ?? 'User'}`}
        description={`${user?.role ?? 'User'} Dashboard`}
      />

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <LoadingSkeleton variant="card" />
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {stats.map((stat) => (
              <Card key={stat.label}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recent Activity */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Exams</CardTitle>
              </CardHeader>
              <CardContent>
                {data?.upcoming_exams?.length ? (
                  <ul className="space-y-2">
                    {data.upcoming_exams.map((exam, i) => (
                      <li key={i} className="flex justify-between text-sm">
                        <span>{exam.title}</span>
                        <span className="text-muted-foreground">{exam.date}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No upcoming exams</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pending Homework</CardTitle>
              </CardHeader>
              <CardContent>
                {data?.pending_homework?.length ? (
                  <ul className="space-y-2">
                    {data.pending_homework.map((hw, i) => (
                      <li key={i} className="flex justify-between text-sm">
                        <span>{hw.title}</span>
                        <span className="text-muted-foreground">Due: {hw.due_date}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No pending homework</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </AppLayout>
  );
}
