import { useOnboardingStore, OnboardingStep } from "../../features/onboarding/stores/onboardingStore";

// Mocks
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("react-native", () => ({ Platform: { OS: "ios" } }));

const DEFAULT_FORM_DATA = {
  gender: null as "male" | "female" | "other" | null,
  ageRange: null as "18-24" | "25-30" | "31-40" | "41-50" | "50+" | null,
  height: "",
  weight: "",
  photoUri: null as string | null,
};

describe("useOnboardingStore", () => {
  beforeEach(() => {
    useOnboardingStore.setState({
      currentStep: "basicInfo",
      completedSteps: [],
      formData: { ...DEFAULT_FORM_DATA },
      isLoading: false,
    });
  });

  // ==================== 初始状态 ====================

  describe("初始状态", () => {
    test("currentStep 应为 'basicInfo'", () => {
      expect(useOnboardingStore.getState().currentStep).toBe("basicInfo");
    });

    test("completedSteps 应为空数组", () => {
      expect(useOnboardingStore.getState().completedSteps).toEqual([]);
    });

    test("formData.gender 应为 null", () => {
      expect(useOnboardingStore.getState().formData.gender).toBeNull();
    });

    test("formData.ageRange 应为 null", () => {
      expect(useOnboardingStore.getState().formData.ageRange).toBeNull();
    });

    test("formData.height 应为空字符串", () => {
      expect(useOnboardingStore.getState().formData.height).toBe("");
    });

    test("formData.weight 应为空字符串", () => {
      expect(useOnboardingStore.getState().formData.weight).toBe("");
    });

    test("formData.photoUri 应为 null", () => {
      expect(useOnboardingStore.getState().formData.photoUri).toBeNull();
    });

    test("isLoading 应为 false", () => {
      expect(useOnboardingStore.getState().isLoading).toBe(false);
    });
  });

  // ==================== setCurrentStep ====================

  describe("setCurrentStep", () => {
    test("应设置当前步骤", () => {
      useOnboardingStore.getState().setCurrentStep("photo");
      expect(useOnboardingStore.getState().currentStep).toBe("photo");
    });

    test("应能设置到任意步骤", () => {
      const steps: OnboardingStep[] = ["basicInfo", "photo", "styleTest", "complete"];
      steps.forEach((step) => {
        useOnboardingStore.getState().setCurrentStep(step);
        expect(useOnboardingStore.getState().currentStep).toBe(step);
      });
    });
  });

  // ==================== completeStep ====================

  describe("completeStep", () => {
    test("应将步骤添加到 completedSteps", () => {
      useOnboardingStore.getState().completeStep("basicInfo");
      expect(useOnboardingStore.getState().completedSteps).toContain("basicInfo");
    });

    test("不应重复添加已完成的步骤", () => {
      useOnboardingStore.getState().completeStep("basicInfo");
      useOnboardingStore.getState().completeStep("basicInfo");
      expect(useOnboardingStore.getState().completedSteps).toEqual(["basicInfo"]);
    });

    test("应支持完成多个步骤", () => {
      useOnboardingStore.getState().completeStep("basicInfo");
      useOnboardingStore.getState().completeStep("photo");
      expect(useOnboardingStore.getState().completedSteps).toEqual(["basicInfo", "photo"]);
    });
  });

  // ==================== updateFormData ====================

  describe("updateFormData", () => {
    test("应合并部分 formData", () => {
      useOnboardingStore.getState().updateFormData({ gender: "male" });
      expect(useOnboardingStore.getState().formData.gender).toBe("male");
      // 其他字段保持默认
      expect(useOnboardingStore.getState().formData.height).toBe("");
    });

    test("应合并多个字段", () => {
      useOnboardingStore.getState().updateFormData({
        gender: "female",
        ageRange: "25-30",
        height: "165",
        weight: "55",
      });
      const formData = useOnboardingStore.getState().formData;
      expect(formData.gender).toBe("female");
      expect(formData.ageRange).toBe("25-30");
      expect(formData.height).toBe("165");
      expect(formData.weight).toBe("55");
    });

    test("多次 updateFormData 应增量合并", () => {
      useOnboardingStore.getState().updateFormData({ gender: "male" });
      useOnboardingStore.getState().updateFormData({ height: "175" });
      const formData = useOnboardingStore.getState().formData;
      expect(formData.gender).toBe("male");
      expect(formData.height).toBe("175");
    });

    test("应支持设置 photoUri", () => {
      useOnboardingStore.getState().updateFormData({
        photoUri: "file:///photo.jpg",
      });
      expect(useOnboardingStore.getState().formData.photoUri).toBe("file:///photo.jpg");
    });
  });

  // ==================== setLoading ====================

  describe("setLoading", () => {
    test("应设置加载状态为 true", () => {
      useOnboardingStore.getState().setLoading(true);
      expect(useOnboardingStore.getState().isLoading).toBe(true);
    });

    test("应设置加载状态为 false", () => {
      useOnboardingStore.getState().setLoading(true);
      useOnboardingStore.getState().setLoading(false);
      expect(useOnboardingStore.getState().isLoading).toBe(false);
    });
  });

  // ==================== resetOnboarding ====================

  describe("resetOnboarding", () => {
    test("应重置所有状态到初始值", () => {
      // 先修改所有状态
      useOnboardingStore.getState().setCurrentStep("styleTest");
      useOnboardingStore.getState().completeStep("basicInfo");
      useOnboardingStore.getState().completeStep("photo");
      useOnboardingStore.getState().updateFormData({
        gender: "male",
        height: "175",
      });
      useOnboardingStore.getState().setLoading(true);

      // 重置
      useOnboardingStore.getState().resetOnboarding();

      expect(useOnboardingStore.getState().currentStep).toBe("basicInfo");
      expect(useOnboardingStore.getState().completedSteps).toEqual([]);
      expect(useOnboardingStore.getState().formData).toEqual(DEFAULT_FORM_DATA);
      expect(useOnboardingStore.getState().isLoading).toBe(false);
    });
  });

  // ==================== goToNextStep ====================

  describe("goToNextStep", () => {
    test("应从 basicInfo 前进到 photo", () => {
      useOnboardingStore.getState().goToNextStep();
      expect(useOnboardingStore.getState().currentStep).toBe("photo");
    });

    test("应从 photo 前进到 styleTest", () => {
      useOnboardingStore.getState().setCurrentStep("photo");
      useOnboardingStore.getState().goToNextStep();
      expect(useOnboardingStore.getState().currentStep).toBe("styleTest");
    });

    test("应从 styleTest 前进到 complete", () => {
      useOnboardingStore.getState().setCurrentStep("styleTest");
      useOnboardingStore.getState().goToNextStep();
      expect(useOnboardingStore.getState().currentStep).toBe("complete");
    });

    test("在 complete 步骤调用不应越界", () => {
      useOnboardingStore.getState().setCurrentStep("complete");
      useOnboardingStore.getState().goToNextStep();
      expect(useOnboardingStore.getState().currentStep).toBe("complete");
    });

    test("连续调用应按顺序前进", () => {
      useOnboardingStore.getState().goToNextStep(); // basicInfo -> photo
      useOnboardingStore.getState().goToNextStep(); // photo -> styleTest
      useOnboardingStore.getState().goToNextStep(); // styleTest -> complete
      expect(useOnboardingStore.getState().currentStep).toBe("complete");
    });
  });

  // ==================== goToPrevStep ====================

  describe("goToPrevStep", () => {
    test("应从 photo 回退到 basicInfo", () => {
      useOnboardingStore.getState().setCurrentStep("photo");
      useOnboardingStore.getState().goToPrevStep();
      expect(useOnboardingStore.getState().currentStep).toBe("basicInfo");
    });

    test("应从 styleTest 回退到 photo", () => {
      useOnboardingStore.getState().setCurrentStep("styleTest");
      useOnboardingStore.getState().goToPrevStep();
      expect(useOnboardingStore.getState().currentStep).toBe("photo");
    });

    test("应从 complete 回退到 styleTest", () => {
      useOnboardingStore.getState().setCurrentStep("complete");
      useOnboardingStore.getState().goToPrevStep();
      expect(useOnboardingStore.getState().currentStep).toBe("styleTest");
    });

    test("在 basicInfo 步骤调用不应越界", () => {
      useOnboardingStore.getState().goToPrevStep();
      expect(useOnboardingStore.getState().currentStep).toBe("basicInfo");
    });

    test("连续调用应按顺序回退", () => {
      useOnboardingStore.getState().setCurrentStep("complete");
      useOnboardingStore.getState().goToPrevStep(); // complete -> styleTest
      useOnboardingStore.getState().goToPrevStep(); // styleTest -> photo
      useOnboardingStore.getState().goToPrevStep(); // photo -> basicInfo
      expect(useOnboardingStore.getState().currentStep).toBe("basicInfo");
    });
  });
});
