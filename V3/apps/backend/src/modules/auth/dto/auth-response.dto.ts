import { ApiProperty } from '@nestjs/swagger';

export class UserInfoDto {
  @ApiProperty({ description: '用户ID' })
  id!: string;

  @ApiProperty({ description: '手机号', nullable: true })
  phone!: string | null;

  @ApiProperty({ description: '昵称', nullable: true })
  nickname!: string | null;

  @ApiProperty({ description: '头像URL', nullable: true })
  avatarUrl!: string | null;

  @ApiProperty({ description: '角色' })
  role!: string;
}

export class AuthResponseDto {
  @ApiProperty({ description: '访问令牌' })
  accessToken!: string;

  @ApiProperty({ description: '刷新令牌' })
  refreshToken!: string;

  @ApiProperty({ description: '用户信息', type: UserInfoDto })
  user!: UserInfoDto;
}

export class SendCodeResponseDto {
  @ApiProperty({ description: '提示消息', example: '验证码已发送' })
  message!: string;
}

export class LogoutResponseDto {
  @ApiProperty({ description: '提示消息', example: '已登出' })
  message!: string;
}

export interface JwtPayload {
  sub: string;
  phone: string | null;
  role: string;
  type: 'access' | 'refresh';
}
