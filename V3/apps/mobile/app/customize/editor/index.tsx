import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { colors, typography, spacing, radius, shadows } from '../../../src/theme';
import { Text } from '../../../src/components/ui/Text';
import { Button } from '../../../src/components/ui/Button';
import { Loading } from '../../../src/components/ui/Loading';
import { PatternEditor, type PatternEditorHandle } from '../../../src/components/customize/PatternEditor';
import { customizeService } from '../../../src/services/customize.service';
import type { DesignData, ProductTemplate } from '../../../src/services/customize.service';

const PRODUCT_TYPES = [
  { key: 'tshirt', label: 'T恤' },
  { key: 'hoodie', label: '卫衣' },
  { key: 'cap', label: '帽子' },
  { key: 'bag', label: '包包' },
  { key: 'phone_case', label: '手机壳' },
] as const;

const FONT_OPTIONS = [
  { key: 'sans-serif', label: '默认' },
  { key: 'serif', label: '衬线' },
  { key: 'monospace', label: '等宽' },
] as const;

const COLOR_OPTIONS = [
  '#1A1A1A', '#FFFFFF', '#E94560', '#2196F3',
  '#4CAF50', '#FF9800', '#9C27B0', '#795548',
] as const;

function UndoIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" fill={colors.textSecondary} />
    </Svg>
  );
}

function RedoIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z" fill={colors.textSecondary} />
    </Svg>
  );
}

function ImageIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill={colors.textInverse} />
    </Svg>
  );
}

function TextIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M5 4v3h5.5v12h3V7H19V4z" fill={colors.textInverse} />
    </Svg>
  );
}

function DeleteIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill={colors.textSecondary} />
    </Svg>
  );
}

function BackIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill={colors.textPrimary} />
    </Svg>
  );
}

export default function EditorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ designId?: string; productType?: string }>();

  const [productType, setProductType] = useState<string>(params.productType ?? 'tshirt');
  const [designName, setDesignName] = useState('我的设计');
  const [designData, setDesignData] = useState<DesignData>({
    elements: [],
    canvasWidth: 400,
    canvasHeight: 480,
  });
  const [templates, setTemplates] = useState<ProductTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ProductTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [textModalVisible, setTextModalVisible] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [selectedFont, setSelectedFont] = useState('sans-serif');
  const [selectedFontSize, setSelectedFontSize] = useState(24);
  const [selectedFontColor, setSelectedFontColor] = useState('#1A1A1A');

  const webViewRef = useRef<PatternEditorHandle>(null);

  const loadTemplates = useCallback(async () => {
    try {
      const result = await customizeService.getProductTemplates(productType);
      setTemplates(result);
      if (result.length > 0) {
        setSelectedTemplate(result[0]);
      }
    } catch {
      // templates loading failed, editor still works without template
    }
  }, [productType]);

  React.useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleDesignChange = useCallback((data: DesignData) => {
    setDesignData(data);
  }, []);

  const handlePickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const imageUrl = asset.uri;
      const width = asset.width ?? 400;
      const height = asset.height ?? 400;

      webViewRef.current?.addImage?.(imageUrl, width, height);
    }
  }, []);

  const handleAddText = useCallback(() => {
    setTextModalVisible(true);
  }, []);

  const handleConfirmText = useCallback(() => {
    if (!textInput.trim()) return;
    webViewRef.current?.addText?.(textInput, selectedFont, selectedFontSize, selectedFontColor);
    setTextInput('');
    setTextModalVisible(false);
  }, [textInput, selectedFont, selectedFontSize, selectedFontColor]);

  const handleDelete = useCallback(() => {
    webViewRef.current?.removeSelected();
  }, []);

  const handleUndo = useCallback(() => {
    webViewRef.current?.undo?.();
  }, []);

  const handleRedo = useCallback(() => {
    webViewRef.current?.redo?.();
  }, []);

  const handleSave = useCallback(async () => {
    if (!designName.trim()) {
      Alert.alert('提示', '请输入设计名称');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: designName,
        designData,
        productType,
        productTemplateId: selectedTemplate?.id,
      };

      if (params.designId) {
        await customizeService.updateDesign(params.designId, payload);
        Alert.alert('成功', '设计已保存', [{ text: '确定', onPress: () => router.back() }]);
      } else {
        const result = await customizeService.createDesign(payload);
        Alert.alert('成功', '设计已创建', [
          { text: '继续编辑', style: 'cancel' },
          { text: '返回', onPress: () => router.back() },
        ]);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存失败';
      Alert.alert('错误', message);
    } finally {
      setSaving(false);
    }
  }, [designName, designData, productType, selectedTemplate, params.designId, router]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <BackIcon />
        </TouchableOpacity>
        <TextInput
          style={styles.nameInput}
          value={designName}
          onChangeText={setDesignName}
          placeholder="设计名称"
          placeholderTextColor={colors.textTertiary}
          maxLength={50}
        />
        <TouchableOpacity onPress={handleSave} style={styles.saveButton} disabled={saving}>
          <Text variant="bodySmall" style={styles.saveButtonText}>
            {saving ? '保存中...' : '保存'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.productTypeBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {PRODUCT_TYPES.map((pt) => (
            <TouchableOpacity
              key={pt.key}
              style={[styles.productTypeChip, productType === pt.key && styles.productTypeChipActive]}
              onPress={() => setProductType(pt.key)}
            >
              <Text
                variant="bodySmall"
                style={[styles.productTypeLabel, productType === pt.key && styles.productTypeLabelActive]}
              >
                {pt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.editorArea}>
        <PatternEditor
          ref={webViewRef}
          designData={designData}
          productTemplate={selectedTemplate ? {
            uvMapUrl: selectedTemplate.uvMapUrl,
            printArea: selectedTemplate.printArea,
          } : undefined}
          onDesignChange={handleDesignChange}
        />
      </View>

      <View style={styles.toolbar}>
        <View style={styles.toolbarRow}>
          <TouchableOpacity style={styles.toolButton} onPress={handleUndo}>
            <UndoIcon />
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolButton} onPress={handleRedo}>
            <RedoIcon />
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolButton} onPress={handleDelete}>
            <DeleteIcon />
          </TouchableOpacity>
        </View>
        <View style={styles.toolbarDivider} />
        <View style={styles.toolbarRow}>
          <TouchableOpacity style={styles.toolButtonPrimary} onPress={handlePickImage}>
            <ImageIcon />
            <Text variant="caption" style={styles.toolLabelPrimary}>图案</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolButtonPrimary} onPress={handleAddText}>
            <TextIcon />
            <Text variant="caption" style={styles.toolLabelPrimary}>文字</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={textModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTextModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <Text variant="h3" style={styles.modalTitle}>添加文字</Text>

            <TextInput
              style={styles.textInput}
              value={textInput}
              onChangeText={setTextInput}
              placeholder="输入文字内容"
              placeholderTextColor={colors.textTertiary}
              autoFocus
              maxLength={100}
            />

            <View style={styles.fontRow}>
              <Text variant="bodySmall" style={styles.sectionLabel}>字体</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {FONT_OPTIONS.map((font) => (
                  <TouchableOpacity
                    key={font.key}
                    style={[styles.fontChip, selectedFont === font.key && styles.fontChipActive]}
                    onPress={() => setSelectedFont(font.key)}
                  >
                    <Text variant="caption" style={{ fontFamily: font.key }}>
                      {font.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.fontRow}>
              <Text variant="bodySmall" style={styles.sectionLabel}>大小</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {[16, 20, 24, 32, 40, 48].map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[styles.fontChip, selectedFontSize === size && styles.fontChipActive]}
                    onPress={() => setSelectedFontSize(size)}
                  >
                    <Text variant="caption">{size}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.fontRow}>
              <Text variant="bodySmall" style={styles.sectionLabel}>颜色</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {COLOR_OPTIONS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[styles.colorChip, { backgroundColor: color }, selectedFontColor === color && styles.colorChipActive]}
                    onPress={() => setSelectedFontColor(color)}
                  />
                ))}
              </ScrollView>
            </View>

            <View style={styles.modalActions}>
              <Button
                variant="secondary"
                onPress={() => setTextModalVisible(false)}
                size="small"
              >
                取消
              </Button>
              <Button
                variant="primary"
                onPress={handleConfirmText}
                size="small"
                disabled={!textInput.trim()}
              >
                添加
              </Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {saving && <Loading variant="fullscreen" />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  backButton: {
    padding: spacing.sm,
    marginLeft: -spacing.sm,
  },
  nameInput: {
    flex: 1,
    ...typography.h3,
    color: colors.textPrimary,
    marginHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  saveButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
  },
  saveButtonText: {
    color: colors.textInverse,
    fontWeight: '600',
  },
  productTypeBar: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  productTypeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.lg,
  },
  productTypeChipActive: {
    backgroundColor: colors.accent,
  },
  productTypeLabel: {
    color: colors.textSecondary,
  },
  productTypeLabelActive: {
    color: colors.textInverse,
  },
  editorArea: {
    flex: 1,
    marginHorizontal: spacing.lg,
    borderRadius: radius.md,
    overflow: 'hidden',
    ...shadows.card,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toolbarDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.divider,
    marginHorizontal: spacing.md,
  },
  toolButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.backgroundSecondary,
  },
  toolButtonPrimary: {
    width: 56,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    gap: 2,
  },
  toolLabelPrimary: {
    color: colors.textInverse,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  modalTitle: {
    marginBottom: spacing.lg,
  },
  textInput: {
    ...typography.body,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  fontRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sectionLabel: {
    color: colors.textSecondary,
    width: 36,
  },
  fontChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.sm,
    marginRight: spacing.sm,
  },
  fontChipActive: {
    backgroundColor: colors.accent,
  },
  colorChip: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  colorChipActive: {
    borderWidth: 2,
    borderColor: colors.accent,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});
