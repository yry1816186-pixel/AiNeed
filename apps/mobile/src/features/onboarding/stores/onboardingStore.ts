import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type OnboardingStep = "scene" | "preference" | "style" | "result";

export interface OnboardingFormData {
  gender?: "male" | "female" | "other" | null;
  ageRange: "18-24" | "25-30" | "31-40" | "41-50" | "50+" | null;
  height: string;
  weight: string;
  photoUri: string | null;
  styleAnswers: string[];
  bodyType?: string | null;
  primaryScenarios?: string[];
  styleExpression?: string[];
  garmentPreference?: {
    lowerBody: "pants" | "skirts" | "both";
    upperFit: "fitted" | "regular" | "loose";
  };
}

export type NewOnboardingStep = "scene" | "style" | "preference" | "result";

export type LowerBodyPref = "pants" | "skirts" | "both";
export type UpperFitPref = "fitted" | "regular" | "loose";

export interface NewOnboardingState {
  step: NewOnboardingStep;
  selectedScenes: string[];
  selectedStyles: string[];
  formalityPreference: number;
  garmentPreference: {
    lowerBody: LowerBodyPref;
    upperFit: UpperFitPref;
  };
  budgetRange: { min: number; max: number };
  recommendations: RecommendationItem[];
}

export interface MatchScoreDimension {
  bodyType: number;
  occasion: number;
  color: number;
  style: number;
  budget: number;
}

export interface RecommendationItem {
  id: string;
  name: string;
  imageUrl: string;
  matchScore: number;
  reason: string;
  items: { name: string; category: string; imageUrl: string }[];
  matchScores?: MatchScoreDimension;
}

interface OnboardingState {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  formData: OnboardingFormData;
  isLoading: boolean;
  newOnboarding: NewOnboardingState;
  setCurrentStep: (step: OnboardingStep) => void;
  completeStep: (step: OnboardingStep) => void;
  updateFormData: (data: Partial<OnboardingFormData>) => void;
  setLoading: (loading: boolean) => void;
  resetOnboarding: () => void;
  goToNextStep: () => void;
  goToPrevStep: () => void;
  setScenes: (scenes: string[]) => void;
  setStyles: (styles: string[]) => void;
  setFormalityPreference: (value: number) => void;
  setGarmentPreference: (pref: Partial<NewOnboardingState["garmentPreference"]>) => void;
  setBudgetRange: (range: { min: number; max: number }) => void;
  setRecommendations: (items: RecommendationItem[]) => void;
  setNewOnboardingStep: (step: NewOnboardingStep) => void;
  resetNewOnboarding: () => void;
}

const STEP_ORDER: OnboardingStep[] = ["scene", "preference", "style", "result"];

const NEW_STEP_ORDER: NewOnboardingStep[] = ["scene", "style", "preference", "result"];

const DEFAULT_FORM_DATA: OnboardingFormData = {
  gender: null,
  ageRange: null,
  height: "",
  weight: "",
  photoUri: null,
  styleAnswers: [],
  bodyType: null,
  primaryScenarios: [],
  styleExpression: [],
  garmentPreference: {
    lowerBody: "both",
    upperFit: "regular",
  },
};

const DEFAULT_NEW_ONBOARDING: NewOnboardingState = {
  step: "scene",
  selectedScenes: [],
  selectedStyles: [],
  formalityPreference: 50,
  garmentPreference: {
    lowerBody: "both",
    upperFit: "regular",
  },
  budgetRange: { min: 200, max: 1000 },
  recommendations: [],
};

interface PersistedOnboardingState {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  formData: OnboardingFormData;
  newOnboarding: NewOnboardingState;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      currentStep: "scene",
      completedSteps: [],
      formData: { ...DEFAULT_FORM_DATA },
      isLoading: false,
      newOnboarding: { ...DEFAULT_NEW_ONBOARDING },
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
          currentStep: "scene",
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
      setScenes: (scenes) =>
        set((state) => ({
          newOnboarding: { ...state.newOnboarding, selectedScenes: scenes },
        })),
      setStyles: (styles) =>
        set((state) => ({
          newOnboarding: { ...state.newOnboarding, selectedStyles: styles },
        })),
      setFormalityPreference: (value) =>
        set((state) => ({
          newOnboarding: { ...state.newOnboarding, formalityPreference: value },
        })),
      setGarmentPreference: (pref) =>
        set((state) => ({
          newOnboarding: {
            ...state.newOnboarding,
            garmentPreference: { ...state.newOnboarding.garmentPreference, ...pref },
          },
        })),
      setBudgetRange: (range) =>
        set((state) => ({
          newOnboarding: { ...state.newOnboarding, budgetRange: range },
        })),
      setRecommendations: (items) =>
        set((state) => ({
          newOnboarding: { ...state.newOnboarding, recommendations: items },
        })),
      setNewOnboardingStep: (step) =>
        set((state) => ({
          newOnboarding: { ...state.newOnboarding, step },
        })),
      resetNewOnboarding: () =>
        set((state) => ({
          newOnboarding: { ...DEFAULT_NEW_ONBOARDING },
        })),
    }),
    {
      name: "onboarding-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state): PersistedOnboardingState => ({
        currentStep: state.currentStep,
        completedSteps: state.completedSteps,
        formData: state.formData,
        newOnboarding: state.newOnboarding,
      }),
    }
  )
);

export { NEW_STEP_ORDER };
