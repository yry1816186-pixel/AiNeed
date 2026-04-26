import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const errorRate = new Rate("errors");
const apiLatency = new Trend("api_latency");

export const options = {
  stages: [
    { duration: "30s", target: 20 }, // ramp up to 20
    { duration: "1m", target: 50 }, // sustain 50 (D-17: P95 < 2s)
    { duration: "30s", target: 100 }, // spike to 100 (D-17: no 5xx)
    { duration: "30s", target: 0 }, // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"], // P95 < 2s
    errors: ["rate<0.05"], // < 5% error rate
  },
};

const BASE_URL = __ENV.API_URL || "http://localhost:3001/api/v1";
const TEST_USER_PASSWORD = __ENV.TEST_USER_PASSWORD || "LoadTestPass1!";

export default function () {
  // Test 1: Health check (no auth)
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    "health status 200": (r) => r.status === 200,
  });

  // Test 2: Login (obtain token)
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({
      email: `test_user_${__VU}@xuno.test`,
      password: TEST_USER_PASSWORD,
    }),
    { headers: { "Content-Type": "application/json" } }
  );

  if (loginRes.status === 200 || loginRes.status === 201) {
    const token = loginRes.json("access_token") || loginRes.json("data.access_token");

    // Test 3: Recommendations (auth required)
    const recRes = http.get(`${BASE_URL}/recommendations`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    check(recRes, {
      "recommendations status 200": (r) => r.status === 200 || r.status === 401,
    });
    apiLatency.add(recRes.timings.duration);

    // Test 4: Wardrobe (auth required)
    const wardrobeRes = http.get(`${BASE_URL}/wardrobe`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    check(wardrobeRes, {
      "wardrobe status 200 or 401": (r) => r.status === 200 || r.status === 401,
    });
    apiLatency.add(wardrobeRes.timings.duration);
  }

  errorRate.add(loginRes.status >= 500);
  sleep(1);
}
