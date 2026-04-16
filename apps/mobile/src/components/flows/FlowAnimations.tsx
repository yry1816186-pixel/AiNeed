import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, Dimensions, Platform, StatusBar, Pressable } from "react-native";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";

import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  interpolate,
  Extrapolate,
  Easing,
  runOnJS,
  cancelAnimation,
} from "react-native-reanimated";
import AnimatedReanimated from "react-native-reanimated";
import { ParticleEffect, FloatingElement, GlowText, MagneticButton } from "../../design-system/ui/FluidAnimations";
import { Colors, Spacing, BorderRadius } from '../../design-system/theme';
import { DesignTokens } from "../../design-system/theme";

const { width: SCREEN_WIDTH, height: _SCREEN_HEIGHT } = Dimensions.get("window");
const AnimatedView = AnimatedReanimated.createAnimatedComponent(View);
const _AnimatedText = AnimatedReanimated.createAnimatedComponent(Text);

export interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const logoRotate = useSharedValue(-180);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(30);
  const progressWidth = useSharedValue(0);
  const particleOpacity = useSharedValue(0);
  const glowValue = useSharedValue(0);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 500 });
    logoScale.value = withSpring(1, { damping: 10, stiffness: 100 });
    logoRotate.value = withSpring(0, { damping: 12, stiffness: 80 });

    textOpacity.value = withDelay(600, withTiming(1, { duration: 400 }));
    textTranslateY.value = withDelay(600, withSpring(0, { damping: 15, stiffness: 100 }));

    particleOpacity.value = withDelay(300, withTiming(1, { duration: 500 }));

    progressWidth.value = withTiming(1, {
      duration: 2500,
      easing: Easing.inOut(Easing.ease),
    });

    glowValue.value = withRepeat(
      withSequence(withTiming(1, { duration: 1000 }), withTiming(0, { duration: 1000 })),
      -1,
      true
    );

    const timer = setTimeout(() => {
      onFinish();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }, { rotate: `${logoRotate.value}deg` }],
    opacity: logoOpacity.value,
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: interpolate(glowValue.value, [0, 1], [0.2, 0.6]),
    shadowRadius: interpolate(glowValue.value, [0, 1], [20, 50]),
  }));

  return (
    <View style={styles.splashContainer}>
      <LinearGradient
        colors={["DesignTokens.colors.text.primary", "DesignTokens.colors.brand.slateDark", "DesignTokens.colors.brand.slateDark", DesignTokens.colors.neutral[800]]}
        locations={[0, 0.3, 0.7, 1]}
        style={styles.splashGradient}
      >
        <AnimatedView style={[styles.particleContainer, { opacity: particleOpacity }]}>
          <ParticleEffect count={40} color="rgba(198, 123, 92, 0.3)" size={3} />
        </AnimatedView>

        <AnimatedView style={[styles.splashLogoContainer, logoAnimatedStyle, glowAnimatedStyle]}>
          <LinearGradient colors={[DesignTokens.colors.brand.terracotta, DesignTokens.colors.brand.camel]} style={styles.splashLogoGradient}>
            <Text style={styles.splashLogoText}>AI</Text>
          </LinearGradient>
        </AnimatedView>

        <AnimatedView style={[styles.splashTextContainer, textAnimatedStyle]}>
          <GlowText text="寻裳" style={styles.splashTitle} glowColor={Colors.primary[400]} />
          <Text style={styles.splashSubtitle}>智能穿搭助手</Text>
        </AnimatedView>

        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            <AnimatedView style={[styles.progressFill, progressAnimatedStyle]} />
          </View>
          <Text style={styles.progressText}>正在加载...</Text>
        </View>
      </LinearGradient>
    </View>
  );
};

export interface OnboardingScreenProps {
  onComplete: () => void;
}

const ONBOARDING_DATA = [
  {
    id: "style",
    title: "发现你的风格",
    subtitle: "AI分析你的穿搭偏好，找到最适合你的时尚风格",
    icon: "✨",
    gradient: [DesignTokens.colors.brand.terracotta, DesignTokens.colors.brand.camel],
  },
  {
    id: "body",
    title: "了解你的身型",
    subtitle: "智能体型分析，为你推荐最显瘦的穿搭方案",
    icon: "👤",
    gradient: [DesignTokens.colors.semantic.info, DesignTokens.colors.semantic.infoLight],
  },
  {
    id: "color",
    title: "找到你的色彩",
    subtitle: "肤色分析，发现让你更加光彩照人的颜色",
    icon: "🎨",
    gradient: [DesignTokens.colors.semantic.success, DesignTokens.colors.semantic.successLight],
  },
  {
    id: "tryon",
    title: "虚拟试穿",
    subtitle: "AI虚拟试穿，足不出户体验万千穿搭",
    icon: "👗",
    gradient: ["DesignTokens.colors.semantic.warning", "DesignTokens.colors.semantic.warning"],
  },
];

type OnboardingItem = (typeof ONBOARDING_DATA)[number];

interface OnboardingDotProps {
  color: string;
  isActive: boolean;
}

const OnboardingDot: React.FC<OnboardingDotProps> = ({ color, isActive }) => {
  const dotScale = useSharedValue(1);
  const dotOpacity = useSharedValue(0.4);

  useEffect(() => {
    if (isActive) {
      dotScale.value = withSpring(1.3, { damping: 15, stiffness: 200 });
      dotOpacity.value = withTiming(1, { duration: 200 });
      return;
    }

    dotScale.value = withSpring(1, { damping: 15, stiffness: 200 });
    dotOpacity.value = withTiming(0.4, { duration: 200 });
  }, [isActive]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
    opacity: dotOpacity.value,
  }));

  return <AnimatedView style={[styles.dot, { backgroundColor: color }, dotStyle]} />;
};

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const slideOffset = useSharedValue(0);

  const goToNext = useCallback(() => {
    if (currentIndex < ONBOARDING_DATA.length - 1) {
      slideOffset.value = withSpring(-(currentIndex + 1) * SCREEN_WIDTH, {
        damping: 15,
        stiffness: 100,
      });
      setCurrentIndex((prev) => prev + 1);
    } else {
      onComplete();
    }
  }, [currentIndex]);

  const skip = useCallback(() => {
    onComplete();
  }, []);

  return (
    <View style={styles.onboardingContainer}>
      <LinearGradient colors={["DesignTokens.colors.text.primary", "DesignTokens.colors.brand.slateDark", "DesignTokens.colors.brand.slateDark"]} style={styles.onboardingGradient}>
        <View style={styles.onboardingHeader}>
          <Pressable onPress={skip}>
            <Text style={styles.skipText}>跳过</Text>
          </Pressable>
        </View>

        <AnimatedView
          style={[styles.slidesContainer, { transform: [{ translateX: slideOffset }] }]}
        >
          {ONBOARDING_DATA.map((item, index) => (
            <OnboardingSlide key={item.id} data={item} isActive={index === currentIndex} />
          ))}
        </AnimatedView>

        <View style={styles.onboardingFooter}>
          <View style={styles.dotsContainer}>
            {ONBOARDING_DATA.map((_, index) => (
              <OnboardingDot
                key={index}
                color={ONBOARDING_DATA[index].gradient[0]}
                isActive={index === currentIndex}
              />
            ))}
          </View>

          <MagneticButton
            title={currentIndex === ONBOARDING_DATA.length - 1 ? "开始体验" : "下一步"}
            onPress={goToNext}
            size="lg"
          />
        </View>
      </LinearGradient>
    </View>
  );
};

interface OnboardingSlideProps {
  data: OnboardingItem;
  isActive: boolean;
}

const OnboardingSlide: React.FC<OnboardingSlideProps> = ({ data, isActive }) => {
  const iconScale = useSharedValue(0);
  const iconRotate = useSharedValue(-90);
  const titleOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);
  const glowValue = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      iconScale.value = withSpring(1, { damping: 12, stiffness: 100 });
      iconRotate.value = withSpring(0, { damping: 12, stiffness: 80 });
      titleOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));
      subtitleOpacity.value = withDelay(400, withTiming(1, { duration: 400 }));

      glowValue.value = withRepeat(
        withSequence(withTiming(1, { duration: 1500 }), withTiming(0, { duration: 1500 })),
        -1,
        true
      );
    } else {
      iconScale.value = withTiming(0.8, { duration: 200 });
      titleOpacity.value = withTiming(0, { duration: 200 });
      subtitleOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [isActive]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }, { rotate: `${iconRotate.value}deg` }],
    shadowColor: data.gradient[0],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: interpolate(glowValue.value, [0, 1], [0.2, 0.5]),
    shadowRadius: interpolate(glowValue.value, [0, 1], [20, 40]),
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  const subtitleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  return (
    <View style={styles.slide}>
      <AnimatedView style={[styles.slideIconContainer, iconAnimatedStyle]}>
        <LinearGradient colors={data.gradient as [string, string]} style={styles.slideIconGradient}>
          <FloatingElement amplitude={5} duration={3000}>
            <Text style={styles.slideIcon}>{data.icon}</Text>
          </FloatingElement>
        </LinearGradient>
      </AnimatedView>

      <AnimatedView style={[styles.slideTextContainer, titleAnimatedStyle]}>
        <GlowText text={data.title} style={styles.slideTitle} glowColor={data.gradient[0]} />
      </AnimatedView>

      <AnimatedView style={[styles.slideTextContainer, subtitleAnimatedStyle]}>
        <Text style={styles.slideSubtitle}>{data.subtitle}</Text>
      </AnimatedView>
    </View>
  );
};

export interface CameraGuideAnimationProps {
  onCapture: () => void;
  onCancel: () => void;
}

export const CameraGuideAnimation: React.FC<CameraGuideAnimationProps> = ({
  onCapture,
  onCancel,
}) => {
  const frameScale = useSharedValue(1);
  const frameOpacity = useSharedValue(0);
  const cornerScale = useSharedValue(0);
  const guideOpacity = useSharedValue(0);
  const pulseValue = useSharedValue(0);
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    frameOpacity.value = withTiming(1, { duration: 500 });
    frameScale.value = withSpring(1, { damping: 15, stiffness: 100 });

    cornerScale.value = withDelay(300, withSpring(1, { damping: 12, stiffness: 100 }));

    guideOpacity.value = withDelay(600, withTiming(1, { duration: 400 }));

    pulseValue.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const frameAnimatedStyle = useAnimatedStyle(() => {
    "worklet";
    const borderColorValue = pulseValue.value;
    return {
      transform: [{ scale: frameScale.value }],
      opacity: frameOpacity.value,
      borderColor: borderColorValue > 0.5 ? "rgba(198, 123, 92, 0.8)" : "rgba(198, 123, 92, 0.3)",
    };
  });

  const cornerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cornerScale.value }],
  }));

  const guideAnimatedStyle = useAnimatedStyle(() => ({
    opacity: guideOpacity.value,
  }));

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulseValue.value, [0, 1], [0.3, 0.8]),
    transform: [{ scale: interpolate(pulseValue.value, [0, 1], [0.95, 1.05]) }],
  }));

  const handlePressIn = () => {
    buttonScale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    buttonScale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  return (
    <View style={styles.cameraGuideContainer}>
      <View style={styles.cameraHeader}>
        <Pressable onPress={onCancel} style={styles.closeButton}>
          <Text style={styles.closeIcon}>✕</Text>
        </Pressable>
        <Text style={styles.cameraTitle}>拍摄全身照</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.cameraPreview}>
        <AnimatedView style={[styles.guideFrame, frameAnimatedStyle]}>
          <AnimatedView style={[styles.corner, styles.cornerTL, cornerAnimatedStyle]} />
          <AnimatedView style={[styles.corner, styles.cornerTR, cornerAnimatedStyle]} />
          <AnimatedView style={[styles.corner, styles.cornerBL, cornerAnimatedStyle]} />
          <AnimatedView style={[styles.corner, styles.cornerBR, cornerAnimatedStyle]} />

          <AnimatedView style={[styles.bodyGuide, pulseAnimatedStyle]}>
            <Text style={styles.bodyGuideIcon}>👤</Text>
          </AnimatedView>
        </AnimatedView>

        <AnimatedView style={[styles.guideText, guideAnimatedStyle]}>
          <Text style={styles.guideTitle}>请站在框内</Text>
          <Text style={styles.guideSubtitle}>保持全身可见，光线充足</Text>
        </AnimatedView>
      </View>

      <View style={styles.cameraFooter}>
        <AnimatedView style={[styles.captureButton, buttonAnimatedStyle]}>
          <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={onCapture}
            style={styles.captureButtonInner}
          >
            <LinearGradient colors={[DesignTokens.colors.brand.terracotta, DesignTokens.colors.brand.camel]} style={styles.captureButtonGradient}>
              <Text style={styles.captureIcon}>📷</Text>
            </LinearGradient>
          </Pressable>
        </AnimatedView>
      </View>
    </View>
  );
};

export interface AnalysisAnimationProps {
  type: "body" | "color" | "style" | "tryon";
  onComplete: (result: Record<string, unknown>) => void;
}

const ANALYSIS_CONFIG = {
  body: {
    title: "体型分析中",
    steps: ["检测人体轮廓", "分析身体比例", "识别体型特征", "生成分析报告"],
    icon: "👤",
    gradient: [DesignTokens.colors.semantic.info, DesignTokens.colors.semantic.infoLight],
  },
  color: {
    title: "肤色分析中",
    steps: ["提取皮肤区域", "分析肤色色调", "匹配色彩季节", "生成配色建议"],
    icon: "🎨",
    gradient: [DesignTokens.colors.semantic.success, DesignTokens.colors.semantic.successLight],
  },
  style: {
    title: "风格分析中",
    steps: ["识别服装元素", "分析穿搭风格", "匹配流行趋势", "生成风格报告"],
    icon: "✨",
    gradient: [DesignTokens.colors.brand.terracotta, DesignTokens.colors.brand.camel],
  },
  tryon: {
    title: "虚拟试穿中",
    steps: ["处理人物图像", "分析服装属性", "生成试穿效果", "优化细节"],
    icon: "👗",
    gradient: ["DesignTokens.colors.semantic.warning", "DesignTokens.colors.semantic.warning"],
  },
};

interface AnalysisStepItemProps {
  accentColor: string;
  currentStep: number;
  index: number;
  step: string;
}

const AnalysisStepItem: React.FC<AnalysisStepItemProps> = ({
  accentColor,
  currentStep,
  index,
  step,
}) => {
  const stepOpacity = useSharedValue(0.3);
  const stepScale = useSharedValue(1);

  useEffect(() => {
    if (index === currentStep) {
      stepOpacity.value = withTiming(1, { duration: 300 });
      stepScale.value = withSpring(1.05, { damping: 15, stiffness: 200 });
      return;
    }

    if (index < currentStep) {
      stepOpacity.value = withTiming(0.7, { duration: 300 });
      stepScale.value = withSpring(1, { damping: 15, stiffness: 200 });
      return;
    }

    stepOpacity.value = withTiming(0.3, { duration: 300 });
    stepScale.value = withSpring(1, { damping: 15, stiffness: 200 });
  }, [currentStep, index]);

  const stepAnimatedStyle = useAnimatedStyle(() => ({
    opacity: stepOpacity.value,
    transform: [{ scale: stepScale.value }],
  }));

  return (
    <AnimatedView style={[styles.stepItem, stepAnimatedStyle]}>
      <View
        style={[
          styles.stepDot,
          {
            backgroundColor: index <= currentStep ? accentColor : "rgba(255,255,255,0.2)",
          },
        ]}
      />
      <Text
        style={[
          styles.stepText,
          {
            color: index <= currentStep ? Colors.white : "rgba(255,255,255,0.4)",
          },
        ]}
      >
        {step}
      </Text>
      {index < currentStep && <Text style={styles.stepCheck}>✓</Text>}
    </AnimatedView>
  );
};

export const AnalysisAnimation: React.FC<AnalysisAnimationProps> = ({ type, onComplete }) => {
  const config = ANALYSIS_CONFIG[type];
  const [currentStep, setCurrentStep] = useState(0);

  const iconScale = useSharedValue(1);
  const iconRotate = useSharedValue(0);
  const progressValue = useSharedValue(0);
  const glowValue = useSharedValue(0);
  const particleOpacity = useSharedValue(0);

  useEffect(() => {
    iconScale.value = withRepeat(
      withSequence(
        withSpring(1.1, { damping: 10, stiffness: 100 }),
        withSpring(1, { damping: 10, stiffness: 100 })
      ),
      -1,
      true
    );

    iconRotate.value = withRepeat(
      withSequence(withTiming(5, { duration: 1000 }), withTiming(-5, { duration: 1000 })),
      -1,
      true
    );

    glowValue.value = withRepeat(
      withSequence(withTiming(1, { duration: 800 }), withTiming(0, { duration: 800 })),
      -1,
      true
    );

    particleOpacity.value = withTiming(1, { duration: 500 });

    const stepDuration = 1500;
    const totalSteps = config.steps.length;

    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < totalSteps - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, stepDuration);

    progressValue.value = withTiming(1, {
      duration: totalSteps * stepDuration,
    });

    const completeTimer = setTimeout(() => {
      onComplete({ success: true, type });
    }, totalSteps * stepDuration + 500);

    return () => {
      clearInterval(stepInterval);
      clearTimeout(completeTimer);
    };
  }, []);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }, { rotate: `${iconRotate.value}deg` }],
    shadowColor: config.gradient[0],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: interpolate(glowValue.value, [0, 1], [0.2, 0.6]),
    shadowRadius: interpolate(glowValue.value, [0, 1], [20, 50]),
  }));

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%`,
  }));

  return (
    <View style={styles.analysisContainer}>
      <LinearGradient colors={["DesignTokens.colors.text.primary", "DesignTokens.colors.brand.slateDark", "DesignTokens.colors.brand.slateDark"]} style={styles.analysisGradient}>
        <AnimatedView style={[styles.particleContainer, { opacity: particleOpacity }]}>
          <ParticleEffect count={30} color={`${config.gradient[0]}50`} size={3} />
        </AnimatedView>

        <AnimatedView style={[styles.analysisIconContainer, iconAnimatedStyle]}>
          <LinearGradient
            colors={config.gradient as [string, string]}
            style={styles.analysisIconGradient}
          >
            <Text style={styles.analysisIcon}>{config.icon}</Text>
          </LinearGradient>
        </AnimatedView>

        <GlowText text={config.title} style={styles.analysisTitle} glowColor={config.gradient[0]} />

        <View style={styles.stepsContainer}>
          {config.steps.map((step, index) => (
            <AnalysisStepItem
              key={`${type}-${index}`}
              accentColor={config.gradient[0]}
              currentStep={currentStep}
              index={index}
              step={step}
            />
          ))}
        </View>

        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <AnimatedView
              style={[
                styles.progressBarFill,
                { backgroundColor: config.gradient[0] },
                progressAnimatedStyle,
              ]}
            />
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

export interface ResultAnimationProps {
  type: "body" | "color" | "style" | "tryon";
  result: Record<string, unknown>;
  onContinue: () => void;
  onRetry: () => void;
}

export const ResultAnimation: React.FC<ResultAnimationProps> = ({
  type,
  result,
  onContinue,
  onRetry,
}) => {
  const config = ANALYSIS_CONFIG[type];

  const containerScale = useSharedValue(0.8);
  const containerOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);
  const celebrationOpacity = useSharedValue(0);

  useEffect(() => {
    containerOpacity.value = withTiming(1, { duration: 400 });
    containerScale.value = withSpring(1, { damping: 12, stiffness: 100 });

    contentOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));

    celebrationOpacity.value = withDelay(200, withTiming(1, { duration: 300 }));

    buttonOpacity.value = withDelay(800, withTiming(1, { duration: 400 }));
  }, []);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: containerScale.value }],
    opacity: containerOpacity.value,
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
  }));

  const celebrationAnimatedStyle = useAnimatedStyle(() => ({
    opacity: celebrationOpacity.value,
  }));

  return (
    <View style={styles.resultContainer}>
      <LinearGradient colors={["DesignTokens.colors.text.primary", "DesignTokens.colors.brand.slateDark", "DesignTokens.colors.brand.slateDark"]} style={styles.resultGradient}>
        <AnimatedView style={[styles.celebrationContainer, celebrationAnimatedStyle]}>
          <ParticleEffect count={50} color={config.gradient[0]} size={4} />
        </AnimatedView>

        <AnimatedView style={[styles.resultContent, containerAnimatedStyle]}>
          <LinearGradient
            colors={config.gradient as [string, string]}
            style={styles.resultIconGradient}
          >
            <Text style={styles.resultIcon}>{config.icon}</Text>
          </LinearGradient>

          <AnimatedView style={contentAnimatedStyle}>
            <GlowText text="分析完成" style={styles.resultTitle} glowColor={config.gradient[0]} />
            <Text style={styles.resultSubtitle}>您的专属分析报告已生成</Text>
          </AnimatedView>
        </AnimatedView>

        <AnimatedView style={[styles.resultButtons, buttonAnimatedStyle]}>
          <MagneticButton title="查看结果" onPress={onContinue} size="lg" />
          <Pressable onPress={onRetry} style={styles.retryButton}>
            <Text style={styles.retryText}>重新分析</Text>
          </Pressable>
        </AnimatedView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
  },
  splashGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  particleContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  splashLogoContainer: {
    marginBottom: Spacing[8],
  },
  splashLogoGradient: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius["4xl"],
    alignItems: "center",
    justifyContent: "center",
  },
  splashLogoText: {
    fontSize: DesignTokens.typography.sizes['5xl'],
    fontWeight: "900",
    color: Colors.white,
  },
  splashTextContainer: {
    alignItems: "center",
  },
  splashTitle: {
    fontSize: DesignTokens.typography.sizes['5xl'],
    fontWeight: "900",
    color: Colors.white,
    letterSpacing: -2,
  },
  splashSubtitle: {
    fontSize: DesignTokens.typography.sizes.md,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: Spacing[2],
  },
  progressContainer: {
    position: "absolute",
    bottom: 80,
    width: SCREEN_WIDTH - 80,
    alignItems: "center",
  },
  progressBackground: {
    width: "100%",
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.primary[500],
    borderRadius: BorderRadius.full,
  },
  progressText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: "rgba(255, 255, 255, 0.5)",
    marginTop: Spacing[3],
  },
  onboardingContainer: {
    flex: 1,
  },
  onboardingGradient: {
    flex: 1,
  },
  onboardingHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: Spacing[5],
    paddingTop: Platform.OS === "ios" ? 60 : (StatusBar.currentHeight || 24) + 20,
  },
  skipText: {
    fontSize: DesignTokens.typography.sizes.md,
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: "500",
  },
  slidesContainer: {
    flex: 1,
    flexDirection: "row",
    width: SCREEN_WIDTH * 4,
  },
  slide: {
    width: SCREEN_WIDTH,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing[8],
  },
  slideIconContainer: {
    marginBottom: Spacing[10],
  },
  slideIconGradient: {
    width: 160,
    height: 160,
    borderRadius: BorderRadius["5xl"],
    alignItems: "center",
    justifyContent: "center",
  },
  slideIcon: {
    fontSize: DesignTokens.typography.sizes['6xl'],
  },
  slideTextContainer: {
    alignItems: "center",
    marginBottom: Spacing[4],
  },
  slideTitle: {
    fontSize: DesignTokens.typography.sizes['3xl'],
    fontWeight: "800",
    color: Colors.white,
    textAlign: "center",
    letterSpacing: -1,
  },
  slideSubtitle: {
    fontSize: DesignTokens.typography.sizes.md,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    lineHeight: 24,
    marginTop: Spacing[3],
  },
  onboardingFooter: {
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[10],
    alignItems: "center",
    gap: Spacing[6],
  },
  dotsContainer: {
    flexDirection: "row",
    gap: Spacing[2],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.full,
  },
  cameraGuideContainer: {
    flex: 1,
    backgroundColor: "DesignTokens.colors.text.primary", // custom color
  },
  cameraHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing[5],
    paddingTop: Platform.OS === "ios" ? 60 : (StatusBar.currentHeight || 24) + 20,
    paddingBottom: Spacing[4],
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeIcon: {
    fontSize: DesignTokens.typography.sizes.lg,
    color: Colors.white,
  },
  cameraTitle: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "700",
    color: Colors.white,
  },
  placeholder: {
    width: 40,
  },
  cameraPreview: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  guideFrame: {
    width: SCREEN_WIDTH - 80,
    height: SCREEN_WIDTH * 1.4,
    borderWidth: 2,
    borderColor: "rgba(198, 123, 92, 0.5)",
    borderRadius: BorderRadius["3xl"],
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: Colors.primary[500],
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: BorderRadius["2xl"],
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: BorderRadius["2xl"],
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: BorderRadius["2xl"],
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: BorderRadius["2xl"],
  },
  bodyGuide: {
    width: 120,
    height: 200,
    borderRadius: BorderRadius["3xl"],
    borderWidth: 2,
    borderColor: "rgba(198, 123, 92, 0.3)",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  bodyGuideIcon: {
    fontSize: DesignTokens.typography.sizes['5xl'],
    opacity: 0.5,
  },
  guideText: {
    alignItems: "center",
    marginTop: Spacing[6],
  },
  guideTitle: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "700",
    color: Colors.white,
  },
  guideSubtitle: {
    fontSize: DesignTokens.typography.sizes.base,
    color: "rgba(255, 255, 255, 0.5)",
    marginTop: Spacing[2],
  },
  cameraFooter: {
    alignItems: "center",
    paddingVertical: Spacing[8],
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  captureButtonInner: {
    flex: 1,
  },
  captureButtonGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  captureIcon: {
    fontSize: DesignTokens.typography.sizes['3xl'],
  },
  analysisContainer: {
    flex: 1,
  },
  analysisGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing[8],
  },
  analysisIconContainer: {
    marginBottom: Spacing[8],
  },
  analysisIconGradient: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius["4xl"],
    alignItems: "center",
    justifyContent: "center",
  },
  analysisIcon: {
    fontSize: DesignTokens.typography.sizes['5xl'],
  },
  analysisTitle: {
    fontSize: DesignTokens.typography.sizes['3xl'],
    fontWeight: "800",
    color: Colors.white,
    marginBottom: Spacing[10],
  },
  stepsContainer: {
    width: "100%",
    marginBottom: Spacing[10],
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing[3],
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: BorderRadius.full,
    marginRight: Spacing[4],
  },
  stepText: {
    fontSize: DesignTokens.typography.sizes.md,
    flex: 1,
  },
  stepCheck: {
    fontSize: DesignTokens.typography.sizes.md,
    color: Colors.emerald[400],
    fontWeight: "700",
  },
  progressBarContainer: {
    width: "100%",
  },
  progressBarBackground: {
    width: "100%",
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: BorderRadius.full,
  },
  resultContainer: {
    flex: 1,
  },
  resultGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing[8],
  },
  celebrationContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  resultContent: {
    alignItems: "center",
  },
  resultIconGradient: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius["4xl"],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing[6],
  },
  resultIcon: {
    fontSize: DesignTokens.typography.sizes['5xl'],
  },
  resultTitle: {
    fontSize: DesignTokens.typography.sizes['3xl'],
    fontWeight: "800",
    color: Colors.white,
    marginBottom: Spacing[2],
  },
  resultSubtitle: {
    fontSize: DesignTokens.typography.sizes.md,
    color: "rgba(255, 255, 255, 0.6)",
  },
  resultButtons: {
    position: "absolute",
    bottom: Spacing[12],
    alignItems: "center",
    gap: Spacing[4],
  },
  retryButton: {
    paddingVertical: Spacing[3],
  },
  retryText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: "500",
  },
});
