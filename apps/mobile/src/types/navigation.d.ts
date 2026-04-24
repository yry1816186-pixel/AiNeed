import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";

import type {
  AuthStackParamList,
  TodayStackParamList,
  DiscoverStackParamList,
  StylistStackParamList,
  ProfileStackParamList,
  MainTabParamList as ActualMainTabParamList,
  RootStackParamList as ActualRootStackParamList,
  AuthStackScreenProps as ActualAuthStackScreenProps,
  TodayStackScreenProps as ActualTodayStackScreenProps,
  DiscoverStackScreenProps as ActualDiscoverStackScreenProps,
  StylistStackScreenProps as ActualStylistStackScreenProps,
  ProfileStackScreenProps as ActualProfileStackScreenProps,
  CompositeScreenProps as ActualCompositeScreenProps,
} from "../navigation/types";

export type RootStackParamList = ActualRootStackParamList;
export type MainTabParamList = ActualMainTabParamList;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

export type MainTabScreenProps<T extends keyof MainTabParamList> = BottomTabScreenProps<
  MainTabParamList,
  T
>;

export type AuthStackScreenProps<T extends keyof AuthStackParamList = keyof AuthStackParamList> =
  ActualAuthStackScreenProps<T>;
export type TodayStackScreenProps<T extends keyof TodayStackParamList = keyof TodayStackParamList> =
  ActualTodayStackScreenProps<T>;
export type DiscoverStackScreenProps<
  T extends keyof DiscoverStackParamList = keyof DiscoverStackParamList
> = ActualDiscoverStackScreenProps<T>;
export type StylistStackScreenProps<
  T extends keyof StylistStackParamList = keyof StylistStackParamList
> = ActualStylistStackScreenProps<T>;
export type ProfileStackScreenProps<
  T extends keyof ProfileStackParamList = keyof ProfileStackParamList
> = ActualProfileStackScreenProps<T>;
export type CompositeScreenProps = ActualCompositeScreenProps;
