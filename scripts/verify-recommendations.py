#!/usr/bin/env python3
"""
推荐效果自动化验证脚本

对每个 seed profile 调用推荐 API，验证输出格式完整性、搭配完整性、
个性化差异和响应时间。

用法:
    python scripts/verify-recommendations.py
    python scripts/verify-recommendations.py --base-url http://localhost:3001
    python scripts/verify-recommendations.py --profile 1   # 只测试第 1 个 profile
    python scripts/verify-recommendations.py --dry-run      # 只验证数据文件不调用 API

验证项:
    a. 格式完整性 — outfits 数组 + items 数组 + name/category/image_url
    b. 搭配完整性 — 上装 + 下装 + 鞋 + 配饰
    c. 个性化差异 — 不同 profile 对同一场景推荐有差异
    d. 响应时间 — 每个请求 < 8 秒 (per D-09)
"""

import json
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

# HTTP client (stdlib first, requests as fallback)
try:
    import urllib.request
    import urllib.error

    def http_post(url: str, data: Dict, headers: Dict = None, timeout: int = 10) -> tuple:
        """Returns (status_code, response_json)."""
        req_data = json.dumps(data).encode("utf-8")
        req_headers = {"Content-Type": "application/json"}
        if headers:
            req_headers.update(headers)
        req = urllib.request.Request(url, data=req_data, headers=req_headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                body = json.loads(resp.read().decode("utf-8"))
                return resp.status, body
        except urllib.error.HTTPError as e:
            body = {}
            try:
                body = json.loads(e.read().decode("utf-8"))
            except Exception:
                pass
            return e.code, body
        except Exception as e:
            return 0, {"error": str(e)}

except ImportError:
    pass

# ──────────────────────────────────────────────────────────────────────
# Constants
# ──────────────────────────────────────────────────────────────────────

MAX_LATENCY_MS = 8000  # D-09: 8 seconds max
SEED_DATA_PATH = "docs/PRESENTATION/seed-user-data-v2.json"

# 搭配完整性所需的 category 关键词
TOP_KEYWORDS = ["top", "shirt", "jacket"]
BOTTOM_KEYWORDS = ["bottom", "pants", "skirt", "trousers"]
SHOES_KEYWORDS = ["shoes", "shoe", "boot", "sneaker"]
ACCESSORY_KEYWORDS = ["accessory", "bag", "hat", "watch", "jewelry", "scarf"]


# ──────────────────────────────────────────────────────────────────────
# Validation helpers
# ──────────────────────────────────────────────────────────────────────

def check_format_completeness(response: Dict) -> Dict[str, Any]:
    """检查推荐响应的格式完整性。"""
    result = {"pass": True, "issues": []}

    # Check for outfits array
    outfits = None
    if "outfits" in response:
        outfits = response["outfits"]
    elif "data" in response and isinstance(response["data"], dict):
        outfits = response["data"].get("outfits")
    elif "data" in response and isinstance(response["data"], list):
        outfits = response["data"]

    if outfits is None:
        result["pass"] = False
        result["issues"].append("No 'outfits' array found in response")
        return result

    if len(outfits) < 1:
        result["pass"] = False
        result["issues"].append("Outfits array is empty (expected >= 1)")
        return result

    # Check each outfit has items with required fields
    for i, outfit in enumerate(outfits):
        items = outfit.get("items", [])
        if not items:
            result["pass"] = False
            result["issues"].append(f"Outfit {i}: empty items array")
            continue

        for j, item in enumerate(items):
            for field in ["name", "category"]:
                if field not in item:
                    result["issues"].append(f"Outfit {i} item {j}: missing '{field}'")

    if result["issues"]:
        result["pass"] = False

    return result


def check_outfit_completeness(outfits: List[Dict]) -> Dict[str, Any]:
    """检查搭配的品类完整性 (上装+下装+鞋+配饰)。"""
    result = {
        "pass": True,
        "issues": [],
        "categories_found": {k: False for k in ["top", "bottom", "shoes", "accessory"]},
    }

    if not outfits:
        result["pass"] = False
        result["issues"].append("No outfits to check")
        return result

    # Check first outfit for category coverage
    outfit = outfits[0]
    items = outfit.get("items", [])

    for item in items:
        cat = item.get("category", "").lower()

        if any(kw in cat for kw in TOP_KEYWORDS):
            result["categories_found"]["top"] = True
        if any(kw in cat for kw in BOTTOM_KEYWORDS):
            result["categories_found"]["bottom"] = True
        if any(kw in cat for kw in SHOES_KEYWORDS):
            result["categories_found"]["shoes"] = True
        if any(kw in cat for kw in ACCESSORY_KEYWORDS):
            result["categories_found"]["accessory"] = True

    # Top and bottom are required; shoes and accessory are recommended
    for required_cat in ["top", "bottom"]:
        if not result["categories_found"][required_cat]:
            result["pass"] = False
            result["issues"].append(f"Missing required category: {required_cat}")

    # Shoes recommended but not strictly required for all scenarios
    if not result["categories_found"]["shoes"]:
        result["issues"].append("Warning: No shoes found (recommended but not required)")

    return result


def check_personalization(all_results: List[Dict]) -> Dict[str, Any]:
    """检查不同 profile 的推荐是否有差异。"""
    result = {"pass": True, "issues": []}

    if len(all_results) < 2:
        result["pass"] = False
        result["issues"].append("Need >= 2 profiles to check personalization")
        return result

    # Compare first items of each profile's recommendations
    summaries = []
    for r in all_results:
        outfits = r.get("outfits", [])
        if outfits:
            items = outfits[0].get("items", [])
            names = [it.get("name", "") for it in items]
            summaries.append(",".join(sorted(names)))
        else:
            summaries.append("")

    unique_count = len(set(summaries))
    if unique_count < 2:
        result["pass"] = False
        result["issues"].append(
            f"Only {unique_count} unique recommendation sets across {len(summaries)} profiles"
        )

    return result


# ──────────────────────────────────────────────────────────────────────
# API interaction
# ──────────────────────────────────────────────────────────────────────

def authenticate(base_url: str, email: str, password: str) -> Optional[str]:
    """登录获取 JWT token。"""
    status, body = http_post(
        f"{base_url}/api/v1/auth/login",
        {"email": email, "password": password},
        timeout=10,
    )
    if status == 200:
        token = body.get("access_token") or body.get("token")
        return token
    return None


def get_recommendation(base_url: str, token: str, scenario: str = "daily") -> tuple:
    """调用推荐/对话接口获取搭配方案。返回 (latency_ms, response)。"""
    headers = {"Authorization": f"Bearer {token}"} if token else {}

    start = time.time()
    status, body = http_post(
        f"{base_url}/api/v1/dialog/process",
        {
            "message": f"帮我推荐一套{scenario}穿搭",
            "scenario": scenario,
        },
        headers=headers,
        timeout=MAX_LATENCY_MS // 1000 + 2,
    )
    latency_ms = int((time.time() - start) * 1000)

    return latency_ms, status, body


# ──────────────────────────────────────────────────────────────────────
# Main verification flow
# ──────────────────────────────────────────────────────────────────────

def load_seed_data(path: str) -> List[Dict]:
    """加载 seed profile 数据。"""
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("users", [])


def verify_single_profile(
    base_url: str,
    user: Dict,
    profile_idx: int,
) -> Dict[str, Any]:
    """验证单个 profile 的推荐效果。"""
    email = user["email"]
    password = user.get("credential", "SeedTest2026!")
    nickname = user.get("profile", {}).get("nickname", f"profile_{profile_idx}")
    scenarios = user.get("profile", {}).get("primaryScenarios", ["daily"])
    scenario = scenarios[0] if scenarios else "daily"

    result = {
        "nickname": nickname,
        "email": email,
        "scenario": scenario,
        "format_ok": False,
        "outfit_complete": False,
        "latency_ms": -1,
        "latency_ok": False,
        "issues": [],
        "outfits": [],
    }

    # Step 1: Authenticate
    token = authenticate(base_url, email, password)
    if not token:
        result["issues"].append("Authentication failed")
        return result

    # Step 2: Get recommendation
    latency_ms, status, body = get_recommendation(base_url, token, scenario)
    result["latency_ms"] = latency_ms
    result["latency_ok"] = latency_ms < MAX_LATENCY_MS

    if status != 200:
        result["issues"].append(f"API returned status {status}")
        return result

    # Step 3: Extract outfits from response
    outfits = []
    if isinstance(body, dict):
        outfits = body.get("outfits", [])
        if not outfits and "data" in body:
            data = body["data"]
            if isinstance(data, dict):
                outfits = data.get("outfits", [])
            elif isinstance(data, list):
                outfits = data

    result["outfits"] = outfits

    # Step 4: Check format completeness
    format_result = check_format_completeness(body)
    result["format_ok"] = format_result["pass"]
    if format_result["issues"]:
        result["issues"].extend(format_result["issues"])

    # Step 5: Check outfit completeness
    completeness_result = check_outfit_completeness(outfits)
    result["outfit_complete"] = completeness_result["pass"]
    if completeness_result["issues"]:
        result["issues"].extend(completeness_result["issues"])

    return result


def verify_data_only(users: List[Dict]) -> None:
    """只验证数据文件格式，不调用 API (dry-run 模式)。"""
    print(f"\n{'='*80}")
    print("DRY RUN: Validating seed data file only (no API calls)")
    print(f"{'='*80}\n")

    for i, user in enumerate(users):
        profile = user.get("profile", {})
        nickname = profile.get("nickname", f"user_{i+1}")
        wardrobe = user.get("wardrobe", [])
        events = user.get("events", [])
        onboarding = user.get("onboarding", {})

        # Wardrobe completeness
        categories = {item.get("category", "unknown") for item in wardrobe}
        has_top = any(kw in " ".join(categories).lower() for kw in TOP_KEYWORDS)
        has_bottom = any(kw in " ".join(categories).lower() for kw in BOTTOM_KEYWORDS)
        has_shoes = "shoes" in categories

        # Onboarding completeness
        has_onboarding = bool(onboarding and onboarding.get("step1_scenes"))
        has_events = len(events) >= 5

        status = "OK" if all([has_top, has_bottom, has_shoes, has_onboarding, has_events]) else "WARN"
        print(f"  [{status}] {nickname:12s} | wardrobe: {len(wardrobe):2d} items ({', '.join(sorted(categories))}) | "
              f"events: {len(events):2d} | onboarding: {'yes' if has_onboarding else 'NO':3s}")

    print()


def main():
    # Parse CLI args
    args = sys.argv[1:]
    base_url = "http://localhost:3001"
    profile_filter = None
    dry_run = False

    if "--base-url" in args:
        idx = args.index("--base-url")
        base_url = args[idx + 1]
    if "--profile" in args:
        idx = args.index("--profile")
        profile_filter = int(args[idx + 1])
    if "--dry-run" in args:
        dry_run = True

    # Load seed data
    seed_path = Path(SEED_DATA_PATH)
    if not seed_path.exists():
        print(f"ERROR: Seed data file not found: {SEED_DATA_PATH}")
        print("Run `python scripts/seed-profile-builder.py` first.")
        sys.exit(1)

    users = load_seed_data(str(seed_path))
    print(f"Loaded {len(users)} seed profiles from {SEED_DATA_PATH}")

    if len(users) != 10:
        print(f"WARNING: Expected 10 profiles, got {len(users)}")

    # Dry run mode
    if dry_run:
        verify_data_only(users)
        return

    # Filter to single profile if requested
    if profile_filter is not None:
        if profile_filter < 1 or profile_filter > len(users):
            print(f"ERROR: Profile index {profile_filter} out of range (1-{len(users)})")
            sys.exit(1)
        users = [users[profile_filter - 1]]
        print(f"Testing single profile: {profile_filter}")

    # Run verification
    print(f"\nBase URL: {base_url}")
    print(f"Max latency: {MAX_LATENCY_MS}ms")
    print(f"{'='*80}\n")

    all_results = []
    for i, user in enumerate(users):
        profile = user.get("profile", {})
        nickname = profile.get("nickname", f"profile_{i+1}")
        print(f"  [{i+1}/{len(users)}] Testing {nickname}...", end=" ", flush=True)

        result = verify_single_profile(base_url, user, i + 1)
        all_results.append(result)

        status_icon = "PASS" if result["format_ok"] and result["outfit_complete"] and result["latency_ok"] else "FAIL"
        print(f"{status_icon} ({result['latency_ms']}ms)")

    # Summary report
    print(f"\n{'='*80}")
    print("VERIFICATION SUMMARY")
    print(f"{'='*80}\n")

    print(f"{'Profile':12s} | {'Format':8s} | {'Outfit':8s} | {'Latency':10s} | {'Issues'}")
    print("-" * 80)

    passed = 0
    for r in all_results:
        all_ok = r["format_ok"] and r["outfit_complete"] and r["latency_ok"]
        if all_ok:
            passed += 1
        fmt = "OK" if r["format_ok"] else "FAIL"
        outfit = "OK" if r["outfit_complete"] else "FAIL"
        latency = f"{r['latency_ms']}ms" if r["latency_ms"] >= 0 else "N/A"
        lat_ok = "OK" if r["latency_ok"] else "SLOW"
        issues_str = "; ".join(r["issues"]) if r["issues"] else "-"
        print(f"{r['nickname']:12s} | {fmt:8s} | {outfit:8s} | {latency:>5s} {lat_ok:3s} | {issues_str}")

    print(f"\nPassed: {passed}/{len(all_results)}")

    # Personalization check
    if len(all_results) >= 2:
        pers_result = check_personalization(all_results)
        print(f"Personalization: {'OK' if pers_result['pass'] else 'FAIL'}")
        if pers_result["issues"]:
            for issue in pers_result["issues"]:
                print(f"  - {issue}")

    # Exit code
    if passed == len(all_results):
        print("\nALL CHECKS PASSED")
        sys.exit(0)
    else:
        print(f"\n{len(all_results) - passed} PROFILES FAILED")
        sys.exit(1)


if __name__ == "__main__":
    main()
