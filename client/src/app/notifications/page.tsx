'use client';

import { AppLayout } from '@/shared/components/AppLayout';
import { PageHeader } from '@/shared/components/PageHeader';
import { EmptyState } from '@/shared/components/EmptyState';
import { Bell } from 'lucide-react';

export default function NotificationsPage() {
  return (
    <AppLayout>
      <PageHeader title="Notifications" description="View your notifications" />
      <EmptyState
        icon={<Bell className="h-12 w-12" />}
        title="Notification Inbox"
        description="Event-driven notifications for attendance, homework, and leave updates coming soon."
      />
    </AppLayout>
  );
}
