import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type OnboardingStep = "basicInfo" | "photo" | "styleTest" | "complete";

export interface OnboardingFormData {
  gender: "male" | "female" | "other" | null;
  ageRange: "18-24" | "25-30" | "31-40" | "41-50" | "50+" | null;
  height: string;
  weight: string;
  photoUri: string | null;
}

interface OnboardingState {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  formData: OnboardingFormData;
  isLoading: boolean;
  setCurrentStep: (step: OnboardingStep) => void;
  completeStep: (step: OnboardingStep) => void;
  updateFormData: (data: Partial<OnboardingFormData>) => void;
  setLoading: (loading: boolean) => void;
  resetOnboarding: () => void;
  goToNextStep: () => void;
  goToPrevStep: () => void;
}

const STEP_ORDER: OnboardingStep[] = ["basicInfo", "photo", "styleTest", "complete"];

const DEFAULT_FORM_DATA: OnboardingFormData = {
  gender: null,
  ageRange: null,
  height: "",
  weight: "",
  photoUri: null,
};

interface PersistedOnboardingState {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  formData: OnboardingFormData;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      currentStep: "basicInfo",
      completedSteps: [],
      formData: { ...DEFAULT_FORM_DATA },
      isLoading: false,
      setCurrentStep: (step) => set({ currentStep: step }),
      completeStep: (step) =>
        set((state) => ({
          completedSteps: state.completedSteps.includes(step)
            ? state.completedSteps
            : [...state.completedSteps, step],
        })),
      updateFormData: (data) =>
        set((state) => ({
          formData: { ...state.formData, ...data },
        })),
      setLoading: (loading) => set({ isLoading: loading }),
      resetOnboarding: () =>
        set({
          currentStep: "basicInfo",
          completedSteps: [],
          formData: { ...DEFAULT_FORM_DATA },
          isLoading: false,
        }),
      goToNextStep: () => {
        const { currentStep } = get();
        const currentIndex = STEP_ORDER.indexOf(currentStep);
        if (currentIndex < STEP_ORDER.length - 1) {
          set({ currentStep: STEP_ORDER[currentIndex + 1] });
        }
      },
      goToPrevStep: () => {
        const { currentStep } = get();
        const currentIndex = STEP_ORDER.indexOf(currentStep);
        if (currentIndex > 0) {
          set({ currentStep: STEP_ORDER[currentIndex - 1] });
        }
      },
    }),
    {
      name: "onboarding-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state): PersistedOnboardingState => ({
        currentStep: state.currentStep,
        completedSteps: state.completedSteps,
        formData: state.formData,
      }),
    }
  )
);
