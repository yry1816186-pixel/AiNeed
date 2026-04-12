import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class DesignerResponse {
  @ApiProperty() id!: string;
  @ApiPropertyOptional() nickname!: string | null;
  @ApiPropertyOptional() avatarUrl!: string | null;
}

class DesignListItemResponse {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() previewImageUrl!: string | null;
  @ApiProperty() productType!: string;
  @ApiProperty() likesCount!: number;
  @ApiProperty() downloadsCount!: number;
  @ApiProperty() tags!: string[];
  @ApiProperty() createdAt!: Date;
  @ApiProperty() designer!: DesignerResponse;
}

class DesignDetailResponse {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() designData!: Record<string, unknown>;
  @ApiPropertyOptional() patternImageUrl!: string | null;
  @ApiPropertyOptional() previewImageUrl!: string | null;
  @ApiProperty() productType!: string;
  @ApiProperty() likesCount!: number;
  @ApiProperty() downloadsCount!: number;
  @ApiProperty() tags!: string[];
  @ApiProperty() status!: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiProperty() designer!: DesignerResponse;
  @ApiProperty() isLiked!: boolean;
}

class DesignListResponse {
  @ApiProperty({ type: [DesignListItemResponse] })
  items!: DesignListItemResponse[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
}

class LikeResponse {
  @ApiProperty() isLiked!: boolean;
  @ApiProperty() likesCount!: number;
}

class ReportResponse {
  @ApiProperty() reportId!: string;
  @ApiProperty() status!: string;
  @ApiPropertyOptional() reviewResult!: Record<string, unknown> | null;
}

class DownloadResponse {
  @ApiProperty() designData!: Record<string, unknown>;
  @ApiPropertyOptional() patternImageUrl!: string | null;
  @ApiProperty() downloadsCount!: number;
}

class PublishResponse {
  @ApiProperty() designId!: string;
  @ApiProperty() status!: string;
  @ApiPropertyOptional() reviewResult!: Record<string, unknown> | null;
}

export {
  DesignerResponse,
  DesignListItemResponse,
  DesignDetailResponse,
  DesignListResponse,
  LikeResponse,
  ReportResponse,
  DownloadResponse,
  PublishResponse,
};
