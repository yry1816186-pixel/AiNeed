import { ApiProperty } from "@nestjs/swagger";

export class StyleMatchDto {
  @ApiProperty({ description: "Matched user ID" })
  userId: string;

  @ApiProperty({ description: "Matched user nickname", required: false })
  nickname: string;

  @ApiProperty({ description: "Matched user avatar URL", required: false, nullable: true })
  avatar: string | null;

  @ApiProperty({ description: "Cosine similarity score (0-1)" })
  similarityScore: number;
}

export class StyleMatchesResponseDto {
  @ApiProperty({ type: [StyleMatchDto] })
  matches: StyleMatchDto[];
}

export class ComputeStyleDnaResponseDto {
  @ApiProperty()
  success: boolean;
}
