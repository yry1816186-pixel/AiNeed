import type { WithErrorBoundaryOptions } from "./withErrorBoundary";

export const screenErrorBoundaryConfigs: Record<string, WithErrorBoundaryOptions> = {
  TodayScreen: {
    screenName: "TodayScreen",
    maxRetries: 3,
    autoRecover: true,
    autoRecoverDelay: 2000,
    context: {
      screen: "today",
      fallbackTitle: "今日推荐加载失败",
      fallbackMessage: "加载今日推荐时出现问题，请重试。",
    },
  },
  DiscoverScreen: {
    screenName: "DiscoverScreen",
    maxRetries: 3,
    autoRecover: true,
    autoRecoverDelay: 2000,
    context: {
      screen: "discover",
      fallbackTitle: "发现页加载失败",
      fallbackMessage: "加载发现内容时出现问题，请重试。",
    },
  },
  OnboardingWizard: {
    screenName: "OnboardingWizard",
    maxRetries: 3,
    autoRecover: false,
    context: {
      screen: "onboarding",
      fallbackTitle: "引导流程异常",
      fallbackMessage: "引导流程加载出现问题，请重新开始。",
    },
  },
  CompleteStep: {
    screenName: "CompleteStep",
    maxRetries: 2,
    autoRecover: false,
    context: {
      screen: "onboarding/complete",
      fallbackTitle: "完成步骤异常",
      fallbackMessage: "引导完成步骤出现问题，请返回重试。",
    },
  },
  StyleTestStep: {
    screenName: "StyleTestStep",
    maxRetries: 2,
    autoRecover: false,
    context: {
      screen: "onboarding/styleTest",
      fallbackTitle: "风格测评异常",
      fallbackMessage: "风格测评加载出现问题，请重试。",
    },
  },
};
