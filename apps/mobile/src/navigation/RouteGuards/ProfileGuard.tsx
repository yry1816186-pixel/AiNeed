import React, { useEffect, useRef } from 'react';
import { useAuthStore } from '../../stores/index';
import { useProfileStore } from '../../stores/profileStore';

interface ProfileGuardProps {
  children: React.ReactNode;
  onProfileIncomplete?: () => void;
}

export function ProfileGuard({ children, onProfileIncomplete }: ProfileGuardProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const onboardingCompleted = useAuthStore((state) => state.onboardingCompleted);
  const hasTriggered = useRef(false);

  useEffect(() => {
    if (isAuthenticated && !onboardingCompleted && !hasTriggered.current) {
      hasTriggered.current = true;
      onProfileIncomplete?.();
    }
    if (onboardingCompleted) {
      hasTriggered.current = false;
    }
  }, [isAuthenticated, onboardingCompleted, onProfileIncomplete]);

  if (!isAuthenticated || !onboardingCompleted) {
    return null;
  }

  return <>{children}</>;
}
