import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean } from "class-validator";

export class RecommendationSettingsDto {
  @ApiProperty({
    description: "是否启用个性化推荐。关闭后使用通用推荐，不使用用户画像数据。",
    example: true,
  })
  @IsBoolean()
  personalizationEnabled!: boolean;
}
