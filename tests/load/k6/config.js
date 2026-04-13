/**
 * xuno k6 负载测试配置
 *
 * 集中管理所有负载测试的目标地址、并发参数、阈值和工具函数。
 * 各场景脚本通过 import 引用本配置，确保一致性。
 */

// ============================================================
// 目标服务配置
// ============================================================

export const BASE_URL = 'http://localhost:3001';
export const API_PREFIX = '/api/v1';

// ============================================================
// 并发与吞吐目标
// ============================================================

/** 目标虚拟用户数（峰值） */
export const TARGET_VUS = 1000;

/** 目标请求吞吐量 (requests/sec) */
export const TARGET_RPS = 500;

// ============================================================
// 测试凭证
// ============================================================

export const TEST_CREDENTIALS = {
  email: 'test@example.com',
  password: 'Test123456!',
};

// ============================================================
// 场景时间配置
// ============================================================

/** 预热阶段：逐步建立连接，验证服务可用 */
export const WARMUP_DURATION = '30s';

/** 爬坡阶段：线性增加并发至目标值 */
export const RAMP_UP_DURATION = '2m';

/** 持续阶段：维持目标并发，观察稳态表现 */
export const SUSTAINED_DURATION = '5m';

/** 降压阶段：逐步减少并发，观察资源回收 */
export const RAMP_DOWN_DURATION = '1m';

// ============================================================
// 阈值配置
// ============================================================

/**
 * 认证类接口阈值（低延迟要求）
 * - 95% 请求在 500ms 内完成
 * - 失败率 < 1%
 * - 业务校验通过率 > 95%
 */
export const AUTH_THRESHOLDS = {
  http_req_duration: ['p(95)<500'],
  http_req_failed: ['rate<0.01'],
  checks: ['rate>0.95'],
};

/**
 * AI 类接口阈值（高延迟容忍）
 * - 95% 请求在 5s 内完成（含 LLM 推理时间）
 * - 失败率 < 1%
 * - 业务校验通过率 > 95%
 */
export const AI_THRESHOLDS = {
  http_req_duration: ['p(95)<5000'],
  http_req_failed: ['rate<0.01'],
  checks: ['rate>0.95'],
};

// ============================================================
// 工具函数
// ============================================================

/**
 * 生成 Authorization 请求头
 * @param {string} token - JWT access token
 * @returns {Object} 包含 Authorization 和 Content-Type 的请求头对象
 */
export function getAuthHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * 生成随机测试邮箱
 * 使用时间戳 + 随机数确保唯一性，避免注册冲突
 * @returns {string} 格式: k6test_<timestamp>_<random>@loadtest.ai-need.dev
 */
export function randomEmail() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 100000);
  return `k6test_${timestamp}_${random}@loadtest.ai-need.dev`;
}

/**
 * 从数组中随机选取一个元素
 * @param {Array} array - 候选数组
 * @returns {*} 随机选中的元素
 */
export function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * 生成符合后端密码策略的随机密码
 * 规则：8-32位，必须包含大写字母、小写字母和数字
 * @returns {string} 符合策略的密码
 */
export function randomPassword() {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const extra = '!@#$%';
  // 保证至少各一个
  const parts = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
  ];
  // 填充到 12 位
  const pool = upper + lower + digits + extra;
  for (let i = 3; i < 12; i++) {
    parts.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  return parts.join('');
}

/**
 * 构建完整 API URL
 * @param {string} path - API 路径（不含前缀），如 /auth/login
 * @returns {string} 完整 URL
 */
export function apiUrl(path) {
  return `${BASE_URL}${API_PREFIX}${path}`;
}
