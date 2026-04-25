import { View, Text, Image } from "@tarojs/components";
import type { SearchItem } from "../../services/search";
import "./index.scss";

interface ProductCardProps {
  item: SearchItem;
  onClick?: () => void;
}

/** Product card showing search result with similarity badge */
export default function ProductCard({ item, onClick }: ProductCardProps) {
  const similarityPercent = Math.round(item.similarityScore * 100);

  return (
    <View className="product-card" onClick={onClick}>
      <Image
        className="product-card__image"
        src={item.images[0] || ""}
        mode="aspectFill"
        lazyLoad
      />

      <View className="product-card__info">
        <Text className="product-card__name">{item.name}</Text>

        <View className="product-card__meta">
          <Text className="product-card__price">{item.price}</Text>
          <Text className="product-card__unit">{item.currency}</Text>
        </View>

        {item.category && <Text className="product-card__category">{item.category}</Text>}

        {item.matchReasons.length > 0 && (
          <View className="product-card__tags">
            {item.matchReasons.slice(0, 3).map((reason) => (
              <Text key={reason} className="product-card__tag">
                {reason}
              </Text>
            ))}
          </View>
        )}
      </View>

      <View className="product-card__similarity">
        <Text className="product-card__similarity-text">{similarityPercent}%</Text>
      </View>
    </View>
  );
}
