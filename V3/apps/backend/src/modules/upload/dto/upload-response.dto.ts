import { ApiProperty } from '@nestjs/swagger';

export class UploadResponseDto {
  @ApiProperty({ example: 'http://localhost:9000/aineed-uploads/avatar/2026/04/12/uuid.jpg' })
  url!: string;

  @ApiProperty({ example: 'avatar/2026/04/12/uuid.jpg' })
  key!: string;

  @ApiProperty({ example: 102400 })
  size!: number;

  @ApiProperty({ example: 'image/jpeg' })
  mimeType!: string;

  @ApiProperty({ example: 800, required: false })
  width?: number;

  @ApiProperty({ example: 600, required: false })
  height?: number;
}

export class BatchUploadResponseDto {
  @ApiProperty({ type: [UploadResponseDto] })
  items!: UploadResponseDto[];
}
