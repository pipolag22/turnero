import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TicketStage, TicketStatus } from '@prisma/client';

function toDay(dateISO: string) {
  return new Date(`${dateISO}T00:00:00`);
}

@Controller('public')
export class PublicController {
  constructor(private readonly prisma: PrismaService) {}

  // Cola pública filtrada por etapa y fecha
  @Get('queue')
  async queue(
    @Query('stage') stage: TicketStage,
    @Query('date') date: string,
  ) {
    const day = toDay(date);

    const rows = await this.prisma.ticket.findMany({
      where: { date: day, stage, status: TicketStatus.EN_COLA },
      orderBy: [{ createdAt: 'asc' }], // ❌ sin queueNumber
      select: {
        id: true,
        nombre: true,      // ✅ antes era fullName
        stage: true,
        assignedBox: true,
        createdAt: true,
      },
    });

    return rows.map((t) => ({
      id: t.id,
      displayName: (t.nombre ?? '').trim(), // ✅ antes abreviabas fullName
      stage: t.stage,
      assignedBox: t.assignedBox,
      createdAt: t.createdAt,
    }));
  }
}
