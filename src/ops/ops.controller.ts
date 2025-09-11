import { BadRequestException, Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { OpsService } from './ops.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

type JwtUser = { id: string; boxNumber?: number | null };

@Controller('ops')
@UseGuards(JwtAuthGuard)
export class OpsController {
  constructor(private readonly ops: OpsService) {}

  // ===== Compatibilidad con lo que ya tenías =====
  // Llama siguiente para Documentación (RECEPCION -> BOX), asigna box y queda "llamando".
  @Post('call-next-lic')
  async callNextLic(@Req() req: any, @Body('date') date?: string) {
    const user = req.user as JwtUser;
    return this.ops.callNextDocs(user, date);
  }

  // Llama siguiente para PSICO (si usás un panel de psico).
  @Post('call-next-psy')
  async callNextPsy(@Req() req: any, @Body('date') date?: string) {
    const user = req.user as JwtUser;
    return this.ops.callNextPsy(user, date);
  }

  // ===== Nuevos endpoints para el flujo de BOX =====

  // Llamar siguiente para Retiro (desde FINAL). Queda "llamando" en FINAL.
  @Post('call-next-ret')
  async callNextRet(@Req() req: any, @Body('date') date?: string) {
    const user = req.user as JwtUser;
    return this.ops.callNextRet(user, date);
  }

  // Marcar como "atendiendo" (pasa de EN_COLA -> EN_ATENCION). Solo el mismo box asignado.
  @Post('attending')
  async markAttending(@Req() req: any, @Body() dto: { ticketId: string }) {
    const user = req.user as JwtUser;
    if (!user.boxNumber) throw new BadRequestException('BOX_NUMBER_REQUIRED');
    return this.ops.markAttending({ ticketId: dto.ticketId, box: user.boxNumber });
  }

  // Finalizar desde un BOX:
  // - si estaba en BOX => deriva a PSICO (EN_COLA) y libera el box
  // - si estaba en FINAL => FINALIZADO y libera el box
  @Post('finish')
  async finishFromBox(@Req() req: any, @Body() dto: { ticketId: string }) {
    const user = req.user as JwtUser;
    if (!user.boxNumber) throw new BadRequestException('BOX_NUMBER_REQUIRED');
    return this.ops.finishFromBox({ ticketId: dto.ticketId, box: user.boxNumber });
  }
}
