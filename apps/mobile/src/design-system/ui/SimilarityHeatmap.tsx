import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import Svg, { Rect, Text as SvgText, G } from "react-native-svg";
import { DesignTokens } from "../theme/tokens/design-tokens";

export interface SimilarityHeatmapProps {
  items: Array<{ id: string; label: string }>;
  similarityMatrix: number[][];
  size?: number;
}

const getColor = (v: number): string => {
  if (v >= 0.8) return DesignTokens.colors.brand.terracotta;
  if (v >= 0.6) return DesignTokens.colors.xuno.warmOrange;
  if (v >= 0.4) return DesignTokens.colors.xuno.warmCamel;
  if (v >= 0.2) return DesignTokens.colors.brand.sage;
  return DesignTokens.colors.neutral[200];
};

export const SimilarityHeatmap: React.FC<SimilarityHeatmapProps> = ({
  items,
  similarityMatrix,
  size = 280,
}) => {
  const n = items.length;
  if (n === 0) return null;
  const lw = 60;
  const cs = Math.min((size - lw) / n, 40);
  const ts = lw + cs * n;

  return (
    <View style={s.c}>
      <Text style={s.t}>Similarity Matrix</Text>
      <ScrollView horizontal>
        <Svg width={ts + 20} height={ts + 20}>
          {items.map((item, row) =>
            items.map((_, col) => {
              const val = similarityMatrix[row]?.[col] ?? 0;
              return (
                <G key={`${row}-${col}`}>
                  <Rect
                    x={lw + col * cs}
                    y={lw + row * cs}
                    width={cs - 1}
                    height={cs - 1}
                    fill={getColor(val)}
                    rx={2}
                  />
                  {cs >= 24 && (
                    <SvgText
                      x={lw + col * cs + cs / 2}
                      y={lw + row * cs + cs / 2 + 4}
                      textAnchor="middle"
                      fontSize={9}
                      fill={val > 0.5 ? "#FFF" : DesignTokens.colors.neutral[700]}
                    >
                      {val.toFixed(1)}
                    </SvgText>
                  )}
                </G>
              );
            })
          )}
          {items.map((item, i) => (
            <React.Fragment key={`l-${i}`}>
              <SvgText
                x={lw + i * cs + cs / 2}
                y={lw - 4}
                textAnchor="middle"
                fontSize={8}
                fill={DesignTokens.colors.neutral[600]}
              >
                {item.label.slice(0, 6)}
              </SvgText>
              <SvgText
                x={lw - 4}
                y={lw + i * cs + cs / 2 + 3}
                textAnchor="end"
                fontSize={8}
                fill={DesignTokens.colors.neutral[600]}
              >
                {item.label.slice(0, 6)}
              </SvgText>
            </React.Fragment>
          ))}
        </Svg>
      </ScrollView>
      <View style={s.legend}>
        <Text style={s.ll}>Low</Text>
        {[0.1, 0.3, 0.5, 0.7, 0.9].map((v) => (
          <View key={v} style={[s.ls, { backgroundColor: getColor(v) }]} />
        ))}
        <Text style={s.ll}>High</Text>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  c: { padding: 8 },
  t: { fontSize: 12, fontWeight: "600", marginBottom: 8, color: DesignTokens.colors.neutral[700] },
  legend: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 4 },
  ll: { fontSize: 10, color: DesignTokens.colors.neutral[500] },
  ls: { width: 16, height: 16, borderRadius: 2 },
});

export const MOCK_SIMILARITY_DATA = {
  items: [
    { id: "1", label: "白衬衫" },
    { id: "2", label: "牛仔裤" },
    { id: "3", label: "西装外套" },
    { id: "4", label: "针织衫" },
  ],
  similarityMatrix: [
    [1.0, 0.6, 0.8, 0.4],
    [0.6, 1.0, 0.5, 0.3],
    [0.8, 0.5, 1.0, 0.7],
    [0.4, 0.3, 0.7, 1.0],
  ],
};
