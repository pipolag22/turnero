import { Controller, Get } from '@nestjs/common';
import { TicketsService } from '../tickets/tickets.service';
import { SkipThrottle } from '@nestjs/throttler';
import { AdminService } from 'src/admin/admin.service';


function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

@Controller('public')
export class PublicController {
  
  constructor(
  private readonly ticketsService: TicketsService,
  private readonly adminService: AdminService) {}
  @SkipThrottle()
  @Get('tvboard')
  getTvboardSnapshot() {
    
    return this.ticketsService.snapshot(todayISO());
  }

  @SkipThrottle()
  @Get('status')
  getSystemStatus() {
    return this.adminService.getStatus();
  }
}