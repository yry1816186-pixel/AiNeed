import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import type {
  AuthStackParamList,
  HomeStackParamList,
  StylistStackParamList,
  TryOnStackParamList,
  CommunityStackParamList,
  ProfileStackParamList,
  MainTabParamList as ActualMainTabParamList,
  RootStackParamList as ActualRootStackParamList,
} from '../navigation/types';

export type RootStackParamList = ActualRootStackParamList;
export type MainTabParamList = ActualMainTabParamList;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> = BottomTabScreenProps<MainTabParamList, T>;
