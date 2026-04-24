/* eslint-disable @typescript-eslint/no-explicit-any */
import { logger } from "../shared/utils/logger";
import {
  useNavigation,
  StackActions,
  CommonActions,
  NavigationProp,
} from "@react-navigation/native";
import { useCallback } from "react";
import { navigationRef } from "../navigation/navigationService";
import type { RootStackParamList } from "../types/navigation";

import React from "react";

type NavigationParams = Record<string, unknown>;

interface NavigationRef {
  navigate: (name: string, params?: object) => void;
  dispatch: (action: unknown) => void;
  goBack: () => void;
  isReady?: () => boolean;
}

export function useRouter() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  return {
    push: useCallback(
      (href: string, params?: NavigationParams) => {
        const path = href.replace(/^\//, "");
        navigation.dispatch(StackActions.push(path, params));
      },
      [navigation]
    ),

    replace: useCallback(
      (href: string, params?: NavigationParams) => {
        const path = href.replace(/^\//, "");
        navigation.dispatch(StackActions.replace(path, params));
      },
      [navigation]
    ),

    back: useCallback(() => {
      navigation.goBack();
    }, [navigation]),

    dismiss: useCallback(
      (count?: number) => {
        if (count && count > 1) {
          navigation.dispatch(StackActions.pop(count));
        } else {
          navigation.goBack();
        }
      },
      [navigation]
    ),

    dismissAll: useCallback(() => {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "MainTabs" }],
        })
      );
    }, [navigation]),

    canGoBack: useCallback(() => {
      return navigation.canGoBack();
    }, [navigation]),

    navigate: useCallback(
      (href: string, params?: NavigationParams) => {
        const path = href.replace(/^\//, "");
        (navigation.navigate as unknown as (name: string, params?: object) => void)(path, params);
      },
      [navigation]
    ),
  };
}

export function usePathname(): string {
  const navigation = useNavigation();
  const state = navigation.getState();
  if (!state) {
    return "/";
  }
  const currentRoute = state.routes[state.index];
  return currentRoute?.name || "/";
}

export function useSearchParams(): URLSearchParams {
  const navigation = useNavigation();
  const state = navigation.getState();
  if (!state) {
    return new URLSearchParams();
  }
  const currentRoute = state.routes[state.index];
  const params = (currentRoute?.params as Record<string, string>) || {};
  return new URLSearchParams(params);
}

export function useGlobalSearchParams(): Record<string, string> {
  const navigation = useNavigation();
  const state = navigation.getState();
  if (!state) {
    return {};
  }
  const currentRoute = state.routes[state.index];
  return (currentRoute?.params as Record<string, string>) || {};
}

export function useLocalSearchParams<T = Record<string, string>>(): T {
  const navigation = useNavigation();
  const state = navigation.getState();
  if (!state) {
    return {} as T;
  }
  const currentRoute = state.routes[state.index];
  return ((currentRoute?.params as T) || {}) as T;
}

export function Link({
  href,
  children,
  ..._props
}: {
  href: string;
  children: React.ReactNode;
  style?: Record<string, unknown>;
  onPress?: () => void;
}) {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const _handlePress = useCallback(() => {
    const path = href.replace(/^\//, "");
    void _handlePress;
    (navigation.navigate as unknown as (name: string, params?: object) => void)(path);
  }, [navigation, href]);

  return children;
}

export function Redirect({ href }: { href: string }) {
  const navigation = useNavigation();

  React.useEffect(() => {
    const path = href.replace(/^\//, "");
    navigation.dispatch(StackActions.replace(path));
  }, [navigation, href]);

  return null;
}

let _navigationRef: NavigationRef | null = null;

export function setNavigationRef(ref: NavigationRef) {
  _navigationRef = ref;
}

function getNav(): NavigationRef | null {
  const ref = _navigationRef || (navigationRef as unknown as NavigationRef | null);
  if (!ref) {
    logger.warn("expo-router.router: Navigation not ready yet.");
    return null;
  }
  if ("isReady" in ref && typeof ref.isReady === "function" && !ref.isReady()) {
    logger.warn("expo-router.router: Navigation not ready yet.");
    return null;
  }
  return ref;
}

export const router = {
  push: (href: string, params?: NavigationParams) => {
    const nav = getNav();
    if (nav) {
      const path = href.replace(/^\//, "");
      (nav.navigate as unknown as (name: string, params?: object) => void)(path, params);
    }
  },
  replace: (href: string, params?: NavigationParams) => {
    const nav = getNav();
    if (nav) {
      const path = href.replace(/^\//, "");
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
      nav.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "MainTabs" }],
        })
      );
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
  presentation?: "card" | "modal" | "transparentModal" | "fullScreenModal";
  animation?: "default" | "fade" | "slide" | "none";
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
