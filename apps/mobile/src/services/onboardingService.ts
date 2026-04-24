import apiClient from "./api/client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ApiResponse } from "../types";
import type { OnboardingFormData } from "../features/onboarding/stores/onboardingStore";

export const onboardingService = {
  saveOnboardingData: async (formData: OnboardingFormData): Promise<ApiResponse<unknown>> => {
    const updateData: Record<string, unknown> = {};

    if (formData.gender) {
      updateData.gender = formData.gender;
    }
    if (formData.bodyType) {
      updateData.bodyType = formData.bodyType;
    }
    if (formData.primaryScenarios && formData.primaryScenarios.length > 0) {
      updateData.primaryScenarios = formData.primaryScenarios;
    }
    if (formData.styleExpression && formData.styleExpression.length > 0) {
      updateData.styleExpression = formData.styleExpression;
    }
    if (formData.garmentPreference) {
      updateData.garmentPreference = formData.garmentPreference;
    }
    if (formData.ageRange) {
      updateData.ageRange = formData.ageRange;
    }
    const parsedHeight = parseFloat(formData.height);
    if (!isNaN(parsedHeight) && parsedHeight > 0) {
      updateData.height = parsedHeight;
    }
    const parsedWeight = parseFloat(formData.weight);
    if (!isNaN(parsedWeight) && parsedWeight > 0) {
      updateData.weight = parsedWeight;
    }
    if (formData.photoUri) {
      updateData.photoUri = formData.photoUri;
    }

    return apiClient.put("/profile", updateData);
  },

  markOnboardingComplete: async (): Promise<void> => {
    await AsyncStorage.setItem("@xuno:onboarding_complete", "true");
  },
};
