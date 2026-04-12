import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Socket } from 'socket.io';

interface JwtPayload {
  sub: string;
  phone?: string;
  role: string;
  type: string;
}

@Injectable()
export class WsAuthGuard implements CanActivate {
  private readonly logger = new Logger(WsAuthGuard.name);

  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient<Socket>();
    const token = this.extractToken(client);

    if (!token) {
      this.logger.warn(`WebSocket connection rejected: no token from ${client.id}`);
      return false;
    }

    try {
      const payload: JwtPayload = await this.jwtService.verifyAsync(token);

      if (payload.type !== 'access') {
        this.logger.warn(`WebSocket connection rejected: not access token from ${client.id}`);
        return false;
      }

      client.data.user = { id: payload.sub, role: payload.role };
      return true;
    } catch {
      this.logger.warn(`WebSocket connection rejected: invalid token from ${client.id}`);
      return false;
    }
  }

  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth as Record<string, string | undefined>;
    if (auth?.token) {
      return auth.token;
    }

    const query = client.handshake.query as Record<string, string | undefined>;
    if (query?.token) {
      return query.token;
    }

    return null;
  }
}
