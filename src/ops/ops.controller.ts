import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { OpsService } from './ops.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

type JwtUser = { id: string; boxNumber?: number | null };

@Controller('ops')
@UseGuards(JwtAuthGuard)
export class OpsController {
  constructor(private readonly ops: OpsService) {}

  // Llama al siguiente para LIC/BOX
  @Post('call-next-lic')
  async callNextLic(@Req() req: any, @Body('date') date?: string) {
    const user = req.user as JwtUser;
    return this.ops.callNextLic(user, date);
  }

  // Llama al siguiente para PSICO
  @Post('call-next-psy')
  async callNextPsy(@Req() req: any, @Body('date') date?: string) {
    const user = req.user as JwtUser;
    return this.ops.callNextPsy(user, date);
  }
}
