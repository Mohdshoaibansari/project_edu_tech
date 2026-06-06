'use client';

import { Sidebar } from '@/shared/components/Sidebar';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { cn } from '@/shared/utils/cn';
import { useUIStore } from '@/shared/store/ui.store';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useUIStore();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main
        className={cn(
          'transition-all duration-200 p-6',
          sidebarCollapsed ? 'ml-16' : 'ml-64',
        )}
      >
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
    </div>
  );
}
