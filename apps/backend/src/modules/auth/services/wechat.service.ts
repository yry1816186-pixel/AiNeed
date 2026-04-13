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

@Injectable()
export class WechatService {
  private readonly logger = new Logger(WechatService.name);
  private readonly appId: string;
  private readonly appSecret: string;

  constructor(private configService: ConfigService) {
    this.appId = this.configService.get<string>("WECHAT_APP_ID", "");
    this.appSecret = this.configService.get<string>("WECHAT_APP_SECRET", "");
  }

  async getAccessToken(code: string): Promise<WechatAccessTokenResponse> {
    if (!this.appId || !this.appSecret) {
      this.logger.warn("微信开放平台配置不完整");
      throw new UnauthorizedException("微信登录服务未配置");
    }

    const url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${this.appId}&secret=${this.appSecret}&code=${code}&grant_type=authorization_code`;

    const response = await fetch(url);
    const data = await response.json() as Record<string, unknown>;

    if (data.errcode) {
      this.logger.warn("微信获取access_token失败", { errcode: data.errcode, errmsg: data.errmsg });
      throw new UnauthorizedException("微信授权失败");
    }

    return data as unknown as WechatAccessTokenResponse;
  }

  async getUserInfo(accessToken: string, openid: string): Promise<WechatUserInfo> {
    const url = `https://api.weixin.qq.com/sns/userinfo?access_token=${accessToken}&openid=${openid}`;

    const response = await fetch(url);
    const data = await response.json() as Record<string, unknown>;

    if (data.errcode) {
      this.logger.warn("微信获取用户信息失败", { errcode: data.errcode, errmsg: data.errmsg });
      throw new UnauthorizedException("获取微信用户信息失败");
    }

    return data as unknown as WechatUserInfo;
  }
}
