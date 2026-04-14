import React, { useEffect, useRef } from 'react';
import { useAuthStore } from '../../stores/index';

interface VipGuardProps {
  children: React.ReactNode;
  onNotVip?: () => void;
}

export function VipGuard({ children, onNotVip }: VipGuardProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isVip = useAuthStore((state) => state.isVip);
  const hasTriggered = useRef(false);

  useEffect(() => {
    if (isAuthenticated && !isVip && !hasTriggered.current) {
      hasTriggered.current = true;
      onNotVip?.();
    }
    if (isVip) {
      hasTriggered.current = false;
    }
  }, [isAuthenticated, isVip, onNotVip]);

  if (!isAuthenticated || !isVip) {
    return null;
  }

  return <>{children}</>;
}
