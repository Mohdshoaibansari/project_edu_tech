'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, ClipboardCheck, BookOpen,
  GraduationCap, CalendarDays, FileText, Bell,
  Settings, ChevronLeft, LogOut, Menu,
} from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { useUIStore } from '@/shared/store/ui.store';
import { useAuthStore } from '@/shared/store/auth.store';
import { PermissionGate } from '@/shared/auth/PermissionGate';
import { Button } from '@/shared/components/Button';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  permission?: string;
  role?: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Students', href: '/students', icon: Users, permission: 'student:view' },
  { label: 'Attendance', href: '/attendance', icon: ClipboardCheck, permission: 'attendance:view' },
  { label: 'Homework', href: '/homework', icon: BookOpen, permission: 'homework:view' },
  { label: 'Exams', href: '/exams', icon: GraduationCap, permission: 'exam:view' },
  { label: 'Leave', href: '/leave', icon: CalendarDays, permission: 'leave:view' },
  { label: 'Reports', href: '/reports', icon: FileText, permission: 'report:view' },
  { label: 'Notifications', href: '/notifications', icon: Bell },
  { label: 'Settings', href: '/settings', icon: Settings, role: 'ADMIN' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, sidebarCollapsed, toggleSidebar, toggleSidebarCollapse } = useUIStore();
  const { user, logout } = useAuthStore();

  if (!sidebarOpen) {
    return (
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 p-2 rounded-md border bg-background hover:bg-accent"
      >
        <Menu className="h-5 w-5" />
      </button>
    );
  }

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 z-40 h-screen border-r bg-background flex flex-col transition-all duration-200',
        sidebarCollapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-14 px-3 border-b">
        {!sidebarCollapsed && (
          <Link href="/" className="font-bold text-lg text-primary">
            EduTech
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebarCollapse}
          className="ml-auto"
        >
          <ChevronLeft className={cn('h-4 w-4 transition-transform', sidebarCollapsed && 'rotate-180')} />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <PermissionGate key={item.href} permission={item.permission} role={item.role}>
            <Link
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                pathname === item.href
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                sidebarCollapsed && 'justify-center px-2',
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Link>
          </PermissionGate>
        ))}
      </nav>

      {/* Footer — User info + Logout */}
      {user && (
        <div className="border-t p-3">
          <div className={cn('flex items-center gap-2', sidebarCollapsed && 'justify-center')}>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
              {user.first_name?.[0]}{user.last_name?.[0]}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.first_name} {user.last_name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.role}</p>
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={logout} title="Logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </aside>
  );
}
