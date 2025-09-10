import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { EstadoEnum, StageAny } from './ticket.enums';
import type { Estado } from './ticket.enums';

export class PatchTicketDto {
  @ApiProperty({ example: 'Juan Pérez', required: false })
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiProperty({ enum: EstadoEnum, required: false })
  @IsIn(EstadoEnum as readonly string[])
  @IsOptional()
  status?: Estado;

  // Permitimos etapa de los 2 mundos (EtapaEnum o StageEnum)
  @ApiProperty({ enum: StageAny, required: false })
  @IsIn(StageAny as readonly string[])
  @IsOptional()
  stage?: (typeof StageAny)[number];
}
