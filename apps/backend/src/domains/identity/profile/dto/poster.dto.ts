/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class GeneratePosterResponseDto {
  @ApiProperty({ description: "海报 ID" })
  id!: string;

  @ApiProperty({ description: "海报图片 URL" })
  url!: string;

  @ApiProperty({ description: "生成时间" })
  createdAt!: Date;
}

export class PosterQueryDto {
  @ApiPropertyOptional({ description: "海报 ID" })
  @IsOptional()
  @IsString()
  id?: string;
}
