import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import type { RootStackParamList } from "../types/navigation";
import type { ClothingItem } from "../types/clothing";
import { DesignTokens } from "../design-system/theme/tokens/design-tokens";

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

const styles = StyleSheet.create({
  container: { paddingVertical: 16 },
  title: { fontSize: 16, fontWeight: "600", color: DesignTokens.colors.text.primary, marginBottom: 12 },
  card: {
    width: 200,
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
  },
  cardTitle: { fontSize: 13, fontWeight: "500", color: DesignTokens.colors.text.secondary, marginBottom: 8 },
  itemsRow: { flexDirection: "row", gap: 6 },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 6,
    backgroundColor: DesignTokens.colors.borders.light,
  },
});
