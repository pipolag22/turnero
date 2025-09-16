import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateUserDto, UserRole } from './create-user.dto';
import { IsOptional, IsString, IsNumber, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({ example: 'Nuevo Nombre', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({ example: 'Nueva Oficina', required: false })
  @IsOptional()
  @IsString()
  office?: string;

  @ApiProperty({ example: 2, required: false })
  @IsOptional()
  @IsNumber()
  boxNumber?: number;
}
