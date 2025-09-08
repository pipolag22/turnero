import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsString, IsNumber } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({ example: 'Nuevo Nombre', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'Nueva Oficina', required: false })
  @IsOptional()
  @IsString()
  office?: string;

  @ApiProperty({ example: 2, required: false })
  @IsOptional()
  @IsNumber()
  boxNumber?: number;
}
