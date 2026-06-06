'use client';

import { AppLayout } from '@/shared/components/AppLayout';
import { PageHeader } from '@/shared/components/PageHeader';
import { EmptyState } from '@/shared/components/EmptyState';
import { BookOpen } from 'lucide-react';

export default function HomeworkPage() {
  return (
    <AppLayout>
      <PageHeader title="Homework" description="Assign, submit, and grade homework" />
      <EmptyState
        icon={<BookOpen className="h-12 w-12" />}
        title="Homework Management"
        description="Create assignments, AI-generated homework, submissions, and grading coming soon."
      />
    </AppLayout>
  );
}
