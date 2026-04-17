import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Image,
  ImageProps,
  ImageStyle,
  View,
  ViewStyle,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Platform,
  StyleProp,
  NativeSyntheticEvent,
  ImageErrorEventData,
  ImageLoadEventData,
} from "react-native";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import * as FileSystem from "@/src/polyfills/expo-file-system";
import { DesignTokens } from '../../design-system/theme/tokens/design-tokens';
import { useTheme, createStyles } from '../contexts/ThemeContext';


const { width: _SCREEN_WIDTH } = Dimensions.get("window");

interface CacheEntry {
  uri: string;
  localPath: string;
  timestamp: number;
  size: number;
}

class ImageCacheManager {
  private static instance: ImageCacheManager;
  private cache: Map<string, CacheEntry> = new Map();
  private pendingDownloads: Map<string, Promise<string>> = new Map();
  private readonly CACHE_DIR = `${FileSystem.cacheDirectory}image-cache/`;
  private readonly MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB
  private readonly CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

  private constructor() {
    void this.initCache();
  }

  static getInstance(): ImageCacheManager {
    if (!ImageCacheManager.instance) {
      ImageCacheManager.instance = new ImageCacheManager();
    }
    return ImageCacheManager.instance;
  }

  private async initCache() {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.CACHE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.CACHE_DIR, {
          intermediates: true,
        });
      }
      await this.loadCacheIndex();
    } catch (error) {
      console.warn("ImageCacheManager init failed:", error);
    }
  }

  private async loadCacheIndex() {
    try {
      const indexFile = `${this.CACHE_DIR}index.json`;
      const info = await FileSystem.getInfoAsync(indexFile);
      if (info.exists) {
        const content = await FileSystem.readAsStringAsync(indexFile);
        const data = JSON.parse(content);
        this.cache = new Map(Object.entries(data));
      }
    } catch (error) {
      console.warn("Failed to load cache index:", error);
    }
  }

  private async saveCacheIndex() {
    try {
      const indexFile = `${this.CACHE_DIR}index.json`;
      const data = Object.fromEntries(this.cache);
      await FileSystem.writeAsStringAsync(indexFile, JSON.stringify(data));
    } catch (error) {
      console.warn("Failed to save cache index:", error);
    }
  }

  private async getCacheKey(uri: string): Promise<string> {
    let hash = 0;
    for (let i = 0; i < uri.length; i++) {
      const char = uri.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, "0");
  }

  private async cleanOldCache() {
    const _now = Date.now();
    const entries = Array.from(this.cache.entries());
    let totalSize = 0;

    entries.forEach(([_, entry]) => {
      totalSize += entry.size;
    });

    if (totalSize > this.MAX_CACHE_SIZE) {
      const sortedEntries = entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      for (const [key, entry] of sortedEntries) {
        if (totalSize <= this.MAX_CACHE_SIZE * 0.8) {
          break;
        }

        try {
          await FileSystem.deleteAsync(entry.localPath, { idempotent: true });
          totalSize -= entry.size;
          this.cache.delete(key);
        } catch (error) {
          console.warn("Failed to delete cache file:", error);
        }
      }

      await this.saveCacheIndex();
    }
  }

  async getCachedImage(uri: string): Promise<string | null> {
    const key = await this.getCacheKey(uri);
    const entry = this.cache.get(key);

    if (entry) {
      if (Date.now() - entry.timestamp > this.CACHE_EXPIRY) {
        this.cache.delete(key);
        try {
          await FileSystem.deleteAsync(entry.localPath, { idempotent: true });
        } catch (error) {
          // ignore
        }
        return null;
      }

      const info = await FileSystem.getInfoAsync(entry.localPath);
      if (info.exists) {
        this.cache.set(key, { ...entry, timestamp: Date.now() });
        return entry.localPath;
      }

      this.cache.delete(key);
    }

    return null;
  }

  async downloadAndCache(uri: string): Promise<string> {
    const key = await this.getCacheKey(uri);

    const pending = this.pendingDownloads.get(key);
    if (pending) {
      return pending;
    }

    const downloadPromise = (async () => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
      try {
        const cached = await this.getCachedImage(uri);
        if (cached) {
          return cached;
        }

        const localPath = `${this.CACHE_DIR}${key}.jpg`;

        const _downloadResult = await FileSystem.downloadAsync(uri, localPath);

        const info = (await FileSystem.getInfoAsync(localPath)) as unknown as {
          size: number;
        };

        this.cache.set(key, {
          uri,
          localPath,
          timestamp: Date.now(),
          size: info.size || 0,
        });

        await this.saveCacheIndex();
        await this.cleanOldCache();

        return localPath;
      } catch (error) {
        console.warn("Failed to download image:", error);
        return uri;
      } finally {
        this.pendingDownloads.delete(key);
      }
    })();

    this.pendingDownloads.set(key, downloadPromise);
    return downloadPromise;
  }

  async clearCache() {
    try {
      await FileSystem.deleteAsync(this.CACHE_DIR, { idempotent: true });
      this.cache.clear();
      await this.initCache();
    } catch (error) {
      console.warn("Failed to clear cache:", error);
    }
  }

  getCacheStats() {
    let totalSize = 0;
    this.cache.forEach((entry) => {
      totalSize += entry.size;
    });
    return {
      count: this.cache.size,
      totalSize,
      maxSize: this.MAX_CACHE_SIZE,
    };
  }
}

const cacheManager = ImageCacheManager.getInstance();

export interface CachedImageProps extends Omit<ImageProps, "source"> {
  source: { uri: string };
  placeholder?: React.ReactNode;
  errorComponent?: React.ReactNode;
  showProgress?: boolean;
  cachePolicy?: "memory" | "disk" | "none";
  priority?: "low" | "normal" | "high";
  fadeInDuration?: number;
}

export const CachedImage = ({
source,
  placeholder,
  errorComponent,
  showProgress = false,
  cachePolicy = "disk",
  priority = "normal",
  fadeInDuration = 300,
  style,
  onLoad,
  onError,
  ...props
}: CachedImageProps) => {
  const { colors } = useTheme();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [_progress, setProgress] = useState(0);
  const [opacity, setOpacity] = useState(0);
  const isMounted = useRef(true);

  const viewStyle = style as StyleProp<ViewStyle>;

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!source?.uri) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    const loadImage = async () => {
      setIsLoading(true);
      setHasError(false);
      setProgress(0);

      try {
        if (cachePolicy === "none") {
          if (isMounted.current) {
            setImageUri(source.uri);
            setProgress(100);
          }
          return;
        }

        const cached = await cacheManager.getCachedImage(source.uri);
        if (cached && isMounted.current) {
          setImageUri(cached);
          setProgress(100);
          return;
        }

        if (cachePolicy === "disk") {
          setProgress(30);
          const downloaded = await cacheManager.downloadAndCache(source.uri);
          if (isMounted.current) {
            setImageUri(downloaded);
            setProgress(100);
          }
        } else {
          if (isMounted.current) {
            setImageUri(source.uri);
            setProgress(100);
          }
        }
      } catch (error) {
        if (isMounted.current) {
          setHasError(true);
          if (onError) {
            onError({
              nativeEvent: { error: String(error) },
            } as NativeSyntheticEvent<ImageErrorEventData>);
          }
        }
      }
    };

    void loadImage();
  }, [source?.uri, cachePolicy]);

  const handleLoad = useCallback(
    (event: NativeSyntheticEvent<ImageLoadEventData>) => {
      if (!isMounted.current) {
        return;
      }

      setIsLoading(false);
      setOpacity(1);

      if (onLoad) {
        onLoad(event);
      }
    },
    [onLoad]
  );

  const handleError = useCallback(
    (event: NativeSyntheticEvent<ImageErrorEventData>) => {
      if (!isMounted.current) {
        return;
      }

      setHasError(true);
      setIsLoading(false);

      if (onError) {
        onError(event);
      }
    },
    [onError]
  );

  const defaultPlaceholder = (
    <View style={[styles.placeholder, viewStyle]}>
      <LinearGradient
        colors={[DesignTokens.colors.neutral[200], DesignTokens.colors.neutral[100]]}
        style={styles.placeholderGradient}
      />
      {showProgress && isLoading && (
        <View style={styles.progressContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
    </View>
  );

  const defaultErrorComponent = (
    <View style={[styles.errorContainer, viewStyle]}>
      <LinearGradient
        colors={[DesignTokens.colors.neutral[300], DesignTokens.colors.neutral[200]]}
        style={styles.placeholderGradient}
      />
    </View>
  );

  if (hasError) {
    return errorComponent || defaultErrorComponent;
  }

  if (!imageUri) {
    return placeholder || defaultPlaceholder;
  }

  return (
    <View style={viewStyle}>
      <Image
        {...props}
        source={{ uri: imageUri }}
        style={[styles.image, { opacity }]}
        onLoad={handleLoad}
        onError={handleError}
      />
      {isLoading && (placeholder || defaultPlaceholder)}
    </View>
  );
};

export interface LazyImageListProps<T = { id: string; uri: string }> {
  images: T[];
  renderItem: (image: T, index: number) => React.ReactNode;
  threshold?: number;
  batchSize?: number;
}

export function useLazyLoading<T>(
  items: T[],
  _threshold = 5,
  batchSize = 10
): {
  visibleItems: T[];
  loadMore: () => void;
  hasMore: boolean;
} {
  const [visibleCount, setVisibleCount] = useState(batchSize);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + batchSize, items.length));
  }, [items.length, batchSize]);

  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const hasMore = visibleCount < items.length;

  return { visibleItems, loadMore, hasMore };
}

const useStyles = createStyles((colors) => ({
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  placeholderGradient: {
    flex: 1,
  },
  progressContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -12 }, { translateY: -12 }],
  },
  errorContainer: {
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
}))

export { cacheManager };


const styles = StyleSheet.create({
  placeholder: { flex: 1 },
  placeholderGradient: { flex: 1 },
  progressContainer: { flex: 1 },
  errorContainer: { flex: 1 },
  image: { flex: 1 },
});
