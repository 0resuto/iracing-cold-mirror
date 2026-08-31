import React from 'react';
import { useAuthStore } from '../../store/useAuthStore';

/**
 * Declarative component wrapper for rendering admin-exclusive UI elements.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - Elements to render if user is admin.
 * @param {React.ReactNode} [props.fallback=null] - Optional placeholder to render if user is not admin.
 */
export function AdminOnly({ children, fallback = null }) {
  const isAdmin = useAuthStore((state) => state.isAdmin);

  if (!isAdmin) {
    return fallback;
  }

  return <>{children}</>;
}
