'use client';

import { AppLayout } from '@/shared/components/AppLayout';
import { PageHeader } from '@/shared/components/PageHeader';
import { EmptyState } from '@/shared/components/EmptyState';
import { GraduationCap } from 'lucide-react';

export default function ExamsPage() {
  return (
    <AppLayout>
      <PageHeader title="Exams" description="Create exams, enter scores, view results" />
      <EmptyState
        icon={<GraduationCap className="h-12 w-12" />}
        title="Exam Management"
        description="Config-driven grading, GPA calculation, and promotion eligibility coming soon."
      />
    </AppLayout>
  );
}
