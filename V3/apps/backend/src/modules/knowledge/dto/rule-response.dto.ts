import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ColorRelationDto {
  @ApiProperty({ description: '源颜色' })
  fromColor: string;

  @ApiProperty({ description: '目标颜色' })
  toColor: string;

  @ApiProperty({ description: '关系类型', example: 'COMPLEMENTS' })
  relationType: string;

  @ApiProperty({ description: '关系强度 0-1', example: 0.9 })
  strength: number;

  @ApiPropertyOptional({ description: '原因说明' })
  reason?: string;
}

export class BodyTypeRecommendationDto {
  @ApiProperty({ description: '体型类型', example: 'hourglass' })
  bodyType: string;

  @ApiProperty({ description: '服装类型', example: 'dress' })
  clothingType: string;

  @ApiProperty({ description: '推荐/避免', example: 'SUITABLE_FOR' })
  action: string;

  @ApiProperty({ description: '推荐说明' })
  recommendation: string;

  @ApiPropertyOptional({ description: '示例', type: [String] })
  examples?: string[];

  @ApiPropertyOptional({ description: '替代选择', type: [String] })
  alternatives?: string[];
}

export class OccasionStyleDto {
  @ApiProperty({ description: '场合名称', example: 'work' })
  occasion: string;

  @ApiProperty({ description: '推荐风格', type: [String] })
  requiredStyles: string[];

  @ApiProperty({ description: '禁忌服装', type: [String] })
  forbiddenItems: string[];

  @ApiPropertyOptional({ description: '场合要求说明' })
  requirements?: string;
}

export class StyleCompatibilityDto {
  @ApiProperty({ description: '风格A', example: 'minimalist' })
  styleA: string;

  @ApiProperty({ description: '风格B', example: 'streetwear' })
  styleB: string;

  @ApiProperty({ description: '兼容性强度 0-1', example: 0.7 })
  strength: number;

  @ApiProperty({ description: '是否兼容' })
  compatible: boolean;
}

export class KnowledgeRuleDto {
  @ApiProperty({ description: '规则类别', example: 'color' })
  category: string;

  @ApiProperty({ description: '规则类型', example: 'do' })
  ruleType: string;

  @ApiProperty({ description: '规则条件' })
  condition: Record<string, unknown>;

  @ApiProperty({ description: '推荐内容' })
  recommendation: string;

  @ApiPropertyOptional({ description: '强度 0-1', example: 0.9 })
  strength?: number;

  @ApiPropertyOptional({ description: '原因说明' })
  reason?: string;
}

export class SeedResultDto {
  @ApiProperty({ description: '创建的节点数' })
  nodesCreated: number;

  @ApiProperty({ description: '创建的关系数' })
  relationshipsCreated: number;

  @ApiProperty({ description: '处理的数据文件数' })
  filesProcessed: number;

  @ApiPropertyOptional({ description: '详细结果', type: [String] })
  details?: string[];
}
