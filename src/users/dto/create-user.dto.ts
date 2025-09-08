import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export enum UserRole {
  ADMIN = 'ADMIN',
  BOX_AGENT = 'BOX_AGENT',
  PSYCHO_AGENT = 'PSYCHO_AGENT',
}

export class CreateUserDto {
  @ApiProperty({ example: 'user@demo.local' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  password: string;

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({ example: 'LICENCIAS', required: false })
  @IsOptional()
  @IsString()
  office?: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsNumber()
  boxNumber?: number;
}
