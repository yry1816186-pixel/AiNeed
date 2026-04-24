import apiClient from "./client";
import { ApiResponse } from "../../types";

export interface WeatherInfo {
  temperature: number;
  description: string;
  icon: string;
  suggestion: string;
  city: string;
  condition: string;
}

export const weatherApi = {
  async getCurrent(): Promise<ApiResponse<WeatherInfo>> {
    return apiClient.get<WeatherInfo>("/weather");
  },

  async getByCity(city: string): Promise<ApiResponse<WeatherInfo>> {
    return apiClient.get<WeatherInfo>("/weather/city", { city });
  },
};
