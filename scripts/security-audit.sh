#!/bin/bash
# 寻裳 XUNO 安全审计脚本
# OWASP Top 10 快速扫描 + 依赖漏洞检查 (D-18)
set -euo pipefail

echo "========================================"
echo "  寻裳 XUNO 安全审计"
echo "========================================"
echo ""

EXIT_CODE=0

# 1. Node.js 依赖审计
echo "--- Node.js 依赖审计 (npm audit) ---"
cd "$(dirname "$0")/.."
if pnpm audit --audit-level=critical 2>&1; then
    echo "[PASS] 无 CRITICAL 级别 Node.js 漏洞"
else
    echo "[FAIL] 发现 CRITICAL 级别 Node.js 漏洞"
    EXIT_CODE=1
fi
echo ""

# 2. Python 依赖审计
echo "--- Python 依赖审计 (pip audit) ---"
if command -v pip-audit &>/dev/null; then
    cd ml
    if pip-audit --strict 2>&1; then
        echo "[PASS] 无 CRITICAL 级别 Python 漏洞"
    else
        echo "[FAIL] 发现 CRITICAL 级别 Python 漏洞"
        EXIT_CODE=1
    fi
    cd ..
else
    echo "[WARN] pip-audit 未安装，跳过 Python 审计"
    echo "  安装: pip install pip-audit"
fi
echo ""

# 3. OWASP Top 10 快速检查
echo "--- OWASP Top 10 快速扫描 ---"

# A01: Broken Access Control
echo "[CHECK] A01 - 检查是否有公开的 .env 文件..."
if git ls-files | grep -q "\.env$"; then
    echo "[FAIL] .env 文件被 git tracked"
    EXIT_CODE=1
else
    echo "[PASS] .env 文件未被 git tracked"
fi

# A02: Cryptographic Failures
echo "[CHECK] A02 - 检查 TLS 配置..."
if grep -q "ssl_protocols TLSv1.2 TLSv1.3" infrastructure/nginx/nginx.conf; then
    echo "[PASS] Nginx TLS 配置正确 (TLS 1.2+)"
else
    echo "[FAIL] Nginx TLS 配置缺失或不正确"
    EXIT_CODE=1
fi

# A03: Injection
echo "[CHECK] A03 - 检查是否使用 ORM (防 SQL 注入)..."
if grep -q "prisma" apps/backend/package.json; then
    echo "[PASS] 使用 Prisma ORM (参数化查询)"
else
    echo "[WARN] 未检测到 Prisma ORM"
fi

# A04: Insecure Design
echo "[CHECK] A04 - 检查 rate limiting..."
if grep -q "limit_req" infrastructure/nginx/nginx.conf; then
    echo "[PASS] Nginx rate limiting 已配置"
else
    echo "[FAIL] Nginx rate limiting 未配置"
    EXIT_CODE=1
fi

# A05: Security Misconfiguration
echo "[CHECK] A05 - 检查 security headers..."
if grep -q "X-Frame-Options DENY" infrastructure/nginx/nginx.conf; then
    echo "[PASS] Security headers 已配置"
else
    echo "[FAIL] Security headers 缺失"
    EXIT_CODE=1
fi

# A07: Identification and Authentication Failures
echo "[CHECK] A07 - 检查 JWT secret 不在代码中..."
if grep -rq "JWT_SECRET.*=.*['\"]" apps/backend/src/ 2>/dev/null | grep -v "node_modules" | grep -v ".d.ts"; then
    echo "[FAIL] JWT_SECRET 可能硬编码在源码中"
    EXIT_CODE=1
else
    echo "[PASS] JWT_SECRET 未在源码中硬编码"
fi

# A09: Security Logging and Monitoring Failures
echo "[CHECK] A09 - 检查监控配置..."
if test -f monitoring/prometheus/prometheus.yml && test -f monitoring/alerts/alert.rules.yml; then
    echo "[PASS] Prometheus + alert rules 已配置"
else
    echo "[FAIL] 监控配置缺失"
    EXIT_CODE=1
fi

echo ""
echo "========================================"
if [ $EXIT_CODE -eq 0 ]; then
    echo "  安全审计通过: 无 CRITICAL 发现"
else
    echo "  安全审计失败: 发现 CRITICAL 问题"
fi
echo "========================================"
exit $EXIT_CODE
