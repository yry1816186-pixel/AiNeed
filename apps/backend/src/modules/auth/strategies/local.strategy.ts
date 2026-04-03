import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-local";

import { AuthService } from "../auth.service";

/**
 * Validated user type returned after successful authentication.
 * Contains only safe user fields that can be attached to the request.
 */
export interface ValidatedUser {
  id: string;
  email: string;
  nickname?: string | null;
  avatar?: string | null;
  createdAt: Date;
}

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: "email" });
  }

  async validate(email: string, password: string): Promise<ValidatedUser> {
    const user = await this.authService.login({ email, password });
    return user.user;
  }
}
