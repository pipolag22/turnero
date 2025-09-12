import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { Prisma, TicketStage, TicketStatus } from '@prisma/client';

@Injectable()
export class OpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  private startOfDay(dateISO: string) { return new Date(`${dateISO}T00:00:00`); }
  private todayISO() {
    const d = new Date(); const mm = String(d.getMonth()+1).padStart(2,'0'); const dd = String(d.getDate()).padStart(2,'0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  private async ensureBoxFree(tx: Prisma.TransactionClient, day: Date, box: number) {
    const busy = await tx.ticket.findFirst({
      where: { date: day, assignedBox: box, status: { in: [TicketStatus.EN_COLA, TicketStatus.EN_ATENCION] } },
    });
    if (busy) throw new BadRequestException('BOX_BUSY');
  }

  // ---------- LLAMAR ----------
  async callNextDocs(user: { id: string; boxNumber: number }, date?: string) {
    const box = user.boxNumber;
    const day = this.startOfDay(date ?? this.todayISO());

    const called = await this.prisma.$transaction(async (tx) => {
      await this.ensureBoxFree(tx, day, box);

      const next = await tx.ticket.findFirst({
        where: { date: day, stage: TicketStage.RECEPCION, status: TicketStatus.EN_COLA, assignedBox: null },
        orderBy: { createdAt: 'asc' },
      });
      if (!next) return null;

      return tx.ticket.update({
        where: { id: next.id },
        data: {
          stage: TicketStage.BOX,
          status: TicketStatus.EN_COLA,        // llamando
          assignedBox: box,
          assignedUserId: user.id,
          calledAt: new Date(),
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (called) this.realtime.emit('ticket.called', called);
    return called;
  }

  async callNextRet(user: { id: string; boxNumber: number }, date?: string) {
    const box = user.boxNumber;
    const day = this.startOfDay(date ?? this.todayISO());

    const called = await this.prisma.$transaction(async (tx) => {
      await this.ensureBoxFree(tx, day, box);

      const next = await tx.ticket.findFirst({
        where: { date: day, stage: TicketStage.FINAL, status: TicketStatus.EN_COLA, assignedBox: null },
        orderBy: { createdAt: 'asc' },
      });
      if (!next) return null;

      return tx.ticket.update({
        where: { id: next.id },
        data: {
          status: TicketStatus.EN_COLA,        // llamando
          assignedBox: box,
          assignedUserId: user.id,
          calledAt: new Date(),
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (called) this.realtime.emit('ticket.called', called);
    return called;
  }

  async callNextPsy(userId: string, date?: string) {
    if (!userId) throw new BadRequestException('USER_ID_REQUIRED');
    const day = this.startOfDay(date ?? this.todayISO());

    const toCall = await this.prisma.ticket.findFirst({
      where: { date: day, stage: TicketStage.PSICO, status: TicketStatus.EN_COLA, assignedUserId: null },
      orderBy: { createdAt: 'asc' },
    });
    if (!toCall) return null;

    const updated = await this.prisma.ticket.update({
      where: { id: toCall.id },
      data: { status: TicketStatus.EN_COLA, assignedUserId: userId, calledAt: new Date() },
    });

    this.realtime.emit('ticket.called', updated);
    return updated;
  }

  // ---------- ATENDER ----------
  async markAttending(params: { ticketId: string; box: number }) {
    const { ticketId, box } = params;
    const current = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!current) throw new BadRequestException('NOT_FOUND');
    if (current.assignedBox !== box) throw new BadRequestException('NOT_YOUR_TICKET');
    if (current.status !== TicketStatus.EN_COLA) throw new BadRequestException('INVALID_STATUS');

    const updated = await this.prisma.ticket.update({ where: { id: ticketId }, data: { status: TicketStatus.EN_ATENCION } });
    this.realtime.emit('ticket.updated', updated);
    return updated;
  }

  async psyAttend(params: { ticketId: string; userId: string }) {
    const { ticketId, userId } = params;
    if (!userId) throw new BadRequestException('USER_ID_REQUIRED');

    const current = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!current) throw new BadRequestException('NOT_FOUND');
    if (String(current.assignedUserId) !== String(userId)) throw new BadRequestException('NOT_YOUR_TICKET');
    if (current.stage !== TicketStage.PSICO) throw new BadRequestException('INVALID_STAGE');
    if (current.status !== TicketStatus.EN_COLA) throw new BadRequestException('INVALID_STATUS');

    const updated = await this.prisma.ticket.update({ where: { id: ticketId }, data: { status: TicketStatus.EN_ATENCION } });
    this.realtime.emit('ticket.updated', updated);
    return updated;
  }

  // ---------- FINALIZAR ----------
  async finishFromBox(params: { ticketId: string; box: number }) {
    const { ticketId, box } = params;
    const current = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!current) throw new BadRequestException('NOT_FOUND');
    if (current.assignedBox !== box) throw new BadRequestException('NOT_YOUR_TICKET');

    let updated;
    if (current.stage === TicketStage.BOX) {
      updated = await this.prisma.ticket.update({
        where: { id: ticketId },
        data: { stage: TicketStage.PSICO, status: TicketStatus.EN_COLA, assignedBox: null, assignedUserId: null, calledAt: null },
      });
    } else if (current.stage === TicketStage.FINAL) {
      updated = await this.prisma.ticket.update({
        where: { id: ticketId },
        data: { status: TicketStatus.FINALIZADO, assignedBox: null, assignedUserId: null, calledAt: null },
      });
    } else {
      throw new BadRequestException('INVALID_STAGE_FOR_FINISH');
    }

    this.realtime.emit('ticket.finished', updated);
    return updated;
  }

  async psyFinish(params: { ticketId: string; userId: string }) {
    const { ticketId, userId } = params;
    if (!userId) throw new BadRequestException('USER_ID_REQUIRED');

    const current = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!current) throw new BadRequestException('NOT_FOUND');
    if (String(current.assignedUserId) !== String(userId)) throw new BadRequestException('NOT_YOUR_TICKET');
    if (current.stage !== TicketStage.PSICO) throw new BadRequestException('INVALID_STAGE');
    if (current.status !== TicketStatus.EN_ATENCION) throw new BadRequestException('INVALID_STATUS');

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { stage: TicketStage.FINAL, status: TicketStatus.EN_COLA, assignedUserId: null, calledAt: null },
    });

    this.realtime.emit('ticket.finished', updated);
    return updated;
  }
}
