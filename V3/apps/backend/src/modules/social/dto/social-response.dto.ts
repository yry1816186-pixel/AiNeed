import { ApiProperty } from '@nestjs/swagger';

export class FollowStatusResponseDto {
  @ApiProperty({ description: '是否已关注' })
  isFollowing!: boolean;
}

export class FollowToggleResponseDto {
  @ApiProperty({ description: '当前关注状态' })
  isFollowing!: boolean;
}

export class UserProfileDto {
  @ApiProperty({ description: '用户ID' })
  id!: string;

  @ApiProperty({ description: '昵称', required: false })
  nickname?: string;

  @ApiProperty({ description: '头像URL', required: false })
  avatarUrl?: string;

  @ApiProperty({ description: '简介', required: false })
  bio?: string;
}

export class FollowerItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  followerId!: string;

  @ApiProperty()
  followingId!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({ required: false })
  user?: UserProfileDto;
}

export class FollowingItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  followerId!: string;

  @ApiProperty()
  followingId!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({ required: false })
  user?: UserProfileDto;
}

export class FollowCountsDto {
  @ApiProperty({ description: '粉丝数' })
  followersCount!: number;

  @ApiProperty({ description: '关注数' })
  followingCount!: number;
}
