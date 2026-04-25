import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface WechatUserInfo {
  openid: string;
  unionid?: string;
  nickname?: string;
  headimgurl?: string;
  sex?: number;
  province?: string;
  city?: string;
  country?: string;
}

export interface WechatAccessTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  openid: string;
  scope: string;
  unionid?: string;
}

export interface Jscode2SessionResponse {
  openid: string;
  session_key?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

@Injectable()
export class WechatService {
  private readonly logger = new Logger(WechatService.name);
  private readonly appId: string;
  private readonly appSecret: string;
  private readonly miniAppId: string;
  private readonly miniAppSecret: string;

  constructor(private configService: ConfigService) {
    this.appId = this.configService.get<string>("WECHAT_APP_ID", "");
    this.appSecret = this.configService.get<string>("WECHAT_APP_SECRET", "");
    this.miniAppId = this.configService.get<string>("WECHAT_MINI_APP_ID", "") || this.appId;
    this.miniAppSecret =
      this.configService.get<string>("WECHAT_MINI_APP_SECRET", "") || this.appSecret;
  }

  async getAccessToken(code: string): Promise<WechatAccessTokenResponse> {
    if (!this.appId || !this.appSecret) {
      this.logger.warn("微信开放平台配置不完整");
      throw new UnauthorizedException("微信登录服务未配置");
    }

    const url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${this.appId}&secret=${this.appSecret}&code=${code}&grant_type=authorization_code`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      const data = (await response.json()) as Record<string, unknown>;

      if (data.errcode) {
        this.logger.warn("微信获取access_token失败", {
          errcode: data.errcode,
          errmsg: data.errmsg,
        });
        throw new UnauthorizedException("微信授权失败");
      }

      return data as unknown as WechatAccessTokenResponse;
    } finally {
      clearTimeout(timeout);
    }
  }

  async getUserInfo(accessToken: string, openid: string): Promise<WechatUserInfo> {
    const url = `https://api.weixin.qq.com/sns/userinfo?access_token=${accessToken}&openid=${openid}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      const data = (await response.json()) as Record<string, unknown>;

      if (data.errcode) {
        this.logger.warn("微信获取用户信息失败", { errcode: data.errcode, errmsg: data.errmsg });
        throw new UnauthorizedException("获取微信用户信息失败");
      }

      return data as unknown as WechatUserInfo;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Mini-program login via jscode2session.
   * Uses WECHAT_MINI_APP_ID/SECRET (falls back to WECHAT_APP_ID/SECRET).
   * Different from OAuth2-based getAccessToken which uses sns/oauth2/access_token.
   */
  async jscode2session(code: string): Promise<Jscode2SessionResponse> {
    if (!this.miniAppId || !this.miniAppSecret) {
      this.logger.warn("微信小程序配置不完整");
      throw new UnauthorizedException("微信小程序登录服务未配置");
    }

    if (!code || code.length > 128) {
      throw new UnauthorizedException("无效的微信登录凭证");
    }

    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${this.miniAppId}&secret=${this.miniAppSecret}&js_code=${code}&grant_type=authorization_code`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      const data = (await response.json()) as Record<string, unknown>;

      if (data.errcode) {
        this.logger.warn("微信jscode2session失败", {
          errcode: data.errcode,
          errmsg: data.errmsg,
        });
        throw new UnauthorizedException("微信小程序授权失败");
      }

      return data as unknown as Jscode2SessionResponse;
    } finally {
      clearTimeout(timeout);
    }
  }
}
