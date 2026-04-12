const MINUTE = 60;
const HOUR = 3600;
const DAY = 86400;

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 11) return phone;
  return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
}

export function formatPrice(price: number): string {
  if (!Number.isFinite(price)) return '¥0.00';
  const yuan = price / 100;
  return `¥${yuan.toFixed(2)}`;
}

export function formatDate(date: string): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return date;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export function formatRelativeTime(date: string): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return date;
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 0) return '刚刚';
  if (diffSec < MINUTE) return '刚刚';
  if (diffSec < HOUR) return `${Math.floor(diffSec / MINUTE)}分钟前`;
  if (diffSec < DAY) return `${Math.floor(diffSec / HOUR)}小时前`;
  if (diffSec < DAY * 2) return '昨天';
  if (diffSec < DAY * 7) return `${Math.floor(diffSec / DAY)}天前`;
  if (diffSec < DAY * 30) return `${Math.floor(diffSec / (DAY * 7))}周前`;
  if (diffSec < DAY * 365) return `${Math.floor(diffSec / (DAY * 30))}个月前`;
  return `${Math.floor(diffSec / (DAY * 365))}年前`;
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let size = bytes;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  const formatted = unitIndex === 0 ? size.toString() : size.toFixed(1);
  return `${formatted} ${units[unitIndex]}`;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 11) return phone;
  return `${digits.slice(0, 3)}****${digits.slice(7)}`;
}
