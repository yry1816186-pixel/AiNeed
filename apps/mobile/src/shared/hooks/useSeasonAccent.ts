/**
 * useSeasonAccent - 四季色彩强调色 Hook
 *
 * 自动从 profileStore 同步色彩季型到 ThemeContext，
 * 组件通过此 Hook 获取当前季节强调色方案。
 *
 * 使用方式：
 *   const { seasonAccent, colorSeason } = useSeasonAccent();
 *   const accentColor = seasonAccent?.accent ?? Colors.primary[500]; // 回退到品牌色
 */
import { useEffect } from "react";
import { useTheme } from '../../shared/contexts/ThemeContext';
import { useProfileStore } from "../../stores/profileStore";
import { normalizeColorSeason, type ColorSeason, type SeasonAccentColors } from '../../design-system/theme/tokens/season-colors';

interface UseSeasonAccentReturn {
  /** 当前色彩季型（null 表示未分析或已清除） */
  colorSeason: ColorSeason | null;
  /** 当前季节强调色方案（null 表示使用默认品牌色） */
  seasonAccent: SeasonAccentColors | null;
  /** 手动设置季节强调色 */
  setSeasonAccent: (season: ColorSeason | null) => void;
}

export function useSeasonAccent(): UseSeasonAccentReturn {
  const { colorSeason, seasonAccent, setSeasonAccent } = useTheme();
  const colorAnalysis = useProfileStore((s) => s.colorAnalysis);

  // 自动从 profileStore 的色彩分析数据同步到 ThemeContext
  useEffect(() => {
    if (!colorAnalysis?.colorSeason?.type) return;

    const normalized = normalizeColorSeason(colorAnalysis.colorSeason.type);
    if (normalized && normalized !== colorSeason) {
      void setSeasonAccent(normalized);
    }
  }, [colorAnalysis?.colorSeason?.type, colorSeason, setSeasonAccent]);

  return { colorSeason, seasonAccent, setSeasonAccent };
}
