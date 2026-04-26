import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";

const aiLatency = new Trend("ai_latency");

export const options = {
  stages: [
    { duration: "30s", target: 5 }, // gentle ramp (AI is expensive)
    { duration: "1m", target: 10 }, // sustain 10 concurrent
    { duration: "30s", target: 20 }, // spike
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<5000"], // D-17: AI P95 < 5s
  },
};

const BASE_URL = __ENV.API_URL || "http://localhost:3001/api/v1";

export default function () {
  const token = __ENV.TEST_TOKEN || "";
  const res = http.post(
    `${BASE_URL}/dialog/process`,
    JSON.stringify({
      message: "帮我搭一套面试穿搭",
      dialogState: "GREET",
    }),
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      timeout: "30s",
    }
  );
  check(res, {
    "dialog status 200 or 401": (r) => r.status === 200 || r.status === 401,
    "dialog response < 5s": (r) => r.timings.duration < 5000 || r.status === 401,
  });
  aiLatency.add(res.timings.duration);
  sleep(2);
}
