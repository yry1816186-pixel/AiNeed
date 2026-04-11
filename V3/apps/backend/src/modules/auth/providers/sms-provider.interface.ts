export interface ISmsProvider {
  sendCode(phone: string, code: string): Promise<void>;
}
