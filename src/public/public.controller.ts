import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type Stage =
  | 'LIC_DOCS_IN_SERVICE'
  | 'WAITING_PSY'
  | 'PSY_IN_SERVICE'
  | 'WAITING_LIC_RETURN'
  | 'COMPLETED'
  | 'CANCELLED';

function abbreviate(name?: string | null): string | null {
  if (!name) return null;                 // maneja undefined o null
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return parts[0];
  return `${parts[0]} ${parts[1][0].toUpperCase()}.`;
}

@Controller('public')
export class PublicController {
  constructor(private prisma: PrismaService) {}

  @Get('queue')
  async queue(@Query('stage') stage: Stage) {
    const rows = await this.prisma.ticket.findMany({
      where: { stage: stage as any },
      orderBy: [{ createdAt: 'asc' }, { queueNumber: 'asc' }],
      select: { id: true, queueNumber: true, fullName: true, stage: true, assignedBox: true, createdAt: true },
    });

    return rows.map((t) => ({
      id: t.id,
      queueNumber: t.queueNumber,
      displayName: abbreviate(t.fullName),   // ahora compila
      stage: t.stage,
      assignedBox: t.assignedBox,
      createdAt: t.createdAt,
    }));
  }
}