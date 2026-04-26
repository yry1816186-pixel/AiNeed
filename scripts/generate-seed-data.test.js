#!/usr/bin/env node
// 寻裳 XUNO — 种子数据生成器测试
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateSeedUser,
  generateBehaviorEvents,
  generateUserJourney,
  generateSatisfactionScore,
  generateRetentionData,
} from "./generate-seed-data.js";

describe("generateSeedUser", () => {
  it("returns user object with email, credential, profile fields", () => {
    const user = generateSeedUser(1);
    assert.equal(user.email, "seed_user_1@xuno.test");
    assert.ok(user.credential);
    assert.ok(user.profile);
    assert.ok(user.profile.bodyType);
    assert.ok(user.profile.styleExpression);
    assert.ok(Array.isArray(user.profile.primaryScenarios));
    assert.ok(user.profile.budget);
    assert.ok(user.profile.ageBand);
  });

  it("generates unique emails by index", () => {
    const u1 = generateSeedUser(1);
    const u5 = generateSeedUser(5);
    assert.notEqual(u1.email, u5.email);
  });

  it("gender can be null (gender demotion)", () => {
    const genders = new Set();
    for (let i = 0; i < 50; i++) {
      genders.add(generateSeedUser(i).profile.gender);
    }
    assert.ok(genders.has(null), "some users should have null gender");
  });
});

describe("generateBehaviorEvents", () => {
  it("returns array of events with timestamp, type, context", () => {
    const user = generateSeedUser(1);
    const events = generateBehaviorEvents(user);
    assert.ok(Array.isArray(events));
    assert.ok(
      events.length >= 50 && events.length <= 200,
      `expected 50-200 events, got ${events.length}`
    );
    const evt = events[0];
    assert.ok(evt.id);
    assert.ok(evt.type);
    assert.ok(evt.timestamp);
    assert.ok(evt.context);
    assert.ok(evt.context.scenario);
    assert.ok(evt.context.weather);
    assert.ok(evt.context.satisfaction);
  });

  it("events are sorted by timestamp", () => {
    const user = generateSeedUser(1);
    const events = generateBehaviorEvents(user);
    for (let i = 1; i < events.length; i++) {
      assert.ok(new Date(events[i - 1].timestamp) <= new Date(events[i].timestamp));
    }
  });
});

describe("generateUserJourney", () => {
  it("returns complete journey: register -> onboarding -> recommend -> dialog -> tryon -> save", () => {
    const user = generateSeedUser(1);
    const journey = generateUserJourney(user);
    assert.ok(Array.isArray(journey));
    assert.ok(journey.length >= 9, `expected >=9 steps, got ${journey.length}`);

    const actions = journey.map((s) => s.action);
    assert.ok(actions.includes("register"));
    assert.ok(actions.includes("onboarding_scene"));
    assert.ok(actions.includes("view_recommendation"));
    assert.ok(actions.includes("chat_with_yiyi"));
    assert.ok(actions.includes("try_on"));
    assert.ok(actions.includes("save_outfit"));
  });

  it("share step is probabilistic", () => {
    let hasShare = false;
    let noShare = false;
    for (let i = 0; i < 30; i++) {
      const user = generateSeedUser(i);
      const journey = generateUserJourney(user);
      if (journey.some((s) => s.action === "share")) hasShare = true;
      else noShare = true;
      if (hasShare && noShare) break;
    }
    assert.ok(hasShare, "some journeys should include share");
    assert.ok(noShare, "some journeys should not include share");
  });
});

describe("generateSatisfactionScore", () => {
  it("returns number between 3.5 and 5.0", () => {
    const user = generateSeedUser(1);
    const events = generateBehaviorEvents(user);
    const score = generateSatisfactionScore(events);
    assert.ok(typeof score === "number");
    assert.ok(score >= 3.5 && score <= 5.0, `expected 3.5-5.0, got ${score}`);
  });

  it("save_outfit and purchase increase score", () => {
    const positiveEvents = [{ type: "save_outfit" }, { type: "purchase" }, { type: "save_outfit" }];
    const negativeEvents = [{ type: "skip" }, { type: "skip" }, { type: "skip" }];
    const posScore = generateSatisfactionScore(positiveEvents);
    const negScore = generateSatisfactionScore(negativeEvents);
    assert.ok(posScore >= negScore, "positive events should score >= negative events");
  });
});

describe("generateRetentionData", () => {
  it("returns 7-day retention labels with percentages", () => {
    const users = Array.from({ length: 10 }, (_, i) => generateSeedUser(i + 1));
    const retention = generateRetentionData(users);
    assert.ok(retention.day1 >= 85 && retention.day1 <= 95);
    assert.ok(retention.day3 >= 65 && retention.day3 <= 80);
    assert.ok(retention.day7 >= 45 && retention.day7 <= 65);
    assert.ok(retention.day14 >= 30 && retention.day14 <= 50);
    assert.equal(retention.totalUsers, 10);
  });

  it("retention decreases over time", () => {
    const users = Array.from({ length: 10 }, (_, i) => generateSeedUser(i + 1));
    const r = generateRetentionData(users);
    assert.ok(r.day1 >= r.day3);
    assert.ok(r.day3 >= r.day7);
    assert.ok(r.day7 >= r.day14);
  });
});
