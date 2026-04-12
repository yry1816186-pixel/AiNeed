import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ColorSeasonDto {
  @ApiProperty({ description: '肤色', enum: ['fair', 'light', 'medium', 'olive', 'tan', 'dark'] })
  @IsString()
  @IsIn(['fair', 'light', 'medium', 'olive', 'tan', 'dark'])
  skinTone!: 'fair' | 'light' | 'medium' | 'olive' | 'tan' | 'dark';

  @ApiProperty({ description: '发色', enum: ['black', 'dark_brown', 'brown', 'light_brown', 'blonde', 'red', 'gray', 'white'] })
  @IsString()
  @IsIn(['black', 'dark_brown', 'brown', 'light_brown', 'blonde', 'red', 'gray', 'white'])
  hairColor!: 'black' | 'dark_brown' | 'brown' | 'light_brown' | 'blonde' | 'red' | 'gray' | 'white';

  @ApiProperty({ description: '瞳色', enum: ['black', 'dark_brown', 'brown', 'hazel', 'green', 'blue', 'gray'] })
  @IsString()
  @IsIn(['black', 'dark_brown', 'brown', 'hazel', 'green', 'blue', 'gray'])
  eyeColor!: 'black' | 'dark_brown' | 'brown' | 'hazel' | 'green' | 'blue' | 'gray';
}
