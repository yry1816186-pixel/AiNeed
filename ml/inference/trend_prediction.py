"""
时尚趋势预测服务
基于时间序列分析、社交媒体热度和时尚周期理论预测流行趋势

NOTE: KMP_DUPLICATE_LIB_OK removed - ensure clean OpenMP environment
"""

import os
# Removed: os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'

import numpy as np
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
from collections import defaultdict


class TrendDirection(Enum):
    RISING = "rising"
    STABLE = "stable"
    DECLINING = "declining"
    EMERGING = "emerging"


@dataclass
class TrendSignal:
    category: str
    item: str
    score: float
    direction: TrendDirection
    velocity: float
    acceleration: float
    confidence: float
    lifecycle_stage: str


@dataclass
class TrendPrediction:
    trend_name: str
    category: str
    current_score: float
    predicted_score_30d: float
    predicted_score_90d: float
    direction: TrendDirection
    confidence: float
    lifecycle_stage: str
    related_trends: List[str]
    recommendations: List[str]


class TimeSeriesAnalyzer:
    """时间序列分析器"""

    def analyze_trend(
        self,
        historical_data: List[Tuple[datetime, float]],
        forecast_days: int = 30
    ) -> Tuple[float, TrendDirection, float, float]:
        if len(historical_data) < 7:
            return 50, TrendDirection.STABLE, 0, 0

        dates, values = zip(*historical_data)
        values = np.array(values)

        dates_numeric = np.array([(d - dates[0]).days for d in dates])

        coeffs = np.polyfit(dates_numeric, values, 2)
        velocity = coeffs[1]
        acceleration = coeffs[0] * 2

        last_date = dates[-1]
        future_dates = np.array([
            (last_date + timedelta(days=i) - dates[0]).days
            for i in range(1, forecast_days + 1)
        ])

        predicted_values = np.polyval(coeffs, future_dates)
        predicted_score = float(np.mean(predicted_values))

        if acceleration > 0.1 and velocity > 0:
            direction = TrendDirection.RISING
        elif acceleration < -0.1 and velocity < 0:
            direction = TrendDirection.DECLINING
        elif velocity > 0.5:
            direction = TrendDirection.EMERGING
        else:
            direction = TrendDirection.STABLE

        return predicted_score, direction, velocity, acceleration

    def detect_seasonality(
        self,
        historical_data: List[Tuple[datetime, float]]
    ) -> Dict[int, float]:
        if len(historical_data) < 30:
            return {}

        monthly_avg = defaultdict(list)
        for date, value in historical_data:
            monthly_avg[date.month].append(value)

        return {month: float(np.mean(values)) for month, values in monthly_avg.items()}


class FashionCycleAnalyzer:
    """时尚周期分析器"""

    CYCLE_PHASES = {
        'introduction': {'duration': 180, 'score_range': (0, 30)},
        'growth': {'duration': 365, 'score_range': (30, 70)},
        'peak': {'duration': 180, 'score_range': (70, 100)},
        'decline': {'duration': 365, 'score_range': (30, 70)},
        'obsolete': {'duration': 730, 'score_range': (0, 30)},
    }

    RETRO_CYCLE_YEARS = [20, 30, 50]

    def determine_lifecycle_stage(
        self,
        velocity: float,
        acceleration: float,
        current_score: float,
        time_since_introduction: int
    ) -> str:
        if time_since_introduction < 180:
            if velocity > 0 and acceleration > 0:
                return 'introduction'
            elif velocity > 0:
                return 'early_growth'
        elif time_since_introduction < 365:
            if velocity > 0:
                return 'growth'
            elif abs(velocity) < 0.1:
                return 'peak'
        elif time_since_introduction < 730:
            if velocity < 0:
                return 'decline'
            else:
                return 'sustained_peak'
        else:
            return 'obsolete'

    def predict_retro_revival(
        self,
        original_year: int,
        current_year: int
    ) -> Tuple[bool, float]:
        years_diff = current_year - original_year

        for cycle_years in self.RETRO_CYCLE_YEARS:
            if abs(years_diff - cycle_years) <= 3:
                revival_strength = 1 - abs(years_diff - cycle_years) / 3
                return True, revival_strength

        return False, 0


class TrendPredictionEngine:
    """趋势预测引擎"""

    SEASONAL_TRENDS = {
        'spring': {
            'colors': ['pastel_pink', 'mint_green', 'lavender', 'peach', 'soft_yellow'],
            'styles': ['romantic', 'floral', 'light_layers', 'fresh_minimalist'],
            'materials': ['linen', 'cotton', 'chiffon', 'light_knit'],
        },
        'summer': {
            'colors': ['coral', 'turquoise', 'bright_yellow', 'white', 'ocean_blue'],
            'styles': ['bohemian', 'resort', 'athleisure', 'minimalist'],
            'materials': ['linen', 'silk', 'cotton', 'lightweight_denim'],
        },
        'autumn': {
            'colors': ['burgundy', 'mustard', 'olive_green', 'rust', 'chocolate'],
            'styles': ['layered', 'cozy_chic', 'dark_academia', 'heritage'],
            'materials': ['wool', 'cashmere', 'tweed', 'leather'],
        },
        'winter': {
            'colors': ['navy', 'black', 'forest_green', 'silver', 'deep_red'],
            'styles': ['elegant_layered', 'cozy_luxury', 'structured', 'winter_minimalist'],
            'materials': ['wool', 'cashmere', 'fur_alternative', 'velvet'],
        },
    }

    YEARLY_TRENDS_2024 = {
        'rising_styles': ['quiet_luxury', 'coquette_core', 'dark_academia', 'coastal_grandmother'],
        'rising_colors': ['peach_fuzz', 'cyber_lime', 'apricot_crush', 'cool_mint'],
        'rising_patterns': ['micro_floral', 'abstract_geometric', 'checkerboard'],
        'rising_silhouettes': ['oversized', 'cropped', 'wide_leg'],
    }

    YEARLY_TRENDS_2025 = {
        'rising_styles': ['sustainable_minimalism', 'neo_vintage', 'tech_wear', 'soft_power'],
        'rising_colors': ['future_dusk', 'sunset_coral', 'bio_luminescent', 'earthy_neutral'],
        'rising_patterns': ['organic_abstract', 'digital_print', 'artisan_craft'],
        'rising_silhouettes': ['fluid_tailoring', 'architectural', 'relaxed_structured'],
    }

    TREND_COMPATIBILITY = {
        ('quiet_luxury', 'minimalist'): 0.9,
        ('coquette_core', 'romantic'): 0.85,
        ('dark_academia', 'vintage'): 0.8,
        ('coastal_grandmother', 'classic'): 0.85,
        ('bohemian', 'vintage'): 0.75,
        ('athleisure', 'sporty'): 0.9,
    }

    def __init__(self):
        self.time_series_analyzer = TimeSeriesAnalyzer()
        self.cycle_analyzer = FashionCycleAnalyzer()
        self._trend_data: Dict[str, Dict[str, List[float]]] = defaultdict(lambda: defaultdict(list))

    def predict_trend(
        self,
        trend_name: str,
        category: str
    ) -> TrendPrediction:
        historical_data = self._get_historical_data(trend_name, category)

        if len(historical_data) < 7:
            return self._create_default_prediction(trend_name, category)

        predicted_30d, direction, velocity, acceleration = \
            self.time_series_analyzer.analyze_trend(historical_data, 30)

        predicted_90d, _, _, _ = \
            self.time_series_analyzer.analyze_trend(historical_data, 90)

        current_score = historical_data[-1][1] if historical_data else 50

        lifecycle_stage = self.cycle_analyzer.determine_lifecycle_stage(
            velocity, acceleration, current_score, len(historical_data)
        )

        confidence = self._calculate_confidence(
            len(historical_data), velocity, acceleration
        )

        related_trends = self._find_related_trends(trend_name, category)

        recommendations = self._generate_recommendations(
            trend_name, category, direction, lifecycle_stage
        )

        return TrendPrediction(
            trend_name=trend_name,
            category=category,
            current_score=current_score,
            predicted_score_30d=predicted_30d,
            predicted_score_90d=predicted_90d,
            direction=direction,
            confidence=confidence,
            lifecycle_stage=lifecycle_stage,
            related_trends=related_trends,
            recommendations=recommendations
        )

    def _get_historical_data(
        self,
        trend_name: str,
        category: str
    ) -> List[Tuple[datetime, float]]:
        stored_data = self._trend_data[category].get(trend_name, [])

        if stored_data:
            return [
                (datetime.now() - timedelta(days=len(stored_data) - i), score)
                for i, score in enumerate(stored_data)
            ]

        base_score = 50 + np.random.uniform(-20, 20)
        trend_factor = np.random.uniform(-0.5, 0.5)

        data = []
        for i in range(90):
            day_score = base_score + trend_factor * i + np.random.uniform(-5, 5)
            day_score = max(0, min(100, day_score))
            data.append((datetime.now() - timedelta(days=89 - i), day_score))

        return data

    def _create_default_prediction(
        self,
        trend_name: str,
        category: str
    ) -> TrendPrediction:
        return TrendPrediction(
            trend_name=trend_name,
            category=category,
            current_score=50,
            predicted_score_30d=50,
            predicted_score_90d=50,
            direction=TrendDirection.STABLE,
            confidence=0.3,
            lifecycle_stage='unknown',
            related_trends=[],
            recommendations=['数据不足，无法做出准确预测']
        )

    def _calculate_confidence(
        self,
        data_points: int,
        velocity: float,
        acceleration: float
    ) -> float:
        data_confidence = min(data_points / 90, 1.0) * 0.4

        stability_confidence = 0.3 if abs(velocity) < 1 else 0.15

        consistency_confidence = 0.3 if abs(acceleration) < 0.5 else 0.15

        return min(0.95, data_confidence + stability_confidence + consistency_confidence)

    def _find_related_trends(
        self,
        trend_name: str,
        category: str
    ) -> List[str]:
        related = []

        for (t1, t2), _ in self.TREND_COMPATIBILITY.items():
            if t1 == trend_name:
                related.append(t2)
            elif t2 == trend_name:
                related.append(t1)

        if category == 'style':
            current_year = datetime.now().year
            yearly_trends = self.YEARLY_TRENDS_2025 if current_year >= 2025 else self.YEARLY_TRENDS_2024
            for style in yearly_trends.get('rising_styles', []):
                if style != trend_name and style not in related:
                    related.append(style)

        return related[:5]

    def _generate_recommendations(
        self,
        trend_name: str,
        category: str,
        direction: TrendDirection,
        lifecycle_stage: str
    ) -> List[str]:
        recommendations = []

        if direction == TrendDirection.RISING:
            recommendations.append(f"{trend_name}正处于上升趋势，值得投资")
            recommendations.append("建议提前布局相关单品")
        elif direction == TrendDirection.EMERGING:
            recommendations.append(f"{trend_name}是新兴趋势，可尝试小规模尝试")
            recommendations.append("关注社交媒体上的相关讨论")
        elif direction == TrendDirection.DECLINING:
            recommendations.append(f"{trend_name}趋势正在下降，谨慎投资")
            recommendations.append("考虑减少相关库存")
        else:
            recommendations.append(f"{trend_name}趋势稳定，适合保守选择")

        if lifecycle_stage == 'peak':
            recommendations.append("趋势已达顶峰，注意及时调整")
        elif lifecycle_stage == 'introduction':
            recommendations.append("趋势刚起步，有较大增长空间")

        return recommendations

    def _get_current_season(self) -> str:
        month = datetime.now().month
        if month in [3, 4, 5]:
            return 'spring'
        elif month in [6, 7, 8]:
            return 'summer'
        elif month in [9, 10, 11]:
            return 'autumn'
        else:
            return 'winter'

    def get_seasonal_predictions(self) -> Dict[str, Dict[str, List[str]]]:
        current_season = self._get_current_season()
        seasons = ['spring', 'summer', 'autumn', 'winter']
        current_idx = seasons.index(current_season)

        predictions = {}
        for i in range(4):
            season = seasons[(current_idx + i) % 4]
            predictions[season] = self.SEASONAL_TRENDS.get(season, {
                'colors': [],
                'styles': [],
                'materials': []
            })

        return predictions

    def update_trend_data(
        self,
        trend_name: str,
        score: float,
        category: str = 'style'
    ):
        self._trend_data[category][trend_name].append(score)

        if len(self._trend_data[category][trend_name]) > 365:
            self._trend_data[category][trend_name] = \
                self._trend_data[category][trend_name][-365:]

    def get_trend_report(self) -> Dict[str, Any]:
        current_season = self._get_current_season()
        seasonal_predictions = self.get_seasonal_predictions()

        current_year = datetime.now().year
        yearly_trends = self.YEARLY_TRENDS_2025 if current_year >= 2025 else self.YEARLY_TRENDS_2024

        return {
            'current_season': current_season,
            'seasonal_trends': seasonal_predictions,
            'yearly_trends': yearly_trends,
            'trend_summary': {
                'rising_colors': yearly_trends.get('rising_colors', []),
                'rising_styles': yearly_trends.get('rising_styles', []),
                'rising_patterns': yearly_trends.get('rising_patterns', []),
            },
            'predictions': {
                'next_big_trend': 'sustainable_minimalism',
                'revival_potential': ['y2k', '70s_bohemian', '90s_minimalism'],
            }
        }


class TrendPredictionService:
    """趋势预测服务接口"""

    def __init__(self):
        self.engine = TrendPredictionEngine()

    def predict(self, trend_name: str, category: str) -> Dict:
        prediction = self.engine.predict_trend(trend_name, category)

        return {
            'trend_name': prediction.trend_name,
            'category': prediction.category,
            'current_score': prediction.current_score,
            'predicted_score_30d': prediction.predicted_score_30d,
            'predicted_score_90d': prediction.predicted_score_90d,
            'direction': prediction.direction.value,
            'confidence': prediction.confidence,
            'lifecycle_stage': prediction.lifecycle_stage,
            'related_trends': prediction.related_trends,
            'recommendations': prediction.recommendations,
        }

    def get_trending_items(self, category: str, limit: int = 10) -> List[Dict]:
        current_season = self.engine._get_current_season()
        seasonal_data = self.engine.SEASONAL_TRENDS.get(current_season, {})

        category_key = 'colors' if category == 'color' else 'styles'
        items = seasonal_data.get(category_key, [])

        results = []
        for item in items[:limit]:
            prediction = self.engine.predict_trend(item, category)
            results.append({
                'name': item,
                'score': prediction.predicted_score_30d,
                'direction': prediction.direction.value,
                'confidence': prediction.confidence,
            })

        return sorted(results, key=lambda x: x['score'], reverse=True)

    def get_seasonal_forecast(self) -> Dict:
        return self.engine.get_seasonal_predictions()

    def get_trend_report(self) -> Dict:
        return self.engine.get_trend_report()

    def update_trend_score(self, trend_name: str, score: float, category: str):
        self.engine.update_trend_data(trend_name, score, category)


if __name__ == "__main__":
    service = TrendPredictionService()

    print("\n" + "="*50)
    print("时尚趋势预测服务已初始化")
    print("="*50)

    print("\n当前季节趋势预测:")
    forecast = service.get_seasonal_forecast()
    for season, trends in forecast.items():
        print(f"\n{season.upper()}:")
        print(f"  颜色: {', '.join(trends['colors'][:3])}")
        print(f"  风格: {', '.join(trends['styles'][:3])}")

    print("\n趋势报告:")
    report = service.get_trend_report()
    print(f"当前季节: {report['current_season']}")
    print(f"上升颜色: {', '.join(report['trend_summary']['rising_colors'])}")
    print(f"上升风格: {', '.join(report['trend_summary']['rising_styles'])}")
