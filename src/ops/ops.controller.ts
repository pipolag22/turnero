import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { OpsService } from './ops.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, AppRole } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ops')
export class OpsController {
  constructor(private readonly ops: OpsService) {}

  // === BOX tradicional ===
  @Post('call-next-lic')
  @Roles('BOX_AGENT' as AppRole)
  callNextLic(@Req() req: any, @Body('date') date?: string) {
    return this.ops.callNextDocs({ id: req.user.id, boxNumber: req.user.boxNumber }, date);
  }

  @Post('call-next-ret')
  @Roles('BOX_AGENT' as AppRole)
  callNextRet(@Req() req: any, @Body('date') date?: string) {
    return this.ops.callNextRet({ id: req.user.id, boxNumber: req.user.boxNumber }, date);
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

  // === BOX: derivación explícita ===
  @Post('box/derive')
  @Roles('BOX_AGENT' as AppRole)
  boxDerive(
    @Req() req: any,
    @Body() dto: { ticketId: string; to: 'PSICO' | 'CAJERO' | 'FINAL' },
  ) {
    return this.ops.boxDerive({ ticketId: dto.ticketId, box: req.user.boxNumber, to: dto.to });
  }

  // === PSICO ===
  @Post('call-next-psy')
  @Roles('PSYCHO_AGENT' as AppRole)
  callNextPsy(@Req() req: any, @Body('date') date?: string) {
    return this.ops.callNextPsy(req.user.id, date);
  }

  @Post('psy/call')
  @Roles('PSYCHO_AGENT' as AppRole)
  psyCall(@Req() req: any, @Body('ticketId') ticketId: string) {
    return this.ops.psyCall({ ticketId, userId: req.user.id });
  }

  @Post('psy/attend')
  @Roles('PSYCHO_AGENT' as AppRole)
  psyAttend(@Req() req: any, @Body('ticketId') ticketId: string) {
    return this.ops.psyAttend({ ticketId, userId: req.user.id });
  }

  @Post('psy/cancel')
  @Roles('PSYCHO_AGENT' as AppRole)
  psyCancel(@Req() req: any, @Body('ticketId') ticketId: string) {
    return this.ops.psyCancel({ ticketId, userId: req.user.id });
  }

  @Post('psy/finish')
  @Roles('PSYCHO_AGENT' as AppRole)
  psyFinish(@Req() req: any, @Body('ticketId') ticketId: string) {
    return this.ops.psyFinish({ ticketId, userId: req.user.id });
  }

  // === CAJERO ===
  @Post('cashier/call-next')
  @Roles('CASHIER_AGENT' as AppRole)
  callNextCashier(@Req() req: any, @Body('date') date?: string) {
    return this.ops.callNextCashier(req.user.id, date);
  }

  @Post('cashier/attend')
  @Roles('CASHIER_AGENT' as AppRole)
  cashierAttend(@Req() req: any, @Body('ticketId') ticketId: string) {
    return this.ops.cashierAttend({ ticketId, userId: req.user.id });
  }

  @Post('cashier/cancel')
  @Roles('CASHIER_AGENT' as AppRole)
  cashierCancel(@Req() req: any, @Body('ticketId') ticketId: string) {
    return this.ops.cashierCancel({ ticketId, userId: req.user.id });
  }

  @Post('cashier/finish')
  @Roles('CASHIER_AGENT' as AppRole)
  cashierFinish(@Req() req: any, @Body('ticketId') ticketId: string) {
    return this.ops.cashierFinish({ ticketId, userId: req.user.id });
  }
}
