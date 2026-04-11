import { IsArray, IsString, IsNotEmpty, ArrayMinSize, ArrayMaxSize } from 'class-validator';

const MAX_BATCH_INDEX_SIZE = 500;

export class BatchIndexDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_BATCH_INDEX_SIZE)
  clothingIds!: string[];
}
