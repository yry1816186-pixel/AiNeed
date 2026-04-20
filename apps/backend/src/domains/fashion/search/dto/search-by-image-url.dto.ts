import { IsString, IsUrl } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SearchByImageUrlDto {
  @ApiProperty({ description: "图片URL地址", example: "https://example.com/dress.jpg" })
  @IsString()
  @IsUrl()
  imageUrl!: string;
}
