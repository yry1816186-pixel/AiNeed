import React, { useEffect, useRef } from 'react';
import { useAuthStore } from '../../stores/index';

interface AuthGuardProps {
  children: React.ReactNode;
  onUnauthorized?: () => void;
}

export function AuthGuard({ children, onUnauthorized }: AuthGuardProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasTriggered = useRef(false);

  useEffect(() => {
    if (!isAuthenticated && !hasTriggered.current) {
      hasTriggered.current = true;
      onUnauthorized?.();
    }
    if (isAuthenticated) {
      hasTriggered.current = false;
    }
  }, [isAuthenticated, onUnauthorized]);

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
