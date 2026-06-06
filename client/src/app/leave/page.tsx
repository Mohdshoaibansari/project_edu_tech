'use client';

import { AppLayout } from '@/shared/components/AppLayout';
import { PageHeader } from '@/shared/components/PageHeader';
import { EmptyState } from '@/shared/components/EmptyState';
import { CalendarDays } from 'lucide-react';

export default function LeavePage() {
  return (
    <AppLayout>
      <PageHeader title="Leave" description="Apply and manage leave requests" />
      <EmptyState
        icon={<CalendarDays className="h-12 w-12" />}
        title="Leave Management"
        description="Workflow-driven approvals with dynamic approval chains coming soon."
      />
    </AppLayout>
  );
}
