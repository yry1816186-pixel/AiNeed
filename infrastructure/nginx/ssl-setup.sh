#!/usr/bin/env bash
# ============================================================
# SSL Certificate Setup Script for XUNO
# Uses Let's Encrypt / certbot to obtain TLS certificates
# ============================================================
set -euo pipefail

DOMAIN="${1:-xuno.ai}"
EMAIL="${2:-admin@xuno.ai}"
MODE="${3:-standalone}"

CERT_DIR="./infrastructure/nginx/certs"
WEBROOT_DIR="./infrastructure/nginx/certbot-webroot"

echo "=== XUNO SSL Certificate Setup ==="
echo "Domain: ${DOMAIN}"
echo "Email:  ${EMAIL}"
echo "Mode:   ${MODE}"
echo ""

# Ensure certbot is installed
if ! command -v certbot &> /dev/null; then
  echo "Installing certbot..."
  if command -v apt-get &> /dev/null; then
    sudo apt-get update -qq
    sudo apt-get install -y -qq certbot
  elif command -v yum &> /dev/null; then
    sudo yum install -y certbot
  elif command -v apk &> /dev/null; then
    sudo apk add certbot
  else
    echo "ERROR: Cannot install certbot automatically. Please install it manually."
    exit 1
  fi
fi

# Create directories
mkdir -p "${CERT_DIR}"
mkdir -p "${WEBROOT_DIR}"

# Obtain certificate
case "${MODE}" in
  standalone)
    echo "Obtaining certificate in standalone mode..."
    echo "NOTE: Port 80 must be free (stop Nginx if running)"
    sudo certbot certonly \
      --standalone \
      --non-interactive \
      --agree-tos \
      --email "${EMAIL}" \
      --domain "${DOMAIN}" \
      --domain "www.${DOMAIN}" \
      --cert-name "${DOMAIN}"
    ;;

  webroot)
    echo "Obtaining certificate in webroot mode..."
    sudo certbot certonly \
      --webroot \
      --webroot-path "${WEBROOT_DIR}" \
      --non-interactive \
      --agree-tos \
      --email "${EMAIL}" \
      --domain "${DOMAIN}" \
      --domain "www.${DOMAIN}" \
      --cert-name "${DOMAIN}"
    ;;

  *)
    echo "ERROR: Unknown mode '${MODE}'. Use 'standalone' or 'webroot'."
    exit 1
    ;;
esac

# Copy certificates to project directory
echo "Copying certificates to ${CERT_DIR}..."
sudo cp -r /etc/letsencrypt/live "${CERT_DIR}/" 2>/dev/null || true
sudo cp -r /etc/letsencrypt/archive "${CERT_DIR}/" 2>/dev/null || true
sudo cp -r /etc/letsencrypt/renewal "${CERT_DIR}/" 2>/dev/null || true

# Fix permissions
sudo chmod -R 755 "${CERT_DIR}"

# Setup auto-renewal cron job
echo "Setting up auto-renewal cron job..."
CRON_LINE="0 3 * * * certbot renew --quiet --deploy-hook \"cp -r /etc/letsencrypt/live ${CERT_DIR}/ && chmod -R 755 ${CERT_DIR}\""

if crontab -l 2>/dev/null | grep -q "certbot renew"; then
  echo "Cron job for certbot renewal already exists. Skipping."
else
  (crontab -l 2>/dev/null; echo "${CRON_LINE}") | crontab -
  echo "Cron job added: certificates will be checked for renewal daily at 3:00 AM."
fi

echo ""
echo "=== SSL Setup Complete ==="
echo "Certificate location: ${CERT_DIR}/live/${DOMAIN}/"
echo "Full chain: ${CERT_DIR}/live/${DOMAIN}/fullchain.pem"
echo "Private key: ${CERT_DIR}/live/${DOMAIN}/privkey.pem"
echo ""
echo "IMPORTANT: Add '${CERT_DIR}' to .gitignore to prevent committing certificates."
