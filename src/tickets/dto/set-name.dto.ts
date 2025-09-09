import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class SetNameDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;
}
