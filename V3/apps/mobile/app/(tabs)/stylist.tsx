import React, { useCallback, useState } from 'react';
import {
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { colors, typography, spacing, radius, shadows } from '../../src/theme';
import { Text } from '../../src/components/ui/Text';
import { Button } from '../../src/components/ui/Button';
import { OccasionCard } from '../../src/components/stylist/OccasionCard';
import { BudgetSelector } from '../../src/components/stylist/BudgetSelector';
import { StyleTagSelector } from '../../src/components/stylist/StyleTagSelector';
import { OutfitCarousel } from '../../src/components/stylist/OutfitCarousel';
import { OutfitImageModal } from '../../src/components/stylist/OutfitImageModal';
import { useStylistStore } from '../../src/stores/stylist.store';
import { useGenerateOutfit } from '../../src/hooks/useStylist';
import { useOutfitImage } from '../../src/hooks/useOutfitImage';
import type { StylistOccasion, StylistBudget, StylistStyleTag, StylistOutfit } from '../../src/types';
import type { GenerateOutfitImagePayload } from '../../src/services/outfit-image.service';

function QAvatarThinking() {
  return (
    <View style={qStyles.container}>
      <View style={qStyles.head}>
        <View style={qStyles.face}>
          <View style={qStyles.eyeLeft} />
          <View style={qStyles.eyeRight} />
          <View style={qStyles.mouth} />
        </View>
      </View>
      <View style={qStyles.body} />
    </View>
  );
}

function QAvatarGreeting() {
  return (
    <View style={gStyles.container}>
      <View style={gStyles.avatarRow}>
        <View style={gStyles.head}>
          <View style={gStyles.face}>
            <View style={gStyles.eyeLeft} />
            <View style={gStyles.eyeRight} />
            <View style={gStyles.smile} />
          </View>
        </View>
        <View style={gStyles.body} />
      </View>
      <Text style={gStyles.greeting}>来帮你搭配!</Text>
    </View>
  );
}

export default function StylistScreen() {
  const store = useStylistStore();
  const { generate, retry, reset } = useGenerateOutfit();
  const { isLoading: isImageLoading, result: imageResult, error: imageError, generate: generateImage, reset: resetImage } = useOutfitImage();
  const [imageModalVisible, setImageModalVisible] = useState(false);

  const hasSelection =
    store.selectedOccasion !== null ||
    store.selectedBudget !== null ||
    store.selectedStyles.length > 0;

  const handleOccasionSelect = useCallback(
    (occasion: StylistOccasion) => {
      store.selectOccasion(
        store.selectedOccasion === occasion ? null : occasion,
      );
    },
    [store],
  );

  const handleBudgetSelect = useCallback(
    (budget: StylistBudget) => {
      store.selectBudget(
        store.selectedBudget === budget ? null : budget,
      );
    },
    [store],
  );

  const handleStyleToggle = useCallback(
    (style: StylistStyleTag) => {
      store.toggleStyle(style);
    },
    [store],
  );

  const handleTryOn = useCallback((_outfit: StylistOutfit) => {
  }, []);

  const handleFavorite = useCallback((_outfit: StylistOutfit) => {
  }, []);

  const handleTryAll = useCallback(() => {
  }, []);

  const handleViewOutfitImage = useCallback(() => {
    const currentOutfit = store.currentOutfits[store.currentOutfitIndex];
    if (!currentOutfit) return;

    const payload: GenerateOutfitImagePayload = {
      items: currentOutfit.items.map((item) => ({
        name: item.name,
        color: '',
        category: item.slot as GenerateOutfitImagePayload['items'][number]['category'],
      })),
      occasion: currentOutfit.occasion ?? store.selectedOccasion ?? 'casual',
      styleTips: currentOutfit.styleTags?.join('、'),
    };

    setImageModalVisible(true);
    generateImage(payload);
  }, [store, generateImage]);

  const handleCloseImageModal = useCallback(() => {
    setImageModalVisible(false);
    resetImage();
  }, [resetImage]);

  const handleRegenerateImage = useCallback(() => {
    const currentOutfit = store.currentOutfits[store.currentOutfitIndex];
    if (!currentOutfit) return;

    const payload: GenerateOutfitImagePayload = {
      items: currentOutfit.items.map((item) => ({
        name: item.name,
        color: '',
        category: item.slot as GenerateOutfitImagePayload['items'][number]['category'],
      })),
      occasion: currentOutfit.occasion ?? store.selectedOccasion ?? 'casual',
      styleTips: currentOutfit.styleTags?.join('、'),
    };

    generateImage(payload);
  }, [store, generateImage]);

  if (store.step === 'loading') {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContent}>
          <QAvatarThinking />
          <Text style={styles.loadingText}>AI正在为你搭配...</Text>
          <ActivityIndicator
            size="large"
            color={colors.accent}
            style={styles.spinner}
          />
          {store.error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{store.error}</Text>
              <Button
                variant="secondary"
                size="small"
                onPress={retry}
              >
                重试
              </Button>
            </View>
          )}
        </View>
      </View>
    );
  }

  if (store.step === 'result') {
    return (
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {store.streamingText ? (
          <View style={styles.streamingSection}>
            <Text style={styles.streamingText}>{store.streamingText}</Text>
          </View>
        ) : null}

        {store.currentOutfits.length > 0 && (
          <OutfitCarousel
            outfits={store.currentOutfits}
            currentIndex={store.currentOutfitIndex}
            onIndexChange={store.setCurrentOutfitIndex}
            onTryOn={handleTryOn}
            onFavorite={handleFavorite}
            onTryAll={handleTryAll}
            onRegenerate={retry}
          />
        )}

        {store.currentOutfits.length > 0 && (
          <View style={styles.viewImageSection}>
            <Button
              variant="secondary"
              size="medium"
              fullWidth
              onPress={handleViewOutfitImage}
            >
              查看穿搭效果
            </Button>
          </View>
        )}

        {store.error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{store.error}</Text>
            <Button variant="secondary" size="small" onPress={retry}>
              重试
            </Button>
          </View>
        )}

        <View style={styles.resultActions}>
          <Button
            variant="secondary"
            size="medium"
            onPress={retry}
            fullWidth
          >
            换一套
          </Button>
          <View style={styles.spacer} />
          <Button
            variant="text"
            size="medium"
            onPress={reset}
            fullWidth
            textStyle={styles.backText}
          >
            重新选择
          </Button>
        </View>

        <View style={styles.bottomPadding} />

        <OutfitImageModal
          visible={imageModalVisible}
          onClose={handleCloseImageModal}
          isLoading={isImageLoading}
          result={imageResult}
          error={imageError}
          onRegenerate={handleRegenerateImage}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <QAvatarGreeting />
      </View>

      <View style={styles.section}>
        <Text variant="h3" style={styles.sectionTitle}>
          今天要去哪里？
        </Text>
        <OccasionCard
          selected={store.selectedOccasion}
          onSelect={handleOccasionSelect}
        />
      </View>

      <View style={styles.section}>
        <Text variant="h3" style={styles.sectionTitle}>
          预算范围？
        </Text>
        <BudgetSelector
          selected={store.selectedBudget}
          onSelect={handleBudgetSelect}
        />
      </View>

      <View style={styles.section}>
        <Text variant="h3" style={styles.sectionTitle}>
          风格偏好？
        </Text>
        <StyleTagSelector
          selected={store.selectedStyles}
          onToggle={handleStyleToggle}
        />
      </View>

      <TouchableOpacity
        style={[styles.generateButton, !hasSelection && styles.generateButtonDisabled]}
        onPress={generate}
        disabled={!hasSelection}
        activeOpacity={0.8}
      >
        <Text style={styles.generateButtonText}>生成搭配方案</Text>
      </TouchableOpacity>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    alignItems: 'center',
  },
  section: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  generateButton: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xxxl,
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: spacing.md + spacing.xs,
    alignItems: 'center',
    ...shadows.fab,
  },
  generateButtonDisabled: {
    backgroundColor: colors.textDisabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  generateButtonText: {
    ...typography.button,
    color: colors.textInverse,
  },
  loadingContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  loadingText: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.xl,
  },
  spinner: {
    marginTop: spacing.lg,
  },
  streamingSection: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  streamingText: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  viewImageSection: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
  },
  errorContainer: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    padding: spacing.lg,
    backgroundColor: `${colors.error}10`,
    borderRadius: radius.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
  },
  resultActions: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xl,
  },
  spacer: {
    height: spacing.md,
  },
  backText: {
    color: colors.textSecondary,
  },
  bottomPadding: {
    height: spacing.xxxl,
  },
});

const qStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  head: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  face: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 30,
  },
  eyeLeft: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
    marginRight: 8,
  },
  eyeRight: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
  },
  mouth: {
    width: 10,
    height: 5,
    borderBottomWidth: 2,
    borderBottomColor: colors.white,
    borderRadius: 0,
    marginTop: 4,
  },
  body: {
    width: 40,
    height: 24,
    borderRadius: radius.lg,
    backgroundColor: colors.accentLight,
  },
});

const gStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  head: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  face: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    width: 36,
    height: 26,
  },
  eyeLeft: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.white,
    marginRight: 7,
  },
  eyeRight: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.white,
  },
  smile: {
    width: 8,
    height: 4,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.white,
    marginTop: 3,
  },
  body: {
    width: 36,
    height: 20,
    borderRadius: radius.md,
    backgroundColor: colors.accentLight,
  },
  greeting: {
    ...typography.body,
    color: colors.accent,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
});
