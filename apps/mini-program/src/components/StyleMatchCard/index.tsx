import { View, Text, Image } from "@tarojs/components";
import type { StyleMatch } from "../../services/social";

interface StyleMatchCardProps {
  match: StyleMatch;
}

/** Style DNA match card showing user similarity */
export default function StyleMatchCard({ match }: StyleMatchCardProps) {
  const similarityPercent = Math.round(match.similarityScore * 100);

  return (
    <View className="style-match-card">
      <View className="style-match-card__avatar-wrap">
        {match.avatar ? (
          <Image className="style-match-card__avatar" src={match.avatar} mode="aspectFill" />
        ) : (
          <View className="style-match-card__avatar-placeholder">
            <Text className="style-match-card__avatar-text">
              {match.nickname.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      <View className="style-match-card__info">
        <Text className="style-match-card__nickname">{match.nickname}</Text>
        <Text className="style-match-card__similarity">{similarityPercent}% 风格匹配</Text>

        <View className="style-match-card__bar-track">
          <View className="style-match-card__bar-fill" style={{ width: `${similarityPercent}%` }} />
        </View>
      </View>
    </View>
  );
}
