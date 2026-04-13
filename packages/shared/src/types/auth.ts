export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  confirmPassword?: string;
  nickname?: string;
  phone?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    nickname?: string;
    avatar?: string;
    createdAt: string;
  };
  accessToken: string;
  token?: string;
  refreshToken: string;
}

export interface SmsCodePayload {
  phone: string;
  code: string;
}

export interface WechatLoginPayload {
  code: string;
  state?: string;
}

export interface RefreshTokenPayload {
  refreshToken: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
  confirmNewPassword?: string;
}
