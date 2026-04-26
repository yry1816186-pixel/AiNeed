#!/usr/bin/env python3
"""
对话质量自动化检查脚本

对每个 seed profile 执行 4 个场景的对话测试，检查伊伊回复的质量。
验证禁用词过滤、回复长度、建议具体性、语气风格。

用法:
    python scripts/dialog-quality-check.py
    python scripts/dialog-quality-check.py --base-url http://localhost:3001
    python scripts/dialog-quality-check.py --profile 1   # 只测试第 1 个 profile
    python scripts/dialog-quality-check.py --dry-run      # 只检查禁用词规则不调用 API

检查场景:
    1. 日常推荐 — "今天穿什么？"
    2. 风格咨询 — "我适合什么风格？"
    3. 面试场景 — "明天面试互联网公司"
    4. 换装请求 — "换个颜色"

检查项:
    - 无禁用词 (亲~、根据算法分析、显瘦、遮肉 等)
    - 回复长度 <= 200 字
    - 包含具体建议 (不是泛泛而谈)
    - 语气温暖但有主见
"""

import json
import re
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

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

SEED_DATA_PATH = "docs/PRESENTATION/seed-user-data-v2.json"
MAX_REPLY_LENGTH = 200

# 场景定义
TEST_SCENARIOS = [
    {
        "name": "日常推荐",
        "message": "今天穿什么？",
        "check_specific_advice": True,
    },
    {
        "name": "风格咨询",
        "message": "我适合什么风格？",
        "check_body_positive": True,
    },
    {
        "name": "面试场景",
        "message": "明天面试互联网公司，产品经理岗位",
        "check_specific_advice": True,
    },
    {
        "name": "换装请求",
        "message": "换个颜色",
        "check_alternatives": True,
    },
]

# 禁用词列表 — 对应 BLOCKED_PATTERNS + BODY_NEGATIVE_PATTERNS
BANNED_WORDS = [
    # Persona banned nicknames
    r"亲[~～]",
    r"宝子",
    r"宝～",
    r"亲爱滴",
    r"亲爱的",
    # AI exposure
    r"系统推荐",
    r"算法分析",
    r"数据分析显示",
    r"模型为你",
    r"AI为你",
    # Body negative
    r"显瘦",
    r"遮肉",
    r"藏肉",
    r"适合你的体型",
    r"掩盖.*缺点",
]

# 具体建议的关键词（表示回复有实质内容而非泛泛而谈）
SPECIFIC_ADVICE_KEYWORDS = [
    "搭配", "上衣", "裤子", "裙子", "外套", "鞋", "颜色", "材质",
    "风格", "穿", "搭", "款式", "版型", "剪裁", "面料", "衬衫",
    "西装", "牛仔", "运动", "休闲", "正式", "约会", "面试", "通勤",
    "建议", "推荐", "选", "配", "试试", "比较适合",
]

# 替代方案关键词
ALTERNATIVE_KEYWORDS = [
    "换", "替代", "也可以", "另一个", "不如", "试试", "或者",
    "不同", "别的", "其他", "颜色", "款式", "风格",
]


# ──────────────────────────────────────────────────────────────────────
# Check functions
# ──────────────────────────────────────────────────────────────────────

def check_banned_words(reply: str) -> Dict[str, Any]:
    """检查回复是否包含禁用词。"""
    found = []
    for pattern in BANNED_WORDS:
        if re.search(pattern, reply):
            found.append(pattern)
    return {
        "pass": len(found) == 0,
        "found_patterns": found,
    }


def check_reply_length(reply: str) -> Dict[str, Any]:
    """检查回复长度是否在限制内。"""
    char_count = len(reply)
    return {
        "pass": char_count <= MAX_REPLY_LENGTH,
        "char_count": char_count,
    }


def check_specific_advice(reply: str) -> Dict[str, Any]:
    """检查回复是否包含具体建议。"""
    matched = [kw for kw in SPECIFIC_ADVICE_KEYWORDS if kw in reply]
    return {
        "pass": len(matched) >= 2,
        "matched_keywords": matched,
        "match_count": len(matched),
    }


def check_body_positive(reply: str) -> Dict[str, Any]:
    """检查回复是否包含体型负面词汇。"""
    body_negative = ["显瘦", "遮肉", "藏肉", "适合你的体型", "遮住你的", "修饰你的"]
    found = [word for word in body_negative if word in reply]
    return {
        "pass": len(found) == 0,
        "found_words": found,
    }


def check_alternatives(reply: str) -> Dict[str, Any]:
    """检查回复是否包含替代方案。"""
    matched = [kw for kw in ALTERNATIVE_KEYWORDS if kw in reply]
    return {
        "pass": len(matched) >= 1,
        "matched_keywords": matched,
    }


def check_tone(reply: str) -> Dict[str, Any]:
    """检查语气是否温暖但有主见。"""
    # Warm indicators
    warm_kw = ["我觉得", "依我看", "建议", "推荐", "试试", "可以", "搭配"]
    # Opinionated indicators
    opinion_kw = ["比较适合", "更适合", "推荐你", "不如", "建议选", "我会"]

    warm_count = sum(1 for kw in warm_kw if kw in reply)
    opinion_count = sum(1 for kw in opinion_kw if kw in reply)

    return {
        "pass": warm_count >= 1 or opinion_count >= 1,
        "warm_score": warm_count,
        "opinion_score": opinion_count,
    }


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
        return body.get("access_token") or body.get("token")
    return None


def send_dialog_message(base_url: str, token: str, message: str) -> tuple:
    """发送对话消息并获取回复。返回 (status, response_body)。"""
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    return http_post(
        f"{base_url}/api/v1/dialog/process",
        {"message": message},
        headers=headers,
        timeout=15,
    )


# ──────────────────────────────────────────────────────────────────────
# Main flow
# ──────────────────────────────────────────────────────────────────────

def load_seed_data(path: str) -> List[Dict]:
    """加载 seed profile 数据。"""
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("users", [])


def verify_scenario_reply(reply: str, scenario: Dict) -> Dict[str, Any]:
    """验证单个场景的回复质量。"""
    result = {
        "scenario": scenario["name"],
        "reply_length": len(reply),
        "checks": {},
    }

    # 1. Banned words check (always)
    result["checks"]["banned_words"] = check_banned_words(reply)

    # 2. Length check (always)
    result["checks"]["length"] = check_reply_length(reply)

    # 3. Tone check (always)
    result["checks"]["tone"] = check_tone(reply)

    # 4. Scenario-specific checks
    if scenario.get("check_specific_advice"):
        result["checks"]["specific_advice"] = check_specific_advice(reply)

    if scenario.get("check_body_positive"):
        result["checks"]["body_positive"] = check_body_positive(reply)

    if scenario.get("check_alternatives"):
        result["checks"]["alternatives"] = check_alternatives(reply)

    # Overall pass
    result["pass"] = all(check_result["pass"] for check_result in result["checks"].values())

    return result


def verify_single_profile(
    base_url: str,
    user: Dict,
    profile_idx: int,
) -> List[Dict[str, Any]]:
    """验证单个 profile 在所有场景下的对话质量。"""
    email = user["email"]
    password = user.get("credential", "SeedTest2026!")
    nickname = user.get("profile", {}).get("nickname", f"profile_{profile_idx}")

    results = []

    # Authenticate
    token = authenticate(base_url, email, password)
    if not token:
        for scenario in TEST_SCENARIOS:
            results.append({
                "scenario": scenario["name"],
                "nickname": nickname,
                "pass": False,
                "error": "Authentication failed",
                "checks": {},
            })
        return results

    # Test each scenario
    for scenario in TEST_SCENARIOS:
        status, body = send_dialog_message(base_url, token, scenario["message"])

        if status != 200:
            results.append({
                "scenario": scenario["name"],
                "nickname": nickname,
                "pass": False,
                "error": f"API returned status {status}",
                "checks": {},
            })
            continue

        # Extract reply text
        reply = ""
        if isinstance(body, dict):
            reply = body.get("reply", "")
            if not reply and "data" in body:
                reply = body["data"].get("reply", "")

        if not reply:
            results.append({
                "scenario": scenario["name"],
                "nickname": nickname,
                "pass": False,
                "error": "Empty reply",
                "checks": {},
            })
            continue

        # Verify reply quality
        result = verify_scenario_reply(reply, scenario)
        result["nickname"] = nickname
        result["reply_preview"] = reply[:60] + "..." if len(reply) > 60 else reply
        results.append(result)

    return results


def check_rules_only() -> None:
    """Dry-run: 只检查禁用词规则的完整性，不调用 API。"""
    print(f"\n{'='*80}")
    print("DRY RUN: Checking dialog engine rules (no API calls)")
    print(f"{'='*80}\n")

    # Check dialog_engine.py has the expected patterns
    engine_path = Path("ml/services/stylist/dialog_engine.py")
    if not engine_path.exists():
        print(f"ERROR: {engine_path} not found")
        return

    with open(engine_path, "r", encoding="utf-8") as f:
        content = f.read()

    print("Blocked patterns count:", content.count("re.compile(r"))
    print("Banned words to check:", len(BANNED_WORDS))
    print()

    # Simulate filter checks against sample replies
    sample_replies = [
        "我觉得你可以试试白色衬衫搭深色西裤，干净利落，很适合产品经理的面试。",
        "亲～这套搭配很显瘦哦，系统推荐你穿深色~",
        "遮住你的小肚子，显瘦效果很好！",
        "这套搭配适合你的体型，模型为你精心挑选。",
        "建议你换一个暖色系的上衣，比如米白或者浅灰，和你的气质很搭。",
        "数据分析显示你适合极简风格，根据算法分析，建议选择基础款。",
    ]

    print(f"{'Sample Reply':<50s} | {'Banned':6s} | {'Body-':6s} | {'Length':6s}")
    print("-" * 80)

    for reply in sample_replies:
        banned = check_banned_words(reply)
        body_pos = check_body_positive(reply)
        length = check_reply_length(reply)

        banned_status = "FAIL" if not banned["pass"] else "OK"
        body_status = "FAIL" if not body_pos["pass"] else "OK"
        length_status = "OK" if length["pass"] else "LONG"

        preview = reply[:47] + "..." if len(reply) > 50 else reply
        print(f"{preview:<50s} | {banned_status:6s} | {body_status:6s} | {length_status:6s}")

    print()


def main():
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

    # Dry run mode
    if dry_run:
        check_rules_only()
        return

    # Load seed data
    seed_path = Path(SEED_DATA_PATH)
    if not seed_path.exists():
        print(f"ERROR: Seed data file not found: {SEED_DATA_PATH}")
        sys.exit(1)

    users = load_seed_data(str(seed_path))
    print(f"Loaded {len(users)} seed profiles")

    # Filter to single profile if requested
    if profile_filter is not None:
        if profile_filter < 1 or profile_filter > len(users):
            print(f"ERROR: Profile index {profile_filter} out of range (1-{len(users)})")
            sys.exit(1)
        users = [users[profile_filter - 1]]
        print(f"Testing single profile: {profile_filter}")

    # Run verification
    print(f"\nBase URL: {base_url}")
    print(f"Testing {len(TEST_SCENARIOS)} scenarios per profile")
    print(f"{'='*80}\n")

    all_results = []
    for i, user in enumerate(users):
        nickname = user.get("profile", {}).get("nickname", f"profile_{i+1}")
        print(f"  [{i+1}/{len(users)}] Testing {nickname}...")

        profile_results = verify_single_profile(base_url, user, i + 1)
        all_results.extend(profile_results)

        for r in profile_results:
            status_icon = "PASS" if r["pass"] else "FAIL"
            print(f"    [{status_icon}] {r['scenario']}")

    # Summary report
    print(f"\n{'='*80}")
    print("DIALOG QUALITY CHECK SUMMARY")
    print(f"{'='*80}\n")

    print(f"{'Profile':12s} | {'Scenario':10s} | {'Banned':7s} | {'Length':7s} | {'Advice':7s} | {'Tone':5s} | {'Overall':7s}")
    print("-" * 90)

    passed = 0
    total = len(all_results)
    for r in all_results:
        checks = r.get("checks", {})
        banned = "OK" if checks.get("banned_words", {}).get("pass", True) else "FAIL"
        length = "OK" if checks.get("length", {}).get("pass", True) else "LONG"
        advice = "OK" if checks.get("specific_advice", checks.get("alternatives", checks.get("body_positive", {}))).get("pass", True) else "WEAK"
        tone = "OK" if checks.get("tone", {}).get("pass", True) else "FLAT"
        overall = "PASS" if r.get("pass", False) else "FAIL"

        if r.get("pass", False):
            passed += 1

        nickname = r.get("nickname", "?")[:12]
        scenario = r.get("scenario", "?")[:10]
        print(f"{nickname:12s} | {scenario:10s} | {banned:7s} | {length:7s} | {advice:7s} | {tone:5s} | {overall:7s}")

    print(f"\nPassed: {passed}/{total}")

    # Exit code
    if passed == total:
        print("\nALL DIALOG QUALITY CHECKS PASSED")
        sys.exit(0)
    else:
        print(f"\n{total - passed} CHECKS FAILED")
        sys.exit(1)


if __name__ == "__main__":
    main()
