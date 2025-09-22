import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { OpsService } from './ops.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, AppRole } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ops')
export class OpsController {
  constructor(private readonly ops: OpsService) {}

  private getUserId(req: any): string {
    return req.user?.id ?? req.user?.sub;
  }

  // ===== BOX tradicional =====
  @Post('call-next-lic')
  @Roles('BOX_AGENT' as AppRole)
  callNextLic(@Req() req: any, @Body('date') date?: string) {
    const userId = this.getUserId(req);
    return this.ops.callNextDocs({ id: userId, boxNumber: req.user.boxNumber }, date);
  }

  @Post('call-next-ret')
  @Roles('BOX_AGENT' as AppRole)
  callNextRet(@Req() req: any, @Body('date') date?: string) {
    const userId = this.getUserId(req);
    return this.ops.callNextRet({ id: userId, boxNumber: req.user.boxNumber }, date);
  }

  // 👉 NUEVO: llamar un ticket específico a BOX (desde RECP o FINAL)
  @Post('box/call')
  @Roles('BOX_AGENT' as AppRole)
  boxCall(@Req() req: any, @Body('ticketId') ticketId: string) {
    const userId = this.getUserId(req);
    return this.ops.boxCall({ ticketId, userId, box: req.user.boxNumber });
  }

  @Post('attending')
  @Roles('BOX_AGENT' as AppRole)
  attending(@Req() req: any, @Body('ticketId') ticketId: string) {
    return this.ops.markAttending({ ticketId, box: req.user.boxNumber });
  }

  @Post('cancel')
  @Roles('BOX_AGENT' as AppRole)
  cancel(@Req() req: any, @Body('ticketId') ticketId: string) {
    return this.ops.cancelFromBox({ ticketId, box: req.user.boxNumber });
  }

  @Post('box/finish-return')
  @Roles('BOX_AGENT' as AppRole)
  finishReturn(@Req() req: any, @Body('ticketId') ticketId: string) {
    return this.ops.finishReturn({ ticketId, box: req.user.boxNumber });
  }

  @Post('box/derive')
  @Roles('BOX_AGENT' as AppRole)
  boxDerive(@Req() req: any, @Body() dto: { ticketId: string; to: 'PSICO' | 'CAJERO' | 'FINAL' }) {
    return this.ops.boxDerive({ ticketId: dto.ticketId, box: req.user.boxNumber, to: dto.to });
  }

  @Post('box/finish')
  @Roles('BOX_AGENT' as AppRole)
  boxFinish(@Req() req: any, @Body('ticketId') ticketId: string) {
    return this.ops.boxFinish({ ticketId, box: req.user.boxNumber });
  }

  // ===== PSICO =====
  @Post('call-next-psy')
  @Roles('PSYCHO_AGENT' as AppRole)
  callNextPsy(@Req() req: any, @Body('date') date?: string) {
    const userId = this.getUserId(req);
    return this.ops.callNextPsy(userId, date);
  }

  @Post('psy/call')
  @Roles('PSYCHO_AGENT' as AppRole)
  psyCall(@Req() req: any, @Body('ticketId') ticketId: string) {
    const userId = this.getUserId(req);
    return this.ops.psyCall({ ticketId, userId });
  }

  @Post('psy/attend')
  @Roles('PSYCHO_AGENT' as AppRole)
  psyAttend(@Req() req: any, @Body('ticketId') ticketId: string) {
    const userId = this.getUserId(req);
    return this.ops.psyAttend({ ticketId, userId });
  }

  @Post('psy/cancel')
  @Roles('PSYCHO_AGENT' as AppRole)
  psyCancel(@Req() req: any, @Body('ticketId') ticketId: string) {
    const userId = this.getUserId(req);
    return this.ops.psyCancel({ ticketId, userId });
  }

  @Post('psy/finish')
  @Roles('PSYCHO_AGENT' as AppRole)
  psyFinish(@Req() req: any, @Body('ticketId') ticketId: string) {
    const userId = this.getUserId(req);
    return this.ops.psyFinish({ ticketId, userId });
  }

  // ===== CAJERO =====
  @Post('cashier/call-next')
  @Roles('CASHIER_AGENT' as AppRole)
  callNextCashier(@Req() req: any, @Body('date') date?: string) {
    const userId = this.getUserId(req);
    return this.ops.callNextCashier(userId, date);
  }

  // 👉 NUEVO: llamar un ticket específico a CAJERO
  @Post('cashier/call')
  @Roles('CASHIER_AGENT' as AppRole)
  cashierCall(@Req() req: any, @Body('ticketId') ticketId: string) {
    const userId = this.getUserId(req);
    return this.ops.cashierCall({ ticketId, userId });
  }

  @Post('cashier/attend')
  @Roles('CASHIER_AGENT' as AppRole)
  cashierAttend(@Req() req: any, @Body('ticketId') ticketId: string) {
    const userId = this.getUserId(req);
    return this.ops.cashierAttend({ ticketId, userId });
  }

  @Post('cashier/cancel')
  @Roles('CASHIER_AGENT' as AppRole)
  cashierCancel(@Req() req: any, @Body('ticketId') ticketId: string) {
    const userId = this.getUserId(req);
    return this.ops.cashierCancel({ ticketId, userId });
  }

  @Post('cashier/finish')
  @Roles('CASHIER_AGENT' as AppRole)
  cashierFinish(@Req() req: any, @Body('ticketId') ticketId: string) {
    const userId = this.getUserId(req);
    return this.ops.cashierFinish({ ticketId, userId });
  }
}
