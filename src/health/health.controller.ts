import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async health() {
    // ping a la DB
    const okDb = await this.prisma.$queryRaw`SELECT 1 as ok`;
    return {
      status: 'ok',
      db: Array.isArray(okDb) ? 'up' : 'unknown',
      time: new Date().toISOString(),
    };
  }
}