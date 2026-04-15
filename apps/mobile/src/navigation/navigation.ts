import { createNavigationContainerRef } from "@react-navigation/native";
import type { RootStackParamList } from "../types/navigation";

export {
  navigationRef,
  setNavigationReady,
  isNavigationReady,
  getCurrentRouteName,
  getCurrentRouteParams,
  navigate,
  navigateAuth,
  navigateTab,
  navigateHome,
  navigateStylist,
  navigateTryOn,
  navigateCommunity,
  navigateProfile,
  goBack,
  reset,
  resetToAuth,
  resetToMain,
  parseDeepLink,
  navigateDeepLink,
  navigateFromPush,
} from "./navigationService";

export type { ParsedDeepLink, PushNotificationData } from "./navigationService";

export const setNavigationRef = (
  _ref: ReturnType<typeof createNavigationContainerRef<RootStackParamList>> | null
) => {
  console.warn("setNavigationRef is deprecated, use navigationRef directly from navigationService");
};
