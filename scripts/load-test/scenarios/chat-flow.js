import http from "k6/http";
import { check, sleep } from "k6";
import { BASE_URL, getAuthHeaders } from "../helpers/auth.js";

export default function () {
  const payload = JSON.stringify({
    message: "推荐一套适合约会的穿搭",
    context: { scene: "date", style: "elegant" },
  });
  const res = http.post(`${BASE_URL}/ai-stylist/chat`, payload, { headers: getAuthHeaders() });
  check(res, {
    "chat returns 200 or 429": (r) => r.status === 200 || r.status === 429,
    "chat has response body": (r) => r.body.length > 0,
    "rate limited returns 429": (r) => r.status === 429 || r.status === 200,
  });
  sleep(3);
}
