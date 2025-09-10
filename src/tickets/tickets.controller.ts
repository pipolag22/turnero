import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { PatchTicketDto } from './dto/patch-ticket.dto';
import { NextDto } from './dto/next.dto';
import type { Etapa } from './dto/ticket.enums';

function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// 🔁 Aca convertimos cualquier stage "legacy" al nuevo Etapa
function mapStageAnyToEtapa(s?: string): Etapa | undefined {
  switch (s) {
    // ya es el nuevo contrato
    case 'RECEPCION':
    case 'BOX':
    case 'PSICO':
    case 'FINAL':
      return s;

    // legacy → nuevo
    case 'LIC_DOCS_IN_SERVICE': return 'BOX';
    case 'WAITING_PSY':         return 'PSICO'; // en cola
    case 'PSY_IN_SERVICE':      return 'PSICO';
    case 'WAITING_LIC_RETURN':  return 'FINAL';
    case 'COMPLETED':           return 'FINAL';
    case 'CANCELLED':           return 'FINAL';

    default:
      return undefined;
  }
}

@Controller('tickets')
export class TicketsController {
  constructor(private readonly service: TicketsService) {}

  @Get('snapshot')
  async snapshot(@Query('date') date?: string) {
    return this.service.snapshot(date || todayISO());
  }

  @Post()
  async create(@Body() dto: CreateTicketDto) {
    const nombre = dto.nombre ?? dto.fullName ?? undefined;
    const date = dto.date || todayISO();
    return this.service.create(nombre, date);
  }

  @Patch(':id')
  async patch(@Param('id') id: string, @Body() dto: PatchTicketDto) {
    const etapa = mapStageAnyToEtapa(dto.stage);        
    return this.service.patch(id, {
      nombre: dto.nombre,
      status: dto.status,
      stage: etapa,                                     
    });
  }

  @Post('next')
  async next(@Body() dto: NextDto) {
    return this.service.takeNext(dto.stage, dto.date);
  }
}
