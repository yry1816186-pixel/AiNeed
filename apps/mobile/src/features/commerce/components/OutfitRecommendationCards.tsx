import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import type { RootStackParamList } from '../../../types/navigation';
import type { ClothingItem } from '../../../types/clothing';
import { DesignTokens, Spacing, flatColors as colors } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';

interface OutfitSet {
  id: string;
  items: ClothingItem[];
  title?: string;
}

interface OutfitRecommendationCardsProps {
  outfits: OutfitSet[];
}

export const OutfitRecommendationCards: React.FC<OutfitRecommendationCardsProps> = ({
  outfits,
}) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  if (!outfits || outfits.length === 0) {
    return null;
  }

  const handleItemPress = (itemId: string) => {
    navigation.navigate("Product", { clothingId: itemId });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>搭配推荐</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {outfits.map((outfit) => (
          <View key={outfit.id} style={styles.card}>
            <Text style={styles.cardTitle}>{outfit.title ?? "推荐搭配"}</Text>
            <View style={styles.itemsRow}>
              {outfit.items.slice(0, 3).map((item) => (
                <TouchableOpacity key={item.id} onPress={() => handleItemPress(item.id)}>
                  <Image
                    source={{ uri: item.imageUri || item.thumbnailUri }}
                    style={styles.itemImage}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const useStyles = createStyles((colors) => ({
  container: { paddingVertical: Spacing.md},
  title: { fontSize: DesignTokens.typography.sizes.md, fontWeight: "600", color: colors.textPrimary, marginBottom: DesignTokens.spacing[3]},
  card: {
    width: 200,
    backgroundColor: "colors.backgroundSecondary",
    borderRadius: 12,
    padding: DesignTokens.spacing[3],
    marginRight: DesignTokens.spacing[3],
  },
  cardTitle: { fontSize: DesignTokens.typography.sizes.sm, fontWeight: "500", color: colors.textSecondary, marginBottom: Spacing.sm},
  itemsRow: { flexDirection: "row", gap: DesignTokens.spacing['1.5']},
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 6,
    backgroundColor: colors.borderLight,
  },
}))
