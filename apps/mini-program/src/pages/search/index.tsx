import { View, Text, ScrollView } from "@tarojs/components";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useShareAppMessage } from "@tarojs/taro";
import ProductCard from "../../components/ProductCard";
import PhotoCapture from "../../components/PhotoCapture";
import RegistrationCTA from "../../components/RegistrationCTA";
import { searchByImage, type SearchItem } from "../../services/search";
import "./index.scss";

/** Skeleton placeholder for loading state */
function SkeletonCard() {
  return (
    <View className="search__skeleton-card">
      <View className="search__skeleton-image" />
      <View className="search__skeleton-content">
        <View className="search__skeleton-line search__skeleton-line--long" />
        <View className="search__skeleton-line search__skeleton-line--medium" />
        <View className="search__skeleton-line search__skeleton-line--short" />
      </View>
    </View>
  );
}

export default function Search() {
  const router = useRouter();
  const [results, setResults] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const imageUrl = router.params.imageUrl ? decodeURIComponent(router.params.imageUrl) : "";

  /** Perform image search */
  const doSearch = useCallback(async (filePath: string) => {
    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const items = await searchByImage(filePath, 5);
      setResults(items);
    } catch {
      setError("搜索失败，请检查网络后重试");
    } finally {
      setLoading(false);
    }
  }, []);

  /** Auto-search if imageUrl provided from home page navigation */
  useEffect(() => {
    if (imageUrl) {
      doSearch(imageUrl);
    }
  }, [imageUrl, doSearch]);

  /** Handle photo capture from PhotoCapture component */
  const handleCapture = useCallback(
    (tempFilePath: string) => {
      doSearch(tempFilePath);
    },
    [doSearch]
  );

  /** Share to WeChat contacts */
  useShareAppMessage(() => ({
    title: "AI 帮我找到了同款！试试拍照搜同款",
    path: "/pages/index/index",
    imageUrl: results.length > 0 && results[0].images.length > 0 ? results[0].images[0] : undefined,
  }));

  return (
    <View className="search">
      {/* Photo capture when no image provided */}
      {!hasSearched && !imageUrl && (
        <View className="search__capture-section">
          <Text className="search__section-title">拍一张照片找同款</Text>
          <PhotoCapture onCapture={handleCapture} />
        </View>
      )}

      {/* Loading skeleton */}
      {loading && (
        <View className="search__results">
          <Text className="search__section-title">AI 正在寻找同款...</Text>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </View>
      )}

      {/* Error state */}
      {error && (
        <View className="search__error">
          <Text className="search__error-text">{error}</Text>
          <View
            className="search__retry-btn"
            onClick={() => {
              setError(null);
              setHasSearched(false);
            }}
          >
            <Text className="search__retry-text">重新选择照片</Text>
          </View>
        </View>
      )}

      {/* Results */}
      {!loading && !error && results.length > 0 && (
        <ScrollView className="search__results" scrollY>
          <Text className="search__section-title">找到 {results.length} 个相似单品</Text>

          {results.map((item) => (
            <ProductCard key={item.id} item={item} />
          ))}

          <RegistrationCTA />
        </ScrollView>
      )}

      {/* Empty state after search */}
      {!loading && !error && hasSearched && results.length === 0 && (
        <View className="search__empty">
          <Text className="search__empty-text">没有找到相似单品</Text>
          <Text className="search__empty-hint">试试换个角度或光线再拍一次</Text>
          <View
            className="search__retry-btn"
            onClick={() => {
              setHasSearched(false);
              setResults([]);
            }}
          >
            <Text className="search__retry-text">重新拍照</Text>
          </View>
        </View>
      )}
    </View>
  );
}
