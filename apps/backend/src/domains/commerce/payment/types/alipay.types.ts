/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * 支付宝支付类型定义
 * 金融级安全类型，确保支付数据类型安全
 */

/**
 * 支付宝 API 响应基础接口
 */
export interface AlipayBaseResponse {
  code: string;
  msg: string;
  sub_code?: string;
  sub_msg?: string;
}

/**
 * 支付宝业务内容（基础）
 */
export interface AlipayBizContentBase {
  out_trade_no: string;
  total_amount: string;
  subject: string;
  body?: string;
  timeout_express?: string;
}

/**
 * 支付宝 H5 业务内容
 */
export interface AlipayBizContentH5 extends AlipayBizContentBase {
  product_code: string;
  extend_params?: {
    sys_service_provider_id: string;
  };
}

/**
 * 支付宝业务内容（统一类型）
 */
export type AlipayBizContent = AlipayBizContentBase | AlipayBizContentH5;

/**
 * 支付宝查询订单响应
 */
export interface AlipayQueryResponse extends AlipayBaseResponse {
  trade_no: string;
  out_trade_no: string;
  trade_status: "WAIT_BUYER_PAY" | "TRADE_SUCCESS" | "TRADE_FINISHED" | "TRADE_CLOSED";
  total_amount: string;
  gmt_payment?: string;
  buyer_logon_id?: string;
  buyer_user_id?: string;
}

/**
 * 支付宝查询订单 API 响应包装
 */
export interface AlipayQueryApiResponse {
  alipay_trade_query_response: AlipayQueryResponse;
}

/**
 * 支付宝退款响应
 */
export interface AlipayRefundResponse extends AlipayBaseResponse {
  trade_no: string;
  out_trade_no: string;
  refund_fee: string;
  gmt_refund_pay?: string;
}

/**
 * 支付宝退款 API 响应包装
 */
export interface AlipayRefundApiResponse {
  alipay_trade_refund_response: AlipayRefundResponse;
}

/**
 * 支付宝关闭订单响应
 */
export interface AlipayCloseResponse extends AlipayBaseResponse {
  trade_no?: string;
  out_trade_no?: string;
}

/**
 * 支付宝关闭订单 API 响应包装
 */
export interface AlipayCloseApiResponse {
  alipay_trade_close_response: AlipayCloseResponse;
}

/**
 * 支付宝回调数据
 */
export interface AlipayCallbackData {
  notify_time: string;
  notify_type: string;
  notify_id: string;
  app_id: string;
  charset: string;
  version: string;
  sign_type: string;
  sign: string;
  trade_no: string;
  out_trade_no: string;
  trade_status: "WAIT_BUYER_PAY" | "TRADE_SUCCESS" | "TRADE_FINISHED" | "TRADE_CLOSED";
  total_amount: string;
  receipt_amount?: string;
  buyer_pay_amount?: string;
  point_amount?: string;
  invoice_amount?: string;
  gmt_create?: string;
  gmt_payment?: string;
  fund_bill_list?: string;
  passback_params?: string;
  subject: string;
  body?: string;
  buyer_id?: string;
  buyer_logon_id?: string;
  seller_id?: string;
  seller_email?: string;
}

/**
 * 支付宝请求参数
 */
export interface AlipayRequestParams {
  app_id: string;
  method: string;
  format: string;
  return_url?: string;
  charset: string;
  sign_type: string;
  timestamp: string;
  version: string;
  notify_url?: string;
  biz_content: string;
  sign?: string;
}

/**
 * 支付宝签名验证参数
 */
export interface AlipaySignVerifyParams {
  sign: string;
  sign_type: string;
  [key: string]: string | undefined;
}
