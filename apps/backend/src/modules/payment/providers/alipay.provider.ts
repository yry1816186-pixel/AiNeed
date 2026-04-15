import * as crypto from "crypto";

import { Injectable, Logger, OnModuleInit, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

import {
  AlipayBizContent,
  AlipayCallbackData,
  AlipayQueryApiResponse,
  AlipayRefundApiResponse,
  AlipayCloseApiResponse,
  AlipayRequestParams,
} from "../types/alipay.types";
import { PaymentRawCallbackData } from "../types/common.types";

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
export class AlipayProvider implements PaymentProviderInterface, OnModuleInit {
  private readonly logger = new Logger(AlipayProvider.name);
  readonly name: PaymentProvider = "alipay";

  private appId!: string;
  private privateKey!: string;
  private alipayPublicKey!: string;
  private notifyUrl!: string;
  private returnUrl!: string;
  private gateway!: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.appId = this.configService.get<string>("ALIPAY_APP_ID") || "";
    this.privateKey =
      this.configService.get<string>("ALIPAY_PRIVATE_KEY") || "";
    this.alipayPublicKey =
      this.configService.get<string>("ALIPAY_PUBLIC_KEY") || "";
    this.notifyUrl = this.configService.get<string>("ALIPAY_NOTIFY_URL") || "";
    this.returnUrl = this.configService.get<string>("ALIPAY_RETURN_URL") || "";

    // 沙箱环境或生产环境
    const isSandbox =
      this.configService.get<string>("ALIPAY_SANDBOX") === "true";
    this.gateway = isSandbox
      ? "https://openapi.alipaydev.com/gateway.do"
      : "https://openapi.alipay.com/gateway.do";

    if (!this.appId || !this.privateKey) {
      this.logger.warn(
        "Alipay configuration is incomplete. Payment will not work.",
      );
    }
  }

  /**
   * 创建支付订单
   */
  async createPayment(options: CreatePaymentOptions): Promise<PaymentResult> {
    // 配置完整性检查：appId 和 privateKey 是支付宝支付的必要参数
    if (!this.appId || !this.privateKey) {
      throw new ServiceUnavailableException(
        "Alipay payment is not available: appId or privateKey is not configured. " +
        "Please set ALIPAY_APP_ID and ALIPAY_PRIVATE_KEY environment variables.",
      );
    }

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

      const bizContent: AlipayBizContent = {
        out_trade_no: orderId,
        total_amount: amount.toFixed(2),
        subject: subject,
        body: body || subject,
        timeout_express: `${expireMinutes}m`,
      };

      const params: AlipayRequestParams = {
        app_id: this.appId,
        method: this.getApiMethod(method),
        format: "JSON",
        return_url: options.returnUrl || this.returnUrl,
        charset: "utf-8",
        sign_type: "RSA2",
        timestamp: this.formatTime(new Date()),
        version: "1.0",
        notify_url: options.notifyUrl || this.notifyUrl,
        biz_content: JSON.stringify(bizContent),
      };

      const sign = this.sign(params);
      params.sign = sign;

      const result: PaymentResult = {
        success: true,
        orderId,
        expireAt,
      };

      switch (method) {
        case "qrcode":
        case "native":
          // 生成二维码链接
          result.qrCode = this.buildRequestUrl(params);
          break;
        case "h5":
          // H5 支付需要额外的场景信息
          (bizContent as AlipayBizContent & { product_code: string }).product_code = "QUICK_WAP_WAY";
          (bizContent as AlipayBizContent & { extend_params: unknown }).extend_params = {
            sys_service_provider_id: this.appId,
          };
          params.biz_content = JSON.stringify(bizContent);
          params.sign = this.sign(params);
          result.h5Url = this.buildRequestUrl(params);
          break;
        case "app":
          // APP 支付返回待签名字符串
          result.appPayload = this.buildAppPayload(params);
          break;
      }

      result.rawData = params as unknown as PaymentRawCallbackData;
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to create alipay payment: ${errorMessage}`,
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
      const bizContent = {
        out_trade_no: orderId,
      };

      const params: AlipayRequestParams = {
        app_id: this.appId,
        method: "alipay.trade.query",
        format: "JSON",
        charset: "utf-8",
        sign_type: "RSA2",
        timestamp: this.formatTime(new Date()),
        version: "1.0",
        biz_content: JSON.stringify(bizContent),
      };

      params.sign = this.sign(params);

      const url = this.buildRequestUrl(params);
      const response = await this.httpGet(url);
      const data = JSON.parse(response) as AlipayQueryApiResponse;

      const queryResponse = data.alipay_trade_query_response;

      if (!queryResponse) {
        throw new Error("Invalid response from Alipay");
      }

      const statusMap: Record<string, PaymentQueryResult["status"]> = {
        WAIT_BUYER_PAY: "pending",
        TRADE_SUCCESS: "paid",
        TRADE_FINISHED: "paid",
        TRADE_CLOSED: "closed",
      };

      return {
        orderId,
        tradeNo: queryResponse.trade_no,
        amount: parseFloat(queryResponse.total_amount || "0"),
        status: statusMap[queryResponse.trade_status] || "failed",
        paidAt: queryResponse.gmt_payment
          ? new Date(queryResponse.gmt_payment)
          : undefined,
        rawData: queryResponse as unknown as PaymentRawCallbackData,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to query alipay payment: ${errorMessage}`,
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
    const alipayData = callbackData as unknown as AlipayCallbackData;
    const status = alipayData.trade_status;

    let paymentStatus: PaymentCallbackData["status"] = "failed";
    if (status === "TRADE_SUCCESS" || status === "TRADE_FINISHED") {
      paymentStatus = "paid";
    } else if (status === "TRADE_CLOSED") {
      paymentStatus = "cancelled";
    }

    return {
      orderId: alipayData.out_trade_no,
      tradeNo: alipayData.trade_no,
      amount: parseFloat(alipayData.total_amount || "0"),
      status: paymentStatus,
      paidAt: alipayData.gmt_payment
        ? new Date(alipayData.gmt_payment)
        : new Date(),
      rawData: callbackData,
    };
  }

  /**
   * 验证回调签名
   */
  verifyCallbackSign(callbackData: PaymentRawCallbackData): boolean {
    try {
      const alipayData = callbackData as unknown as AlipayCallbackData;
      const sign = alipayData.sign;
      const signType = alipayData.sign_type;

      if (!sign || signType !== "RSA2") {
        return false;
      }

      // 构建待验签字符串
      const params = { ...callbackData };
      delete (params as Record<string, unknown>).sign;
      delete (params as Record<string, unknown>).sign_type;

      const signStr = this.buildSignString(params);
      return this.verify(signStr, sign);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      this.logger.error(`Failed to verify callback sign: ${errorMessage}`);
      return false;
    }
  }

  /**
   * 申请退款
   */
  async refund(options: RefundOptions): Promise<RefundResult> {
    try {
      const { orderId, refundId, amount, reason } = options;

      const bizContent = {
        out_trade_no: orderId,
        refund_amount: amount.toFixed(2),
        out_request_no: refundId,
        refund_reason: reason || "用户申请退款",
      };

      const params: Record<string, string> = {
        app_id: this.appId,
        method: "alipay.trade.refund",
        format: "JSON",
        charset: "utf-8",
        sign_type: "RSA2",
        timestamp: this.formatTime(new Date()),
        version: "1.0",
        biz_content: JSON.stringify(bizContent),
      };

      const signParams: AlipayRequestParams = {
        app_id: params.app_id!,
        method: params.method!,
        format: params.format!,
        charset: params.charset!,
        sign_type: params.sign_type!,
        timestamp: params.timestamp!,
        version: params.version!,
        biz_content: params.biz_content!,
      };
      const signValue = this.sign(signParams);
      params.sign = signValue;

      const url = this.buildRequestUrl(signParams, signValue);
      const response = await this.httpGet(url);
      const data = JSON.parse(response) as AlipayRefundApiResponse;

      const refundResponse = data.alipay_trade_refund_response;

      if (refundResponse?.code === "10000") {
        return {
          success: true,
          refundId,
          refundNo: refundResponse.trade_no,
          status: "success",
        };
      }

      return {
        success: false,
        refundId,
        status: "failed",
        error: {
          code: refundResponse?.code || "REFUND_FAILED",
          message: refundResponse?.msg || "退款失败",
          detail: refundResponse?.sub_msg,
        },
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to refund alipay payment: ${errorMessage}`,
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
      const bizContent = {
        out_trade_no: orderId,
      };

      const params: Record<string, string> = {
        app_id: this.appId,
        method: "alipay.trade.close",
        format: "JSON",
        charset: "utf-8",
        sign_type: "RSA2",
        timestamp: this.formatTime(new Date()),
        version: "1.0",
        biz_content: JSON.stringify(bizContent),
      };

      const signParams: AlipayRequestParams = {
        app_id: params.app_id!,
        method: params.method!,
        format: params.format!,
        charset: params.charset!,
        sign_type: params.sign_type!,
        timestamp: params.timestamp!,
        version: params.version!,
        biz_content: params.biz_content!,
      };
      const signValue = this.sign(signParams);
      params.sign = signValue;

      const url = this.buildRequestUrl(signParams, signValue);
      const response = await this.httpGet(url);
      const data = JSON.parse(response) as AlipayCloseApiResponse;

      const closeResponse = data.alipay_trade_close_response;
      return closeResponse?.code === "10000";
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to close alipay order: ${errorMessage}`,
        errorStack,
      );
      return false;
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 获取 API 方法名
   */
  private getApiMethod(method: string): string {
    const methodMap: Record<string, string> = {
      qrcode: "alipay.trade.precreate",
      native: "alipay.trade.precreate",
      h5: "alipay.trade.wap.pay",
      app: "alipay.trade.app.pay",
    };
    return methodMap[method] || "alipay.trade.precreate";
  }

  /**
   * RSA2 签名
   */
  private sign(params: AlipayRequestParams): string {
    const signStr = this.buildSignString(params);

    try {
      const sign = crypto.createSign("RSA-SHA256");
      sign.update(signStr);

      // 格式化私钥
      const formattedKey = this.formatPrivateKey(this.privateKey);
      return sign.sign(formattedKey, "base64");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      this.logger.error(`Sign error: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * RSA2 验签
   */
  private verify(content: string, sign: string): boolean {
    try {
      const verify = crypto.createVerify("RSA-SHA256");
      verify.update(content);

      const formattedKey = this.formatPublicKey(this.alipayPublicKey);
      return verify.verify(formattedKey, sign, "base64");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      this.logger.error(`Verify error: ${errorMessage}`);
      return false;
    }
  }

  /**
   * 构建待签名字符串
   */
  private buildSignString(params: PaymentRawCallbackData | AlipayRequestParams): string {
    const paramsRecord = params as Record<string, unknown>;
    const sortedKeys = Object.keys(paramsRecord)
      .filter(
        (key) =>
          paramsRecord[key] !== undefined &&
          paramsRecord[key] !== "" &&
          key !== "sign" &&
          key !== "sign_type",
      )
      .sort();

    return sortedKeys.map((key) => `${key}=${String(paramsRecord[key])}`).join("&");
  }

  /**
   * 构建请求 URL
   */
  private buildRequestUrl(params: AlipayRequestParams, sign?: string): string {
    const paramsWithSign = sign ? { ...params, sign } : params;
    const paramsRecord = paramsWithSign as unknown as Record<string, string | undefined>;
    const queryStr = Object.keys(paramsRecord)
      .map((key) => `${key}=${encodeURIComponent(paramsRecord[key] ?? "")}`)
      .join("&");
    return `${this.gateway}?${queryStr}`;
  }

  /**
   * 构建 APP 支付参数
   */
  private buildAppPayload(params: AlipayRequestParams): string {
    const paramsRecord = params as unknown as Record<string, string | undefined>;
    return Object.keys(paramsRecord)
      .map((key) => `${key}="${encodeURIComponent(paramsRecord[key] ?? "")}"`)
      .join("&");
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
   * 格式化公钥
   */
  private formatPublicKey(key: string): string {
    if (key.includes("-----BEGIN")) {
      return key;
    }
    return `-----BEGIN PUBLIC KEY-----\n${key}\n-----END PUBLIC KEY-----`;
  }

  /**
   * 格式化时间
   */
  private formatTime(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  /**
   * HTTP GET 请求
   */
  private async httpGet(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          "Content-Type": "application/json",
        },
      });
      return typeof response.data === "string"
        ? response.data
        : JSON.stringify(response.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      this.logger.error(`Alipay HTTP GET failed: ${message}`);
      throw error;
    }
  }
}
