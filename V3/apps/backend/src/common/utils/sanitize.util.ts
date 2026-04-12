const XSS_PATTERNS = /<\s*\/?\s*(script|iframe|object|embed|form|input|textarea|select|button|link|style|meta|base|svg|math|applet|body|html|head)\b[^>]*>/gi;
const EVENT_HANDLER_PATTERN = /\bon\w+\s*=\s*["'][^"']*["']/gi;
const JAVASCRIPT_URL_PATTERN = /href\s*=\s*["']\s*javascript:/gi;
const DATA_URL_PATTERN = /src\s*=\s*["']\s*data:text\/html/gi;

export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== 'string') {
    return input;
  }

  let sanitized = input;

  sanitized = sanitized.replace(XSS_PATTERNS, '');
  sanitized = sanitized.replace(EVENT_HANDLER_PATTERN, '');
  sanitized = sanitized.replace(JAVASCRIPT_URL_PATTERN, 'href="about:blank"');
  sanitized = sanitized.replace(DATA_URL_PATTERN, 'src="about:blank"');

  return sanitized;
}

export function sanitizePlainText(input: string): string {
  if (!input || typeof input !== 'string') {
    return input;
  }

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
