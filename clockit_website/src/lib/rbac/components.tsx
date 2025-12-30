"use client";

/**
 * RBAC Components
 * React components for conditional rendering based on permissions
 */

import { type ReactNode } from 'react';
import { useAbility } from './AbilityContext';
import { type Action, type Subject, Role } from './types';

interface CanProps {
  I: Action;
  a: Subject;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Render children only if user can perform the action
 *
 * @example
 * <Can I="create" a="Upload">
 *   <button>Upload CSV</button>
 * </Can>
 */
export function Can({ I: action, a: subject, children, fallback = null }: CanProps) {
  const { ability } = useAbility();

  if (ability.can(action, subject)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

interface CannotProps {
  I: Action;
  a: Subject;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Render children only if user cannot perform the action
 *
 * @example
 * <Cannot I="delete" a="Upload">
 *   <p>You don't have permission to delete uploads</p>
 * </Cannot>
 */
export function Cannot({ I: action, a: subject, children, fallback = null }: CannotProps) {
  const { ability } = useAbility();

  if (ability.cannot(action, subject)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

interface RequireRoleProps {
  role: Role | Role[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Render children only if user has the required role(s)
 *
 * @example
 * <RequireRole role={Role.ADMIN}>
 *   <AdminPanel />
 * </RequireRole>
 */
export function RequireRole({ role, children, fallback = null }: RequireRoleProps) {
  const { role: userRole } = useAbility();

  const hasRole = Array.isArray(role) ? role.includes(userRole) : userRole === role;

  if (hasRole) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

interface RequireAuthProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Render children only if user is authenticated (not a guest)
 *
 * @example
 * <RequireAuth fallback={<SignInPrompt />}>
 *   <UserDashboard />
 * </RequireAuth>
 */
export function RequireAuth({ children, fallback = null }: RequireAuthProps) {
  const { role } = useAbility();

  if (role !== Role.GUEST) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
