// src/tickets/dto/create-ticket.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { StageEnum, type Stage } from '../ticket.enums';

export class CreateTicketDto {
  @ApiProperty({ example: 'Juan Pérez', required: false })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiProperty({ example: 'Juan Pérez', required: false })
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiProperty({ example: '2025-09-10', required: false })
  @IsDateString()
  @IsOptional()
  date?: string; // YYYY-MM-DD

  // Opcional (legado): si alguien envía un "stage" viejo, lo aceptamos
  @ApiProperty({ enum: StageEnum, enumName: 'Stage', required: false })
  @IsEnum(StageEnum)
  @IsOptional()
  stage?: Stage;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  assignedBox?: number;

  @ApiProperty({ example: 'userId123', required: false })
  @IsOptional()
  @IsString()
  assignedUserId?: string;
}
