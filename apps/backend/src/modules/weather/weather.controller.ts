import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { AuthGuard } from "../auth/guards/auth.guard";

import { WeatherService } from "./weather.service";

@Controller("weather")
@ApiTags("weather")
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get()
  @ApiOperation({ summary: "根据经纬度获取天气信息" })
  async getWeatherByLocation(
    @Query("lat") lat: string,
    @Query("lon") lon: string,
  ) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      return this.weatherService.getWeatherByCity("北京");
    }

    return this.weatherService.getWeatherByLocation(latitude, longitude);
  }

  @Get("city")
  @ApiOperation({ summary: "根据城市名获取天气信息" })
  async getWeatherByCity(@Query("name") city: string) {
    return this.weatherService.getWeatherByCity(city || "北京");
  }

  @Get("styles")
  @ApiOperation({ summary: "根据天气获取推荐风格" })
  async getWeatherStyles(
    @Query("temperature") temp: string,
    @Query("condition") condition: string,
  ) {
    const temperature = parseFloat(temp) || 22;
    return {
      styles: this.weatherService.getWeatherBasedStyles(
        temperature,
        condition || "晴",
      ),
    };
  }
}
