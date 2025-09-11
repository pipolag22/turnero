import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { Prisma, TicketStage, TicketStatus } from '@prisma/client';

type JwtUser = { id: string; boxNumber?: number | null };

@Injectable()
export class OpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  private startOfDay(dateISO: string) {
    return new Date(`${dateISO}T00:00:00`);
  }

  private todayISO() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  // ---------- Helpers ----------
  // NOTA: tx es Prisma.TransactionClient, no PrismaService
  private async ensureBoxFree(tx: Prisma.TransactionClient, day: Date, box: number) {
    const busy = await tx.ticket.findFirst({
      where: {
        date: day,
        assignedBox: box,
        status: { in: [TicketStatus.EN_COLA, TicketStatus.EN_ATENCION] },
      },
    });
    if (busy) throw new BadRequestException('BOX_BUSY');
  }

  // ---------- LLAMAR (queda "llamando" = EN_COLA con assignedBox/calledAt) ----------

  /** Documentación: toma de RECEPCION y lo mueve a BOX (sigue EN_COLA) */
  async callNextDocs(user: JwtUser, date?: string) {
    const box = user.boxNumber ?? null;
    if (!box) throw new BadRequestException('BOX_NUMBER_REQUIRED');

    const day = this.startOfDay(date ?? this.todayISO());

    const called = await this.prisma.$transaction(async (tx) => {
      await this.ensureBoxFree(tx, day, box);

      // primer ticket libre (no llamado aún)
      const next = await tx.ticket.findFirst({
        where: {
          date: day,
          stage: TicketStage.RECEPCION,
          status: TicketStatus.EN_COLA,
          assignedBox: null,
        },
        orderBy: { createdAt: 'asc' },
      });
      if (!next) return null;

      // lo movemos a BOX pero queda EN_COLA (llamando)
      const updated = await tx.ticket.update({
        where: { id: next.id },
        data: {
          stage: TicketStage.BOX,
          status: TicketStatus.EN_COLA,
          assignedBox: box,
          assignedUserId: user.id,
          calledAt: new Date(),
        },
      });

      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (called) this.realtime.emit('ticket.called', called);
    return called;
  }

  /** Retiro: toma de FINAL y lo deja en FINAL (llamando) */
  async callNextRet(user: JwtUser, date?: string) {
    const box = user.boxNumber ?? null;
    if (!box) throw new BadRequestException('BOX_NUMBER_REQUIRED');

    const day = this.startOfDay(date ?? this.todayISO());

    const called = await this.prisma.$transaction(async (tx) => {
      await this.ensureBoxFree(tx, day, box);

      const next = await tx.ticket.findFirst({
        where: {
          date: day,
          stage: TicketStage.FINAL,
          status: TicketStatus.EN_COLA,
          assignedBox: null,
        },
        orderBy: { createdAt: 'asc' },
      });
      if (!next) return null;

      const updated = await tx.ticket.update({
        where: { id: next.id },
        data: {
          // se mantiene en FINAL
          status: TicketStatus.EN_COLA,
          assignedBox: box,
          assignedUserId: user.id,
          calledAt: new Date(),
        },
      });

      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (called) this.realtime.emit('ticket.called', called);
    return called;
  }

  /** PSICO (si usás un panel de psico) */
  async callNextPsy(user: JwtUser, date?: string) {
    const day = this.startOfDay(date ?? this.todayISO());

    const next = await this.prisma.ticket.findFirst({
      where: { date: day, stage: TicketStage.PSICO, status: TicketStatus.EN_COLA },
      orderBy: { createdAt: 'asc' },
    });
    if (!next) return null;

    const ticket = await this.prisma.ticket.update({
      where: { id: next.id },
      data: {
        status: TicketStatus.EN_ATENCION,
        assignedUserId: user.id,
        calledAt: new Date(),
      },
    });

    this.realtime.emit('ticket.called', ticket);
    return ticket;
  }

  // ---------- ATENDER (pasar a EN_ATENCION) ----------
  async markAttending(params: { ticketId: string; box: number }) {
    const { ticketId, box } = params;

    const current = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!current) throw new BadRequestException('NOT_FOUND');
    if (current.assignedBox !== box) throw new BadRequestException('NOT_YOUR_TICKET');
    if (current.status !== TicketStatus.EN_COLA) throw new BadRequestException('INVALID_STATUS');

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status: TicketStatus.EN_ATENCION },
    });

    this.realtime.emit('ticket.updated', updated);
    return updated;
  }

  // ---------- FINALIZAR desde BOX ----------
  // - Si está en BOX -> deriva a PSICO (EN_COLA) y libera box
  // - Si está en FINAL -> FINALIZADO y libera box
  async finishFromBox(params: { ticketId: string; box: number }) {
    const { ticketId, box } = params;

    const current = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!current) throw new BadRequestException('NOT_FOUND');
    if (current.assignedBox !== box) throw new BadRequestException('NOT_YOUR_TICKET');

    let updated;
    if (current.stage === TicketStage.BOX) {
      updated = await this.prisma.ticket.update({
        where: { id: ticketId },
        data: {
          stage: TicketStage.PSICO,
          status: TicketStatus.EN_COLA,
          assignedBox: null,
          assignedUserId: null,
          calledAt: null,
        },
      });
    } else if (current.stage === TicketStage.FINAL) {
      updated = await this.prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: TicketStatus.FINALIZADO,
          assignedBox: null,
          assignedUserId: null,
          calledAt: null,
        },
      });
    } else {
      throw new BadRequestException('INVALID_STAGE_FOR_FINISH');
    }

    this.realtime.emit('ticket.finished', updated);
    return updated;
  }
}
