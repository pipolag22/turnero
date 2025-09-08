import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { OpsService } from './ops.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ops')
@UseGuards(JwtAuthGuard)
export class OpsController {
  constructor(private readonly ops: OpsService) {}

  @Post('call-next-lic')
  async callNextLic(@Req() req: any) {
    return this.ops.callNextLic(req.user);
  }

  @Post('call-next-psy')
  async callNextPsy(@Req() req: any) {
    return this.ops.callNextPsy(req.user);
  }
}
