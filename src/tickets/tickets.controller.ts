import { Controller, Get, Param, Patch, Post, Body, Query, UseGuards } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

type Stage =
  | 'LIC_DOCS_IN_SERVICE'
  | 'WAITING_PSY'
  | 'PSY_IN_SERVICE'
  | 'WAITING_LIC_RETURN'
  | 'COMPLETED'
  | 'CANCELLED';

@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  // Avanza un ticket a otro estado
  @Patch(':id/advance')
  async advance(@Param('id') id: string, @Query('to') to: Stage) {
    return this.tickets.advance(id, to);
  }

  // (Opcional) obtener un ticket por id
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.tickets.findOne(id);
  }

  // (Opcional) crear ticket manual (admin/ops)
  @Post()
  async create(@Body() body: { fullName?: string; stage: Stage; assignedBox?: number; assignedUserId?: string }) {
    return this.tickets.create(body);
  }
}
