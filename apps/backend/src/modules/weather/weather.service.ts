import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  location: string;
  suggestion: string;
}

interface OpenWeatherResponse {
  main?: {
    temp?: number;
    humidity?: number;
  };
  weather?: Array<{
    description?: string;
  }>;
  wind?: {
    speed?: number;
  };
  name?: string;
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly apiKey: string;
  private readonly baseUrl = "https://api.openweathermap.org/data/2.5/weather";

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>("OPENWEATHER_API_KEY", "");
  }

  async getWeatherByLocation(
    latitude: number,
    longitude: number,
  ): Promise<WeatherData | null> {
    if (!this.apiKey) {
      this.logger.warn("OpenWeather API key not configured");
      return this.getMockWeather();
    }

    try {
      const response = await fetch(
        `${this.baseUrl}?lat=${latitude}&lon=${longitude}&appid=${this.apiKey}&units=metric&lang=zh_cn`,
      );

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseWeatherData(data);
    } catch (error) {
      this.logger.error(`Failed to fetch weather: ${error}`);
      return this.getMockWeather();
    }
  }

  async getWeatherByCity(city: string): Promise<WeatherData | null> {
    if (!this.apiKey) {
      this.logger.warn("OpenWeather API key not configured");
      return this.getMockWeather();
    }

    try {
      const response = await fetch(
        `${this.baseUrl}?q=${encodeURIComponent(city)}&appid=${this.apiKey}&units=metric&lang=zh_cn`,
      );

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseWeatherData(data);
    } catch (error) {
      this.logger.error(`Failed to fetch weather for city ${city}: ${error}`);
      return this.getMockWeather();
    }
  }

  private parseWeatherData(data: OpenWeatherResponse): WeatherData {
    const temp = data.main?.temp ?? 20;
    const condition = data.weather?.[0]?.description ?? "晴";
    const humidity = data.main?.humidity ?? 50;
    const windSpeed = data.wind?.speed ?? 0;
    const location = data.name ?? "未知位置";

    return {
      temperature: Math.round(temp),
      condition,
      humidity,
      windSpeed,
      location,
      suggestion: this.getWeatherSuggestion(temp, condition),
    };
  }

  private getWeatherSuggestion(temperature: number, condition: string): string {
    const suggestions: string[] = [];

    if (temperature <= 0) {
      suggestions.push("气温很低，建议穿羽绒服或厚棉服");
    } else if (temperature <= 10) {
      suggestions.push("天气较冷，建议穿厚外套或毛衣");
    } else if (temperature <= 20) {
      suggestions.push("气温适中，建议穿薄外套或卫衣");
    } else if (temperature <= 28) {
      suggestions.push("天气温暖，适合穿T恤或薄衬衫");
    } else {
      suggestions.push("天气炎热，建议穿轻薄透气的衣物");
    }

    if (condition.includes("雨")) {
      suggestions.push("记得带伞，穿防水鞋");
    } else if (condition.includes("雪")) {
      suggestions.push("注意保暖，穿防滑鞋");
    } else if (condition.includes("风")) {
      suggestions.push("风大，避免穿太宽松的衣服");
    }

    return suggestions.join("；");
  }

  private getMockWeather(): WeatherData {
    return {
      temperature: 22,
      condition: "晴",
      humidity: 55,
      windSpeed: 3,
      location: "北京",
      suggestion: "天气温暖，适合穿T恤或薄衬衫",
    };
  }

  getWeatherBasedStyles(temperature: number, condition: string): string[] {
    const styles: string[] = [];

    if (temperature <= 5) {
      styles.push("保暖", "层次搭配");
    } else if (temperature <= 15) {
      styles.push("轻正式", "通勤");
    } else if (temperature <= 25) {
      styles.push("日常", "休闲");
    } else {
      styles.push("清爽", "透气");
    }

    if (condition.includes("雨")) {
      styles.push("防水");
    }

    return styles;
  }
}
