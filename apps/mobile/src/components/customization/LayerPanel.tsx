import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "../../polyfills/expo-vector-icons";
import { theme, Colors, Spacing, BorderRadius } from "../../theme";
import type { DesignLayer } from "../../stores/customizationEditorStore";

interface LayerPanelProps {
  layers: DesignLayer[];
  selectedId: string | null;
  onSelectLayer: (layerId: string) => void;
  onDeleteLayer: (layerId: string) => void;
  onToggleVisibility?: (layerId: string) => void;
  visible?: boolean;
}

export const LayerPanel: React.FC<LayerPanelProps> = ({
  layers,
  selectedId,
  onSelectLayer,
  onDeleteLayer,
  visible = true,
}) => {
  if (!visible) return null;

  if (layers.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>暂无图层，请添加图片或文字</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>图层</Text>
        <Text style={styles.layerCount}>{layers.length}</Text>
      </View>
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {layers.map((layer) => {
          const isSelected = selectedId === layer.id;
          return (
            <TouchableOpacity
              key={layer.id}
              style={[
                styles.layerRow,
                isSelected && styles.layerRowSelected,
              ]}
              onPress={() => onSelectLayer(layer.id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={
                  layer.type === "image"
                    ? "image-outline"
                    : layer.type === "text"
                      ? "text-outline"
                      : "shapes-outline"
                }
                size={18}
                color={isSelected ? theme.colors.primary : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.layerContent,
                  isSelected && styles.layerContentSelected,
                ]}
                numberOfLines={1}
              >
                {layer.type === "image" ? "图片" : layer.content}
              </Text>
              <TouchableOpacity
                onPress={() => onDeleteLayer(layer.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={18}
                  color={Colors.neutral[400]}
                />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.neutral[50],
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
    maxHeight: 200,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
  },
  layerCount: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  list: {
    paddingHorizontal: Spacing[2],
    paddingBottom: Spacing[2],
  },
  layerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[3],
    borderRadius: BorderRadius.md,
    gap: Spacing[2],
  },
  layerRowSelected: {
    backgroundColor: "rgba(198, 123, 92, 0.1)",
  },
  layerContent: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  layerContentSelected: {
    color: theme.colors.primary,
    fontWeight: "500",
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    textAlign: "center",
    paddingVertical: Spacing[3],
  },
});
