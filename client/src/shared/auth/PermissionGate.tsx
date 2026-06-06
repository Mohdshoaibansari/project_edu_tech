'use client';

import * as React from 'react';
import { useAuthStore } from '@/shared/store/auth.store';

interface PermissionGateProps {
  permission?: string;
  role?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Conditionally renders children based on permission or role check.
 * Use `permission` for fine-grained control (e.g., "homework:create").
 * Use `role` for broad access (e.g., "TEACHER").
 */
export function PermissionGate({ permission, role, fallback = null, children }: PermissionGateProps) {
  const { can, hasRole } = useAuthStore();

  if (permission && !can(permission)) return <>{fallback}</>;
  if (role && !hasRole(role)) return <>{fallback}</>;

  return <>{children}</>;
}

/**
 * Hook version for inline permission checks.
 */
export function usePermission() {
  const { can, hasRole } = useAuthStore();
  return { can, hasRole };
}
