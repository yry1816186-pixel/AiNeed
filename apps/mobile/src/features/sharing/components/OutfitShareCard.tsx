import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import ShareCardLayout from "./ShareCardLayout";
import { encodeMiniProgramPath } from "../utils/qr-encoder";

/**
 * Outfit Plan Share Card
 *
 * Displays a 2x2 grid of outfit items (top/bottom/shoes/accessory),
 * total price, scene tag, and a QR code linking to the mini-program.
 */

interface OutfitItem {
  category: string;
  name: string;
  imageUrl: string;
  price: number;
}

interface OutfitShareCardProps {
  items: OutfitItem[];
  scene?: string;
  totalPrice: number;
  referrerId: string;
  outfitId?: string;
}

const OutfitShareCard: React.FC<OutfitShareCardProps> = ({
  items,
  scene,
  totalPrice,
  referrerId,
  outfitId,
}) => {
  const qrPath = encodeMiniProgramPath({
    referrerId,
    cardType: "outfit",
    cardId: outfitId,
  });

  return (
    <View collapsable={false} style={styles.wrapper}>
      <ShareCardLayout qrPath={qrPath}>
        {/* Scene tag */}
        {scene ? <Text style={styles.sceneTag}>{scene}</Text> : null}

        {/* 4-item grid: top/bottom/shoes/accessory */}
        <View style={styles.itemGrid}>
          {items.slice(0, 4).map((item, i) => (
            <View key={i} style={styles.gridItem} collapsable={false}>
              <Image source={{ uri: item.imageUrl }} style={styles.itemImage} resizeMode="cover" />
              <Text style={styles.itemName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.itemPrice}>{"¥" + item.price}</Text>
            </View>
          ))}
        </View>

        {/* Total price */}
        <Text style={styles.totalPrice}>{"搭配总价 ¥" + totalPrice}</Text>
      </ShareCardLayout>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
  },
  sceneTag: {
    fontSize: 13,
    fontWeight: "600",
    color: "#C67B5C",
    backgroundColor: "rgba(198, 123, 92, 0.1)",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  itemGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
  },
  gridItem: {
    width: "47%",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 4,
  },
  itemImage: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#F5F5F3",
  },
  itemName: {
    fontSize: 12,
    color: "#282825",
    fontWeight: "500",
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 2,
  },
  itemPrice: {
    fontSize: 12,
    color: "#C67B5C",
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2D3436",
    marginTop: 16,
    textAlign: "center",
  },
});

export default OutfitShareCard;
