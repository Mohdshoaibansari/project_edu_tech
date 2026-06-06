'use client';

import { AppLayout } from '@/shared/components/AppLayout';
import { PageHeader } from '@/shared/components/PageHeader';
import { EmptyState } from '@/shared/components/EmptyState';
import { FileText } from 'lucide-react';

export default function ReportsPage() {
  return (
    <AppLayout>
      <PageHeader title="Reports" description="View and export reports" />
      <EmptyState
        icon={<FileText className="h-12 w-12" />}
        title="Reporting"
        description="Attendance reports, exam results, leave summaries, and data export coming soon."
      />
    </AppLayout>
  );
}
