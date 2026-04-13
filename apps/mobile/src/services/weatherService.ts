export interface WeatherInfo {
  temperature: number;
  description: string;
  icon: string;
  suggestion: string;
  city: string;
}

interface OpenMeteoCurrentWeather {
  temperature: number;
  windspeed: number;
  winddirection: number;
  weathercode: number;
  time: string;
}

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  current_weather: OpenMeteoCurrentWeather;
}

interface NominatimAddress {
  city?: string;
  town?: string;
  state?: string;
}

interface NominatimResponse {
  address?: NominatimAddress;
}

function mapWeatherCode(code: number): { description: string; icon: string } {
  if (code === 0) return { description: "晴", icon: "sunny" };
  if (code >= 1 && code <= 3) return { description: "多云", icon: "cloudy" };
  if (code >= 45 && code <= 48) return { description: "雾", icon: "cloudy" };
  if (code >= 51 && code <= 67) return { description: "雨", icon: "rainy" };
  if (code >= 71 && code <= 77) return { description: "雪", icon: "snowy" };
  if (code >= 80 && code <= 82) return { description: "雨", icon: "rainy" };
  if (code >= 95 && code <= 99) return { description: "雷雨", icon: "rainy" };
  return { description: "未知", icon: "cloudy" };
}

function generateSuggestion(temperature: number, weatherCode: number): string {
  const isRainy = (code: number) =>
    (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || (code >= 95 && code <= 99);
  const isSnowy = (code: number) => code >= 71 && code <= 77;

  if (isRainy(weatherCode)) return "记得带伞，选择防水单品";
  if (isSnowy(weatherCode)) return "注意防滑，选择保暖靴子";

  if (temperature > 30) return "清凉穿搭，选择透气面料";
  if (temperature >= 25) return "轻薄搭配，享受舒适";
  if (temperature >= 20) return "舒适温度，适合叠穿";
  if (temperature >= 15) return "加件外套，优雅保暖";
  if (temperature >= 10) return "注意保暖，选择厚实面料";
  return "寒冷天气，厚外套必备";
}

async function fetchCityName(lat: number, lon: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
    );
    const data: NominatimResponse = await response.json();
    return data.address?.city || data.address?.town || data.address?.state || "未知城市";
  } catch {
    return "未知城市";
  }
}

export const weatherService = {
  getWeather: async (latitude: number, longitude: number): Promise<WeatherInfo> => {
    try {
      const [weatherResponse, city] = await Promise.all([
        fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`,
        ).then((res) => res.json() as Promise<OpenMeteoResponse>),
        fetchCityName(latitude, longitude),
      ]);

      const current = weatherResponse.current_weather;
      const { description, icon } = mapWeatherCode(current.weathercode);
      const suggestion = generateSuggestion(current.temperature, current.weathercode);

      return {
        temperature: Math.round(current.temperature),
        description,
        icon,
        suggestion,
        city,
      };
    } catch {
      return {
        temperature: 20,
        description: "未知",
        icon: "cloudy",
        suggestion: "舒适温度，适合叠穿",
        city: "未知城市",
      };
    }
  },
};
