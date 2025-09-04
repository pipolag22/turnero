import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsEnum, IsString } from 'class-validator';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

enum Stage {
  LIC_DOCS_IN_SERVICE = 'LIC_DOCS_IN_SERVICE',
  WAITING_PSY = 'WAITING_PSY',
  PSY_IN_SERVICE = 'PSY_IN_SERVICE',
  WAITING_LIC_RETURN = 'WAITING_LIC_RETURN',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

class SetNameDto { @IsString() fullName: string; }
class TransitionDto { @IsEnum(Stage) toStage: Stage; }

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private tickets: TicketsService) {}

  @Get('queue')
  list(@Query('stage') stage: Stage) { return this.tickets.listByStage(stage as any); }

  @Patch(':id/fullname')
  setName(@Req() req, @Param('id') id: string, @Body() dto: SetNameDto) {
    return this.tickets.setFullName(req.user, id, dto.fullName);
  }

  @Post(':id/transition')
  transition(@Req() req, @Param('id') id: string, @Body() dto: TransitionDto) {
    return this.tickets.transition(req.user, id, dto.toStage as any);
  }
}

