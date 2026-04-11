/**
 * 微信支付类型定义
 * 金融级安全类型，确保支付数据类型安全
 */

/**
 * 微信支付 V3 API 响应基础接口
 */
export interface WechatV3BaseResponse {
  code?: string;
  message?: string;
  detail?: string;
}

/**
 * 微信支付创建订单响应 (Native/H5)
 */
export interface WechatV3CreatePaymentResponse extends WechatV3BaseResponse {
  prepay_id?: string;
  code_url?: string; // Native 支付二维码链接
  h5_url?: string; // H5 支付链接
}

/**
 * 微信支付查询订单响应
 */
export interface WechatV3QueryResponse extends WechatV3BaseResponse {
  transaction_id?: string;
  trade_state?: "NOTPAY" | "SUCCESS" | "CLOSED" | "REFUND";
  trade_state_desc?: string;
  success_time?: string;
  amount?: {
    total: number; // 单位：分
    currency: string;
  };
}

/**
 * 微信支付退款响应
 */
export interface WechatV3RefundResponse extends WechatV3BaseResponse {
  refund_id?: string;
  status?: "SUCCESS" | "PROCESSING" | "CLOSED";
}

/**
 * 微信支付回调资源（加密）
 */
export interface WechatCallbackResource {
  algorithm: string;
  ciphertext: string;
  associated_data: string;
  nonce: string;
  original_type: string;
}

/**
 * 微信支付回调数据（解密后）
 */
export interface WechatDecryptedResource {
  out_trade_no: string; // 商户订单号
  transaction_id: string; // 微信支付订单号
  trade_state: "SUCCESS" | "CLOSED" | "PAYERROR";
  trade_state_desc?: string;
  success_time?: string;
  amount?: {
    total: number; // 单位：分
    currency: string;
  };
  payer?: {
    openid: string;
  };
}

/**
 * 微信支付回调请求头
 */
export interface WechatCallbackHeaders {
  "wechatpay-timestamp": string;
  "wechatpay-nonce": string;
  "wechatpay-signature": string;
  "wechatpay-serial": string;
  "wechatpay-signature-type"?: string;
}

/**
 * 微信支付回调原始数据
 */
export interface WechatCallbackData {
  id: string;
  create_time: string;
  resource_type: string;
  event_type: string;
  summary: string;
  resource: WechatCallbackResource;
}

/**
 * 微信支付回调完整数据（包含 headers 和 body）
 */
export interface WechatCallbackPayload {
  headers: WechatCallbackHeaders;
  body: string; // JSON 字符串
}

/**
 * 微信支付 V3 请求数据（基础）
 */
export interface WechatV3RequestDataBase {
  appid: string;
  mchid: string;
  description: string;
  out_trade_no: string;
  notify_url: string;
  amount: {
    total: number; // 单位：分
    currency: string;
  };
  time_expire?: string;
}

/**
 * 微信支付 H5 场景信息
 */
export interface WechatH5SceneInfo {
  payer_client_ip: string;
  h5_info: {
    type: string;
    app_url?: string;
  };
}

/**
 * 微信支付 V3 请求数据（H5）
 */
export interface WechatV3RequestDataH5 extends WechatV3RequestDataBase {
  scene_info: WechatH5SceneInfo;
}

/**
 * 微信支付 V3 请求数据（统一类型）
 */
export type WechatV3RequestData =
  | WechatV3RequestDataBase
  | WechatV3RequestDataH5;

/**
 * 微信支付 APP 支付参数
 */
export interface WechatAppPayload {
  appid: string;
  partnerid: string;
  prepayid: string;
  package: string;
  noncestr: string;
  timestamp: string;
  sign: string;
}

/**
 * 微信支付 API 响应（统一包装）
 */
export type WechatApiResponse<T = unknown> =
  | (T & { code?: never })
  | WechatV3BaseResponse;
