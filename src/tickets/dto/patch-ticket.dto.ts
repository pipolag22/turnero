// src/tickets/dto/patch-ticket.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EstadoEnum, EtapaEnum, type Estado, type Etapa } from '../ticket.enums';

export class PatchTicketDto {
  @ApiProperty({ example: 'Juan Pérez', required: false })
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiProperty({ enum: EstadoEnum, enumName: 'Estado', required: false })
  @IsEnum(EstadoEnum)
  @IsOptional()
  status?: Estado;

  @ApiProperty({ enum: EtapaEnum, enumName: 'Etapa', required: false })
  @IsEnum(EtapaEnum)
  @IsOptional()
  stage?: Etapa;
}
