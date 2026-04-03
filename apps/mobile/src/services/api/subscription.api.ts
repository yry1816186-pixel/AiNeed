import apiClient from "./client";
import type { ApiResponse } from "../../types/api";

export type PlanTier = "basic" | "premium" | "vip";

export type SubscriptionStatus =
  | "active"
  | "expired"
  | "cancelled"
  | "trial"
  | "pending";

export interface MembershipPlan {
  id: string;
  tier: PlanTier;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  currency: string;
  duration: number;
  durationUnit: "month" | "year";
  features: MembershipFeature[];
  isPopular?: boolean;
  isActive: boolean;
}

export interface MembershipFeature {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  included: boolean;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  plan?: MembershipPlan;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubscribeDto {
  planId: string;
  paymentMethod: string;
}

export const subscriptionApi = {
  getPlans: async (): Promise<ApiResponse<MembershipPlan[]>> => {
    return apiClient.get<MembershipPlan[]>("/subscriptions/plans");
  },

  getPlanById: async (id: string): Promise<ApiResponse<MembershipPlan>> => {
    return apiClient.get<MembershipPlan>(`/subscriptions/plans/${id}`);
  },

  getCurrentSubscription: async (): Promise<
    ApiResponse<UserSubscription | null>
  > => {
    return apiClient.get<UserSubscription | null>("/subscriptions/current");
  },

  subscribe: async (
    data: SubscribeDto,
  ): Promise<ApiResponse<UserSubscription>> => {
    return apiClient.post<UserSubscription>("/subscriptions/subscribe", data);
  },

  cancel: async (): Promise<ApiResponse<UserSubscription>> => {
    return apiClient.post<UserSubscription>("/subscriptions/cancel");
  },

  renew: async (): Promise<ApiResponse<UserSubscription>> => {
    return apiClient.post<UserSubscription>("/subscriptions/renew");
  },
};

export default subscriptionApi;
