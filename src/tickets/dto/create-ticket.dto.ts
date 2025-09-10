// src/tickets/dto/create-ticket.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { StageEnum, type Stage } from './ticket.enums';

export class CreateTicketDto {
  // Aceptamos ambos nombres para compatibilidad con front/back
  @ApiProperty({ example: 'Juan Pérez', required: false })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiProperty({ example: 'Juan Pérez', required: false })
  @IsString()
  @IsOptional()
  nombre?: string;

  // Si tu front NO envía date, lo rellenamos con HOY en el controller
  @ApiProperty({ example: '2025-09-10', required: false })
  @IsDateString()
  @IsOptional()
  date?: string; // YYYY-MM-DD

  // Opcional: si alguien aún te envía stage legacy lo aceptamos (lo podés ignorar)
  @ApiProperty({ enum: StageEnum, enumName: 'Stage', required: false })
  @IsEnum(StageEnum)
  @IsOptional()
  stage?: Stage;

  // Otros opcionales que ya tenías
  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  assignedBox?: number;

  @ApiProperty({ example: 'userId123', required: false })
  @IsOptional()
  @IsString()
  assignedUserId?: string;
}
