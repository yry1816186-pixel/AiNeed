import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { JwtUserPayload } from "../../../common/types/common.types";
import { PrismaService } from "../../../common/prisma/prisma.service";

export const REQUIRE_BIG_V = "requireBigV";

export const RequireBigV = () => SetMetadata(REQUIRE_BIG_V, true);

@Injectable()
export class BloggerGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: JwtUserPayload = request.user;

    if (!user?.id) {
      throw new ForbiddenException("User not authenticated");
    }

    const requireBigV = this.reflector.getAllAndOverride<boolean>(REQUIRE_BIG_V, [
      context.getHandler(),
      context.getClass(),
    ]) ?? false;

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { bloggerLevel: true },
    });

    if (!dbUser?.bloggerLevel) {
      throw new ForbiddenException("Blogger access required");
    }

    if (requireBigV && dbUser.bloggerLevel !== "big_v") {
      throw new ForbiddenException("Big-V blogger access required");
    }

    return true;
  }
}
