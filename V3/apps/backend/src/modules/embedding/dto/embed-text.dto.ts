import { IsString, IsNotEmpty } from 'class-validator';

export class EmbedTextDto {
  @IsString()
  @IsNotEmpty()
  text!: string;
}
