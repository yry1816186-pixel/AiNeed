import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
// eslint-disable-next-line import/no-unresolved
import { Strategy } from "passport-local";

import { AuthHelpersService } from "../auth.helpers";

export interface ValidatedUser {
  id: string;
  email: string;
  nickname?: string | null;
  avatar?: string | null;
  createdAt: Date;
}

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authHelpersService: AuthHelpersService) {
    super({ usernameField: "email" });
  }

  async validate(email: string, password: string): Promise<ValidatedUser> {
    const user = await this.authHelpersService.validateCredentials(email, password);
    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname ?? undefined,
      avatar: user.avatar ?? undefined,
      createdAt: user.createdAt,
    };
  }
}
