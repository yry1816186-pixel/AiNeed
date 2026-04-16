/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from "@nestjs/common";

import { RedisService } from "../../../../common/redis/redis.service";
import { WeatherService, type WeatherData } from "../../../../../../../fashion/weather/weather.service";

/**
 * 天气智能集成服务 — AIS-06
 * 集成和风天气（QWeather）+ OpenWeatherMap 备选
 * 自动获取用户位置天气，注入到推荐上下文
 */

export interface WeatherContext {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  location: string;
  suggestion: string;
  weatherStyles: string[];
  slotString: string; // 注入到 StylistSlots.weather 的字符串
}

const WEATHER_CACHE_TTL_SECONDS = 30 * 60; // 30 分钟缓存

@Injectable()
export class WeatherIntegrationService {
  private readonly logger = new Logger(WeatherIntegrationService.name);

  constructor(
    private weatherService: WeatherService,
    private redisService: RedisService,
  ) {}

  /**
   * 获取天气上下文（带缓存）
   * @param latitude 纬度
   * @param longitude 经度
   */
  async getWeatherContext(
    latitude: number,
    longitude: number,
  ): Promise<WeatherContext | null> {
    const cacheKey = `weather:${latitude.toFixed(2)}:${longitude.toFixed(2)}`;

    // 尝试从 Redis 缓存获取
    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as WeatherContext;
      }
    } catch {
      // Redis 不可用时继续
    }

    // 调用天气服务
    const weatherData: WeatherData | null = await this.weatherService.getWeatherByLocation(
      latitude,
      longitude,
    );

    if (!weatherData) {
      this.logger.warn("无法获取天气数据，将不注入天气上下文");
      return null;
    }

    const weatherStyles = this.weatherService.getWeatherBasedStyles(
      weatherData.temperature,
      weatherData.condition,
    );

    const context: WeatherContext = {
      temperature: weatherData.temperature,
      condition: weatherData.condition,
      humidity: weatherData.humidity,
      windSpeed: weatherData.windSpeed,
      location: weatherData.location,
      suggestion: weatherData.suggestion,
      weatherStyles,
      slotString: `${weatherData.location} ${weatherData.temperature}°C ${weatherData.condition} 湿度${weatherData.humidity}% 风速${weatherData.windSpeed}m/s`,
    };

    // 写入 Redis 缓存（使用 setex 设置 TTL）
    try {
      await this.redisService.setex(
        cacheKey,
        WEATHER_CACHE_TTL_SECONDS,
        JSON.stringify(context),
      );
    } catch {
      // Redis 不可用时跳过缓存
    }

    return context;
  }

  /**
   * 获取天气穿衣建议文本（用于推荐理由）
   */
  getWeatherRecommendationText(context: WeatherContext): string {
    const parts: string[] = [];

    if (context.temperature <= 5) {
      parts.push("气温较低，建议保暖层次搭配");
    } else if (context.temperature <= 15) {
      parts.push("天气偏凉，建议选择轻正式或通勤风格");
    } else if (context.temperature <= 25) {
      parts.push("气温适宜，适合日常休闲穿搭");
    } else {
      parts.push("天气炎热，建议选择清爽透气的面料");
    }

    if (context.condition.includes("雨")) {
      parts.push("注意防雨，建议选择防水面料和深色系");
    } else if (context.condition.includes("雪")) {
      parts.push("注意保暖防滑");
    }

    return parts.join("；");
  }
}
