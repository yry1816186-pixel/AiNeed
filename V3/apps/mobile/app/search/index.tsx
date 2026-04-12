import React, { useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  type ListRenderItemInfo,
} from 'react-native';
import { Svg, Path, Circle } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { colors, spacing, radius, typography } from '../../src/theme';
import { Text } from '../../src/components/ui/Text';
import { Badge } from '../../src/components/ui/Badge';
import { SearchBar } from '../../src/components/search/SearchBar';
import { HotKeywords } from '../../src/components/search/HotKeywords';
import { SearchHistory } from '../../src/components/search/SearchHistory';
import { SearchResultList } from '../../src/components/search/SearchResultList';
import { SearchFilters } from '../../src/components/search/SearchFilters';
import { useSearch } from '../../src/hooks/useSearch';
import type { SearchTab, SearchSuggestion } from '../../src/services/search.service';

const TAB_OPTIONS: { key: SearchTab; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'clothing', label: '服装' },
  { key: 'post', label: '帖子' },
  { key: 'user', label: '用户' },
];

const SUGGESTION_TYPE_LABELS: Record<SearchSuggestion['type'], string> = {
  clothing: '服装',
  post: '帖子',
  user: '用户',
};

export default function SearchScreen() {
  const router = useRouter();
  const {
    query,
    activeTab,
    sort,
    filters,
    isSearching,
    isTyping,
    searchResult,
    isSearchLoading,
    isSearchFetching,
    suggestions,
    hotKeywords,
    isHotKeywordsLoading,
    history,
    isHistoryLoading,
    handleSearch,
    handleClear,
    handleTabChange,
    handleSortChange,
    handleFilterChange,
    handleLoadMore,
    deleteHistoryItem,
    clearAllHistory,
  } = useSearch();

  const handleCancel = useCallback(() => {
    handleClear();
    router.back();
  }, [handleClear, router]);

  const handleKeywordPress = useCallback(
    (text: string) => {
      handleSearch(text);
    },
    [handleSearch],
  );

  const handleClothingPress = useCallback(
    (id: string) => {
      router.push(`/clothing/${id}`);
    },
    [router],
  );

  const handlePostPress = useCallback(
    (id: string) => {
      router.push(`/community/post/${id}`);
    },
    [router],
  );

  const handleUserPress = useCallback(
    (id: string) => {
      router.push(`/community/user/${id}`);
    },
    [router],
  );

  const handleFollowPress = useCallback(
    (_id: string) => {
      // follow action handled by social module
    },
    [],
  );

  const renderSuggestion = useCallback(
    ({ item }: ListRenderItemInfo<SearchSuggestion>) => (
      <TouchableOpacity
        style={suggestionStyles.item}
        onPress={() => handleSearch(item.text)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`搜索 ${item.text}`}
      >
        <Svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <Circle cx="6" cy="6" r="4.5" stroke={colors.textTertiary} strokeWidth="1.2" />
          <Path d="M9.5 9.5L13 13" stroke={colors.textTertiary} strokeWidth="1.2" strokeLinecap="round" />
        </Svg>
        <Text variant="body" color={colors.textSecondary} numberOfLines={1} style={suggestionStyles.text}>
          {item.text}
        </Text>
        <Badge label={SUGGESTION_TYPE_LABELS[item.type]} variant="default" size="small" />
      </TouchableOpacity>
    ),
    [handleSearch],
  );

  return (
    <View style={styles.container}>
      <SearchBar
        value={query}
        onChangeText={handleSearch}
        onClear={handleClear}
        onCancel={handleCancel}
        autoFocus
      />

      {isSearching ? (
        <View style={styles.content}>
          <View style={styles.tabRow}>
            {TAB_OPTIONS.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => handleTabChange(tab.key)}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: activeTab === tab.key }}
              >
                <Text
                  variant="bodySmall"
                  weight={activeTab === tab.key ? '600' : '400'}
                  color={activeTab === tab.key ? colors.accent : colors.textSecondary}
                >
                  {tab.label}
                </Text>
                {activeTab === tab.key && <View style={styles.tabIndicator} />}
              </TouchableOpacity>
            ))}
          </View>

          <SearchFilters
            filters={filters}
            sort={sort}
            onFilterChange={handleFilterChange}
            onSortChange={handleSortChange}
          />

          <SearchResultList
            result={searchResult}
            activeTab={activeTab}
            isLoading={isSearchLoading}
            isFetching={isSearchFetching}
            onLoadMore={handleLoadMore}
            onClothingPress={handleClothingPress}
            onPostPress={handlePostPress}
            onUserPress={handleUserPress}
            onFollowPress={handleFollowPress}
            style={styles.resultList}
          />
        </View>
      ) : isTyping ? (
        <FlatList
          data={suggestions}
          keyExtractor={(item, index) => `${item.text}-${index}`}
          renderItem={renderSuggestion}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={suggestionStyles.list}
          ItemSeparatorComponent={() => <View style={suggestionStyles.separator} />}
        />
      ) : (
        <FlatList
          data={[]}
          keyExtractor={() => 'initial'}
          renderItem={() => null}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View>
              <HotKeywords
                keywords={hotKeywords}
                isLoading={isHotKeywordsLoading}
                onKeywordPress={handleKeywordPress}
              />
              <SearchHistory
                history={history}
                isLoading={isHistoryLoading}
                onHistoryPress={handleKeywordPress}
                onDeleteItem={deleteHistoryItem}
                onClearAll={clearAllHistory}
              />
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  tab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    position: 'relative',
  },
  tabActive: {},
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: spacing.lg,
    right: spacing.lg,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.accent,
  },
  resultList: {
    flex: 1,
  },
});

const suggestionStyles = StyleSheet.create({
  list: {
    paddingBottom: spacing.xl,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  text: {
    flex: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginLeft: spacing.xxl + spacing.sm,
  },
});
