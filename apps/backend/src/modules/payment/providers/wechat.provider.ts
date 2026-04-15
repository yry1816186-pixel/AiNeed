import * as crypto from "crypto";
import * as fs from "fs";
import * as https from "https";
import * as path from "path";

import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import {
  PaymentRawCallbackData,
} from "../types/common.types";
import {
  WechatV3CreatePaymentResponse,
  WechatV3QueryResponse,
  WechatV3RefundResponse,
  WechatCallbackData,
  WechatCallbackPayload,
  WechatDecryptedResource,
  WechatV3RequestData,
  WechatApiResponse,
} from "../types/wechat.types";

import {
  PaymentProviderInterface,
  PaymentProvider,
  CreatePaymentOptions,
  PaymentResult,
  PaymentCallbackData,
  RefundOptions,
  RefundResult,
  PaymentQueryResult,
} from "./payment-provider.interface";


@Injectable()
export class WechatProvider implements PaymentProviderInterface, OnModuleInit {
  private readonly logger = new Logger(WechatProvider.name);
  readonly name: PaymentProvider = "wechat";

  private appId!: string;
  private mchId!: string;
  private apiKey!: string;
  private notifyUrl!: string;
  private certPath!: string;
  private keyPath!: string;
  private apiV3Key!: string;
  private serialNo!: string;

  // API 端点
  private readonly gateway = "https://api.mch.weixin.qq.com";
  private readonly v3Gateway = "https://api.mch.weixin.qq.com/v3";

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.appId = this.configService.get<string>("WECHAT_APP_ID") || "";
    this.mchId = this.configService.get<string>("WECHAT_MCH_ID") || "";
    this.apiKey = this.configService.get<string>("WECHAT_API_KEY") || "";
    this.apiV3Key = this.configService.get<string>("WECHAT_API_V3_KEY") || "";
    this.notifyUrl = this.configService.get<string>("WECHAT_NOTIFY_URL") || "";
    this.certPath = this.configService.get<string>("WECHAT_CERT_PATH") || "";
    this.keyPath = this.configService.get<string>("WECHAT_KEY_PATH") || "";
    this.serialNo = this.configService.get<string>("WECHAT_SERIAL_NO") || "";

    if (!this.appId || !this.mchId || !this.apiKey) {
      this.logger.warn(
        "Wechat Pay configuration is incomplete. Payment will not work.",
      );
    }
  }

  /**
   * 创建支付订单（使用 V3 API）
   */
  async createPayment(options: CreatePaymentOptions): Promise<PaymentResult> {
    try {
      const {
        orderId,
        amount,
        subject,
        body,
        method,
        expireMinutes = 30,
      } = options;

      const expireAt = new Date();
      expireAt.setMinutes(expireAt.getMinutes() + expireMinutes);

      // 使用 V3 API
      const endpoint = this.getV3Endpoint(method);
      const requestData = this.buildV3RequestData(
        orderId,
        amount,
        subject,
        method,
        expireMinutes,
      );

      const response = await this.v3Request("POST", endpoint, requestData);

      if (!response.code) {
        // 请求成功
        const createResponse = response as WechatV3CreatePaymentResponse;
        const result: PaymentResult = {
          success: true,
          orderId,
          tradeNo: createResponse.prepay_id,
          expireAt,
          rawData: response as unknown as PaymentRawCallbackData,
        };

        switch (method) {
          case "qrcode":
          case "native":
            // Native 支付返回 code_url
            result.qrCode = createResponse.code_url;
            break;
          case "h5":
            // H5 支付返回 h5_url
            result.h5Url = createResponse.h5_url;
            break;
          case "app":
            // APP 支付返回 prepay_id，需要二次签名
            result.appPayload = this.buildAppPayload(createResponse.prepay_id || "");
            break;
        }

        return result;
      }

      return {
        success: false,
        orderId,
        error: {
          code: response.code,
          message: response.message || "创建支付失败",
          detail: response.detail,
        },
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to create wechat payment: ${errorMessage}`,
        errorStack,
      );
      return {
        success: false,
        orderId: options.orderId,
        error: {
          code: "CREATE_PAYMENT_FAILED",
          message: "创建支付订单失败",
          detail: errorMessage,
        },
      };
    }
  }

  /**
   * 查询支付状态
   */
  async queryPayment(orderId: string): Promise<PaymentQueryResult> {
    try {
      const endpoint = `/v3/pay/transactions/out-trade-no/${orderId}?mchid=${this.mchId}`;
      const response = await this.v3Request("GET", endpoint);

      if (response.code) {
        return {
          orderId,
          status: "failed",
          rawData: response as unknown as PaymentRawCallbackData,
        };
      }

      const queryResponse = response as WechatV3QueryResponse;
      const statusMap: Record<string, PaymentQueryResult["status"]> = {
        NOTPAY: "pending",
        SUCCESS: "paid",
        CLOSED: "closed",
        REFUND: "refunded",
      };

      const tradeState = queryResponse.trade_state || "";
      return {
        orderId,
        tradeNo: queryResponse.transaction_id,
        amount: queryResponse.amount?.total ? queryResponse.amount.total / 100 : 0,
        status: statusMap[tradeState] || "failed",
        paidAt: queryResponse.success_time
          ? new Date(queryResponse.success_time)
          : undefined,
        rawData: response as unknown as PaymentRawCallbackData,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to query wechat payment: ${errorMessage}`,
        errorStack,
      );
      return {
        orderId,
        status: "failed",
        rawData: { error: errorMessage },
      };
    }
  }

  /**
   * 处理支付回调
   */
  async handleCallback(
    callbackData: PaymentRawCallbackData,
  ): Promise<PaymentCallbackData> {
    const actualBody = (callbackData.body ?? callbackData) as WechatCallbackData;
    const resource = actualBody.resource;
    const decryptedData = this.decryptResource(resource);

    const statusMap: Record<string, PaymentCallbackData["status"]> = {
      SUCCESS: "paid",
      CLOSED: "cancelled",
      PAYERROR: "failed",
    };

    const result: PaymentCallbackData = {
      orderId: decryptedData.out_trade_no,
      tradeNo: decryptedData.transaction_id,
      amount: decryptedData.amount?.total
        ? decryptedData.amount.total / 100
        : 0,
      status: statusMap[decryptedData.trade_state] || "failed",
      paidAt: decryptedData.success_time
        ? new Date(decryptedData.success_time)
        : new Date(),
      rawData: callbackData,
    };
    return result;
  }

  verifyCallbackSign(callbackData: PaymentRawCallbackData): boolean {
    try {
      // 检查 callbackData 是否包含 WechatCallbackPayload 所需的结构
      const payload = callbackData as unknown as WechatCallbackPayload;
      const { headers, body } = payload;

      if (!headers || !body) {
        return false;
      }

      const timestamp = headers["wechatpay-timestamp"];
      const nonce = headers["wechatpay-nonce"];
      const signature = headers["wechatpay-signature"];
      const serial = headers["wechatpay-serial"];

      if (!timestamp || !nonce || !signature) {
        return false;
      }

      // 构建验签字符串
      const message = `${timestamp}\n${nonce}\n${body}\n`;

      // 使用微信支付平台公钥验证签名
      return this.verifySignature(message, signature, serial);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      this.logger.error(
        `Failed to verify wechat callback sign: ${errorMessage}`,
      );
      return false;
    }
  }

  /**
   * 申请退款
   */
  async refund(options: RefundOptions): Promise<RefundResult> {
    try {
      const { orderId, refundId, amount, reason } = options;

      // 先查询原订单获取总金额
      const queryResult = await this.queryPayment(orderId);
      const totalAmount = (queryResult.amount ?? 0) * 100; // 转换为分

      const requestData = {
        out_trade_no: orderId,
        out_refund_no: refundId,
        reason: reason || "用户申请退款",
        amount: {
          refund: Math.round(amount * 100),
          total: Math.round(totalAmount),
          currency: "CNY",
        },
      };

      const response = await this.v3Request(
        "POST",
        "/v3/refund/domestic/refunds",
        requestData as unknown as WechatV3RequestData,
      );

      if (response.code) {
        return {
          success: false,
          refundId,
          status: "failed",
          error: {
            code: response.code,
            message: response.message || "退款失败",
            detail: response.detail,
          },
        };
      }

      const refundResponse = response as WechatV3RefundResponse;
      const statusMap: Record<string, RefundResult["status"]> = {
        SUCCESS: "success",
        PROCESSING: "processing",
        CLOSED: "failed",
      };

      const refundStatus = refundResponse.status || "";
      return {
        success: true,
        refundId,
        refundNo: refundResponse.refund_id,
        status: statusMap[refundStatus] || "processing",
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to refund wechat payment: ${errorMessage}`,
        errorStack,
      );
      return {
        success: false,
        refundId: options.refundId,
        status: "failed",
        error: {
          code: "REFUND_ERROR",
          message: "退款异常",
          detail: errorMessage,
        },
      };
    }
  }

  /**
   * 关闭订单
   */
  async closeOrder(orderId: string): Promise<boolean> {
    try {
      const endpoint = `/v3/pay/transactions/out-trade-no/${orderId}/close`;
      const requestData = {
        mchid: this.mchId,
      };

      const response = await this.v3Request("POST", endpoint, requestData as unknown as WechatV3RequestData);
      return !response.code;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to close wechat order: ${errorMessage}`,
        errorStack,
      );
      return false;
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 获取 V3 API 端点
   */
  private getV3Endpoint(method: string): string {
    const endpointMap: Record<string, string> = {
      qrcode: "/v3/pay/transactions/native",
      native: "/v3/pay/transactions/native",
      h5: "/v3/pay/transactions/h5",
      app: "/v3/pay/transactions/app",
    };
    return endpointMap[method] || "/v3/pay/transactions/native";
  }

  /**
   * 构建 V3 请求数据
   */
  private buildV3RequestData(
    orderId: string,
    amount: number,
    description: string,
    method: string,
    expireMinutes: number,
  ): WechatV3RequestData {
    const baseData: WechatV3RequestData = {
      appid: this.appId,
      mchid: this.mchId,
      description,
      out_trade_no: orderId,
      notify_url: this.notifyUrl,
      amount: {
        total: Math.round(amount * 100), // 转换为分
        currency: "CNY",
      },
    };

    // 设置过期时间
    const expireTime = new Date();
    expireTime.setMinutes(expireTime.getMinutes() + expireMinutes);
    baseData.time_expire = expireTime.toISOString();

    // 根据支付方式添加额外参数
    if (method === "h5") {
      (baseData as WechatV3RequestData & { scene_info: unknown }).scene_info = {
        payer_client_ip: "127.0.0.1",
        h5_info: {
          type: "Wap",
        },
      };
    }

    return baseData;
  }

  /**
   * 构建 APP 支付参数
   */
  private buildAppPayload(prepayId: string): string {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = crypto.randomBytes(16).toString("hex");
    const packageStr = `prepay_id=${prepayId}`;

    const message = `${this.appId}\n${timestamp}\n${nonceStr}\n${packageStr}\n`;
    const signature = this.signV3(message);

    const params = {
      appid: this.appId,
      partnerid: this.mchId,
      prepayid: prepayId,
      package: "Sign=WXPay",
      noncestr: nonceStr,
      timestamp,
      sign: signature,
    };

    return JSON.stringify(params);
  }

  /**
   * V3 API 请求
   */
  private async v3Request(
    method: string,
    endpoint: string,
    data?: WechatV3RequestData,
  ): Promise<WechatApiResponse> {
    const url = `${this.v3Gateway}${endpoint}`;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = crypto.randomBytes(16).toString("hex");

    let bodyStr = "";
    if (data && method !== "GET") {
      bodyStr = JSON.stringify(data);
    }

    const message = `${method}\n${endpoint}\n${timestamp}\n${nonceStr}\n${bodyStr}\n`;
    const signature = this.signV3(message);

    const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${this.mchId}",nonce_str="${nonceStr}",timestamp="${timestamp}",serial_no="${this.serialNo}",signature="${signature}"`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: authorization,
    };

    try {
      const https = await import("https");
      const agent = this.getHttpsAgent();

      return new Promise((resolve, reject) => {
        const req = https.request(
          url,
          {
            method,
            headers,
            agent,
          },
          (res) => {
            let responseData = "";
            res.on("data", (chunk) => (responseData += chunk));
            res.on("end", () => {
              try {
                resolve(JSON.parse(responseData) as WechatApiResponse);
              } catch (_parseError) {
                // WeChat API may return non-JSON responses in some cases
                // Log this for debugging but continue with raw response
                this.logger.debug(
                  `WeChat API returned non-JSON response (status: ${res.statusCode}). Response (truncated): ${responseData.substring(0, 200)}`,
                );
                resolve({ raw: responseData } as unknown as WechatApiResponse);
              }
            });
          },
        );

        req.on("error", reject);

        if (bodyStr) {
          req.write(bodyStr);
        }
        req.end();
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      this.logger.error(`V3 request error: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * V3 签名
   */
  private signV3(message: string): string {
    try {
      const sign = crypto.createSign("RSA-SHA256");
      sign.update(message);

      const privateKey = this.getPrivateKey();
      return sign.sign(privateKey, "base64");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      this.logger.error(`V3 sign error: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 验证签名
   */
  private verifySignature(
    message: string,
    signature: string,
    serial: string,
  ): boolean {
    try {
      const platformCert = this.configService.get<string>(
        "WECHAT_PLATFORM_CERT",
      );
      if (!platformCert) {
        this.logger.error(
          "SECURITY ALERT: Platform certificate not configured. " +
            "Callback signature verification is DISABLED. " +
            "This is a critical security risk - configure WECHAT_PLATFORM_CERT immediately.",
        );
        return false;
      }

      const verify = crypto.createVerify("RSA-SHA256");
      verify.update(message);

      const cert = this.formatCertificate(platformCert);
      const isValid = verify.verify(cert, signature, "base64");

      if (!isValid) {
        this.logger.error(
          `Signature verification failed for serial: ${serial}. ` +
            "Possible callback forgery attempt detected.",
        );
      }

      return isValid;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      this.logger.error(
        `Verify signature error: ${errorMessage}. ` +
          "Rejecting callback for security reasons.",
      );
      return false;
    }
  }

  /**
   * 解密回调数据
   */
  private decryptResource(resource: WechatCallbackData["resource"]): WechatDecryptedResource {
    try {
      const { ciphertext, nonce, associated_data } = resource;
      const key = Buffer.from(this.apiV3Key, "utf8");
      const iv = Buffer.from(nonce, "utf8");
      const authTag = Buffer.from(ciphertext.slice(-16), "base64");
      const data = Buffer.from(ciphertext.slice(0, -16), "base64");

      const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(authTag);
      decipher.setAAD(Buffer.from(associated_data || "", "utf8"));

      let decrypted = decipher.update(data, undefined, "utf8");
      decrypted += decipher.final("utf8");

      return JSON.parse(decrypted) as WechatDecryptedResource;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      this.logger.error(`Decrypt resource error: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 获取私钥
   */
  private getPrivateKey(): string {
    if (this.keyPath) {
      try {
        const keyContent = fs.readFileSync(this.keyPath, "utf8");
        return this.formatPrivateKey(keyContent);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "未知错误";
        this.logger.error(`Failed to read private key from file: ${this.keyPath}: ${errorMessage}`);
        throw error;
      }
    }
    return this.formatPrivateKey(
      this.configService.get<string>("WECHAT_PRIVATE_KEY") || "",
    );
  }

  /**
   * 获取 HTTPS Agent（包含证书）
   */
  private getHttpsAgent(): https.Agent | undefined {
    try {
      const certFilePath = this.certPath;
      const keyFilePath = this.keyPath;

      if (certFilePath && keyFilePath) {
        if (fs.existsSync(certFilePath) && fs.existsSync(keyFilePath)) {
          const cert = fs.readFileSync(certFilePath);
          const key = fs.readFileSync(keyFilePath);

          return new https.Agent({
            cert,
            key,
            rejectUnauthorized: true,
          });
        }

        this.logger.warn(
          `WeChat certificate files not found: cert=${certFilePath}, key=${keyFilePath}`,
        );
      }

      const certEnv = this.configService.get<string>("WECHAT_CERT_CONTENT");
      const keyEnv = this.configService.get<string>("WECHAT_KEY_CONTENT");

      if (certEnv && keyEnv) {
        return new https.Agent({
          cert: Buffer.from(certEnv, "utf8"),
          key: Buffer.from(keyEnv, "utf8"),
          rejectUnauthorized: true,
        });
      }

      this.logger.warn(
        "WeChat merchant certificate not configured. " +
          "Set WECHAT_CERT_PATH/WECHAT_KEY_PATH or WECHAT_CERT_CONTENT/WECHAT_KEY_CONTENT. " +
          "Using default Agent (some V3 API calls may fail).",
      );
      return undefined;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create HTTPS agent: ${message}`);
      return undefined;
    }
  }

  /**
   * 格式化私钥
   */
  private formatPrivateKey(key: string): string {
    if (key.includes("-----BEGIN")) {
      return key;
    }
    return `-----BEGIN PRIVATE KEY-----\n${key}\n-----END PRIVATE KEY-----`;
  }

  /**
   * 格式化证书
   */
  private formatCertificate(cert: string): string {
    if (cert.includes("-----BEGIN")) {
      return cert;
    }
    return `-----BEGIN CERTIFICATE-----\n${cert}\n-----END CERTIFICATE-----`;
  }
}
