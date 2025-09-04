import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OpsService } from './ops.service';

@Controller('ops')
@UseGuards(JwtAuthGuard)
export class OpsController {
  constructor(private ops: OpsService) {}

  @Post('call-next/lic')
  callNextLic(@Req() req) { return this.ops.callNextLic(req.user); }

  @Post('call-next/psy')
  callNextPsy(@Req() req) { return this.ops.callNextPsy(req.user); }
}
