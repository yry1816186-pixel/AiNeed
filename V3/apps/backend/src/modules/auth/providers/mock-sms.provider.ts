import { Injectable, Logger } from '@nestjs/common';
import { ISmsProvider } from './sms-provider.interface';

@Injectable()
export class MockSmsProvider implements ISmsProvider {
  private readonly logger = new Logger(MockSmsProvider.name);

  async sendCode(phone: string, code: string): Promise<void> {
    this.logger.log(`[MockSMS] -> ${phone}: ${code}`);
  }
}
