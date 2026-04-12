import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { colors, spacing, radius } from '../../theme';
import type { ClothingImage } from '../../services/clothing.service';

const SCREEN_WIDTH = Dimensions.get('window').width;
const IMAGE_HEIGHT = SCREEN_WIDTH * 1.2;

interface ImageCarouselProps {
  images: ClothingImage[];
}

const AnimatedImage = Animated.createAnimatedComponent(Image);

function CarouselItem({
  image,
  index,
}: {
  image: ClothingImage;
  index: number;
  activeIndex: number;
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const [isZoomed, setIsZoomed] = useState(false);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        runOnJS(setIsZoomed)(false);
      } else if (scale.value > 3) {
        scale.value = withSpring(3);
        savedScale.value = 3;
        runOnJS(setIsZoomed)(true);
      } else {
        savedScale.value = scale.value;
        runOnJS(setIsZoomed)(scale.value > 1);
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (scale.value > 1) {
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      }
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        runOnJS(setIsZoomed)(false);
      } else {
        scale.value = withSpring(2);
        savedScale.value = 2;
        runOnJS(setIsZoomed)(true);
      }
    });

  const composed = isZoomed
    ? Gesture.Simultaneous(pinchGesture, panGesture)
    : Gesture.Simultaneous(pinchGesture, doubleTapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.imageContainer, animatedStyle]}>
        <AnimatedImage
          source={{ uri: image.url }}
          style={styles.image}
          contentFit="cover"
          transition={200}
          accessibilityLabel={image.alt ?? `服装图片 ${index + 1}`}
        />
      </Animated.View>
    </GestureDetector>
  );
}

export const ImageCarousel: React.FC<ImageCarouselProps> = ({ images }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = useCallback(
    (event: {
      nativeEvent: {
        contentOffset: { x: number };
        layoutMeasurement: { width: number };
      };
    }) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const layoutWidth = event.nativeEvent.layoutMeasurement.width;
      if (layoutWidth > 0) {
        const newIndex = Math.round(offsetX / layoutWidth);
        if (newIndex !== activeIndex && newIndex >= 0 && newIndex < images.length) {
          setActiveIndex(newIndex);
        }
      }
    },
    [activeIndex, images.length],
  );

  if (images.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyPlaceholder} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={styles.carouselContainer}>
        <Animated.ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
        >
          {images.map((image, index) => (
            <CarouselItem
              key={image.id}
              image={image}
              index={index}
              activeIndex={activeIndex}
            />
          ))}
        </Animated.ScrollView>

        {images.length > 1 && (
          <View style={styles.indicatorContainer}>
            {images.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === activeIndex ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>
        )}

        <View style={styles.imageCounter}>
          <View style={styles.counterBadge}>
            <Text style={styles.counterText}>
              {activeIndex + 1}/{images.length}
            </Text>
          </View>
        </View>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: {
    height: IMAGE_HEIGHT,
  },
  carouselContainer: {
    height: IMAGE_HEIGHT,
    position: 'relative',
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
  },
  image: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    backgroundColor: colors.backgroundSecondary,
  },
  emptyContainer: {
    height: IMAGE_HEIGHT,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: radius.xl,
    backgroundColor: colors.gray200,
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'center',
  },
  dot: {
    borderRadius: radius.full,
  },
  dotActive: {
    width: 20,
    height: 6,
    backgroundColor: colors.accent,
  },
  dotInactive: {
    width: 6,
    height: 6,
    backgroundColor: colors.gray400,
  },
  imageCounter: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
  },
  counterBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: 'rgba(26, 26, 46, 0.6)',
  },
  counterText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.white,
    lineHeight: 14,
  },
});
