import { ApiProperty } from '@nestjs/swagger';

export class BodyAnalysisResponseDto {
  @ApiProperty({ description: '体型类型' })
  bodyType: string;

  @ApiProperty({ description: '体型描述' })
  description: string;

  @ApiProperty({ description: '适合风格', type: [String] })
  suitableStyles: string[];

  @ApiProperty({ description: '避免风格', type: [String] })
  avoidStyles: string[];

  @ApiProperty({ description: '色彩季型' })
  colorSeason: string;
}

export class ColorSeasonResponseDto {
  @ApiProperty({ description: '色彩季型' })
  season: string;

  @ApiProperty({ description: '适合颜色', type: [String] })
  suitableColors: string[];

  @ApiProperty({ description: '避免颜色', type: [String] })
  avoidColors: string[];

  @ApiProperty({ description: '描述' })
  description: string;
}

export class BodyProfileResponseDto {
  @ApiProperty({ description: '档案ID' })
  id: string;

  @ApiProperty({ description: '用户ID' })
  userId: string;

  @ApiProperty({ description: '体型类型', required: false })
  bodyType?: string;

  @ApiProperty({ description: '色彩季型', required: false })
  colorSeason?: string;

  @ApiProperty({ description: '测量数据', required: false })
  measurements?: Record<string, number>;

  @ApiProperty({ description: '分析结果', required: false })
  analysisResult?: Record<string, unknown>;

  @ApiProperty({ description: '创建时间' })
  createdAt: string;

  @ApiProperty({ description: '更新时间' })
  updatedAt: string;
}
