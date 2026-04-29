import { default as runChatFlow } from "./scenarios/chat-flow.js";
import { default as runRecommendationFlow } from "./scenarios/recommendation-flow.js";
import { default as runTryonFlow } from "./scenarios/tryon-flow.js";

export const options = {
  scenarios: {
    chat: {
      executor: "ramping-vus",
      exec: "chatFlow",
      startVUs: 1,
      stages: [
        { duration: "2m", target: 50 },
        { duration: "2m", target: 50 },
        { duration: "1m", target: 0 },
      ],
    },
    recommendations: {
      executor: "ramping-vus",
      exec: "recommendationFlow",
      startVUs: 1,
      stages: [
        { duration: "2m", target: 50 },
        { duration: "2m", target: 50 },
        { duration: "1m", target: 0 },
      ],
    },
  },
  thresholds: {
    "http_req_duration{scenario:chat}": ["p(95)<2000"],
    "http_req_duration{scenario:recommendations}": ["p(95)<1000"],
    http_req_failed: ["rate<0.05"],
  },
};

export function chatFlow() {
  runChatFlow();
}
export function recommendationFlow() {
  runRecommendationFlow();
}
export function tryonFlow() {
  runTryonFlow();
}
