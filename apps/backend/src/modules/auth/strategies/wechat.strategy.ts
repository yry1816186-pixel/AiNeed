import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { WechatService, WechatUserInfo } from "../services/wechat.service";

export interface WechatTokenResponse {
  accessToken: string;
  openid: string;
  unionid?: string;
}

/**
 * WechatAuthStrategy handles WeChat OAuth2.0 code-to-token exchange and user info retrieval.
 * Provides both low-level API access (exchangeCodeForToken, getUserInfo) and
 * high-level validation (validate) for use with Passport or direct auth flows.
 */
@Injectable()
export class WechatAuthStrategy {
  private readonly logger = new Logger(WechatAuthStrategy.name);
  private readonly appId: string;
  private readonly appSecret: string;

  constructor(
    private readonly wechatService: WechatService,
    private readonly configService: ConfigService,
  ) {
    this.appId = this.configService.get<string>("WECHAT_APP_ID", "");
    this.appSecret = this.configService.get<string>("WECHAT_APP_SECRET", "");
  }

  /**
   * Exchange WeChat authorization code for access_token, openid, and optional unionid.
   * Calls WeChat OAuth2.0 endpoint directly.
   */
  async exchangeCodeForToken(code: string): Promise<WechatTokenResponse> {
    if (!this.appId || !this.appSecret) {
      this.logger.warn("WeChat configuration incomplete");
      throw new UnauthorizedException("WeChat login service not configured");
    }

    const url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${this.appId}&secret=${this.appSecret}&code=${code}&grant_type=authorization_code`;

    const response = await fetch(url);
    const data = (await response.json()) as Record<string, unknown>;

    if (data.errcode && data.errcode !== 0) {
      this.logger.warn("WeChat code-to-token exchange failed", {
        errcode: data.errcode,
        errmsg: data.errmsg,
      });
      throw new UnauthorizedException("WeChat authorization failed");
    }

    return {
      accessToken: data.access_token as string,
      openid: data.openid as string,
      unionid: (data.unionid as string) || undefined,
    };
  }

  /**
   * Retrieve WeChat user profile info using access_token and openid.
   */
  async getUserInfo(accessToken: string, openid: string): Promise<WechatUserInfo> {
    return this.wechatService.getUserInfo(accessToken, openid);
  }

  /**
   * High-level validation: exchange code, get user info.
   * Used by AuthService for direct login flows.
   */
  async validate(code: string): Promise<WechatUserInfo> {
    const tokenResponse = await this.wechatService.getAccessToken(code);
    const userInfo = await this.wechatService.getUserInfo(
      tokenResponse.access_token,
      tokenResponse.openid,
    );
    return userInfo;
  }
}
