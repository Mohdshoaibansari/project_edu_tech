'use client';

import { AppLayout } from '@/shared/components/AppLayout';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/Card';
import { PermissionGate } from '@/shared/auth/PermissionGate';
import { useAuthStore } from '@/shared/store/auth.store';

export default function SettingsPage() {
  const { user } = useAuthStore();

  return (
    <AppLayout>
      <PageHeader title="Settings" description="Manage account and preferences" />
      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{user?.first_name} {user?.last_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Role</span>
              <span className="font-medium">{user?.role}</span>
            </div>
          </CardContent>
        </Card>

        <PermissionGate permission="admin:settings">
          <Card>
            <CardHeader>
              <CardTitle>Admin Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Admin configuration and tenant management coming soon.
              </p>
            </CardContent>
          </Card>
        </PermissionGate>
      </div>
    </AppLayout>
  );
}
