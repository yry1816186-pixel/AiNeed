#!/usr/bin/env node
// 寻裳 XUNO — 模拟种子用户数据生成器
// 生成 5-10 个模拟用户的完整行为链数据

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const BODY_TYPES = ["slim", "average", "athletic", "curvy", "petite"];
const STYLE_EXPRESSIONS = [
  "minimalist",
  "casual",
  "business",
  "creative",
  "romantic",
  "streetwear",
];
const PRIMARY_SCENARIOS = ["interview", "daily", "date", "business", "party", "travel"];
const BUDGETS = ["500", "1000", "2000", "3000", "5000"];
const AGE_BANDS = ["18-22", "23-26", "27-30", "31-35"];
const EVENT_TYPES = [
  "view_item",
  "view_recommendation",
  "save_outfit",
  "try_on",
  "chat_with_yiyi",
  "purchase",
  "share",
  "skip",
];
const SCENARIOS = ["interview", "daily", "date", "business", "party", "travel"];
const WEATHER_CONDITIONS = ["sunny", "cloudy", "rainy", "cold", "hot"];
const TIMES_OF_DAY = ["morning", "afternoon", "evening"];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

// 测试用固定凭证，仅用于种子数据生成
const SEED_CREDENTIAL = "SeedTest" + new Date().getFullYear() + "!";

export function generateSeedUser(index) {
  return {
    email: `seed_user_${index}@xuno.test`,
    credential: SEED_CREDENTIAL,
    profile: {
      bodyType: pick(BODY_TYPES),
      styleExpression: pick(STYLE_EXPRESSIONS),
      primaryScenarios: [
        pick(PRIMARY_SCENARIOS),
        pick(PRIMARY_SCENARIOS.filter((s) => s !== PRIMARY_SCENARIOS[0])),
      ],
      budget: pick(BUDGETS),
      ageBand: pick(AGE_BANDS),
      nickname: `测试用户${index}`,
      gender: Math.random() > 0.7 ? null : pick(["male", "female"]),
    },
  };
}

export function generateBehaviorEvents(user) {
  const events = [];
  const count = randInt(50, 200);
  for (let i = 0; i < count; i++) {
    events.push({
      id: `evt_${user.email}_${i}`,
      type: pick(EVENT_TYPES),
      timestamp: daysAgo(randInt(0, 14)),
      context: {
        scenario: pick(SCENARIOS),
        weather: pick(WEATHER_CONDITIONS),
        timeOfDay: pick(TIMES_OF_DAY),
        satisfaction: randFloat(3.0, 5.0),
      },
    });
  }
  return events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

export function generateUserJourney(user) {
  const base = new Date();
  base.setDate(base.getDate() - randInt(1, 7));
  const ts = (minOffset) => new Date(base.getTime() + minOffset * 60000).toISOString();

  const journey = [
    { step: 1, action: "register", timestamp: ts(0), detail: `注册 ${user.email}` },
    {
      step: 2,
      action: "onboarding_scene",
      timestamp: ts(2),
      detail: `选择场景: ${user.profile.primaryScenarios.join(", ")}`,
    },
    {
      step: 3,
      action: "onboarding_profile",
      timestamp: ts(3),
      detail: `体型: ${user.profile.bodyType}, 风格: ${user.profile.styleExpression}`,
    },
    { step: 4, action: "onboarding_style", timestamp: ts(4), detail: "风格表达确认" },
    {
      step: 5,
      action: "onboarding_first_outfit",
      timestamp: ts(5),
      detail: "伊伊推荐第一套，用户选择并保存",
    },
    { step: 6, action: "view_recommendation", timestamp: ts(10), detail: "浏览今日推荐 3 套方案" },
    {
      step: 7,
      action: "chat_with_yiyi",
      timestamp: ts(15),
      detail: `与伊伊对话: "${pick(["帮我搭一套面试穿搭", "明天约会穿什么", "通勤怎么穿"])}"`,
    },
    { step: 8, action: "try_on", timestamp: ts(20), detail: "虚拟试穿 1 套推荐方案" },
    { step: 9, action: "save_outfit", timestamp: ts(25), detail: "保存 1 套到衣橱" },
  ];

  if (Math.random() > 0.5) {
    journey.push({ step: 10, action: "share", timestamp: ts(30), detail: "分享穿搭到微信" });
  }

  return journey;
}

export function generateSatisfactionScore(events) {
  let score = 3.5;
  for (const event of events) {
    switch (event.type) {
      case "save_outfit":
        score += 0.05;
        break;
      case "purchase":
        score += 0.1;
        break;
      case "share":
        score += 0.03;
        break;
      case "skip":
        score -= 0.02;
        break;
    }
  }
  return Math.min(5.0, Math.max(3.5, parseFloat(score.toFixed(2))));
}

export function generateRetentionData(users) {
  return {
    day1: randFloat(85, 95),
    day3: randFloat(65, 80),
    day7: randFloat(45, 65),
    day14: randFloat(30, 50),
    totalUsers: users.length,
  };
}

export function main() {
  const users = [];
  for (let i = 1; i <= 10; i++) {
    const user = generateSeedUser(i);
    const events = generateBehaviorEvents(user);
    const journey = generateUserJourney(user);
    const satisfaction = generateSatisfactionScore(events);
    users.push({ ...user, events, journey, satisfaction });
  }

  const retention = generateRetentionData(users);
  const avgSatisfaction = parseFloat(
    (users.reduce((s, u) => s + u.satisfaction, 0) / users.length).toFixed(2)
  );

  const output = {
    meta: {
      generatedAt: new Date().toISOString(),
      version: "1.0.0",
      description: "寻裳 XUNO 模拟种子用户数据",
    },
    users,
    summary: {
      totalUsers: users.length,
      avgSatisfaction,
      retention,
      eventDistribution: EVENT_TYPES.map((type) => ({
        type,
        count: users.reduce((n, u) => n + u.events.filter((e) => e.type === type).length, 0),
      })),
    },
  };

  const outDir = join(__dirname, "..", "docs", "PRESENTATION");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "seed-user-data.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`Generated ${users.length} seed users -> ${outPath}`);
  console.log(`Avg satisfaction: ${avgSatisfaction}`);
  console.log(`Day 7 retention: ${retention.day7}%`);
  return output;
}

main();
