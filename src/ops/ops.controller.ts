import { BadRequestException, Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OpsService } from './ops.service';

// Normaliza el user del JWT (id | userId | sub) y boxNumber
function pickJwt(req: any) {
  const u = (req?.user ?? {}) as {
    id?: string;
    userId?: string;
    sub?: string;
    boxNumber?: number | null;
  };
  const id = u.id ?? u.userId ?? u.sub;
  return { id, boxNumber: u.boxNumber ?? null };
}

@UseGuards(JwtAuthGuard)
@SkipThrottle() // quita 429 en botones operativos
@Controller('ops')
export class OpsController {
  constructor(private readonly ops: OpsService) {}

  // ===== BOX / LIC =====
  @Post('call-next-lic')
  async callNextLic(@Req() req: any, @Body('date') date?: string) {
    const { id, boxNumber } = pickJwt(req);
    if (!boxNumber) throw new BadRequestException('BOX_NUMBER_REQUIRED');
    return this.ops.callNextDocs({ id: id!, boxNumber }, date);
  }

  // ===== FINAL =====
  @Post('call-next-ret')
  async callNextRet(@Req() req: any, @Body('date') date?: string) {
    const { id, boxNumber } = pickJwt(req);
    if (!boxNumber) throw new BadRequestException('BOX_NUMBER_REQUIRED');
    return this.ops.callNextRet({ id: id!, boxNumber }, date);
  }

  // BOX/FINAL: "llamando" -> "atendiendo"
  @Post('attending')
  async markAttending(@Req() req: any, @Body() dto: { ticketId: string }) {
    const { boxNumber } = pickJwt(req);
    if (!boxNumber) throw new BadRequestException('BOX_NUMBER_REQUIRED');
    return this.ops.markAttending({ ticketId: dto.ticketId, box: boxNumber });
  }

  // BOX/FINAL: finalizar
  @Post('finish')
  async finishFromBox(@Req() req: any, @Body() dto: { ticketId: string }) {
    const { boxNumber } = pickJwt(req);
    if (!boxNumber) throw new BadRequestException('BOX_NUMBER_REQUIRED');
    return this.ops.finishFromBox({ ticketId: dto.ticketId, box: boxNumber });
  }

  // ===== PSICO =====
  @Post('call-next-psy')
  async callNextPsy(@Req() req: any, @Body('date') date?: string) {
    const { id } = pickJwt(req);
    if (!id) throw new BadRequestException('USER_ID_REQUIRED');
    return this.ops.callNextPsy(id, date);
  }

  @Post('psy/attend')
  async psyAttend(@Req() req: any, @Body() dto: { ticketId: string }) {
    const { id } = pickJwt(req);
    if (!id) throw new BadRequestException('USER_ID_REQUIRED');
    return this.ops.psyAttend({ ticketId: dto.ticketId, userId: id });
  }

  @Post('psy/finish')
  async psyFinish(@Req() req: any, @Body() dto: { ticketId: string }) {
    const { id } = pickJwt(req);
    if (!id) throw new BadRequestException('USER_ID_REQUIRED');
    return this.ops.psyFinish({ ticketId: dto.ticketId, userId: id });
  }
}
