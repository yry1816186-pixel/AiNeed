import apiClient from "../../../services/api/client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ApiResponse } from "../../../types";
import type { OnboardingFormData, NewOnboardingState } from "../stores/onboardingStore";

const AGE_RANGE_MAP: Record<string, string> = {
  "18-24": "18_24",
  "25-30": "25_34",
  "31-40": "35_44",
  "41-50": "45_54",
  "50+": "55_plus",
};

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
      updateData.ageRange = AGE_RANGE_MAP[formData.ageRange] ?? formData.ageRange;
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
    if (formData.styleAnswers && formData.styleAnswers.length > 0) {
      updateData.styleAnswers = formData.styleAnswers;
    }

    return apiClient.put("/profile", updateData);
  },

  /** Complete onboarding via the backend state machine */
  completeOnboarding: async (
    formData: OnboardingFormData,
    newOnboarding: NewOnboardingState
  ): Promise<void> => {
    const scenes =
      newOnboarding.selectedScenes.length > 0
        ? newOnboarding.selectedScenes
        : formData.primaryScenarios ?? ["casual"];

    const styles =
      newOnboarding.selectedStyles.length > 0
        ? newOnboarding.selectedStyles
        : formData.styleExpression ?? ["casual"];

    const dto: Record<string, unknown> = {
      primaryScenarios: scenes,
      styleExpression: styles,
      garmentPreference: newOnboarding.garmentPreference,
    };

    if (formData.gender) {
      dto.gender = formData.gender;
    }
    if (formData.ageRange) {
      dto.ageRange = AGE_RANGE_MAP[formData.ageRange] ?? formData.ageRange;
    }
    if (formData.bodyType) {
      dto.bodyType = formData.bodyType;
    }

    const parsedHeight = parseFloat(formData.height);
    if (!isNaN(parsedHeight) && parsedHeight > 0) {
      dto.height = parsedHeight;
    }
    const parsedWeight = parseFloat(formData.weight);
    if (!isNaN(parsedWeight) && parsedWeight > 0) {
      dto.weight = parsedWeight;
    }

    // Step 1: POST /onboarding/basic-info to advance state machine
    await apiClient.post("/onboarding/basic-info", dto);

    // Step 2: Skip PHOTO and STYLE_TEST steps (new flow doesn't use them)
    await apiClient.post("/onboarding/skip/PHOTO");
    await apiClient.post("/onboarding/skip/STYLE_TEST");

    // Step 3: Update profile with new onboarding data
    await apiClient.put("/profile", {
      primaryScenarios: scenes,
      styleExpression: styles,
      garmentPreference: newOnboarding.garmentPreference,
      budgetRange: newOnboarding.budgetRange,
      formalityPreference: newOnboarding.formalityPreference,
    });
  },

  markOnboardingComplete: async (): Promise<void> => {
    await AsyncStorage.setItem("@xuno:onboarding_complete", "true");
  },
};
