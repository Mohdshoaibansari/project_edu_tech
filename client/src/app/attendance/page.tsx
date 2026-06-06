'use client';

import { AppLayout } from '@/shared/components/AppLayout';
import { PageHeader } from '@/shared/components/PageHeader';
import { EmptyState } from '@/shared/components/EmptyState';
import { ClipboardCheck } from 'lucide-react';

export default function AttendancePage() {
  return (
    <AppLayout>
      <PageHeader title="Attendance" description="Mark and track student attendance" />
      <EmptyState
        icon={<ClipboardCheck className="h-12 w-12" />}
        title="Attendance Tracking"
        description="Roll-call marking, config-driven status toggles, and attendance reports coming soon."
      />
    </AppLayout>
  );
}
