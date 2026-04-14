import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ProductTemplateType } from "@prisma/client";
import { IsString, IsOptional, IsEnum, IsObject, IsArray, ValidateNested, IsNumber, Min, Max } from "class-validator";
import { Type } from "class-transformer";

export class CreateDesignDto {
  @ApiProperty({ description: "模板ID", example: "uuid" })
  @IsString()
  templateId!: string;

  @ApiProperty({ description: "画布数据 (JSON)", example: {} })
  @IsObject()
  canvasData!: Record<string, unknown>;
}

export class DesignLayerDto {
  @ApiProperty({ description: "图层类型", enum: ["image", "text", "shape"] })
  @IsString()
  type!: string;

  @ApiProperty({ description: "内容 (图片URL或文本)" })
  @IsString()
  content!: string;

  @ApiPropertyOptional({ description: "X坐标", default: 0 })
  @IsNumber()
  @IsOptional()
  x?: number;

  @ApiPropertyOptional({ description: "Y坐标", default: 0 })
  @IsNumber()
  @IsOptional()
  y?: number;

  @ApiPropertyOptional({ description: "宽度", default: 100 })
  @IsNumber()
  @IsOptional()
  width?: number;

  @ApiPropertyOptional({ description: "高度", default: 100 })
  @IsNumber()
  @IsOptional()
  height?: number;

  @ApiPropertyOptional({ description: "缩放", default: 1 })
  @IsNumber()
  @IsOptional()
  scale?: number;

  @ApiPropertyOptional({ description: "旋转角度", default: 0 })
  @IsNumber()
  @IsOptional()
  rotation?: number;

  @ApiPropertyOptional({ description: "透明度", default: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  opacity?: number;

  @ApiPropertyOptional({ description: "层级" })
  @IsNumber()
  @IsOptional()
  zIndex?: number;

  @ApiPropertyOptional({ description: "字号 (文字图层)" })
  @IsNumber()
  @IsOptional()
  fontSize?: number;

  @ApiPropertyOptional({ description: "颜色 (十六进制)" })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ description: "字体" })
  @IsString()
  @IsOptional()
  fontFamily?: string;

  @ApiPropertyOptional({ description: "图片URL" })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ description: "形状类型" })
  @IsString()
  @IsOptional()
  shapeType?: string;

  @ApiPropertyOptional({ description: "填充颜色" })
  @IsString()
  @IsOptional()
  fillColor?: string;

  @ApiPropertyOptional({ description: "描边颜色" })
  @IsString()
  @IsOptional()
  strokeColor?: string;

  @ApiPropertyOptional({ description: "描边宽度" })
  @IsNumber()
  @IsOptional()
  strokeWidth?: number;
}

export class UpdateDesignDto {
  @ApiProperty({ description: "画布数据 (JSON)" })
  @IsObject()
  canvasData!: Record<string, unknown>;

  @ApiPropertyOptional({ description: "图层数组", type: [DesignLayerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DesignLayerDto)
  @IsOptional()
  layers?: DesignLayerDto[];
}

export class CalculateQuoteDto {
  @ApiPropertyOptional({
    description: "打印面",
    enum: ["front", "back", "both"],
    default: "front",
  })
  @IsEnum(["front", "back", "both"])
  @IsOptional()
  printSide?: "front" | "back" | "both";
}

export class CreateFromDesignDto {
  @ApiProperty({ description: "设计ID" })
  @IsString()
  designId!: string;

  @ApiProperty({ description: "报价ID" })
  @IsString()
  quoteId!: string;
}
