/**
 * xuno AI 造型师 API 负载测试
 *
 * 覆盖 AI 造型师核心流程：创建会话 -> 发送消息 -> 列表查询 -> 会话详情
 * 目标：验证 AI 服务在 50 并发下的响应时间、成功率和降级行为。
 *
 * 运行方式：
 *   k6 run tests/load/k6/scenarios/ai-stylist-load.js
 *
 * 注意事项：
 *   - AI 接口依赖 GLM API，响应延迟较高（2-10s），并发上限设为 50
 *   - setup 阶段使用测试账号登录获取 token，所有 VU 共享同一 token
 *   - 遇到 429/503 时自动退避，避免雪崩
 *   - 会话创建后发送消息，消息内容从预设列表随机选取
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

import {
  BASE_URL,
  API_PREFIX,
  WARMUP_DURATION,
  RAMP_UP_DURATION,
  SUSTAINED_DURATION,
  RAMP_DOWN_DURATION,
  AI_THRESHOLDS,
  TEST_CREDENTIALS,
  getAuthHeaders,
  randomItem,
  apiUrl,
} from '../config.js';

// ============================================================
// 自定义指标
// ============================================================

/** 创建会话响应时间趋势 */
const sessionCreateTime = new Trend('ai_session_create_time', true);

/** 发送消息响应时间趋势 */
const messageTime = new Trend('ai_message_time', true);

/** 列表查询响应时间趋势 */
const listTime = new Trend('ai_list_time', true);

/** 会话详情查询响应时间趋势 */
const sessionDetailTime = new Trend('ai_session_detail_time', true);

/** AI 限流/服务降级率 */
const aiRateLimited = new Rate('ai_rate_limited');

/** AI 服务错误率（5xx） */
const aiServerError = new Rate('ai_server_error');

/** 成功创建的会话计数 */
const sessionsCreated = new Counter('ai_sessions_created');

// ============================================================
// 预设消息内容（模拟真实用户输入）
// ============================================================

const STYLIST_MESSAGES = [
  '我要一套面试穿搭，偏正式商务风格',
  '帮我搭配一套周末约会的衣服',
  '我想走极简通勤风，预算 2000 以内',
  '春天穿什么比较好看？我偏瘦',
  '推荐一套适合年会的穿搭',
  '我身高 170，体重 65kg，推荐日常搭配',
  '有没有适合微胖男生的穿搭建议？',
  '帮我选一套海边度假的穿搭',
  '我想要一套运动休闲风格的搭配',
  '推荐一套适合 30 岁职场女性的通勤穿搭',
];

const SESSION_GOALS = [
  '面试穿搭',
  '约会穿搭',
  '日常通勤',
  '派对穿搭',
  '度假穿搭',
  '运动休闲',
];

const SESSION_ENTRIES = [
  'interview',
  'date',
  'daily',
  'party',
  'vacation',
  'casual',
];

// ============================================================
// 场景与阈值配置
// ============================================================

export const options = {
  scenarios: {
    // 阶段 1：预热 - 极少量并发验证 AI 服务可用
    ai_warmup: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: WARMUP_DURATION, target: 5 },
      ],
      gracefulRampDown: '15s',
    },
    // 阶段 2：爬坡 - 缓慢增加并发（AI 服务成本高）
    ai_ramp_up: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: RAMP_UP_DURATION, target: 50 },
      ],
      gracefulRampDown: '30s',
      startTime: WARMUP_DURATION,
    },
    // 阶段 3：持续 - 维持 50 并发观察稳态
    ai_sustained: {
      executor: 'ramping-vus',
      startVUs: 50,
      stages: [
        { duration: SUSTAINED_DURATION, target: 50 },
      ],
      gracefulRampDown: '30s',
      startTime: WARMUP_DURATION.replace(/\D/g, '') * 1
        + RAMP_UP_DURATION.replace(/\D/g, '') * 60,
    },
    // 阶段 4：降压 - 逐步释放
    ai_ramp_down: {
      executor: 'ramping-vus',
      startVUs: 50,
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
    ...AI_THRESHOLDS,
    // 创建会话 p95 < 2s（数据库写入 + 初始化）
    ai_session_create_time: ['p(95)<2000'],
    // 发送消息 p95 < 10s（含 LLM 推理，容忍较高延迟）
    ai_message_time: ['p(95)<10000'],
    // 列表查询 p95 < 1s
    ai_list_time: ['p(95)<1000'],
    // 会话详情 p95 < 1s
    ai_session_detail_time: ['p(95)<1000'],
  },

  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

// ============================================================
// Setup：登录获取认证 token
// ============================================================

export function setup() {
  const loginPayload = JSON.stringify({
    email: TEST_CREDENTIALS.email,
    password: TEST_CREDENTIALS.password,
  });

  const loginRes = http.post(
    apiUrl('/auth/login'),
    loginPayload,
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'setup_login' },
      timeout: '15s',
    },
  );

  if (loginRes.status !== 200) {
    throw new Error(
      `Setup failed: login returned status ${loginRes.status}. ` +
      `Ensure the test account (${TEST_CREDENTIALS.email}) exists and the backend is running.`,
    );
  }

  let loginBody;
  try {
    loginBody = JSON.parse(loginRes.body);
  } catch {
    throw new Error('Setup failed: could not parse login response body.');
  }

  if (!loginBody.accessToken) {
    throw new Error('Setup failed: login response missing accessToken.');
  }

  console.log(
    `Setup complete: authenticated as ${TEST_CREDENTIALS.email}, ` +
    `token length=${loginBody.accessToken.length}`,
  );

  return {
    accessToken: loginBody.accessToken,
    refreshToken: loginBody.refreshToken,
  };
}

// ============================================================
// Teardown：清理（可选）
// ============================================================

export function teardown(data) {
  // 登出使 token 失效
  if (data && data.accessToken) {
    http.post(
      apiUrl('/auth/logout'),
      JSON.stringify({ refreshToken: data.refreshToken }),
      {
        headers: getAuthHeaders(data.accessToken),
        tags: { name: 'teardown_logout' },
        timeout: '5s',
      },
    );
  }
  console.log('Teardown complete.');
}

// ============================================================
// 退避处理：遇到限流/服务不可用时等待
// ============================================================

function handleRateLimitOrError(response) {
  if (response.status === 429) {
    aiRateLimited.add(1);
    // 读取 Retry-After 头，默认退避 5 秒
    const retryAfter = response.headers['Retry-After'];
    const backoff = retryAfter ? parseInt(retryAfter, 10) : 5;
    console.warn(`Rate limited (429), backing off for ${backoff}s...`);
    sleep(backoff);
    return true;
  }

  if (response.status >= 500) {
    aiServerError.add(1);
    console.error(`Server error: ${response.status}, body: ${response.body?.substring(0, 200)}`);
    sleep(2 + Math.random() * 3);
    return true;
  }

  aiRateLimited.add(0);
  aiServerError.add(0);
  return false;
}

// ============================================================
// 测试主逻辑
// ============================================================

export default function (data) {
  const authHeaders = getAuthHeaders(data.accessToken);

  // ----------------------------------------------------------
  // 1. 创建 AI 造型师会话
  // ----------------------------------------------------------
  const entry = randomItem(SESSION_ENTRIES);
  const goal = randomItem(SESSION_GOALS);

  const createPayload = JSON.stringify({
    entry: entry,
    goal: goal,
    context: {
      source: 'k6-load-test',
      vu: __VU,
      iter: __ITER,
    },
  });

  const createRes = http.post(
    apiUrl('/ai-stylist/sessions'),
    createPayload,
    {
      headers: authHeaders,
      tags: { name: 'ai_create_session', endpoint: 'create_session' },
      timeout: '15s',
    },
  );

  sessionCreateTime.add(createRes.timings.duration);

  // 处理限流/服务错误
  if (handleRateLimitOrError(createRes)) {
    sleep(3 + Math.random() * 2);
    return;
  }

  const createOk = check(createRes, {
    'create_session: status is 201 or 200': (r) => r.status === 201 || r.status === 200,
    'create_session: has session id': (r) => {
      try {
        const body = JSON.parse(r.body);
        return typeof body.id === 'string' && body.id.length > 0;
      } catch {
        return false;
      }
    },
  });

  if (!createOk) {
    sleep(2 + Math.random() * 2);
    return;
  }

  let sessionId;
  try {
    const createBody = JSON.parse(createRes.body);
    sessionId = createBody.id;
  } catch {
    sleep(2);
    return;
  }

  sessionsCreated.add(1);

  // 创建后短暂等待，模拟用户阅读初始建议
  sleep(1 + Math.random());

  // ----------------------------------------------------------
  // 2. 发送消息到会话
  // ----------------------------------------------------------
  const userMessage = randomItem(STYLIST_MESSAGES);

  const messagePayload = JSON.stringify({
    message: userMessage,
  });

  const messageRes = http.post(
    apiUrl(`/ai-stylist/sessions/${sessionId}/messages`),
    messagePayload,
    {
      headers: authHeaders,
      tags: { name: 'ai_send_message', endpoint: 'send_message' },
      timeout: '30s', // AI 响应可能较慢
    },
  );

  messageTime.add(messageRes.timings.duration);

  // 消息接口可能遇到限流
  if (handleRateLimitOrError(messageRes)) {
    sleep(3 + Math.random() * 2);
    return;
  }

  check(messageRes, {
    'send_message: status is 201 or 200': (r) => r.status === 201 || r.status === 200,
    'send_message: has response content': (r) => {
      try {
        const body = JSON.parse(r.body);
        // 消息响应可能是 { id, role, content } 或 { response }
        return body.content || body.response || body.id;
      } catch {
        return false;
      }
    },
  });

  // AI 响应后较长等待，模拟用户阅读和思考
  sleep(3 + Math.random() * 2);

  // ----------------------------------------------------------
  // 3. 列表查询会话
  // ----------------------------------------------------------
  const listRes = http.get(
    apiUrl('/ai-stylist/sessions?limit=10&offset=0'),
    {
      headers: authHeaders,
      tags: { name: 'ai_list_sessions', endpoint: 'list_sessions' },
      timeout: '10s',
    },
  );

  listTime.add(listRes.timings.duration);

  check(listRes, {
    'list_sessions: status is 200': (r) => r.status === 200,
    'list_sessions: has sessions array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.sessions) || Array.isArray(body.data);
      } catch {
        return false;
      }
    },
  });

  sleep(0.5 + Math.random());

  // ----------------------------------------------------------
  // 4. 获取会话详情
  // ----------------------------------------------------------
  const detailRes = http.get(
    apiUrl(`/ai-stylist/sessions/${sessionId}`),
    {
      headers: authHeaders,
      tags: { name: 'ai_session_detail', endpoint: 'session_detail' },
      timeout: '10s',
    },
  );

  sessionDetailTime.add(detailRes.timings.duration);

  check(detailRes, {
    'session_detail: status is 200': (r) => r.status === 200,
    'session_detail: has session id': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.id === sessionId;
      } catch {
        return false;
      }
    },
  });

  // 迭代间思考时间：3-5 秒，AI 交互节奏较慢
  sleep(3 + Math.random() * 2);
}
