import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsInt,
  IsOptional,
  Min,
  Max,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ProductType {
  TSHIRT = 'tshirt',
  HOODIE = 'hoodie',
  HAT = 'hat',
  BAG = 'bag',
  PHONE_CASE = 'phone_case',
}

class ShippingAddressDto {
  @ApiProperty({ description: '收件人姓名' })
  @IsString()
  name!: string;

  @ApiProperty({ description: '手机号' })
  @IsString()
  phone!: string;

  @ApiProperty({ description: '省份' })
  @IsString()
  province!: string;

  @ApiProperty({ description: '城市' })
  @IsString()
  city!: string;

  @ApiProperty({ description: '区/县' })
  @IsString()
  district!: string;

  @ApiProperty({ description: '详细地址' })
  @IsString()
  address!: string;

  @ApiPropertyOptional({ description: '邮政编码' })
  @IsOptional()
  @IsString()
  postalCode?: string;
}

export class CreateCustomOrderDto {
  @ApiProperty({ description: '设计ID', format: 'uuid' })
  @IsUUID()
  design_id!: string;

  @ApiProperty({ description: '产品类型', enum: ProductType })
  @IsEnum(ProductType)
  product_type!: ProductType;

  @ApiProperty({ description: '面料/材质' })
  @IsString()
  material!: string;

  @ApiProperty({ description: '尺码' })
  @IsString()
  size!: string;

  @ApiPropertyOptional({ description: '数量', default: 1, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  quantity?: number;

  @ApiProperty({ description: '收货地址', type: ShippingAddressDto })
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shipping_address!: ShippingAddressDto;
}
