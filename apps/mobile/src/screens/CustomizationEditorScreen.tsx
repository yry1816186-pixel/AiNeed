import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "../polyfills/expo-vector-icons";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { theme, Colors, Spacing, BorderRadius, Shadows } from '../design-system/theme';
import { DesignTokens } from "../theme/tokens/design-tokens";
import { launchImageLibrary } from "react-native-image-picker";
import { useCustomizationEditorStore, type DesignLayer } from "../stores/customizationEditorStore";
import { TemplateSelector } from "../components/customization/TemplateSelector";
import { DesignToolbar } from "../components/customization/DesignToolbar";
import { LayerPanel } from "../components/customization/LayerPanel";
import { DesignCanvas } from "../components/customization/DesignCanvas";
import { ColorPicker } from "../components/customization/ColorPicker";
import type { RootStackParamList } from "../types/navigation";

type Navigation = NavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CANVAS_WIDTH = SCREEN_WIDTH - 32;
const CANVAS_HEIGHT = Math.round(CANVAS_WIDTH * 1.2);

export const CustomizationEditorScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const [showTextModal, setShowTextModal] = useState(false);
  const [textContent, setTextContent] = useState("");
  const [textFontSize, setTextFontSize] = useState("24");
  const [textColor, setTextColor] = useState(DesignTokens.colors.neutral.black);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showLayers, setShowLayers] = useState(false);

  const store = useCustomizationEditorStore();

  useEffect(() => {
    void store.loadTemplates();
    return () => {
      store.reset();
    };
  }, []);

  const handleAddImage = useCallback(() => {
    void launchImageLibrary({ mediaType: "photo", quality: 0.8, selectionLimit: 1 }, (response) => {
      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        if (asset.uri) {
          store.addImageLayer(asset.uri, asset.width ?? 200, asset.height ?? 200);
        }
      }
    });
  }, [store]);

  const handleAddText = useCallback(() => {
    setShowTextModal(true);
  }, []);

  const handleConfirmText = useCallback(() => {
    if (!textContent.trim()) {
      Alert.alert("提示", "请输入文字内容");
      return;
    }
    store.addTextLayer(textContent.trim(), parseInt(textFontSize, 10) || 24, textColor);
    setTextContent("");
    setShowTextModal(false);
  }, [textContent, textFontSize, textColor, store]);

  const handleDeleteLayer = useCallback(() => {
    if (store.selectedLayerId) {
      store.removeLayer(store.selectedLayerId);
    }
  }, [store]);

  const handleBringForward = useCallback(() => {
    if (!store.selectedLayerId) {
      return;
    }
    const ids = store.designLayers.map((l) => l.id);
    const idx = ids.indexOf(store.selectedLayerId);
    if (idx < ids.length - 1) {
      [ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
      store.reorderLayers(ids);
    }
  }, [store]);

  const handleSendBack = useCallback(() => {
    if (!store.selectedLayerId) {
      return;
    }
    const ids = store.designLayers.map((l) => l.id);
    const idx = ids.indexOf(store.selectedLayerId);
    if (idx > 0) {
      [ids[idx], ids[idx - 1]] = [ids[idx - 1], ids[idx]];
      store.reorderLayers(ids);
    }
  }, [store]);

  const handleLayerUpdate = useCallback(
    (layerId: string, props: Partial<DesignLayer>) => {
      store.updateLayerProperty(layerId, props);
    },
    [store]
  );

  const handleSave = useCallback(async () => {
    await store.saveDesign();
    Alert.alert("保存成功", "设计方案已保存");
  }, [store]);

  const handlePreview = useCallback(async () => {
    if (!store.designId) {
      await store.saveDesign();
    }
    if (store.designId) {
      await store.generatePreview();
      // CustomizationPreview route is defined in RootStackParamList but not yet
      // registered in ProfileStackNavigator. Uncomment navigation once the route
      // is added to ProfileStackParamList and the screen is registered.
      // navigation.navigate("CustomizationPreview", {
      //   designId: store.designId!,
      // });
    }
  }, [store, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>
          {store.selectedTemplate ? store.selectedTemplate.name : "选择模板"}
        </Text>
        <View style={styles.topBarActions}>
          <TouchableOpacity
            style={styles.topBarButton}
            onPress={handleSave}
            disabled={store.isSaving}
          >
            <Text style={styles.topBarActionText}>保存</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.topBarButton, styles.previewButton]}
            onPress={handlePreview}
            disabled={!store.selectedTemplate || store.isLoading}
          >
            <Text style={styles.previewButtonText}>预览</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Template Selector (when no template selected) */}
      {!store.selectedTemplate && (
        <View style={styles.templateSection}>
          <Text style={styles.sectionTitle}>选择商品模板</Text>
          <TemplateSelector
            templates={store.templates}
            selectedId={null}
            onSelect={store.selectTemplate}
            isLoading={store.isLoadingTemplates}
          />
        </View>
      )}

      {/* Canvas Area */}
      {store.selectedTemplate && (
        <View style={styles.canvasSection}>
          <DesignCanvas
            template={store.selectedTemplate}
            layers={store.designLayers}
            selectedLayerId={store.selectedLayerId}
            onLayerUpdate={handleLayerUpdate}
            canvasWidth={CANVAS_WIDTH}
            canvasHeight={CANVAS_HEIGHT}
          />
          {store.isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          )}
        </View>
      )}

      {/* Toolbar */}
      {store.selectedTemplate && (
        <DesignToolbar
          onAddImage={handleAddImage}
          onAddText={handleAddText}
          onDeleteLayer={handleDeleteLayer}
          onBringForward={handleBringForward}
          onSendBack={handleSendBack}
          canDelete={!!store.selectedLayerId}
        />
      )}

      {/* Layer toggle */}
      {store.selectedTemplate && store.designLayers.length > 0 && (
        <TouchableOpacity
          style={styles.layerToggle}
          onPress={() => setShowLayers(!showLayers)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={showLayers ? "chevron-down" : "chevron-up"}
            size={16}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.layerToggleText}>{showLayers ? "收起图层" : "展开图层"}</Text>
        </TouchableOpacity>
      )}

      {/* Layer Panel */}
      {store.selectedTemplate && (
        <LayerPanel
          layers={store.designLayers}
          selectedId={store.selectedLayerId}
          onSelectLayer={store.setSelectedLayer}
          onDeleteLayer={store.removeLayer}
          visible={showLayers}
        />
      )}

      {/* Text Input Modal */}
      <Modal
        visible={showTextModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTextModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>添加文字</Text>
            <TextInput
              style={styles.textInput}
              placeholder="输入文字内容"
              value={textContent}
              onChangeText={setTextContent}
              maxLength={50}
              autoFocus
            />
            <View style={styles.textSettings}>
              <View style={styles.textSettingRow}>
                <Text style={styles.textSettingLabel}>字号</Text>
                <TextInput
                  style={styles.textSettingInput}
                  value={textFontSize}
                  onChangeText={setTextFontSize}
                  keyboardType="numeric"
                  maxLength={3}
                />
              </View>
              <TouchableOpacity
                style={styles.colorButton}
                onPress={() => setShowColorPicker(!showColorPicker)}
              >
                <View style={[styles.colorPreview, { backgroundColor: textColor }]} />
                <Text style={styles.colorButtonText}>颜色</Text>
              </TouchableOpacity>
            </View>
            <ColorPicker
              selectedColor={textColor}
              onColorChange={setTextColor}
              visible={showColorPicker}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowTextModal(false)}
              >
                <Text style={styles.modalCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmButton} onPress={handleConfirmText}>
                <Text style={styles.modalConfirmText}>确认</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  topBarActions: {
    flexDirection: "row",
    gap: Spacing[2],
  },
  topBarButton: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.neutral[100],
  },
  topBarActionText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "500",
    color: theme.colors.textPrimary,
  },
  previewButton: {
    backgroundColor: theme.colors.primary,
  },
  previewButtonText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: theme.colors.surface,
  },
  templateSection: {
    flex: 1,
    paddingTop: Spacing[4],
  },
  sectionTitle: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    paddingHorizontal: Spacing[4],
    marginBottom: Spacing[3],
  },
  canvasSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing[4],
    position: "relative",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  layerToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing[1],
    paddingVertical: Spacing[1],
    backgroundColor: Colors.neutral[50],
  },
  layerToggleText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing[5],
    width: "90%",
    ...Shadows.lg,
  },
  modalTitle: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    marginBottom: Spacing[4],
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    fontSize: DesignTokens.typography.sizes.md,
    color: theme.colors.textPrimary,
    marginBottom: Spacing[3],
  },
  textSettings: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing[2],
  },
  textSettingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[2],
  },
  textSettingLabel: {
    fontSize: DesignTokens.typography.sizes.base,
    color: theme.colors.textSecondary,
  },
  textSettingInput: {
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    borderRadius: BorderRadius.md,
    width: 60,
    height: 36,
    textAlign: "center",
    fontSize: DesignTokens.typography.sizes.base,
    color: theme.colors.textPrimary,
  },
  colorButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[2],
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  colorButtonText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: theme.colors.textSecondary,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing[3],
    marginTop: Spacing[4],
  },
  modalCancelButton: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.neutral[100],
  },
  modalCancelText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: theme.colors.textSecondary,
  },
  modalConfirmButton: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.md,
    backgroundColor: theme.colors.primary,
  },
  modalConfirmText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: theme.colors.surface,
  },
});

export default CustomizationEditorScreen;
