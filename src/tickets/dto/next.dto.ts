// src/tickets/dto/next.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn } from 'class-validator';
import { EtapaEnum } from './ticket.enums';
import type { Etapa } from './ticket.enums';

export class NextDto {
  @ApiProperty({ enum: EtapaEnum })
  @IsIn(EtapaEnum as readonly string[])
  stage!: Etapa; // RECEPCION | BOX | PSICO | FINAL

  @ApiProperty({ example: '2025-09-10' })
  @IsDateString()
  date!: string; // YYYY-MM-DD
}
