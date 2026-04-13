import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class PaginatedMetaDto {
  @ApiPropertyOptional({
    description: "Cursor for the next page",
  })
  nextCursor?: string;

  @ApiProperty({
    description: "Whether there are more items",
    example: true,
  })
  hasMore!: boolean;

  @ApiPropertyOptional({
    description: "Total count (optional, expensive query)",
    example: 150,
  })
  total?: number;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({
    description: "Array of items",
    isArray: true,
  })
  items!: T[];

  @ApiProperty({
    description: "Pagination metadata",
    type: PaginatedMetaDto,
  })
  meta!: PaginatedMetaDto;
}
