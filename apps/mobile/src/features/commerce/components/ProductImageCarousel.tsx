import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Dimensions,
} from "react-native";
import { DesignTokens } from "../theme/tokens/design-tokens";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface ProductImageCarouselProps {
  images: string[];
}

export const ProductImageCarousel: React.FC<ProductImageCarouselProps> = ({ images }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomVisible, setZoomVisible] = useState(false);
  const [_zoomIndex, setZoomIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  const handleImageTap = (index: number) => {
    setZoomIndex(index);
    setZoomVisible(true);
  };

  if (!images || images.length === 0) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>暂无图片</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {images.map((uri, index) => (
          <TouchableOpacity key={uri} activeOpacity={0.9} onPress={() => handleImageTap(index)}>
            <Image source={{ uri }} style={styles.image} resizeMode="cover" />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {images.length > 1 && (
        <View style={styles.dots}>
          {images.map((_, index) => (
            <View
              key={`dot-${index}`}
              style={[styles.dot, index === activeIndex && styles.dotActive]}
            />
          ))}
        </View>
      )}

      <Modal visible={zoomVisible} transparent animationType="fade">
        <View style={styles.zoomOverlay}>
          <TouchableOpacity style={styles.zoomClose} onPress={() => setZoomVisible(false)}>
            <Text style={styles.zoomCloseText}>X</Text>
          </TouchableOpacity>
          <ScrollView horizontal pagingEnabled>
            {images.map((uri, _index) => (
              <Image key={uri} source={{ uri }} style={styles.zoomImage} resizeMode="contain" />
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  placeholder: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    backgroundColor: DesignTokens.colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: DesignTokens.colors.neutral[300],
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: DesignTokens.colors.neutral[200],
    marginHorizontal: 3,
  },
  dotActive: {
    backgroundColor: "DesignTokens.colors.semantic.error", // custom color
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  zoomOverlay: {
    flex: 1,
    backgroundColor: DesignTokens.colors.neutral[900],
  },
  zoomClose: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  zoomCloseText: {
    color: DesignTokens.colors.backgrounds.primary,
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
  },
  zoomImage: {
    width: SCREEN_WIDTH,
    height: "100%",
  },
});
