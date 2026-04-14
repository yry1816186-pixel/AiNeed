import { useNavigation, StackActions, CommonActions, NavigationProp } from '@react-navigation/native';
import { useCallback } from 'react';
import { navigationRef } from '../navigation/navigationService';
import type { RootStackParamList } from '../types/navigation';

type NavigationParams = Record<string, unknown>;

export function useRouter() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  return {
    push: useCallback((href: string, params?: NavigationParams) => {
      const path = href.replace(/^\//, '');
      navigation.dispatch(StackActions.push(path, params));
    }, [navigation]),
    
    replace: useCallback((href: string, params?: NavigationParams) => {
      const path = href.replace(/^\//, '');
      navigation.dispatch(StackActions.replace(path, params));
    }, [navigation]),
    
    back: useCallback(() => {
      navigation.goBack();
    }, [navigation]),
    
    dismiss: useCallback((count?: number) => {
      if (count && count > 1) {
        navigation.dispatch(StackActions.pop(count));
      } else {
        navigation.goBack();
      }
    }, [navigation]),
    
    dismissAll: useCallback(() => {
      navigation.dispatch(CommonActions.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      }));
    }, [navigation]),
    
    canGoBack: useCallback(() => {
      return navigation.canGoBack();
    }, [navigation]),
    
    navigate: useCallback((href: string, params?: NavigationParams) => {
      const path = href.replace(/^\//, '');
      navigation.navigate(path as any, params as any);
    }, [navigation]),
  };
}

export function usePathname(): string {
  const navigation = useNavigation();
  const state = navigation.getState();
  if (!state) return '/';
  const currentRoute = state.routes[state.index];
  return currentRoute?.name || '/';
}

export function useSearchParams(): URLSearchParams {
  const navigation = useNavigation();
  const state = navigation.getState();
  if (!state) return new URLSearchParams();
  const currentRoute = state.routes[state.index];
  const params = (currentRoute?.params as Record<string, string>) || {};
  return new URLSearchParams(params);
}

export function useGlobalSearchParams(): Record<string, string> {
  const navigation = useNavigation();
  const state = navigation.getState();
  if (!state) return {};
  const currentRoute = state.routes[state.index];
  return (currentRoute?.params as Record<string, string>) || {};
}

export function useLocalSearchParams<T = Record<string, string>>(): T {
  const navigation = useNavigation();
  const state = navigation.getState();
  if (!state) return {} as T;
  const currentRoute = state.routes[state.index];
  return ((currentRoute?.params as T) || {}) as T;
}

export function Link({ href, children, ...props }: { 
  href: string; 
  children: React.ReactNode;
  style?: Record<string, unknown>;
  onPress?: () => void;
}) {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  
  const handlePress = useCallback(() => {
    const path = href.replace(/^\//, '');
    navigation.navigate(path as never);
  }, [navigation, href]);

  return children;
}

export function Redirect({ href }: { href: string }) {
  const navigation = useNavigation();
  
  React.useEffect(() => {
    const path = href.replace(/^\//, '');
    navigation.dispatch(StackActions.replace(path));
  }, [navigation, href]);

  return null;
}

import React from 'react';
import type { NavigationContainerRef } from '@react-navigation/native';

let _navigationRef: any = null;

export function setNavigationRef(ref: any) {
  _navigationRef = ref;
}

function getNav() {
  const ref = _navigationRef || navigationRef;
  if (!ref) {
    console.warn('expo-router.router: Navigation not ready yet.');
    return null;
  }
  if ('isReady' in ref && typeof ref.isReady === 'function' && !ref.isReady()) {
    console.warn('expo-router.router: Navigation not ready yet.');
    return null;
  }
  return ref;
}

export const router = {
  push: (href: string, params?: NavigationParams) => {
    const nav = getNav();
    if (nav) {
      const path = href.replace(/^\//, '');
      nav.navigate(path as any, params as any);
    }
  },
  replace: (href: string, params?: NavigationParams) => {
    const nav = getNav();
    if (nav) {
      const path = href.replace(/^\//, '');
      nav.dispatch(StackActions.replace(path, params));
    }
  },
  back: () => {
    const nav = getNav();
    if (nav) {
      nav.goBack();
    }
  },
  dismiss: (count?: number) => {
    const nav = getNav();
    if (nav) {
      if (count && count > 1) {
        nav.dispatch(StackActions.pop(count));
      } else {
        nav.goBack();
      }
    }
  },
  dismissAll: () => {
    const nav = getNav();
    if (nav) {
      nav.dispatch(CommonActions.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      }));
    }
  },
};

export interface ScreenOptions {
  title?: string;
  headerShown?: boolean;
  headerTitle?: string;
  headerStyle?: Record<string, unknown>;
  headerTitleStyle?: Record<string, unknown>;
  cardStyle?: Record<string, unknown>;
  presentation?: 'card' | 'modal' | 'transparentModal' | 'fullScreenModal';
  animation?: 'default' | 'fade' | 'slide' | 'none';
}

export const Stack = {
  Screen: ({ name, options }: { name: string; options?: ScreenOptions }) => null,
};

export const Tabs = {
  Screen: ({ name, options }: { name: string; options?: ScreenOptions }) => null,
};

export default {
  useRouter,
  usePathname,
  useSearchParams,
  useGlobalSearchParams,
  useLocalSearchParams,
  Link,
  Redirect,
  router,
  Stack,
  Tabs,
};
