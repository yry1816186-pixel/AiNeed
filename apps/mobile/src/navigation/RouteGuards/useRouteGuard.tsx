import React, { useEffect, useRef, useCallback } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../stores/index';
import { navigateAuth, navigateProfile } from '../navigationService';
import { GUARDED_ROUTES, type GuardType } from '../types';

interface GuardResult {
  canAccess: boolean;
  failedGuard: GuardType | null;
}

function checkGuards(routeName: string): GuardResult {
  const guardConfig = GUARDED_ROUTES.find((g) => g.route === routeName);
  if (!guardConfig) return { canAccess: true, failedGuard: null };

  const isAuthenticated = useAuthStore.getState().isAuthenticated;
  const onboardingCompleted = useAuthStore.getState().onboardingCompleted;
  const isVip = useAuthStore.getState().isVip;

  for (const guard of guardConfig.guards) {
    if (guard === 'auth' && !isAuthenticated) {
      return { canAccess: false, failedGuard: 'auth' };
    }
    if (guard === 'profile' && (!isAuthenticated || !onboardingCompleted)) {
      return { canAccess: false, failedGuard: 'profile' };
    }
    if (guard === 'vip' && (!isAuthenticated || !isVip)) {
      return { canAccess: false, failedGuard: 'vip' };
    }
  }

  return { canAccess: true, failedGuard: null };
}

function handleGuardFailure(failedGuard: GuardType) {
  switch (failedGuard) {
    case 'auth':
      navigateAuth('Login');
      break;
    case 'profile':
      navigateAuth('Onboarding');
      break;
    case 'vip':
      navigateProfile('Subscription');
      break;
  }
}

export function useRouteGuard(routeName: string): GuardResult {
  const navigation = useNavigation();
  const hasRedirected = useRef(false);

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const onboardingCompleted = useAuthStore((state) => state.onboardingCompleted);
  const isVip = useAuthStore((state) => state.isVip);

  useFocusEffect(
    useCallback(() => {
      hasRedirected.current = false;
      const result = checkGuards(routeName);
      if (!result.canAccess && result.failedGuard && !hasRedirected.current) {
        hasRedirected.current = true;
        const timer = setTimeout(() => {
          handleGuardFailure(result.failedGuard!);
        }, 0);
        return () => clearTimeout(timer);
      }
    }, [routeName, isAuthenticated, onboardingCompleted, isVip]),
  );

  return checkGuards(routeName);
}

interface GuardedScreenProps {
  routeName: string;
  children: React.ReactNode;
}

export function GuardedScreen({ routeName, children }: GuardedScreenProps) {
  const { canAccess } = useRouteGuard(routeName);

  if (!canAccess) {
    return null;
  }

  return <>{children}</>;
}
