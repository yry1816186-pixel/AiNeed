#!/bin/bash

# ============================================
# xuno Security Check Script
# ============================================
# This script checks for common security issues
# Run: bash scripts/security-check.sh
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

echo "========================================"
echo "xuno Security Check"
echo "========================================"
echo ""

# Get the project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Function to print status
print_status() {
    if [ "$1" -eq 0 ]; then
        echo -e "${GREEN}[PASS]${NC} $2"
    else
        echo -e "${RED}[FAIL]${NC} $2"
        ((ERRORS++))
    fi
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    ((WARNINGS++))
}

# ============================================
# Check 1: .env file in .gitignore
# ============================================
echo "--- Checking .gitignore ---"

if grep -q "^\.env$" .gitignore 2>/dev/null || grep -q "^\.env\s*$" .gitignore 2>/dev/null; then
    print_status 0 ".env is in .gitignore"
else
    print_status 1 ".env is NOT in .gitignore - CRITICAL SECURITY ISSUE!"
fi

# Check for .env.* patterns
if grep -q "\.env\.\*\.local" .gitignore 2>/dev/null || grep -q "\.env\*\.local" .gitignore 2>/dev/null; then
    print_status 0 ".env.*.local patterns are in .gitignore"
else
    print_warning ".env.*.local patterns not found in .gitignore"
fi

# ============================================
# Check 2: Weak JWT Secret
# ============================================
echo ""
echo "--- Checking JWT Secret ---"

if [ -f .env ]; then
    JWT_SECRET=$(grep "^JWT_SECRET=" .env | cut -d'=' -f2-)

    if [ -z "$JWT_SECRET" ]; then
        print_status 1 "JWT_SECRET is not set"
    elif [ ${#JWT_SECRET} -lt 32 ]; then
        print_status 1 "JWT_SECRET is too short (${#JWT_SECRET} chars, minimum 32)"
    elif [[ "$JWT_SECRET" == *"change"* ]] || [[ "$JWT_SECRET" == *"dev"* ]] || [[ "$JWT_SECRET" == *"test"* ]]; then
        print_status 1 "JWT_SECRET contains weak/insecure value"
    else
        print_status 0 "JWT_SECRET appears secure (${#JWT_SECRET} characters)"
    fi
else
    print_warning ".env file not found"
fi

# ============================================
# Check 3: Default Database Password
# ============================================
echo ""
echo "--- Checking Database Password ---"

if [ -f .env ]; then
    DB_URL=$(grep "^DATABASE_URL=" .env | cut -d'=' -f2-)

    if [[ "$DB_URL" == *"postgres:postgres@"* ]]; then
        print_status 1 "Database uses default password 'postgres'"
    elif [ -n "$DB_URL" ]; then
        print_status 0 "Database password is not default"
    fi
fi

# ============================================
# Check 4: Default MinIO Credentials
# ============================================
echo ""
echo "--- Checking MinIO Credentials ---"

if [ -f .env ]; then
    MINIO_ACCESS=$(grep "^MINIO_ACCESS_KEY=" .env | cut -d'=' -f2-)
    MINIO_SECRET=$(grep "^MINIO_SECRET_KEY=" .env | cut -d'=' -f2-)

    if [ "$MINIO_ACCESS" == "minioadmin" ] || [ "$MINIO_SECRET" == "minioadmin" ]; then
        print_status 1 "MinIO uses default credentials"
    elif [ -n "$MINIO_ACCESS" ] && [ -n "$MINIO_SECRET" ]; then
        print_status 0 "MinIO credentials are not default"
    fi
fi

# ============================================
# Check 5: Hardcoded Secrets in docker-compose.yml
# ============================================
echo ""
echo "--- Checking docker-compose.yml ---"

if [ -f docker-compose.yml ]; then
    # Check for hardcoded passwords
    if grep -q "POSTGRES_PASSWORD: postgres$" docker-compose.yml; then
        print_status 1 "docker-compose.yml has hardcoded POSTGRES_PASSWORD"
    else
        print_status 0 "POSTGRES_PASSWORD uses environment variable"
    fi

    if grep -q "MINIO_ROOT_USER: minioadmin" docker-compose.yml || grep -q "MINIO_ROOT_PASSWORD: minioadmin" docker-compose.yml; then
        print_status 1 "docker-compose.yml has hardcoded MinIO credentials"
    else
        print_status 0 "MinIO credentials use environment variables"
    fi

    if grep -q "JWT_SECRET: your-production-secret" docker-compose.yml || grep -q "JWT_SECRET: change-me" docker-compose.yml; then
        print_status 1 "docker-compose.yml has weak JWT_SECRET placeholder"
    else
        print_status 0 "JWT_SECRET uses environment variable"
    fi
fi

# ============================================
# Check 6: Sensitive Files
# ============================================
echo ""
echo "--- Checking for Sensitive Files ---"

SENSITIVE_FILES=(
    ".env"
    "*.pem"
    "*.key"
    "*_key.pem"
    "credentials.json"
    "kaggle.json"
)

for pattern in "${SENSITIVE_FILES[@]}"; do
    if ls $pattern 1>/dev/null 2>&1; then
        print_warning "Found sensitive file pattern: $pattern (ensure it's in .gitignore)"
    fi
done

print_status 0 "Sensitive file check complete"

# ============================================
# Check 7: OpenAI API Key Format
# ============================================
echo ""
echo "--- Checking API Keys ---"

if [ -f .env ]; then
    OPENAI_KEY=$(grep "^OPENAI_API_KEY=" .env | cut -d'=' -f2-)

    if [ -n "$OPENAI_KEY" ]; then
        if [[ "$OPENAI_KEY" == *"your"* ]] || [[ "$OPENAI_KEY" == *"sk-placeholder"* ]] || [[ "$OPENAI_KEY" == *"sk-your"* ]]; then
            print_warning "OPENAI_API_KEY appears to be a placeholder"
        elif [[ "$OPENAI_KEY" =~ ^sk- ]]; then
            print_status 0 "OPENAI_API_KEY format looks valid"
        else
            print_warning "OPENAI_API_KEY format may be invalid"
        fi
    fi
fi

# ============================================
# Summary
# ============================================
echo ""
echo "========================================"
echo "Security Check Summary"
echo "========================================"
echo -e "Errors:   ${RED}$ERRORS${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}All security checks passed!${NC}"
    exit 0
else
    echo -e "${RED}Security issues found. Please fix them before deploying!${NC}"
    exit 1
fi
