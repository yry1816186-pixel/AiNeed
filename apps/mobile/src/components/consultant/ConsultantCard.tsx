import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { RatingBadge } from "../ui/Rating";
import { MatchBadge } from "./MatchBadge";

interface ConsultantCardProps {
  id: string;
  studioName: string;
  avatar: string | null;
  specialties: string[];
  rating: number;
  reviewCount: number;
  matchPercentage?: number;
  matchReasons?: string[];
  price?: number;
  onPress: () => void;
  index?: number;
}

export const ConsultantCard: React.FC<ConsultantCardProps> = ({
  studioName,
  avatar,
  specialties,
  rating,
  reviewCount,
  matchPercentage,
  matchReasons,
  price,
  onPress,
  index = 0,
}) => {
  return (
    <Animated.View entering={FadeInUp.duration(300).delay(index * 50)}>
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.header}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>
                {studioName.charAt(0)}
              </Text>
            </View>
          )}
          <View style={styles.headerInfo}>
            <Text style={styles.studioName} numberOfLines={1}>
              {studioName}
            </Text>
            <View style={styles.specialtyRow}>
              {specialties.slice(0, 3).map((s) => (
                <View key={s} style={styles.specialtyBadge}>
                  <Text style={styles.specialtyText}>{s}</Text>
                </View>
              ))}
            </View>
          </View>
          {matchPercentage !== undefined && (
            <MatchBadge percentage={matchPercentage} />
          )}
        </View>

        <View style={styles.footer}>
          <View style={styles.ratingRow}>
            <RatingBadge value={rating} size="compact" />
            <Text style={styles.reviewCount}>{reviewCount} 条评价</Text>
          </View>
          {matchReasons && matchReasons.length > 0 && (
            <Text style={styles.matchReasons} numberOfLines={2}>
              {matchReasons.join(" / ")}
            </Text>
          )}
          {price !== undefined && (
            <Text style={styles.price}>参考价: {price} 元</Text>
          )}
        </View>

        <View style={styles.cta}>
          <Text style={styles.ctaText}>查看详情</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#C67B5C",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarPlaceholderText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "600",
  },
  headerInfo: {
    flex: 1,
  },
  studioName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  specialtyRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  specialtyBadge: {
    backgroundColor: "#FFF5F0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#F0D5C8",
  },
  specialtyText: {
    fontSize: 12,
    color: "#C67B5C",
  },
  footer: {
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  reviewCount: {
    fontSize: 13,
    color: "#888",
  },
  matchReasons: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
  price: {
    fontSize: 13,
    color: "#C67B5C",
    marginTop: 4,
  },
  cta: {
    alignSelf: "flex-end",
  },
  ctaText: {
    fontSize: 14,
    color: "#C67B5C",
    fontWeight: "500",
  },
});

export default ConsultantCard;
