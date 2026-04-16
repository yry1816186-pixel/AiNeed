/* eslint-disable @typescript-eslint/no-explicit-any */
﻿import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery } from "@nestjs/swagger";

import { AuthGuard } from "../../../domains/identity/auth/guards/auth.guard";

import { WeatherService } from "./weather.service";

@Controller("weather")
@ApiTags("weather")
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get()
  @ApiOperation({ summary: "根据经纬度获取天气信息" })
  @ApiResponse({ status: 200, description: "成功返回天气信息" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiQuery({ name: "lat", required: true, description: "纬度", type: Number })
  @ApiQuery({ name: "lon", required: true, description: "经度", type: Number })
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
  @ApiResponse({ status: 200, description: "成功返回天气信息" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiQuery({ name: "name", required: true, description: "城市名称", type: String })
  async getWeatherByCity(@Query("name") city: string) {
    return this.weatherService.getWeatherByCity(city || "北京");
  }

  @Get("styles")
  @ApiOperation({ summary: "根据天气获取推荐风格" })
  @ApiResponse({ status: 200, description: "成功返回推荐风格" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiQuery({ name: "temperature", required: true, description: "温度（摄氏度）", type: Number })
  @ApiQuery({ name: "condition", required: true, description: "天气状况，如 晴、阴、雨", type: String })
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
