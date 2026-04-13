/**
 * xuno 认证 API 负载测试
 *
 * 覆盖完整认证生命周期：注册 -> 登录 -> 获取用户 -> 刷新令牌 -> 登出
 * 目标：验证认证服务在 200 并发下的响应时间、成功率和资源表现。
 *
 * 运行方式：
 *   k6 run tests/load/k6/scenarios/auth-load.js
 *
 * 注意事项：
 *   - 注册接口有 5次/分钟 的限流，高并发下预期部分 429 响应
 *   - 每个迭代使用全新随机邮箱，避免唯一约束冲突
 *   - 登出使用当前迭代的 refreshToken 使其失效
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

import {
  BASE_URL,
  API_PREFIX,
  WARMUP_DURATION,
  RAMP_UP_DURATION,
  SUSTAINED_DURATION,
  RAMP_DOWN_DURATION,
  AUTH_THRESHOLDS,
  getAuthHeaders,
  randomEmail,
  randomPassword,
  apiUrl,
} from '../config.js';

// ============================================================
// 自定义指标
// ============================================================

/** 注册接口响应时间趋势 */
const registrationTime = new Trend('auth_registration_time', true);

/** 登录接口响应时间趋势 */
const loginTime = new Trend('auth_login_time', true);

/** 刷新令牌接口响应时间趋势 */
const refreshTime = new Trend('auth_refresh_time', true);

/** 注册 429 限流率 */
const rateLimitedRate = new Rate('auth_rate_limited');

// ============================================================
// 场景与阈值配置
// ============================================================

export const options = {
  scenarios: {
    // 阶段 1：预热 - 少量并发验证服务可用性
    register_warmup: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: WARMUP_DURATION, target: 10 },
      ],
      gracefulRampDown: '10s',
    },
    // 阶段 2：爬坡 - 线性增加并发至目标
    register_ramp_up: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: RAMP_UP_DURATION, target: 200 },
      ],
      gracefulRampDown: '30s',
      startTime: WARMUP_DURATION,
    },
    // 阶段 3：持续 - 维持目标并发观察稳态
    register_sustained: {
      executor: 'ramping-vus',
      startVUs: 200,
      stages: [
        { duration: SUSTAINED_DURATION, target: 200 },
      ],
      gracefulRampDown: '30s',
      startTime: WARMUP_DURATION.replace(/\D/g, '') * 1
        + RAMP_UP_DURATION.replace(/\D/g, '') * 60,
    },
    // 阶段 4：降压 - 逐步释放并发
    register_ramp_down: {
      executor: 'ramping-vus',
      startVUs: 200,
      stages: [
        { duration: RAMP_DOWN_DURATION, target: 0 },
      ],
      gracefulRampDown: '30s',
      startTime: WARMUP_DURATION.replace(/\D/g, '') * 1
        + RAMP_UP_DURATION.replace(/\D/g, '') * 60
        + SUSTAINED_DURATION.replace(/\D/g, '') * 60,
    },
  },

  thresholds: {
    ...AUTH_THRESHOLDS,
    // 注册接口 p95 应在 1s 内（含 bcrypt 哈希开销）
    auth_registration_time: ['p(95)<1000'],
    // 登录接口 p95 应在 500ms 内
    auth_login_time: ['p(95)<500'],
    // 刷新令牌接口 p95 应在 300ms 内
    auth_refresh_time: ['p(95)<300'],
  },

  // 不追踪每个请求的完整数据，降低内存开销
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

// ============================================================
// 测试主逻辑
// ============================================================

export default function () {
  const email = randomEmail();
  const password = randomPassword();

  // ----------------------------------------------------------
  // 1. 注册新用户
  // ----------------------------------------------------------
  const registerPayload = JSON.stringify({
    email: email,
    password: password,
    nickname: `k6_${__VU}_${__ITER}`,
  });

  const registerParams = {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'auth_register', endpoint: 'register' },
    timeout: '10s',
  };

  const registerRes = http.post(
    apiUrl('/auth/register'),
    registerPayload,
    registerParams,
  );

  registrationTime.add(registerRes.timings.duration);

  const registerOk = check(registerRes, {
    'register: status is 201 or 200': (r) => r.status === 201 || r.status === 200,
    'register: has accessToken': (r) => {
      try {
        const body = JSON.parse(r.body);
        return typeof body.accessToken === 'string' && body.accessToken.length > 0;
      } catch {
        return false;
      }
    },
    'register: has user object': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.user && typeof body.user.id === 'string';
      } catch {
        return false;
      }
    },
  });

  // 处理注册限流 (429) - 标记后跳过后续步骤
  if (registerRes.status === 429) {
    rateLimitedRate.add(1);
    sleep(2 + Math.random() * 3); // 限流后退避
    return;
  }
  rateLimitedRate.add(0);

  if (!registerOk) {
    // 注册失败则跳过后续认证流程
    sleep(1);
    return;
  }

  let registerBody;
  try {
    registerBody = JSON.parse(registerRes.body);
  } catch {
    sleep(1);
    return;
  }

  const accessToken = registerBody.accessToken;
  const refreshToken = registerBody.refreshToken;

  // 思考时间：模拟用户注册后短暂停顿
  sleep(0.5 + Math.random());

  // ----------------------------------------------------------
  // 2. 登录（使用刚注册的账号）
  // ----------------------------------------------------------
  const loginPayload = JSON.stringify({
    email: email,
    password: password,
  });

  const loginParams = {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'auth_login', endpoint: 'login' },
    timeout: '10s',
  };

  const loginRes = http.post(
    apiUrl('/auth/login'),
    loginPayload,
    loginParams,
  );

  loginTime.add(loginRes.timings.duration);

  check(loginRes, {
    'login: status is 200': (r) => r.status === 200,
    'login: has accessToken': (r) => {
      try {
        const body = JSON.parse(r.body);
        return typeof body.accessToken === 'string' && body.accessToken.length > 0;
      } catch {
        return false;
      }
    },
  });

  // 更新为登录返回的新 token
  let loginAccessToken = accessToken;
  let loginRefreshToken = refreshToken;
  try {
    const loginBody = JSON.parse(loginRes.body);
    if (loginBody.accessToken) loginAccessToken = loginBody.accessToken;
    if (loginBody.refreshToken) loginRefreshToken = loginBody.refreshToken;
  } catch {
    // 解析失败，使用注册时的 token
  }

  sleep(0.3 + Math.random() * 0.5);

  // ----------------------------------------------------------
  // 3. 获取当前用户信息
  // ----------------------------------------------------------
  const meRes = http.get(
    apiUrl('/auth/me'),
    {
      headers: getAuthHeaders(loginAccessToken),
      tags: { name: 'auth_me', endpoint: 'me' },
      timeout: '5s',
    },
  );

  check(meRes, {
    'me: status is 200': (r) => r.status === 200,
    'me: has user id': (r) => {
      try {
        const body = JSON.parse(r.body);
        return typeof body.id === 'string';
      } catch {
        return false;
      }
    },
  });

  sleep(0.3 + Math.random() * 0.5);

  // ----------------------------------------------------------
  // 4. 刷新令牌
  // ----------------------------------------------------------
  const refreshPayload = JSON.stringify({
    refreshToken: loginRefreshToken,
  });

  const refreshRes = http.post(
    apiUrl('/auth/refresh'),
    refreshPayload,
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'auth_refresh', endpoint: 'refresh' },
      timeout: '5s',
    },
  );

  refreshTime.add(refreshRes.timings.duration);

  check(refreshRes, {
    'refresh: status is 200': (r) => r.status === 200,
    'refresh: has new accessToken': (r) => {
      try {
        const body = JSON.parse(r.body);
        return typeof body.accessToken === 'string' && body.accessToken.length > 0;
      } catch {
        return false;
      }
    },
  });

  // 获取刷新后的新 token，用于后续登出
  let newAccessToken = loginAccessToken;
  let newRefreshToken = loginRefreshToken;
  try {
    const refreshBody = JSON.parse(refreshRes.body);
    if (refreshBody.accessToken) newAccessToken = refreshBody.accessToken;
    if (refreshBody.refreshToken) newRefreshToken = refreshBody.refreshToken;
  } catch {
    // 解析失败，使用旧 token
  }

  sleep(0.3 + Math.random() * 0.5);

  // ----------------------------------------------------------
  // 5. 登出
  // ----------------------------------------------------------
  const logoutPayload = JSON.stringify({
    refreshToken: newRefreshToken,
  });

  const logoutRes = http.post(
    apiUrl('/auth/logout'),
    logoutPayload,
    {
      headers: getAuthHeaders(newAccessToken),
      tags: { name: 'auth_logout', endpoint: 'logout' },
      timeout: '5s',
    },
  );

  check(logoutRes, {
    'logout: status is 200': (r) => r.status === 200,
    'logout: success is true': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true;
      } catch {
        return false;
      }
    },
  });

  // 迭代间思考时间：1-3 秒，模拟真实用户操作间隔
  sleep(1 + Math.random() * 2);
}
