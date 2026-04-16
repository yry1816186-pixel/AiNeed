/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * 支付提供商接口
 * 定义所有支付提供商必须实现的方法
 */

import { PaymentRawCallbackData } from "../types/common.types";

export type PaymentProvider = "alipay" | "wechat";

export type PaymentMethod = "qrcode" | "h5" | "app" | "native";

export interface CreatePaymentOptions {
  orderId: string;
  amount: number;
  subject: string;
  body?: string;
  method: PaymentMethod;
  clientIp?: string;
  notifyUrl?: string;
  returnUrl?: string;
  expireMinutes?: number;
}

export interface PaymentResult {
  success: boolean;
  orderId: string;
  tradeNo?: string;
  qrCode?: string;
  h5Url?: string;
  appPayload?: string;
  expireAt?: Date;
  rawData?: PaymentRawCallbackData;
  error?: PaymentError;
}

export interface PaymentCallbackData {
  orderId: string;
  tradeNo: string;
  amount: number;
  status: "paid" | "failed" | "cancelled";
  paidAt: Date;
  rawData: PaymentRawCallbackData;
}

export interface RefundOptions {
  orderId: string;
  refundId: string;
  amount: number;
  reason?: string;
}

export interface RefundResult {
  success: boolean;
  refundId: string;
  refundNo?: string;
  status: "processing" | "success" | "failed";
  error?: PaymentError;
}

export interface PaymentQueryResult {
  orderId: string;
  tradeNo?: string;
  amount?: number;
  status: "pending" | "paid" | "failed" | "refunded" | "closed";
  paidAt?: Date;
  rawData?: PaymentRawCallbackData;
}

export interface PaymentError {
  code: string;
  message: string;
  detail?: string;
}

export interface PaymentProviderInterface {
  /**
   * 提供商名称
   */
  readonly name: PaymentProvider;

  /**
   * 创建支付订单
   */
  createPayment(options: CreatePaymentOptions): Promise<PaymentResult>;

  /**
   * 查询支付状态
   */
  queryPayment(orderId: string): Promise<PaymentQueryResult>;

  /**
   * 处理支付回调
   * @param callbackData 原始回调数据
   * @returns 解析后的回调数据
   */
  handleCallback(
    callbackData: PaymentRawCallbackData,
  ): Promise<PaymentCallbackData>;

  /**
   * 验证回调签名
   */
  verifyCallbackSign(callbackData: PaymentRawCallbackData): boolean;

  /**
   * 申请退款
   */
  refund(options: RefundOptions): Promise<RefundResult>;

  /**
   * 关闭订单
   */
  closeOrder(orderId: string): Promise<boolean>;
}
