import { Injectable } from "@nestjs/common";

@Injectable()
export class BodyMetricsService {
  async getBodyProfile(userId: string) {
    return { userId, height: null, weight: null, bodyType: null };
  }
}
