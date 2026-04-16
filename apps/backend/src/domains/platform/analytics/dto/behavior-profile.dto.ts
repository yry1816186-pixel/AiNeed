import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsObject, IsArray, IsString, IsNumber, IsDateString, IsOptional } from "class-validator";

export class BehaviorProfileDto {
  @ApiProperty({ description: "用户偏好", type: Object })
  @IsObject()
  preferences!: {
    styles: string[];
    colors: string[];
    brands: string[];
    priceRanges: string[];
  };

  @ApiProperty({ description: "近期行为", type: Object })
  @IsObject()
  recentBehaviors!: {
    mostViewedCategories: string[];
    mostTriedOnItems: string[];
    searchKeywords: string[];
  };

  @ApiProperty({ description: "行为统计", type: Object })
  @IsObject()
  stats!: {
    totalEvents: number;
    lastActive: Date;
    avgSessionDuration: number;
    conversionRate: number;
  };
}
