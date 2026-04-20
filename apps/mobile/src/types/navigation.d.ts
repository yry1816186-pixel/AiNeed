import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";

import type {
  AuthStackParamList,
  HomeStackParamList,
  StylistStackParamList,
  TryOnStackParamList,
  CommunityStackParamList,
  ProfileStackParamList,
  MainTabParamList as ActualMainTabParamList,
  RootStackParamList as ActualRootStackParamList,
  AuthStackScreenProps as ActualAuthStackScreenProps,
  HomeStackScreenProps as ActualHomeStackScreenProps,
  StylistStackScreenProps as ActualStylistStackScreenProps,
  TryOnStackScreenProps as ActualTryOnStackScreenProps,
  CommunityStackScreenProps as ActualCommunityStackScreenProps,
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
export type HomeStackScreenProps<T extends keyof HomeStackParamList = keyof HomeStackParamList> =
  ActualHomeStackScreenProps<T>;
export type StylistStackScreenProps<
  T extends keyof StylistStackParamList = keyof StylistStackParamList,
> = ActualStylistStackScreenProps<T>;
export type TryOnStackScreenProps<T extends keyof TryOnStackParamList = keyof TryOnStackParamList> =
  ActualTryOnStackScreenProps<T>;
export type CommunityStackScreenProps<
  T extends keyof CommunityStackParamList = keyof CommunityStackParamList,
> = ActualCommunityStackScreenProps<T>;
export type ProfileStackScreenProps<
  T extends keyof ProfileStackParamList = keyof ProfileStackParamList,
> = ActualProfileStackScreenProps<T>;
export type CompositeScreenProps = ActualCompositeScreenProps;
