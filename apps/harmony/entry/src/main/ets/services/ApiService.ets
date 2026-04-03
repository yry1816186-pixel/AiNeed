import http from '@ohos.net.http';
import { API_CONFIG } from '../common/config';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_CONFIG.baseUrl;
  }

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    const httpRequest = http.createHttp();
    
    let url = `${this.baseUrl}${endpoint}`;
    if (params) {
      const queryString = Object.entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
      url += `?${queryString}`;
    }

    try {
      const response = await httpRequest.request(url, {
        method: http.RequestMethod.GET,
        header: {
          'Content-Type': 'application/json'
        },
        connectTimeout: 30000,
        readTimeout: 30000
      });

      if (response.responseCode === 200) {
        const data = JSON.parse(response.result as string);
        return { success: true, data };
      } else {
        return { success: false, error: `HTTP ${response.responseCode}` };
      }
    } catch (error) {
      return { success: false, error: String(error) };
    } finally {
      httpRequest.destroy();
    }
  }

  async post<T>(endpoint: string, body?: object): Promise<ApiResponse<T>> {
    const httpRequest = http.createHttp();
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await httpRequest.request(url, {
        method: http.RequestMethod.POST,
        header: {
          'Content-Type': 'application/json'
        },
        extraData: body ? JSON.stringify(body) : undefined,
        connectTimeout: 30000,
        readTimeout: 30000
      });

      if (response.responseCode === 200 || response.responseCode === 201) {
        const data = JSON.parse(response.result as string);
        return { success: true, data };
      } else {
        return { success: false, error: `HTTP ${response.responseCode}` };
      }
    } catch (error) {
      return { success: false, error: String(error) };
    } finally {
      httpRequest.destroy();
    }
  }

  async upload<T>(endpoint: string, filePath: string): Promise<ApiResponse<T>> {
    const httpRequest = http.createHttp();
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await httpRequest.request(url, {
        method: http.RequestMethod.POST,
        header: {
          'Content-Type': 'multipart/form-data'
        },
        extraData: { file: filePath },
        connectTimeout: 60000,
        readTimeout: 60000
      });

      if (response.responseCode === 200) {
        const data = JSON.parse(response.result as string);
        return { success: true, data };
      } else {
        return { success: false, error: `HTTP ${response.responseCode}` };
      }
    } catch (error) {
      return { success: false, error: String(error) };
    } finally {
      httpRequest.destroy();
    }
  }
}

export const apiService = new ApiService();
