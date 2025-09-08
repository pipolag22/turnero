import { Controller, Get, Query, ParseEnumPipe } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Stage } from '@prisma/client';
import type { Stage as StageType } from '@prisma/client';

function abbreviate(name?: string | null): string | null {
  if (!name) return null;
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return parts[0];
  return `${parts[0]} ${parts[1][0].toUpperCase()}.`;
}

@Controller('public')
export class PublicController {
  constructor(private prisma: PrismaService) {}

  @Get('queue')
  async queue(@Query('stage', new ParseEnumPipe(Stage)) stage: StageType) {
    const rows = await this.prisma.ticket.findMany({
      where: { stage },
      orderBy: [{ createdAt: 'asc' }, { queueNumber: 'asc' }],
      select: { id: true, queueNumber: true, fullName: true, stage: true, assignedBox: true, createdAt: true },
    });

    return rows.map((t) => ({
      id: t.id,
      queueNumber: t.queueNumber,
      displayName: abbreviate(t.fullName),
      stage: t.stage,
      assignedBox: t.assignedBox,
      createdAt: t.createdAt,
    }));
  }
}
