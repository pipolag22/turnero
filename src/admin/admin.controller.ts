import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AdminService, type TvAlert } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, AppRole } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('alert')
  @Roles('ADMIN' as AppRole)
  getAlert(): TvAlert {
    return this.admin.getAlert();
  }

  @Post('alert')
  @Roles('ADMIN' as AppRole)
  setAlert(@Body() body: TvAlert): TvAlert {
    return this.admin.setAlert(body);
  }
}
