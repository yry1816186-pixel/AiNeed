import { ApiProperty } from "@nestjs/swagger";

export class SizeRecommendationResponse {
  @ApiProperty()
  recommendedSize!: string;

  @ApiProperty()
  confidence!: "high" | "medium" | "low";

  @ApiProperty()
  reasons!: string[];
}

export class SizeChartDto {
  @ApiProperty()
  sizes!: Array<{
    size: string;
    chest: string;
    waist: string;
    hips: string;
    height: string;
  }>;
}
