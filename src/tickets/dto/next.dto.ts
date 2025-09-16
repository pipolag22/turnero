// src/tickets/dto/next.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum } from 'class-validator';
import { EtapaEnum, type Etapa } from '../ticket.enums';

export class NextDto {
  @ApiProperty({ enum: EtapaEnum, enumName: 'Etapa' })
  @IsEnum(EtapaEnum)
  stage!: Etapa;

  @ApiProperty({ example: '2025-09-10' })
  @IsDateString()
  date!: string; // YYYY-MM-DD
}
