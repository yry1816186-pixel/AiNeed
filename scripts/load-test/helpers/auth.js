import http from "k6/http";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3001";

export function getAuthHeaders() {
  const token = __ENV.TEST_AUTH_TOKEN || "test-token-placeholder";
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export { BASE_URL };
