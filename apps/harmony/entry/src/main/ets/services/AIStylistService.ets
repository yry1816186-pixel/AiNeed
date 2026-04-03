/**
 * AI 造型师服务
 * 封装 AI 造型师 API 调用，实现会话管理
 */

import http from '@ohos.net.http';
import { API_CONFIG } from '../common/config';
import {
  AiStylistSessionResponse,
  AiStylistSuggestionResponse,
  SessionListResponse,
  ApiResponse,
  CreateSessionRequest,
  DeleteSessionResponse,
  ConversationHistoryItem
} from './types';

export class AIStylistService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_CONFIG.baseUrl;
  }

  /**
   * 创建新会话
   */
  async createSession(payload?: CreateSessionRequest): Promise<ApiResponse<AiStylistSessionResponse>> {
    const httpRequest = http.createHttp();
    const url = `${this.baseUrl}${API_CONFIG.endpoints.stylist.session}`;

    try {
      const response = await httpRequest.request(url, {
        method: http.RequestMethod.POST,
        header: {
          'Content-Type': 'application/json'
        },
        extraData: payload ? JSON.stringify(payload) : undefined,
        connectTimeout: 30000,
        readTimeout: 60000
      });

      if (response.responseCode === 200 || response.responseCode === 201) {
        const result = response.result as string;
        const data: AiStylistSessionResponse = JSON.parse(result);
        return { success: true, data: data };
      } else {
        return { success: false, error: `HTTP ${response.responseCode}` };
      }
    } catch (error) {
      const errorMsg = error !== null && error !== undefined ? String(error) : 'Unknown error';
      return { success: false, error: errorMsg };
    } finally {
      httpRequest.destroy();
    }
  }

  /**
   * 获取会话状态
   */
  async getSessionStatus(sessionId: string): Promise<ApiResponse<AiStylistSessionResponse>> {
    const httpRequest = http.createHttp();
    const url = `${this.baseUrl}${API_CONFIG.endpoints.stylist.session}/${sessionId}`;

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
        const result = response.result as string;
        const data: AiStylistSessionResponse = JSON.parse(result);
        return { success: true, data: data };
      } else {
        return { success: false, error: `HTTP ${response.responseCode}` };
      }
    } catch (error) {
      const errorMsg = error !== null && error !== undefined ? String(error) : 'Unknown error';
      return { success: false, error: errorMsg };
    } finally {
      httpRequest.destroy();
    }
  }

  /**
   * 发送消息
   */
  async sendMessage(sessionId: string, message: string): Promise<ApiResponse<AiStylistSessionResponse>> {
    const httpRequest = http.createHttp();
    const url = `${this.baseUrl}${API_CONFIG.endpoints.stylist.session}/${sessionId}/messages`;

    try {
      const response = await httpRequest.request(url, {
        method: http.RequestMethod.POST,
        header: {
          'Content-Type': 'application/json'
        },
        extraData: JSON.stringify({ message: message }),
        connectTimeout: 30000,
        readTimeout: 60000
      });

      if (response.responseCode === 200) {
        const result = response.result as string;
        const data: AiStylistSessionResponse = JSON.parse(result);
        return { success: true, data: data };
      } else {
        return { success: false, error: `HTTP ${response.responseCode}` };
      }
    } catch (error) {
      const errorMsg = error !== null && error !== undefined ? String(error) : 'Unknown error';
      return { success: false, error: errorMsg };
    } finally {
      httpRequest.destroy();
    }
  }

  /**
   * 上传照片
   */
  async uploadPhoto(
    sessionId: string,
    filePath: string,
    type: string
  ): Promise<ApiResponse<AiStylistSessionResponse>> {
    const httpRequest = http.createHttp();
    const url = `${this.baseUrl}${API_CONFIG.endpoints.stylist.session}/${sessionId}/photo`;
    const photoType = type || 'full_body';

    try {
      const response = await httpRequest.request(url, {
        method: http.RequestMethod.POST,
        header: {
          'Content-Type': 'multipart/form-data'
        },
        extraData: {
          file: filePath,
          type: photoType
        },
        connectTimeout: 60000,
        readTimeout: 120000
      });

      if (response.responseCode === 200) {
        const result = response.result as string;
        const data: AiStylistSessionResponse = JSON.parse(result);
        return { success: true, data: data };
      } else {
        return { success: false, error: `HTTP ${response.responseCode}` };
      }
    } catch (error) {
      const errorMsg = error !== null && error !== undefined ? String(error) : 'Unknown error';
      return { success: false, error: errorMsg };
    } finally {
      httpRequest.destroy();
    }
  }

  /**
   * 生成穿搭方案
   */
  async resolveSession(sessionId: string): Promise<ApiResponse<AiStylistSessionResponse>> {
    const httpRequest = http.createHttp();
    const url = `${this.baseUrl}${API_CONFIG.endpoints.stylist.session}/${sessionId}/resolve`;

    try {
      const response = await httpRequest.request(url, {
        method: http.RequestMethod.POST,
        header: {
          'Content-Type': 'application/json'
        },
        connectTimeout: 30000,
        readTimeout: 120000
      });

      if (response.responseCode === 200) {
        const result = response.result as string;
        const data: AiStylistSessionResponse = JSON.parse(result);
        return { success: true, data: data };
      } else {
        return { success: false, error: `HTTP ${response.responseCode}` };
      }
    } catch (error) {
      const errorMsg = error !== null && error !== undefined ? String(error) : 'Unknown error';
      return { success: false, error: errorMsg };
    } finally {
      httpRequest.destroy();
    }
  }

  /**
   * 获取快捷建议
   */
  async getSuggestions(): Promise<ApiResponse<AiStylistSuggestionResponse>> {
    const httpRequest = http.createHttp();
    const url = `${this.baseUrl}/ai-stylist/suggestions`;

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
        const result = response.result as string;
        const data: AiStylistSuggestionResponse = JSON.parse(result);
        return { success: true, data: data };
      } else {
        return { success: false, error: `HTTP ${response.responseCode}` };
      }
    } catch (error) {
      const errorMsg = error !== null && error !== undefined ? String(error) : 'Unknown error';
      return { success: false, error: errorMsg };
    } finally {
      httpRequest.destroy();
    }
  }

  /**
   * 获取会话列表
   */
  async listSessions(limit?: number, offset?: number): Promise<ApiResponse<SessionListResponse>> {
    const httpRequest = http.createHttp();
    let url = `${this.baseUrl}${API_CONFIG.endpoints.stylist.session}`;

    const params: string[] = [];
    if (limit !== undefined && limit !== null) {
      params.push(`limit=${limit}`);
    }
    if (offset !== undefined && offset !== null) {
      params.push(`offset=${offset}`);
    }
    if (params.length > 0) {
      url = url + `?${params.join('&')}`;
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
        const result = response.result as string;
        const data: SessionListResponse = JSON.parse(result);
        return { success: true, data: data };
      } else {
        return { success: false, error: `HTTP ${response.responseCode}` };
      }
    } catch (error) {
      const errorMsg = error !== null && error !== undefined ? String(error) : 'Unknown error';
      return { success: false, error: errorMsg };
    } finally {
      httpRequest.destroy();
    }
  }

  /**
   * 删除会话
   */
  async deleteSession(sessionId: string): Promise<ApiResponse<DeleteSessionResponse>> {
    const httpRequest = http.createHttp();
    const url = `${this.baseUrl}${API_CONFIG.endpoints.stylist.session}/${sessionId}`;

    try {
      const response = await httpRequest.request(url, {
        method: http.RequestMethod.DELETE,
        header: {
          'Content-Type': 'application/json'
        },
        connectTimeout: 30000,
        readTimeout: 30000
      });

      if (response.responseCode === 200) {
        const result = response.result as string;
        const data: DeleteSessionResponse = JSON.parse(result);
        return { success: true, data: data };
      } else {
        return { success: false, error: `HTTP ${response.responseCode}` };
      }
    } catch (error) {
      const errorMsg = error !== null && error !== undefined ? String(error) : 'Unknown error';
      return { success: false, error: errorMsg };
    } finally {
      httpRequest.destroy();
    }
  }

  /**
   * 遗留的无状态聊天接口
   */
  async chat(
    message: string,
    conversationHistory?: ConversationHistoryItem[]
  ): Promise<ApiResponse<AiStylistSessionResponse>> {
    const httpRequest = http.createHttp();
    const url = `${this.baseUrl}${API_CONFIG.endpoints.stylist.chat}`;
    const history = conversationHistory || [];

    try {
      const response = await httpRequest.request(url, {
        method: http.RequestMethod.POST,
        header: {
          'Content-Type': 'application/json'
        },
        extraData: JSON.stringify({
          message: message,
          conversationHistory: history
        }),
        connectTimeout: 30000,
        readTimeout: 60000
      });

      if (response.responseCode === 200) {
        const result = response.result as string;
        const data: AiStylistSessionResponse = JSON.parse(result);
        return { success: true, data: data };
      } else {
        return { success: false, error: `HTTP ${response.responseCode}` };
      }
    } catch (error) {
      const errorMsg = error !== null && error !== undefined ? String(error) : 'Unknown error';
      return { success: false, error: errorMsg };
    } finally {
      httpRequest.destroy();
    }
  }
}

// 导出单例
export const aiStylistService = new AIStylistService();
