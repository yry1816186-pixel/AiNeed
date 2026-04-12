import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, radius, shadows, typography } from '../../src/theme';
import { Text } from '../../src/components/ui/Text';
import { Button } from '../../src/components/ui/Button';
import { Badge } from '../../src/components/ui/Badge';
import { useCreatePost } from '../../src/hooks/useCommunity';

const MAX_IMAGES = 9;
const MAX_TAGS = 10;

const SUGGESTED_TAGS = [
  '日常穿搭', '通勤', '约会', '街头', '简约',
  '韩系', '日系', '国潮', '复古', '运动',
];

export default function CreatePostScreen() {
  const router = useRouter();
  const createPost = useCreatePost();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const pickImages = async () => {
    const remaining = MAX_IMAGES - imageUris.length;
    if (remaining <= 0) {
      Alert.alert('提示', `最多上传${MAX_IMAGES}张图片`);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newUris = result.assets.map((asset) => asset.uri);
      setImageUris((prev) => [...prev, ...newUris].slice(0, MAX_IMAGES));
    }
  };

  const removeImage = (index: number) => {
    setImageUris((prev) => prev.filter((_, i) => i !== index));
  };

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (tags.length >= MAX_TAGS) {
      Alert.alert('提示', `最多添加${MAX_TAGS}个标签`);
      return;
    }
    if (tags.includes(trimmed)) return;
    setTags((prev) => [...prev, trimmed]);
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleSubmit = () => {
    if (!content.trim()) {
      Alert.alert('提示', '请输入帖子内容');
      return;
    }
    if (imageUris.length === 0) {
      Alert.alert('提示', '请至少上传一张图片');
      return;
    }

    createPost.mutate(
      {
        title: title.trim() || undefined,
        content: content.trim(),
        image_urls: imageUris,
        tags: tags.length > 0 ? tags : undefined,
      },
      {
        onSuccess: (post) => {
          router.replace(`/community/${post.id}`);
        },
        onError: (error) => {
          Alert.alert('发帖失败', error.message);
        },
      },
    );
  };

  const canSubmit = content.trim().length > 0 && imageUris.length > 0;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text variant="body" color={colors.textSecondary}>取消</Text>
        </TouchableOpacity>
        <Text variant="body" weight="600">发布帖子</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <TextInput
            style={styles.titleInput}
            placeholder="标题（可选）"
            placeholderTextColor={colors.textTertiary}
            value={title}
            onChangeText={setTitle}
            maxLength={200}
          />
          <TextInput
            style={styles.contentInput}
            placeholder="分享你的穿搭心得..."
            placeholderTextColor={colors.textTertiary}
            value={content}
            onChangeText={setContent}
            multiline
            maxLength={5000}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <Text variant="body2" weight="600" style={styles.sectionTitle}>图片</Text>
          <View style={styles.imageGrid}>
            {imageUris.map((uri, i) => (
              <View key={i} style={styles.imageWrapper}>
                <Image source={{ uri }} style={styles.imageThumb} resizeMode="cover" />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeImage(i)}
                  activeOpacity={0.7}
                >
                  <Text variant="caption" color={colors.white}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            {imageUris.length < MAX_IMAGES && (
              <TouchableOpacity
                style={styles.addImageButton}
                onPress={pickImages}
                activeOpacity={0.7}
              >
                <Text variant="h2" color={colors.textTertiary}>+</Text>
                <Text variant="caption" color={colors.textTertiary}>
                  {imageUris.length}/{MAX_IMAGES}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text variant="body2" weight="600" style={styles.sectionTitle}>标签</Text>
          <View style={styles.tagInputRow}>
            <TextInput
              style={styles.tagInput}
              placeholder="输入标签"
              placeholderTextColor={colors.textTertiary}
              value={tagInput}
              onChangeText={setTagInput}
              onSubmitEditing={() => addTag(tagInput)}
              maxLength={20}
              returnKeyType="done"
            />
            <TouchableOpacity
              onPress={() => addTag(tagInput)}
              disabled={!tagInput.trim()}
              style={[styles.addTagButton, !tagInput.trim() && styles.addTagButtonDisabled]}
              activeOpacity={0.7}
            >
              <Text variant="buttonSmall" color={colors.white}>添加</Text>
            </TouchableOpacity>
          </View>
          {tags.length > 0 && (
            <View style={styles.tagsRow}>
              {tags.map((tag) => (
                <TouchableOpacity key={tag} onPress={() => removeTag(tag)} activeOpacity={0.7}>
                  <Badge label={`#${tag} ✕`} variant="default" size="small" />
                </TouchableOpacity>
              ))}
            </View>
          )}
          <View style={styles.suggestedTagsRow}>
            {SUGGESTED_TAGS.filter((t) => !tags.includes(t)).map((tag) => (
              <TouchableOpacity key={tag} onPress={() => addTag(tag)} activeOpacity={0.7}>
                <Badge label={`#${tag}`} variant="default" size="small" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, shadows.sm]}>
        <Button
          variant="primary"
          size="large"
          fullWidth
          onPress={handleSubmit}
          loading={createPost.isPending}
          disabled={!canSubmit}
        >
          发布
        </Button>
      </View>
    </View>
  );
}

const IMAGE_GRID_SIZE = (Dimensions => {
  const { width } = require('react-native').Dimensions.get('window');
  return (width - spacing.lg * 2 - spacing.sm * 2) / 3;
})();

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  section: {
    padding: spacing.lg,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray50,
  },
  sectionTitle: {
    lineHeight: typography.body2.lineHeight,
  },
  titleInput: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
    color: colors.textPrimary,
    lineHeight: typography.h3.lineHeight,
    padding: 0,
  },
  contentInput: {
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
    lineHeight: typography.body.lineHeight,
    minHeight: 120,
    padding: 0,
    textAlignVertical: 'top',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  imageWrapper: {
    width: IMAGE_GRID_SIZE,
    height: IMAGE_GRID_SIZE,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  imageThumb: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageButton: {
    width: IMAGE_GRID_SIZE,
    height: IMAGE_GRID_SIZE,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.gray300,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tagInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tagInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.gray50,
    borderRadius: radius.lg,
    fontSize: typography.body2.fontSize,
    color: colors.textPrimary,
  },
  addTagButton: {
    paddingHorizontal: spacing.lg,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTagButtonDisabled: {
    opacity: 0.5,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  suggestedTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
});
