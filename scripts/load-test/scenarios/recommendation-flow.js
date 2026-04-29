import http from "k6/http";
import { check, sleep } from "k6";
import { BASE_URL, getAuthHeaders } from "../helpers/auth.js";

export default function () {
  const scenes = ["casual", "business", "date", "sport", "party"];
  const scene = scenes[Math.floor(Math.random() * scenes.length)];
  const res = http.get(`${BASE_URL}/recommendations?occasion=${scene}`, {
    headers: getAuthHeaders(),
  });
  check(res, {
    "recommendations returns 200": (r) => r.status === 200,
    "has response body": (r) => r.body.length > 0,
  });
  sleep(1);
}
