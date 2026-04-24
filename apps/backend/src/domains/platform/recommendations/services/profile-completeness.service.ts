import { Injectable } from "@nestjs/common";

@Injectable()
export class ProfileCompletenessService {
  async getCompleteness(userId: string) {
    return { userId, completeness: 0, breakdown: {} };
  }
}
