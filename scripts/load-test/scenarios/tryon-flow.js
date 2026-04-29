import http from "k6/http";
import { check } from "k6";
import { BASE_URL, getAuthHeaders } from "../helpers/auth.js";

export default function () {
  const payload = JSON.stringify({
    photoId: "00000000-0000-0000-0000-000000000001",
    itemId: "00000000-0000-0000-0000-000000000002",
  });
  const res = http.post(`${BASE_URL}/try-on`, payload, { headers: getAuthHeaders() });
  check(res, {
    "tryon returns 200 or 429": (r) => r.status === 200 || r.status === 201 || r.status === 429,
  });
}
