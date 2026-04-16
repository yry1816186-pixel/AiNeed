/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useEffect, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
  FlatList,
  Pressable,
  StatusBar,
  ViewStyle,
  ImageSourcePropType,
  Animated,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import * as Haptics from "@/src/polyfills/expo-haptics";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
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
  useAnimatedScrollHandler,
  useDerivedValue,
} from "react-native-reanimated";
import AnimatedReanimated from "react-native-reanimated";
import { Colors } from '../../../design-system/theme';
import { DesignTokens } from "../../../theme/tokens/design-tokens";

import { Ionicons } from "@/src/polyfills/expo-vector-icons";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const AnimatedView = AnimatedReanimated.createAnimatedComponent(View);
const AnimatedImage = AnimatedReanimated.createAnimatedComponent(Image);
const AnimatedPressable = AnimatedReanimated.createAnimatedComponent(Pressable);

const springConfig = {
  damping: 20,
  stiffness: 200,
  mass: 0.8,
};

export interface FullScreenGalleryProps {
  visible: boolean;
  images: {
    uri: string;
    caption?: string;
    id?: string;
  }[];
  initialIndex?: number;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
  showThumbnails?: boolean;
  showCounter?: boolean;
  enableZoom?: boolean;
  enableSwipeDown?: boolean;
  backgroundColor?: string;
}

interface GalleryThumbnailProps {
  item: FullScreenGalleryProps["images"][number];
  index: number;
  selected: boolean;
  onPress: (index: number) => void;
}

const GalleryThumbnail: React.FC<GalleryThumbnailProps> = ({ item, index, selected, onPress }) => {
  const thumbnailScale = useSharedValue(1);

  useEffect(() => {
    thumbnailScale.value = withSpring(selected ? 1.1 : 1, springConfig);
  }, [selected, thumbnailScale]);

  const thumbnailAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: thumbnailScale.value }],
    borderWidth: selected ? 2 : 0,
  }));

  return (
    <TouchableOpacity onPress={() => onPress(index)}>
      <AnimatedImage
        source={{ uri: item.uri }}
        style={[styles.thumbnail, thumbnailAnimatedStyle]}
      />
    </TouchableOpacity>
  );
};

export const FullScreenGallery: React.FC<FullScreenGalleryProps> = ({
  visible,
  images,
  initialIndex = 0,
  onClose,
  onIndexChange,
  showThumbnails = true,
  showCounter = true,
  enableZoom = true,
  enableSwipeDown = true,
  backgroundColor = DesignTokens.colors.neutral[900],
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList>(null);

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);
  const translateY = useSharedValue(0);
  const zoomScale = useSharedValue(1);
  const controlsOpacity = useSharedValue(1);

  const [controlsVisible, setControlsVisible] = useState(true);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withSpring(1, springConfig);
      StatusBar.setHidden(true);
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      scale.value = withTiming(0.9, { duration: 200 });
      StatusBar.setHidden(false);
    }
  }, [visible]);

  const handleScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      translateY.value = event.contentOffset.y;
    },
    onMomentumEnd: (event) => {
      const index = Math.round(event.contentOffset.x / SCREEN_WIDTH);
      runOnJS(setCurrentIndex)(index);
      if (onIndexChange) {
        runOnJS(onIndexChange)(index);
      }
    },
  });

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      if (enableZoom) {
        zoomScale.value = Math.max(1, Math.min(4, event.scale));
      }
    })
    .onEnd(() => {
      if (zoomScale.value < 1.2) {
        zoomScale.value = withSpring(1, springConfig);
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (enableSwipeDown && zoomScale.value === 1 && event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > 100 || event.velocityY > 500) {
        opacity.value = withTiming(0, { duration: 200 });
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0, springConfig);
      }
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    controlsOpacity.value = controlsOpacity.value === 1 ? withTiming(0) : withTiming(1);
    runOnJS(setControlsVisible)(!controlsVisible);
  });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture, tapGesture);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: zoomScale.value }, { translateY: translateY.value * 0.3 }],
  }));

  const controlsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
  }));

  const renderImage = ({ item, index }: { item: (typeof images)[0]; _index: number }) => (
    <GestureDetector gesture={composedGesture}>
      <AnimatedView style={[styles.imageContainer, imageAnimatedStyle]}>
        <AnimatedImage
          source={{ uri: item.uri }}
          style={styles.fullScreenImage}
          resizeMode="contain"
        />
        {item.caption && (
          <AnimatedView style={[styles.captionContainer, controlsAnimatedStyle]}>
            <BlurView intensity={80} style={styles.captionBlur}>
              <Text style={styles.captionText}>{item.caption}</Text>
            </BlurView>
          </AnimatedView>
        )}
      </AnimatedView>
    </GestureDetector>
  );

  const handleThumbnailPress = (index: number) => {
    setCurrentIndex(index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <AnimatedView style={[styles.galleryContainer, { backgroundColor }, containerAnimatedStyle]}>
        <AnimatedPressable style={[styles.closeButton, controlsAnimatedStyle]} onPress={onClose}>
          <BlurView intensity={80} style={styles.closeButtonBlur}>
            <Ionicons name="close" size={24} color={DesignTokens.colors.text.inverse} />
          </BlurView>
        </AnimatedPressable>

        {showCounter && (
          <AnimatedView style={[styles.counterContainer, controlsAnimatedStyle]}>
            <BlurView intensity={80} style={styles.counterBlur}>
              <Text style={styles.counterText}>
                {currentIndex + 1} / {images.length}
              </Text>
            </BlurView>
          </AnimatedView>
        )}

        <FlatList
          ref={flatListRef}
          data={images}
          renderItem={renderImage}
          keyExtractor={(item, index) => item.id || String(index)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
        />

        {showThumbnails && images.length > 1 && (
          <AnimatedView style={[styles.thumbnailsContainer, controlsAnimatedStyle]}>
            <BlurView intensity={80} style={styles.thumbnailsBlur}>
              <FlatList
                data={images}
                renderItem={({ item, index }) => (
                  <GalleryThumbnail
                    item={item}
                    index={index}
                    selected={currentIndex === index}
                    onPress={handleThumbnailPress}
                  />
                )}
                keyExtractor={(item, index) => `thumb-${item.id || index}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbnailsList}
              />
            </BlurView>
          </AnimatedView>
        )}
      </AnimatedView>
    </Modal>
  );
};

export interface ARGuideOverlayProps {
  visible: boolean;
  step: number;
  totalSteps: number;
  title: string;
  description: string;
  highlightArea?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  onNext: () => void;
  onSkip: () => void;
  onComplete: () => void;
}

export const ARGuideOverlay: React.FC<ARGuideOverlayProps> = ({
  visible,
  step,
  totalSteps,
  title,
  description,
  highlightArea,
  onNext,
  onSkip,
  onComplete,
}) => {
  const opacity = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const highlightOpacity = useSharedValue(0.5);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 300 });
      pulseScale.value = withRepeat(
        withSequence(withTiming(1.1, { duration: 800 }), withTiming(1, { duration: 800 })),
        -1,
        true
      );
      highlightOpacity.value = withRepeat(
        withSequence(withTiming(0.8, { duration: 600 }), withTiming(0.4, { duration: 600 })),
        -1,
        true
      );
    } else {
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const highlightAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: highlightOpacity.value,
  }));

  const isLastStep = step === totalSteps - 1;

  if (!visible) {
    return null;
  }

  return (
    <AnimatedView style={[styles.guideOverlay, overlayAnimatedStyle]}>
      <View style={styles.guideMask}>
        {highlightArea && (
          <AnimatedView
            style={[
              styles.highlightArea,
              {
                left: highlightArea.x,
                top: highlightArea.y,
                width: highlightArea.width,
                height: highlightArea.height,
              },
              highlightAnimatedStyle,
            ]}
          >
            <View style={styles.highlightBorder} />
          </AnimatedView>
        )}
      </View>

      <View style={styles.guideContent}>
        <View style={styles.guideCard}>
          <View style={styles.guideProgress}>
            {Array(totalSteps)
              .fill(0)
              .map((_, index) => (
                <View
                  key={index}
                  style={[styles.progressDot, index <= step && styles.progressDotActive]}
                />
              ))}
          </View>

          <Text style={styles.guideTitle}>{title}</Text>
          <Text style={styles.guideDescription}>{description}</Text>

          <View style={styles.guideActions}>
            <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
              <Text style={styles.skipText}>跳过</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.nextButton} onPress={isLastStep ? onComplete : onNext}>
              <LinearGradient colors={[DesignTokens.colors.brand.terracotta, DesignTokens.colors.brand.terracottaDark]} style={styles.nextButtonGradient}>
                <Text style={styles.nextText}>{isLastStep ? "开始体验" : "下一步"}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </AnimatedView>
  );
};

export interface VirtualTryOnPreviewProps {
  visible: boolean;
  productImage: string;
  userImage?: string;
  resultImage?: string;
  isProcessing: boolean;
  progress: number;
  onClose: () => void;
  onCapture: () => void;
  onRetry?: () => void;
  onSave?: () => void;
  onShare?: () => void;
}

export const VirtualTryOnPreview: React.FC<VirtualTryOnPreviewProps> = ({
  visible,
  productImage,
  userImage,
  resultImage,
  isProcessing,
  progress,
  onClose,
  onCapture,
  onRetry,
  onSave,
  onShare,
}) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);
  const shimmerTranslate = useSharedValue(-SCREEN_WIDTH);
  const resultScale = useSharedValue(0.8);
  const resultOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withSpring(1, springConfig);
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      scale.value = withTiming(0.9, { duration: 200 });
    }
  }, [visible]);

  useEffect(() => {
    if (isProcessing) {
      shimmerTranslate.value = withRepeat(
        withTiming(SCREEN_WIDTH, { duration: 1500, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      shimmerTranslate.value = -SCREEN_WIDTH;
    }
  }, [isProcessing]);

  useEffect(() => {
    if (resultImage && !isProcessing) {
      resultScale.value = withSpring(1, springConfig);
      resultOpacity.value = withTiming(1, { duration: 500 });
    } else {
      resultScale.value = 0.8;
      resultOpacity.value = 0;
    }
  }, [resultImage, isProcessing]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const shimmerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerTranslate.value }],
  }));

  const resultAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: resultScale.value }],
    opacity: resultOpacity.value,
  }));

  if (!visible) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <AnimatedView style={[styles.tryOnContainer, containerAnimatedStyle]}>
        <BlurView intensity={100} style={StyleSheet.absoluteFill as ViewStyle}>
          <View style={styles.tryOnHeader}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={28} color={DesignTokens.colors.text.inverse} />
            </TouchableOpacity>
            <Text style={styles.tryOnTitle}>虚拟试衣</Text>
            <View style={{ width: 28 }} />
          </View>

          <View style={styles.tryOnContent}>
            <View style={styles.tryOnPreviewContainer}>
              <Image source={{ uri: productImage }} style={styles.productPreview} />
              <View style={styles.previewDivider}>
                <Ionicons name="arrow-forward" size={24} color={DesignTokens.colors.text.inverse} />
              </View>
              {resultImage ? (
                <AnimatedImage
                  source={{ uri: resultImage }}
                  style={[styles.resultPreview, resultAnimatedStyle]}
                />
              ) : (
                <View style={styles.resultPlaceholder}>
                  {isProcessing ? (
                    <>
                      <AnimatedView style={[styles.shimmerOverlay, shimmerAnimatedStyle]}>
                        <LinearGradient
                          colors={["transparent", "rgba(255,255,255,0.3)", "transparent"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={StyleSheet.absoluteFill}
                        />
                      </AnimatedView>
                      <View style={styles.processingIndicator}>
                        <Text style={styles.processingText}>AI正在处理...</Text>
                        <View style={styles.progressBar}>
                          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                        </View>
                      </View>
                    </>
                  ) : (
                    <TouchableOpacity style={styles.captureButton} onPress={onCapture}>
                      <Ionicons name="camera" size={32} color={DesignTokens.colors.text.inverse} />
                      <Text style={styles.captureText}>拍照试衣</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {resultImage && !isProcessing && (
              <AnimatedView style={[styles.resultActions, resultAnimatedStyle]}>
                <TouchableOpacity style={styles.actionButton} onPress={onRetry}>
                  <Ionicons name="refresh" size={20} color={DesignTokens.colors.text.inverse} />
                  <Text style={styles.actionText}>重试</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={onSave}>
                  <Ionicons name="download" size={20} color={DesignTokens.colors.text.inverse} />
                  <Text style={styles.actionText}>保存</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={onShare}>
                  <Ionicons name="share" size={20} color={DesignTokens.colors.text.inverse} />
                  <Text style={styles.actionText}>分享</Text>
                </TouchableOpacity>
              </AnimatedView>
            )}
          </View>
        </BlurView>
      </AnimatedView>
    </Modal>
  );
};

export interface ImmersiveProductViewProps {
  visible: boolean;
  product: {
    name: string;
    brand: string;
    price: number;
    images: string[];
    colors?: string[];
    sizes?: string[];
    description?: string;
  };
  onClose: () => void;
  onAddToCart?: () => void;
  onTryOn?: () => void;
}

export const ImmersiveProductView: React.FC<ImmersiveProductViewProps> = ({
  visible,
  product,
  onClose,
  onAddToCart,
  onTryOn,
}) => {
  const scrollY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const imageScale = useSharedValue(1);
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedSize, setSelectedSize] = useState(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 400 });
      StatusBar.setHidden(true);
    } else {
      opacity.value = withTiming(0, { duration: 300 });
      StatusBar.setHidden(false);
    }
  }, [visible]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
      imageScale.value = interpolate(
        event.contentOffset.y,
        [-100, 0, 100],
        [1.2, 1, 0.9],
        Extrapolate.CLAMP
      );
    },
  });

  const headerOpacity = useDerivedValue(() => {
    return interpolate(scrollY.value, [0, 100], [0, 1], Extrapolate.CLAMP);
  });

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
  }));

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: imageScale.value }],
  }));

  if (!visible) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <AnimatedView style={[styles.immersiveContainer, containerAnimatedStyle]}>
        <AnimatedView style={[styles.immersiveHeader, headerAnimatedStyle]}>
          <BlurView intensity={100} style={StyleSheet.absoluteFill as ViewStyle}>
            <View style={styles.headerContent}>
              <TouchableOpacity style={styles.backButton} onPress={onClose}>
                <Ionicons name="arrow-back" size={24} color={Colors.neutral[800]} />
              </TouchableOpacity>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {product.name}
              </Text>
              <View style={{ width: 40 }} />
            </View>
          </BlurView>
        </AnimatedView>

        <Animated.ScrollView
          style={StyleSheet.absoluteFill}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          <AnimatedView style={[styles.productImageContainer, imageAnimatedStyle]}>
            <Image source={{ uri: product.images[0] }} style={styles.productImage} />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.8)"]}
              style={styles.imageGradient}
            />
          </AnimatedView>

          <View style={styles.productDetails}>
            <Text style={styles.productBrand}>{product.brand}</Text>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productPrice}>¥{product.price.toLocaleString()}</Text>

            {product.colors && product.colors.length > 0 && (
              <View style={styles.optionSection}>
                <Text style={styles.optionLabel}>颜色</Text>
                <View style={styles.colorOptions}>
                  {product.colors.map((color, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        selectedColor === index && styles.colorOptionSelected,
                      ]}
                      onPress={() => setSelectedColor(index)}
                    >
                      {selectedColor === index && (
                        <Ionicons
                          name="checkmark"
                          size={16}
                          color={color === DesignTokens.colors.backgrounds.primary ? DesignTokens.colors.neutral[900] : DesignTokens.colors.text.inverse}
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {product.sizes && product.sizes.length > 0 && (
              <View style={styles.optionSection}>
                <Text style={styles.optionLabel}>尺码</Text>
                <View style={styles.sizeOptions}>
                  {product.sizes.map((size, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.sizeOption,
                        selectedSize === index && styles.sizeOptionSelected,
                      ]}
                      onPress={() => setSelectedSize(index)}
                    >
                      <Text
                        style={[styles.sizeText, selectedSize === index && styles.sizeTextSelected]}
                      >
                        {size}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {product.description && (
              <View style={styles.descriptionSection}>
                <Text style={styles.descriptionTitle}>商品描述</Text>
                <Text style={styles.descriptionText}>{product.description}</Text>
              </View>
            )}

            <View style={{ height: 120 }} />
          </View>
        </Animated.ScrollView>

        <View style={styles.immersiveFooter}>
          <BlurView intensity={100} style={StyleSheet.absoluteFill as ViewStyle}>
            <View style={styles.footerContent}>
              {onTryOn && (
                <TouchableOpacity style={styles.tryOnButton} onPress={onTryOn}>
                  <Ionicons name="shirt" size={20} color={Colors.primary[500]} />
                  <Text style={styles.tryOnText}>试穿</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.addToCartButton} onPress={onAddToCart}>
                <LinearGradient colors={[DesignTokens.colors.brand.terracotta, DesignTokens.colors.brand.terracottaDark]} style={styles.addToCartGradient}>
                  <Text style={styles.addToCartText}>加入购物车</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </AnimatedView>
    </Modal>
  );
};

export interface StoryViewerProps {
  visible: boolean;
  stories: {
    id: string;
    user: {
      name: string;
      avatar: string;
    };
    items: {
      type: "image" | "video";
      uri: string;
      duration?: number;
    }[];
  }[];
  initialStoryIndex?: number;
  onClose: () => void;
}

interface StoryProgressBarProps {
  index: number;
  currentItemIndex: number;
  progress: any;
}

const StoryProgressBar: React.FC<StoryProgressBarProps> = ({
  index,
  currentItemIndex,
  progress,
}) => {
  const barAnimatedStyle = useAnimatedStyle(() => {
    const widthProgress =
      index < currentItemIndex ? 1 : index === currentItemIndex ? progress.value : 0;

    return {
      width: `${widthProgress * 100}%`,
    };
  }, [currentItemIndex, index]);

  return (
    <View style={styles.progressBarContainer}>
      <View style={styles.progressBarBackground} />
      <AnimatedView style={[styles.progressBarFill, barAnimatedStyle]} />
    </View>
  );
};

export const StoryViewer: React.FC<StoryViewerProps> = ({
  visible,
  stories,
  initialStoryIndex = 0,
  onClose,
}) => {
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialStoryIndex);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const progress = useSharedValue(0);
  const opacity = useSharedValue(0);

  const currentStory = stories[currentStoryIndex];
  const currentItem = currentStory?.items[currentItemIndex];
  const duration = currentItem?.duration || 5000;

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      StatusBar.setHidden(true);
    } else {
      opacity.value = withTiming(0, { duration: 150 });
      StatusBar.setHidden(false);
    }
  }, [visible]);

  useEffect(() => {
    if (visible && currentStory) {
      progress.value = 0;
      progress.value = withTiming(1, { duration, easing: Easing.linear }, (finished) => {
        if (finished) {
          runOnJS(handleNext)();
        }
      });
    }
  }, [visible, currentStoryIndex, currentItemIndex, duration]);

  const handleNext = useCallback(() => {
    if (currentItemIndex < currentStory.items.length - 1) {
      setCurrentItemIndex((prev) => prev + 1);
    } else if (currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex((prev) => prev + 1);
      setCurrentItemIndex(0);
    } else {
      onClose();
    }
  }, [currentItemIndex, currentStoryIndex, currentStory, stories.length, onClose]);

  const handlePrevious = useCallback(() => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex((prev) => prev - 1);
    } else if (currentStoryIndex > 0) {
      setCurrentStoryIndex((prev) => prev - 1);
      setCurrentItemIndex(stories[currentStoryIndex - 1].items.length - 1);
    }
  }, [currentItemIndex, currentStoryIndex, stories]);

  const handleTap = useCallback(
    (x: number) => {
      if (x < SCREEN_WIDTH / 3) {
        handlePrevious();
      } else if (x > (SCREEN_WIDTH * 2) / 3) {
        handleNext();
      }
    },
    [handlePrevious, handleNext]
  );

  const _progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!visible || !currentStory) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <AnimatedView style={[styles.storyContainer, containerAnimatedStyle]}>
        <Image
          source={{ uri: currentItem?.uri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />

        <View style={styles.storyHeader}>
          <View style={styles.progressBars}>
            {currentStory.items.map((_, index) => (
              <StoryProgressBar
                key={index}
                index={index}
                currentItemIndex={currentItemIndex}
                progress={progress}
              />
            ))}
          </View>

          <View style={styles.storyUserInfo}>
            <Image source={{ uri: currentStory.user.avatar }} style={styles.storyAvatar} />
            <Text style={styles.storyUserName}>{currentStory.user.name}</Text>
            <TouchableOpacity style={styles.storyCloseButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={DesignTokens.colors.text.inverse} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.storyTapArea, { left: 0, width: SCREEN_WIDTH / 3 }]}
          onPress={() => handleTap(0)}
        />
        <TouchableOpacity
          style={[styles.storyTapArea, { right: 0, width: SCREEN_WIDTH / 3 }]}
          onPress={() => handleTap(SCREEN_WIDTH)}
        />
      </AnimatedView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  galleryContainer: {
    flex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 30,
    right: 16,
    zIndex: 10,
  },
  closeButtonBlur: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  counterContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 30,
    left: 16,
    zIndex: 10,
  },
  counterBlur: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    overflow: "hidden",
  },
  counterText: {
    color: DesignTokens.colors.text.inverse,
    fontSize: 14,
    fontWeight: "600",
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  fullScreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  captionContainer: {
    position: "absolute",
    bottom: 100,
    left: 16,
    right: 16,
  },
  captionBlur: {
    padding: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  captionText: {
    color: DesignTokens.colors.text.inverse,
    fontSize: 14,
    textAlign: "center",
  },
  thumbnailsContainer: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 40 : 20,
    left: 0,
    right: 0,
  },
  thumbnailsBlur: {
    paddingVertical: 8,
    borderRadius: 20,
    overflow: "hidden",
  },
  thumbnailsList: {
    paddingHorizontal: 12,
  },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginHorizontal: 4,
    borderColor: DesignTokens.colors.neutral.white,
  },
  guideOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  guideMask: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  highlightArea: {
    position: "absolute",
    borderRadius: 12,
    borderWidth: 3,
    borderColor: DesignTokens.colors.brand.terracotta,
  },
  highlightBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    backgroundColor: "transparent",
    shadowColor: DesignTokens.colors.brand.terracotta,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  guideContent: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 100 : 80,
    left: 20,
    right: 20,
  },
  guideCard: {
    backgroundColor: DesignTokens.colors.backgrounds.primary,
    borderRadius: 20,
    padding: 24,
  },
  guideProgress: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.neutral[200],
  },
  progressDotActive: {
    backgroundColor: Colors.primary[500],
  },
  guideTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.neutral[800],
    textAlign: "center",
    marginBottom: 8,
  },
  guideDescription: {
    fontSize: 14,
    color: Colors.neutral[600],
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  guideActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  skipText: {
    fontSize: 14,
    color: Colors.neutral[500],
    fontWeight: "500",
  },
  nextButton: {
    flex: 1,
    borderRadius: 24,
    overflow: "hidden",
  },
  nextButtonGradient: {
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 24,
  },
  nextText: {
    fontSize: 15,
    color: DesignTokens.colors.text.inverse,
    fontWeight: "600",
  },
  tryOnContainer: {
    flex: 1,
  },
  tryOnHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 50 : 30,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  tryOnTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: DesignTokens.colors.text.inverse,
  },
  tryOnContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tryOnPreviewContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  productPreview: {
    width: SCREEN_WIDTH * 0.35,
    height: SCREEN_WIDTH * 0.5,
    borderRadius: 16,
  },
  previewDivider: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  resultPreview: {
    width: SCREEN_WIDTH * 0.35,
    height: SCREEN_WIDTH * 0.5,
    borderRadius: 16,
  },
  resultPlaceholder: {
    width: SCREEN_WIDTH * 0.35,
    height: SCREEN_WIDTH * 0.5,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  processingIndicator: {
    alignItems: "center",
  },
  processingText: {
    color: DesignTokens.colors.text.inverse,
    fontSize: 14,
    marginBottom: 12,
  },
  progressBar: {
    width: 100,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: DesignTokens.colors.brand.terracotta,
    borderRadius: 2,
  },
  captureButton: {
    alignItems: "center",
    gap: 8,
  },
  captureText: {
    color: DesignTokens.colors.text.inverse,
    fontSize: 14,
    fontWeight: "500",
  },
  resultActions: {
    flexDirection: "row",
    gap: 20,
    marginTop: 30,
  },
  actionButton: {
    alignItems: "center",
    gap: 6,
  },
  actionText: {
    color: DesignTokens.colors.text.inverse,
    fontSize: 12,
  },
  immersiveContainer: {
    flex: 1,
    backgroundColor: DesignTokens.colors.backgrounds.primary,
  },
  immersiveHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 50 : 30,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.neutral[800],
    textAlign: "center",
    marginHorizontal: 16,
  },
  productImageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.3,
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  imageGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  productDetails: {
    padding: 20,
    marginTop: -40,
    backgroundColor: DesignTokens.colors.backgrounds.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  productBrand: {
    fontSize: 13,
    color: Colors.neutral[500],
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  productName: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.neutral[800],
    marginTop: 4,
  },
  productPrice: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.primary[500],
    marginTop: 8,
  },
  optionSection: {
    marginTop: 24,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.neutral[700],
    marginBottom: 12,
  },
  colorOptions: {
    flexDirection: "row",
    gap: 12,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorOptionSelected: {
    borderColor: Colors.primary[500],
  },
  sizeOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  sizeOption: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.neutral[100],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  sizeOptionSelected: {
    backgroundColor: Colors.primary[500],
    borderColor: Colors.primary[500],
  },
  sizeText: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.neutral[700],
  },
  sizeTextSelected: {
    color: DesignTokens.colors.text.inverse,
  },
  descriptionSection: {
    marginTop: 24,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.neutral[700],
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: Colors.neutral[600],
    lineHeight: 22,
  },
  immersiveFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  footerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
  },
  tryOnButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: Colors.neutral[100],
  },
  tryOnText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary[500],
  },
  addToCartButton: {
    flex: 1,
    borderRadius: 24,
    overflow: "hidden",
  },
  addToCartGradient: {
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 24,
  },
  addToCartText: {
    fontSize: 15,
    fontWeight: "600",
    color: DesignTokens.colors.text.inverse,
  },
  storyContainer: {
    flex: 1,
    backgroundColor: DesignTokens.colors.neutral[900],
  },
  storyHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === "ios" ? 50 : 30,
    paddingHorizontal: 12,
    zIndex: 10,
  },
  progressBars: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 12,
  },
  progressBarContainer: {
    flex: 1,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 1.5,
    overflow: "hidden",
  },
  progressBarBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: DesignTokens.colors.neutral.white,
    borderRadius: 1.5,
  },
  storyUserInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  storyAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  storyUserName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: DesignTokens.colors.text.inverse,
  },
  storyCloseButton: {
    padding: 4,
  },
  storyTapArea: {
    position: "absolute",
    top: 0,
    bottom: 0,
  },
});

export default {
  FullScreenGallery,
  ARGuideOverlay,
  VirtualTryOnPreview,
  ImmersiveProductView,
  StoryViewer,
};
