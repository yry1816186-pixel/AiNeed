import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  StatusBar,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import { LinearGradient } from '@/src/polyfills/expo-linear-gradient';
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  interpolate,
  Extrapolate,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import AnimatedReanimated from "react-native-reanimated";
import {
  MagneticButton,
  GlowText,
  FloatingElement,
  ParticleEffect,
} from "../ui/FluidAnimations";
import {
  Colors,
  Spacing,
  BorderRadius,
  Shadows,
  Typography,
} from "../../theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const AnimatedView = AnimatedReanimated.createAnimatedComponent(View);
const AnimatedText = AnimatedReanimated.createAnimatedComponent(Text);

export interface ProfileSetupScreenProps {
  onComplete: (data: ProfileData) => void;
}

interface ProfileData {
  nickname: string;
  gender: "male" | "female" | "other";
  birthYear: number;
  height: number;
  weight: number;
  stylePreferences: string[];
}

const STYLE_OPTIONS = [
  { id: "casual", name: "休闲", icon: "☕", color: Colors.amber[500] },
  { id: "formal", name: "商务", icon: "💼", color: Colors.neutral[700] },
  { id: "streetwear", name: "街头", icon: "🔥", color: Colors.rose[500] },
  { id: "minimalist", name: "极简", icon: "✨", color: Colors.sky[500] },
  { id: "vintage", name: "复古", icon: "🎭", color: Colors.emerald[500] },
  { id: "bohemian", name: "波西米亚", icon: "🌸", color: Colors.primary[500] },
];

const STEP_CONFIG = [
  { id: "welcome", title: "欢迎", subtitle: "让我们了解你" },
  { id: "basic", title: "基本信息", subtitle: "你的称呼是？" },
  { id: "gender", title: "性别", subtitle: "帮助我们更好地推荐" },
  { id: "body", title: "身材数据", subtitle: "用于精准推荐尺码" },
  { id: "style", title: "风格偏好", subtitle: "选择你喜欢的风格" },
  { id: "complete", title: "完成", subtitle: "一切准备就绪" },
];

export const ProfileSetupScreen: React.FC<ProfileSetupScreenProps> = ({
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [profileData, setProfileData] = useState<Partial<ProfileData>>({});
  const [nickname, setNickname] = useState("");
  const [selectedGender, setSelectedGender] = useState<
    "male" | "female" | "other" | null
  >(null);
  const [height, setHeight] = useState("165");
  const [weight, setWeight] = useState("55");
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);

  const slideOffset = useSharedValue(0);
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    progressWidth.value = withSpring((currentStep + 1) / STEP_CONFIG.length, {
      damping: 15,
      stiffness: 100,
    });
  }, [currentStep]);

  const goToNext = useCallback(() => {
    if (currentStep < STEP_CONFIG.length - 1) {
      slideOffset.value = withSpring(-(currentStep + 1) * SCREEN_WIDTH, {
        damping: 15,
        stiffness: 100,
      });
      setCurrentStep((prev) => prev + 1);
    } else {
      onComplete(profileData as ProfileData);
    }
  }, [currentStep, profileData]);

  const goToPrev = useCallback(() => {
    if (currentStep > 0) {
      slideOffset.value = withSpring(-(currentStep - 1) * SCREEN_WIDTH, {
        damping: 15,
        stiffness: 100,
      });
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }));

  const WelcomeStep: React.FC = () => {
    const logoScale = useSharedValue(0);
    const textOpacity = useSharedValue(0);
    const buttonOpacity = useSharedValue(0);

    useEffect(() => {
      logoScale.value = withSpring(1, { damping: 12, stiffness: 100 });
      textOpacity.value = withDelay(300, withTiming(1, { duration: 500 }));
      buttonOpacity.value = withDelay(800, withTiming(1, { duration: 400 }));
    }, []);

    const logoAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: logoScale.value }],
    }));

    const textAnimatedStyle = useAnimatedStyle(() => ({
      opacity: textOpacity.value,
    }));

    const buttonAnimatedStyle = useAnimatedStyle(() => ({
      opacity: buttonOpacity.value,
    }));

    return (
      <View style={styles.stepContent}>
        <ParticleEffect count={30} color="rgba(168, 85, 247, 0.3)" size={3} />

        <AnimatedView style={[styles.welcomeLogo, logoAnimatedStyle]}>
          <LinearGradient
            colors={["#a855f7", "#ec4899"]}
            style={styles.welcomeLogoGradient}
          >
            <Text style={styles.welcomeLogoText}>AI</Text>
          </LinearGradient>
        </AnimatedView>

        <AnimatedView style={textAnimatedStyle}>
          <GlowText
            text="欢迎使用 AiNeed"
            style={styles.welcomeTitle}
            glowColor={Colors.primary[400]}
          />
          <Text style={styles.welcomeSubtitle}>
            让我们花1分钟了解你{"\n"}为你打造专属穿搭体验
          </Text>
        </AnimatedView>

        <AnimatedView style={[styles.welcomeButton, buttonAnimatedStyle]}>
          <MagneticButton title="开始设置" onPress={goToNext} size="xl" />
        </AnimatedView>
      </View>
    );
  };

  const BasicStep: React.FC = () => {
    const inputScale = useSharedValue(0.9);
    const inputOpacity = useSharedValue(0);
    const inputFocus = useSharedValue(0);

    useEffect(() => {
      inputOpacity.value = withTiming(1, { duration: 400 });
      inputScale.value = withSpring(1, { damping: 15, stiffness: 100 });
    }, []);

    const inputAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: inputScale.value }],
      opacity: inputOpacity.value,
    }));

    const handleFocus = () => {
      inputFocus.value = withTiming(1, { duration: 200 });
    };

    const handleBlur = () => {
      inputFocus.value = withTiming(0, { duration: 200 });
    };

    const borderAnimatedStyle = useAnimatedStyle(() => {
      "worklet";
      const focusValue = inputFocus.value;
      return {
        borderColor:
          focusValue > 0.5 ? Colors.primary[500] : "rgba(255, 255, 255, 0.2)",
        shadowOpacity: interpolate(inputFocus.value, [0, 1], [0, 0.3]),
      };
    });

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>你的称呼是？</Text>
        <Text style={styles.stepSubtitle}>我们会用这个名字称呼你</Text>

        <AnimatedView style={[styles.inputContainer, inputAnimatedStyle]}>
          <AnimatedView style={[styles.inputWrapper, borderAnimatedStyle]}>
            <TextInput
              style={styles.textInput}
              placeholder="输入你的昵称"
              placeholderTextColor="rgba(255, 255, 255, 0.3)"
              value={nickname}
              onChangeText={setNickname}
              onFocus={handleFocus}
              onBlur={handleBlur}
              autoFocus
            />
          </AnimatedView>
        </AnimatedView>

        <View style={styles.stepFooter}>
          <MagneticButton
            title="继续"
            onPress={() => {
              setProfileData((prev) => ({ ...prev, nickname }));
              goToNext();
            }}
            size="lg"
            disabled={!nickname.trim()}
          />
        </View>
      </View>
    );
  };

  const GenderOptionCard: React.FC<{
    option: {
      id: "male" | "female" | "other";
      label: string;
      icon: string;
      color: string;
    };
    index: number;
    selected: boolean;
    onPress: () => void;
  }> = ({ option, index, selected, onPress }) => {
    const scale = useSharedValue(0);

    useEffect(() => {
      scale.value = withDelay(
        index * 100,
        withSpring(1, { damping: 12, stiffness: 100 }),
      );
    }, [index, scale]);

    useEffect(() => {
      scale.value = withSpring(selected ? 1.05 : 1, {
        damping: 12,
        stiffness: 200,
      });
    }, [scale, selected]);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    return (
      <Pressable onPress={onPress}>
        <AnimatedView
          style={[
            styles.genderOption,
            {
              borderColor: selected ? option.color : "rgba(255, 255, 255, 0.1)",
            },
            animatedStyle,
          ]}
        >
          <LinearGradient
            colors={
              selected
                ? [option.color, `${option.color}cc`]
                : ["rgba(255,255,255,0.05)", "rgba(255,255,255,0.02)"]
            }
            style={styles.genderOptionGradient}
          >
            <FloatingElement amplitude={selected ? 5 : 0} duration={3000}>
              <Text style={styles.genderIcon}>{option.icon}</Text>
            </FloatingElement>
            <Text
              style={[styles.genderLabel, selected && { color: Colors.white }]}
            >
              {option.label}
            </Text>
          </LinearGradient>
        </AnimatedView>
      </Pressable>
    );
  };

  const GenderStep: React.FC = () => {
    const options = [
      { id: "male", label: "男生", icon: "👨", color: Colors.sky[500] },
      { id: "female", label: "女生", icon: "👩", color: Colors.rose[500] },
      { id: "other", label: "其他", icon: "🧑", color: Colors.primary[500] },
    ];

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>你的性别是？</Text>
        <Text style={styles.stepSubtitle}>帮助我们推荐更合适的服装</Text>

        <View style={styles.genderOptions}>
          {options.map((option, index) => (
            <GenderOptionCard
              key={option.id}
              option={
                option as {
                  id: "male" | "female" | "other";
                  label: string;
                  icon: string;
                  color: string;
                }
              }
              index={index}
              selected={selectedGender === option.id}
              onPress={() =>
                setSelectedGender(option.id as "male" | "female" | "other")
              }
            />
          ))}
        </View>

        <View style={styles.stepFooter}>
          <MagneticButton
            title="继续"
            onPress={() => {
              setProfileData((prev) => ({
                ...prev,
                gender: selectedGender ?? undefined,
              }));
              goToNext();
            }}
            size="lg"
            disabled={!selectedGender}
          />
        </View>
      </View>
    );
  };

  const BodyStep: React.FC = () => {
    const heightValue = useSharedValue(0);
    const weightValue = useSharedValue(0);

    useEffect(() => {
      heightValue.value = withSpring(1, { damping: 15, stiffness: 100 });
      weightValue.value = withDelay(
        200,
        withSpring(1, { damping: 15, stiffness: 100 }),
      );
    }, []);

    const heightAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: heightValue.value }],
      opacity: heightValue.value,
    }));

    const weightAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: weightValue.value }],
      opacity: weightValue.value,
    }));

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>你的身材数据</Text>
        <Text style={styles.stepSubtitle}>用于精准推荐尺码和搭配</Text>

        <AnimatedView style={[styles.bodyInputContainer, heightAnimatedStyle]}>
          <Text style={styles.bodyInputLabel}>身高</Text>
          <View style={styles.bodyInputRow}>
            <TextInput
              style={styles.bodyInput}
              value={height}
              onChangeText={setHeight}
              keyboardType="numeric"
              placeholder="165"
              placeholderTextColor="rgba(255, 255, 255, 0.3)"
            />
            <Text style={styles.bodyInputUnit}>cm</Text>
          </View>
        </AnimatedView>

        <AnimatedView style={[styles.bodyInputContainer, weightAnimatedStyle]}>
          <Text style={styles.bodyInputLabel}>体重</Text>
          <View style={styles.bodyInputRow}>
            <TextInput
              style={styles.bodyInput}
              value={weight}
              onChangeText={setWeight}
              keyboardType="numeric"
              placeholder="55"
              placeholderTextColor="rgba(255, 255, 255, 0.3)"
            />
            <Text style={styles.bodyInputUnit}>kg</Text>
          </View>
        </AnimatedView>

        <View style={styles.stepFooter}>
          <MagneticButton
            title="继续"
            onPress={() => {
              setProfileData((prev) => ({
                ...prev,
                height: parseInt(height) || 165,
                weight: parseInt(weight) || 55,
              }));
              goToNext();
            }}
            size="lg"
          />
        </View>
      </View>
    );
  };

  const StyleOptionCard: React.FC<{
    option: (typeof STYLE_OPTIONS)[number];
    index: number;
    selected: boolean;
    onPress: () => void;
  }> = ({ option, index, selected, onPress }) => {
    const scale = useSharedValue(0);

    useEffect(() => {
      scale.value = withDelay(
        index * 80,
        withSpring(1, { damping: 12, stiffness: 100 }),
      );
    }, [index, scale]);

    useEffect(() => {
      scale.value = withSpring(selected ? 1.05 : 1, {
        damping: 12,
        stiffness: 200,
      });
    }, [scale, selected]);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    return (
      <Pressable onPress={onPress} style={styles.styleOptionPressable}>
        <AnimatedView
          style={[
            styles.styleOption,
            {
              borderColor: selected ? option.color : "rgba(255, 255, 255, 0.1)",
            },
            animatedStyle,
          ]}
        >
          <LinearGradient
            colors={
              selected
                ? [`${option.color}30`, `${option.color}10`]
                : ["rgba(255,255,255,0.03)", "rgba(255,255,255,0.01)"]
            }
            style={styles.styleOptionGradient}
          >
            <Text style={styles.styleIcon}>{option.icon}</Text>
            <Text style={styles.styleName}>{option.name}</Text>
            {selected && (
              <View
                style={[styles.styleCheck, { backgroundColor: option.color }]}
              >
                <Text style={styles.styleCheckIcon}>{"\u2713"}</Text>
              </View>
            )}
          </LinearGradient>
        </AnimatedView>
      </Pressable>
    );
  };

  const StyleStep: React.FC = () => {
    const toggleStyle = (styleId: string) => {
      setSelectedStyles((prev) =>
        prev.includes(styleId)
          ? prev.filter((id) => id !== styleId)
          : [...prev, styleId],
      );
    };

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>你喜欢什么风格？</Text>
        <Text style={styles.stepSubtitle}>选择1-3个你喜欢的风格</Text>

        <View style={styles.styleOptions}>
          {STYLE_OPTIONS.map((style, index) => {
            const StyleItem: React.FC = () => {
              const scale = useSharedValue(0);
              const isSelected = selectedStyles.includes(style.id);

              useEffect(() => {
                scale.value = withDelay(
                  index * 80,
                  withSpring(1, { damping: 12, stiffness: 100 }),
                );
              }, []);

              useEffect(() => {
                if (isSelected) {
                  scale.value = withSpring(1.05, {
                    damping: 12,
                    stiffness: 200,
                  });
                } else {
                  scale.value = withSpring(1, { damping: 12, stiffness: 200 });
                }
              }, [isSelected]);

              const animatedStyle = useAnimatedStyle(() => ({
                transform: [{ scale: scale.value }],
              }));

              return (
                <Pressable
                  key={style.id}
                  onPress={() => toggleStyle(style.id)}
                  style={styles.styleOptionPressable}
                >
                  <AnimatedView
                    style={[
                      styles.styleOption,
                      {
                        borderColor: isSelected
                          ? style.color
                          : "rgba(255, 255, 255, 0.1)",
                      },
                      animatedStyle,
                    ]}
                  >
                    <LinearGradient
                      colors={
                        isSelected
                          ? [`${style.color}30`, `${style.color}10`]
                          : ["rgba(255,255,255,0.03)", "rgba(255,255,255,0.01)"]
                      }
                      style={styles.styleOptionGradient}
                    >
                      <Text style={styles.styleIcon}>{style.icon}</Text>
                      <Text style={styles.styleName}>{style.name}</Text>
                      {isSelected && (
                        <View
                          style={[
                            styles.styleCheck,
                            { backgroundColor: style.color },
                          ]}
                        >
                          <Text style={styles.styleCheckIcon}>✓</Text>
                        </View>
                      )}
                    </LinearGradient>
                  </AnimatedView>
                </Pressable>
              );
            };

            return (
              <StyleOptionCard
                key={style.id}
                option={style}
                index={index}
                selected={selectedStyles.includes(style.id)}
                onPress={() => toggleStyle(style.id)}
              />
            );
          })}
        </View>

        <View style={styles.stepFooter}>
          <MagneticButton
            title="继续"
            onPress={() => {
              setProfileData((prev) => ({
                ...prev,
                stylePreferences: selectedStyles,
              }));
              goToNext();
            }}
            size="lg"
            disabled={selectedStyles.length === 0}
          />
        </View>
      </View>
    );
  };

  const CompleteStep: React.FC = () => {
    const scale = useSharedValue(0);
    const opacity = useSharedValue(0);
    const buttonOpacity = useSharedValue(0);

    useEffect(() => {
      scale.value = withSpring(1, { damping: 12, stiffness: 100 });
      opacity.value = withTiming(1, { duration: 500 });
      buttonOpacity.value = withDelay(800, withTiming(1, { duration: 400 }));
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    }));

    const buttonAnimatedStyle = useAnimatedStyle(() => ({
      opacity: buttonOpacity.value,
    }));

    return (
      <View style={styles.stepContent}>
        <ParticleEffect count={50} color="rgba(168, 85, 247, 0.4)" size={4} />

        <AnimatedView style={[styles.completeContainer, animatedStyle]}>
          <LinearGradient
            colors={["#a855f7", "#ec4899"]}
            style={styles.completeIconGradient}
          >
            <Text style={styles.completeIcon}>🎉</Text>
          </LinearGradient>

          <GlowText
            text="设置完成！"
            style={styles.completeTitle}
            glowColor={Colors.primary[400]}
          />
          <Text style={styles.completeSubtitle}>
            {nickname}，欢迎来到 AiNeed{"\n"}开始你的时尚之旅吧
          </Text>
        </AnimatedView>

        <AnimatedView style={[styles.completeButton, buttonAnimatedStyle]}>
          <MagneticButton
            title="开始探索"
            onPress={() => onComplete(profileData as ProfileData)}
            size="xl"
          />
        </AnimatedView>
      </View>
    );
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <WelcomeStep />;
      case 1:
        return <BasicStep />;
      case 2:
        return <GenderStep />;
      case 3:
        return <BodyStep />;
      case 4:
        return <StyleStep />;
      case 5:
        return <CompleteStep />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={["#0f0a1a", "#1e1b4b", "#312e81"]}
        style={styles.gradient}
      >
        {currentStep > 0 && currentStep < 5 && (
          <View style={styles.header}>
            <Pressable onPress={goToPrev} style={styles.backButton}>
              <Text style={styles.backIcon}>←</Text>
            </Pressable>
            <View style={styles.progressContainer}>
              <View style={styles.progressBackground}>
                <AnimatedView
                  style={[styles.progressFill, progressAnimatedStyle]}
                />
              </View>
            </View>
            <Text style={styles.stepIndicator}>
              {currentStep}/{STEP_CONFIG.length - 2}
            </Text>
          </View>
        )}

        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {renderStep()}
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing[5],
    paddingTop:
      Platform.OS === "ios" ? 60 : (StatusBar.currentHeight || 24) + 20,
    paddingBottom: Spacing[4],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    fontSize: 20,
    color: Colors.white,
  },
  progressContainer: {
    flex: 1,
    marginHorizontal: Spacing[4],
  },
  progressBackground: {
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
  stepIndicator: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.5)",
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  stepContent: {
    flex: 1,
    paddingHorizontal: Spacing[6],
    paddingTop: Spacing[8],
    alignItems: "center",
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.white,
    textAlign: "center",
    marginBottom: Spacing[2],
  },
  stepSubtitle: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
    marginBottom: Spacing[10],
  },
  welcomeLogo: {
    marginBottom: Spacing[8],
  },
  welcomeLogoGradient: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius["4xl"],
    alignItems: "center",
    justifyContent: "center",
  },
  welcomeLogoText: {
    fontSize: 48,
    fontWeight: "900",
    color: Colors.white,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: Colors.white,
    textAlign: "center",
    marginBottom: Spacing[4],
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
    lineHeight: 24,
  },
  welcomeButton: {
    marginTop: Spacing[12],
  },
  inputContainer: {
    width: "100%",
    marginBottom: Spacing[8],
  },
  inputWrapper: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[4],
  },
  textInput: {
    fontSize: 20,
    color: Colors.white,
    fontWeight: "600",
    textAlign: "center",
  },
  stepFooter: {
    position: "absolute",
    bottom: Spacing[12],
    left: 0,
    right: 0,
    alignItems: "center",
  },
  genderOptions: {
    flexDirection: "row",
    gap: Spacing[4],
    marginBottom: Spacing[8],
  },
  genderOption: {
    width: (SCREEN_WIDTH - Spacing[6] * 2 - Spacing[4] * 2) / 3,
    aspectRatio: 0.85,
    borderRadius: BorderRadius["2xl"],
    borderWidth: 2,
    overflow: "hidden",
  },
  genderOptionGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing[3],
  },
  genderIcon: {
    fontSize: 40,
    marginBottom: Spacing[2],
  },
  genderLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: "600",
  },
  bodyInputContainer: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: BorderRadius.xl,
    padding: Spacing[5],
    marginBottom: Spacing[4],
  },
  bodyInputLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.5)",
    marginBottom: Spacing[2],
  },
  bodyInputRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  bodyInput: {
    flex: 1,
    fontSize: 36,
    color: Colors.white,
    fontWeight: "700",
  },
  bodyInputUnit: {
    fontSize: 18,
    color: "rgba(255, 255, 255, 0.4)",
    marginLeft: Spacing[2],
  },
  styleOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing[3],
    justifyContent: "center",
  },
  styleOptionPressable: {
    width: (SCREEN_WIDTH - Spacing[6] * 2 - Spacing[3] * 2) / 3,
  },
  styleOption: {
    aspectRatio: 1,
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    overflow: "hidden",
  },
  styleOptionGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing[3],
  },
  styleIcon: {
    fontSize: 32,
    marginBottom: Spacing[2],
  },
  styleName: {
    fontSize: 13,
    color: Colors.white,
    fontWeight: "600",
  },
  styleCheck: {
    position: "absolute",
    top: Spacing[2],
    right: Spacing[2],
    width: 20,
    height: 20,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  styleCheckIcon: {
    fontSize: 12,
    color: Colors.white,
    fontWeight: "700",
  },
  completeContainer: {
    alignItems: "center",
    marginTop: Spacing[16],
  },
  completeIconGradient: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius["4xl"],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing[6],
  },
  completeIcon: {
    fontSize: 48,
  },
  completeTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: Colors.white,
    marginBottom: Spacing[3],
  },
  completeSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
    lineHeight: 24,
  },
  completeButton: {
    position: "absolute",
    bottom: Spacing[12],
    left: 0,
    right: 0,
    alignItems: "center",
  },
});
