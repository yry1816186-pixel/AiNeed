---
phase: 10-production-launch-competition
plan: 03
subsystem: mobile-android
tags: [android, keystore, app-store, metadata, release-build]

requires:
  - phase: 09-monetization-community-sharing
    provides: 完整移动端应用
provides:
  - 4 家商店 metadata (小米/华为/OPPO/vivo)
  - 截图策略文档 (6 张)
  - Gradle release 签名配置 (无 hardcoded 密码)
  - Keystore 生成指引 (需人工执行)
affects: []

tech-stack:
  added: []
  patterns: [env var password injection, per-store metadata]

key-files:
  created:
    - docs/app-store/xiaomi-metadata.json
    - docs/app-store/huawei-metadata.json
    - docs/app-store/oppo-metadata.json
    - docs/app-store/vivo-metadata.json
    - docs/app-store/screenshot-strategy.md
  modified:
    - apps/mobile/android/gradle.properties

key-decisions:
  - "Release 密码通过 XUNO_KEYSTORE_PASSWORD / XUNO_KEY_PASSWORD 环境变量注入, build.gradle 无 fallback"
  - "华为 metadata 使用 agpFormat:true (D-07)"
  - "4 家商店统一 1080x1920 分辨率, 华为适配 1080x2160 全面屏"

patterns-established:
  - "Android 签名安全: 环境变量注入密码, gradle.properties 仅存非敏感配置"

requirements-completed: [PRD-05]

duration: 5min
completed: 2026-04-26
---

# Phase 10 Plan 03: Android APK 构建 + 应用商店 metadata Summary

4 家中国 Android 应用商店 metadata + 截图策略 + Gradle release 签名配置

## Performance

- **Duration:** 5 min
- **Tasks:** 1/2 (Task 1b complete; Task 1a keystore 需人工执行)
- **Files modified:** 6

## Accomplishments

- 4 家商店 metadata JSON 创建 (小米/华为/OPPO/vivo)
- 截图策略文档定义 6 张截图覆盖核心功能
- gradle.properties 添加 RELEASE_STORE_FILE 和 RELEASE_KEY_ALIAS
- build.gradle 通过 System.getenv() 注入密码, 无 hardcoded fallback

## Task Commits

1. **Task 1b: Gradle 签名配置 + 4 家商店 metadata + 截图策略** - commit (feat)

## Files Created/Modified

- `apps/mobile/android/gradle.properties` - 添加 RELEASE_STORE_FILE=xuno-release.keystore, RELEASE_KEY_ALIAS=xuno
- `docs/app-store/xiaomi-metadata.json` - 小米应用商店 metadata (com.xuno.app, 生活/购物)
- `docs/app-store/huawei-metadata.json` - 华为应用市场 metadata (agpFormat:true, developerName)
- `docs/app-store/oppo-metadata.json` - OPPO 软件商店 metadata (minSdkVersion:24, targetSdkVersion:34)
- `docs/app-store/vivo-metadata.json` - vivo 应用商店 metadata (minSdkVersion:24, targetSdkVersion:34)
- `docs/app-store/screenshot-strategy.md` - 6 张截图策略 + 品牌装饰规范 + 分辨率要求

## Decisions Made

- 环境变量注入密码, 不使用 gradle.properties 存储敏感信息
- 华为适配更高分辨率 (1080x2160) 满足全面屏设备
- 所有 metadata 使用统一中文描述, 核心功能列表一致

## Deviations from Plan

None

## Pending (Human Action Required)

**Task 1a: Keystore 生成** - 需要人工执行:

1. 设置 XUNO_KEYSTORE_PASSWORD 和 XUNO_KEY_PASSWORD 环境变量
2. 运行 keytool 命令生成 xuno-release.keystore
3. 备份 keystore 到至少 2 个安全位置

---

_Phase: 10-production-launch-competition_
_Completed: 2026-04-26_
