'use client';

import { AppLayout } from '@/shared/components/AppLayout';
import { PageHeader } from '@/shared/components/PageHeader';
import { EmptyState } from '@/shared/components/EmptyState';
import { Users } from 'lucide-react';

export default function StudentsPage() {
  return (
    <AppLayout>
      <PageHeader title="Students" description="Manage student records" />
      <EmptyState
        icon={<Users className="h-12 w-12" />}
        title="Student Management"
        description="View, enroll, and manage students. Search, filter, and bulk import coming soon."
      />
    </AppLayout>
  );
}
