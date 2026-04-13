export const PHONE_REGEX = /^1[3-9]\d{9}$/;

export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{8,32}$/;

export const PASSWORD_RULES = {
  minLength: 8,
  maxLength: 32,
  requireLowercase: true,
  requireUppercase: true,
  requireDigit: true,
  allowedSpecialChars: '!@#$%^&*()_+-=[]{}|;\':",./<>?',
} as const;

export const PASSWORD_ERROR_MSG = '密码必须为8-32位，包含大小写字母和数字';

export const NICKNAME_RULES = {
  minLength: 1,
  maxLength: 50,
} as const;

export const PHONE_ERROR_MSG = '请输入有效的中国大陆手机号码';

export const EMAIL_ERROR_MSG = '请输入有效的邮箱地址';

export function isValidPhone(phone: string): boolean {
  return PHONE_REGEX.test(phone);
}

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export function isValidPassword(password: string): boolean {
  return PASSWORD_REGEX.test(password);
}
