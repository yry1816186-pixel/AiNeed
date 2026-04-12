export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export type ValidatorFn = (value: unknown) => ValidationResult;

const PHONE_REGEX = /^1[3-9]\d{9}$/;
const CODE_REGEX = /^\d{6}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NICKNAME_REGEX = /^[\u4e00-\u9fa5a-zA-Z0-9_·\-]{2,20}$/;
const SPECIAL_CHARS_REGEX = /[!@#$%^&*()+=\[\]{};':"\\|,<>/?~`]/;
const PRICE_REGEX = /^(0|[1-9]\d*)(\.\d{1,2})?$/;

export function validatePhone(phone: string): ValidationResult {
  if (!phone) return { valid: false, message: '请输入手机号' };
  const trimmed = phone.replace(/\s/g, '');
  if (!PHONE_REGEX.test(trimmed)) {
    return { valid: false, message: '请输入有效的11位手机号' };
  }
  return { valid: true };
}

export function validateCode(code: string): ValidationResult {
  if (!code) return { valid: false, message: '请输入验证码' };
  if (!CODE_REGEX.test(code)) {
    return { valid: false, message: '验证码为6位数字' };
  }
  return { valid: true };
}

export function validateNickname(name: string): ValidationResult {
  if (!name) return { valid: false, message: '请输入昵称' };
  if (name.length < 2) return { valid: false, message: '昵称至少2个字符' };
  if (name.length > 20) return { valid: false, message: '昵称最多20个字符' };
  if (SPECIAL_CHARS_REGEX.test(name)) {
    return { valid: false, message: '昵称不能包含特殊字符' };
  }
  return { valid: true };
}

export function validateEmail(email: string): ValidationResult {
  if (!email) return { valid: false, message: '请输入邮箱' };
  if (!EMAIL_REGEX.test(email)) {
    return { valid: false, message: '请输入有效的邮箱地址' };
  }
  return { valid: true };
}

export function validatePassword(password: string): ValidationResult {
  if (!password) return { valid: false, message: '请输入密码' };
  if (password.length < 8) return { valid: false, message: '密码至少8个字符' };
  if (password.length > 32) return { valid: false, message: '密码最多32个字符' };
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  if (!hasLetter || !hasDigit) {
    return { valid: false, message: '密码需包含字母和数字' };
  }
  return { valid: true };
}

export function required(value: unknown, label: string): ValidationResult {
  if (value === null || value === undefined) {
    return { valid: false, message: `${label}不能为空` };
  }
  if (typeof value === 'string' && value.trim() === '') {
    return { valid: false, message: `${label}不能为空` };
  }
  if (Array.isArray(value) && value.length === 0) {
    return { valid: false, message: `请选择${label}` };
  }
  return { valid: true };
}

export function minLength(value: string, min: number, label: string): ValidationResult {
  if (!value) return { valid: false, message: `${label}不能为空` };
  if (value.length < min) {
    return { valid: false, message: `${label}至少${min}个字符` };
  }
  return { valid: true };
}

export function maxLength(value: string, max: number, label: string): ValidationResult {
  if (value && value.length > max) {
    return { valid: false, message: `${label}最多${max}个字符` };
  }
  return { valid: true };
}

export function validatePrice(price: string): ValidationResult {
  if (!price) return { valid: false, message: '请输入价格' };
  if (!PRICE_REGEX.test(price)) {
    return { valid: false, message: '请输入有效价格（正数，最多2位小数）' };
  }
  const num = parseFloat(price);
  if (num <= 0) return { valid: false, message: '价格必须大于0' };
  return { valid: true };
}

export function validateTags(tags: string[], minCount: number, label: string): ValidationResult {
  if (tags.length < minCount) {
    return { valid: false, message: `请至少选择${minCount}个${label}` };
  }
  return { valid: true };
}

export interface Address {
  province?: string;
  city?: string;
  district?: string;
  detail?: string;
}

export function validateAddress(address: Address): ValidationResult {
  if (!address) return { valid: false, message: '请填写地址' };
  if (!address.province) return { valid: false, message: '请选择省份' };
  if (!address.city) return { valid: false, message: '请选择城市' };
  if (!address.district) return { valid: false, message: '请选择区县' };
  if (!address.detail || address.detail.trim() === '') {
    return { valid: false, message: '请填写详细地址' };
  }
  if (address.detail.trim().length < 5) {
    return { valid: false, message: '详细地址至少5个字符' };
  }
  return { valid: true };
}

export function compose(validators: ValidatorFn[]): (value: unknown) => ValidationResult {
  return (value: unknown): ValidationResult => {
    for (const validator of validators) {
      const result = validator(value);
      if (!result.valid) return result;
    }
    return { valid: true };
  };
}
