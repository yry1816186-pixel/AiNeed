import { IsString, IsArray, IsNotEmpty, IsOptional, ArrayMinSize, ArrayMaxSize } from 'class-validator';

const MAX_BATCH_SIZE = 100;

export class EmbedBatchDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_BATCH_SIZE)
  texts!: string[];

  @IsString()
  @IsOptional()
  model?: string;
}
