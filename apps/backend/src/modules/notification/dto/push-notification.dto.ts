import { IsString, IsEnum, IsOptional, IsArray, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum PushPlatform {
  IOS = "ios",
  ANDROID = "android",
}

export class RegisterDeviceTokenDto {
  @ApiProperty({ description: "Device push token (FCM or APNs)" })
  @IsString()
  token = "";

  @ApiProperty({ description: "Device platform", enum: PushPlatform })
  @IsEnum(PushPlatform)
  platform: PushPlatform = PushPlatform.ANDROID;

  @ApiPropertyOptional({ description: "App identifier" })
  @IsOptional()
  @IsString()
  appId?: string;
}

export class DeregisterDeviceTokenDto {
  @ApiProperty({ description: "Device push token to remove" })
  @IsString()
  token = "";
}

export class SendPushDto {
  @ApiProperty({ description: "Target user IDs", type: [String] })
  @IsArray()
  @IsString({ each: true })
  userIds: string[] = [];

  @ApiProperty({ description: "Notification title" })
  @IsString()
  @MaxLength(100)
  title = "";

  @ApiProperty({ description: "Notification body" })
  @IsString()
  @MaxLength(500)
  body = "";

  @ApiPropertyOptional({ description: "Additional data payload" })
  @IsOptional()
  data?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "Notification category" })
  @IsOptional()
  @IsString()
  category?: string;
}
