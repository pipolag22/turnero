import { Body, Controller, Get, Post, UseGuards, HttpCode } from '@nestjs/common';
import { AdminService, type SystemStatus } from './admin.service'; // Importamos el nuevo tipo
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, AppRole } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('status') // <-- ENDPOINT CORREGIDO
  @Roles('ADMIN' as AppRole)
  async getStatus(): Promise<SystemStatus> {
    return this.adminService.getStatus();
  }

  @Post('status') // <-- ENDPOINT CORREGIDO
  @Roles('ADMIN' as AppRole)
  @HttpCode(200)
  async setStatus(@Body() body: Partial<SystemStatus>): Promise<SystemStatus> {
    return this.adminService.setStatus(body);
  }
}