import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

type Stage =
  | 'LIC_DOCS_IN_SERVICE'
  | 'WAITING_PSY'
  | 'PSY_IN_SERVICE'
  | 'WAITING_LIC_RETURN'
  | 'COMPLETED'
  | 'CANCELLED';

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  // Reglas de transición permitidas
  private isValidTransition(from: Stage, to: Stage): boolean {
    const edges: Record<Stage, Stage[]> = {
      LIC_DOCS_IN_SERVICE: ['WAITING_PSY', 'CANCELLED'],
      WAITING_PSY: ['PSY_IN_SERVICE', 'CANCELLED'],
      PSY_IN_SERVICE: ['WAITING_LIC_RETURN', 'CANCELLED'],
      WAITING_LIC_RETURN: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: [],
    };
    return edges[from]?.includes(to) ?? false;
  }

  async create(data: { fullName?: string; stage: Stage; assignedBox?: number; assignedUserId?: string }) {
    const t = await this.prisma.ticket.create({
      data: {
        fullName: data.fullName ?? null,
        stage: data.stage as any,
        assignedBox: data.assignedBox ?? null,
        assignedUserId: data.assignedUserId ?? null,
      },
      select: { id: true, queueNumber: true, fullName: true, stage: true, assignedBox: true, createdAt: true },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'TICKET_CREATE',
        ticketId: t.id,
        meta: { stage: data.stage } as Prisma.InputJsonValue,
      },
    });

    return t;
  }

  async findOne(id: string) {
    const t = await this.prisma.ticket.findUnique({
      where: { id },
      select: { id: true, queueNumber: true, fullName: true, stage: true, assignedBox: true, createdAt: true },
    });
    if (!t) throw new NotFoundException('Ticket no existe');
    return t;
  }

  async advance(id: string, to: Stage) {
    const current = await this.prisma.ticket.findUnique({
      where: { id },
      select: { id: true, stage: true },
    });
    if (!current) throw new NotFoundException('Ticket no existe');

    const from = current.stage as Stage;
    if (!this.isValidTransition(from, to)) {
      throw new BadRequestException(`Transición inválida: ${from} -> ${to}`);
    }

    const updated = await this.prisma.ticket.update({
      where: { id },
      data: { stage: to as any },
      select: { id: true, queueNumber: true, stage: true, assignedBox: true, createdAt: true },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'TICKET_ADVANCE',
        ticketId: id,
        meta: { from, to } as Prisma.InputJsonValue,
      },
    });

    return { id: updated.id, from, to, ticket: updated };
  }

  async setName(id: string, fullName: string) {
  const before = await this.prisma.ticket.findUnique({
    where: { id },
    select: { id: true, fullName: true, queueNumber: true, stage: true, assignedBox: true, createdAt: true },
  });
  if (!before) throw new NotFoundException('Ticket no existe');

  const updated = await this.prisma.ticket.update({
    where: { id },
    data: { fullName },
    select: { id: true, fullName: true, queueNumber: true, stage: true, assignedBox: true, createdAt: true },
  });

  // Audit
  await this.prisma.auditLog.create({
    data: {
      action: 'TICKET_SET_NAME',
      ticketId: id,
      meta: {
        beforeFullName: before.fullName ?? null,
        afterFullName: updated.fullName ?? null,
      } as any,
    },
  });

  return updated;
}
}
