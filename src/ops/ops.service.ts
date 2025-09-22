import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, TicketStage, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

type DeriveTo = 'PSICO' | 'CAJERO' | 'FINAL';

@Injectable()
export class OpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  private startOfDay(dateISO: string) { return new Date(`${dateISO}T00:00:00`); }
  private todayISO() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  private async ensureBoxFree(tx: Prisma.TransactionClient, day: Date, box: number) {
    const busy = await tx.ticket.findFirst({
      where: { date: day, assignedBox: box, status: { in: [TicketStatus.EN_COLA, TicketStatus.EN_ATENCION] } },
    });
    if (busy) throw new BadRequestException('BOX_BUSY');
  }

  // ========= LLAMAR =========

  /** RECEPCIÓN -> BOX (asigna box físico) */
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
          status: TicketStatus.EN_COLA, // llamando
          assignedBox: box,
          assignedUserId: user.id,
          calledAt: new Date(),
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (called) this.realtime.emit('ticket.called', called);
    return called;
  }
async finishReturn(params: { ticketId: string; box: number }) {
    const { ticketId, box } = params;
    const t = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!t) throw new BadRequestException('NOT_FOUND');
    if (t.assignedBox !== box) throw new BadRequestException('NOT_YOUR_TICKET');
    if (t.stage !== TicketStage.FINAL) throw new BadRequestException('INVALID_STAGE');
    if (t.status !== TicketStatus.EN_ATENCION) throw new BadRequestException('INVALID_STATUS');

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: TicketStatus.FINALIZADO,
        assignedBox: null,
        assignedUserId: null,
        calledAt: null,
      },
    });

    this.realtime.emit('ticket.finished', updated);
    return updated;
  }
  /** FINAL -> BOX (retiro/entrega) */
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
          status: TicketStatus.EN_COLA, // llamando
          assignedBox: box,
          assignedUserId: user.id,
          calledAt: new Date(),
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (called) this.realtime.emit('ticket.called', called);
    return called;
  }
  // --- NUEVO: llamar específico a BOX ---
async boxCall(params: { ticketId: string; userId: string; box: number }) {
  const { ticketId, userId, box } = params;
  const t = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!t) throw new BadRequestException('NOT_FOUND');

  // Solo se puede desde RECP (va a BOX) o desde FINAL (retiro), y debe estar en cola y sin box asignado
  const validStage = t.stage === TicketStage.RECEPCION || t.stage === TicketStage.FINAL;
  if (!validStage) throw new BadRequestException('INVALID_STAGE');
  if (t.status !== TicketStatus.EN_COLA) throw new BadRequestException('INVALID_STATUS');
  if (t.assignedBox) throw new BadRequestException('ALREADY_RESERVED');

  // el box debe estar libre
  await this.ensureBoxFree(this.prisma, t.date, box);

  const updated = await this.prisma.ticket.update({
    where: { id: ticketId },
    data: {
      // si viene de recepción, lo movemos a BOX; si ya está en FINAL, se queda en FINAL
      stage: t.stage === TicketStage.RECEPCION ? TicketStage.BOX : TicketStage.FINAL,
      status: TicketStatus.EN_COLA,
      assignedBox: box,
      assignedUserId: userId,
      calledAt: new Date(),
    },
  });

  this.realtime.emit('ticket.called', updated);
  return updated;
}

  /** PSICO -> reservar siguiente para un psicólogo */
  async callNextPsy(userId: string, date?: string) {
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

  /** PSICO -> reservar un ticket específico por id (lo que usa /ops/psy/call) */
  async psyCall(params: { ticketId: string; userId: string }) {
    const { ticketId, userId } = params;
    const t = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!t) throw new BadRequestException('NOT_FOUND');
    if (t.stage !== TicketStage.PSICO || t.status !== TicketStatus.EN_COLA) {
      throw new BadRequestException('INVALID_STAGE_OR_STATUS');
    }
    if (t.assignedUserId) throw new BadRequestException('ALREADY_RESERVED');

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { assignedUserId: userId, calledAt: new Date() },
    });
    this.realtime.emit('ticket.called', updated);
    return updated;
  }

  /** CAJERO -> reservar siguiente para cajero */
  async callNextCashier(userId: string, date?: string) {
    const day = this.startOfDay(date ?? this.todayISO());
    const toCall = await this.prisma.ticket.findFirst({
      where: { date: day, stage: TicketStage.CAJERO, status: TicketStatus.EN_COLA, assignedUserId: null },
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

  // ========= ATENDER =========

  /** BOX/FINAL: pasar a EN_ATENCION (usa box físico) */
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

  /** PSICO: pasar a EN_ATENCION */
  async psyAttend(params: { ticketId: string; userId: string }) {
    const { ticketId, userId } = params;
    const current = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!current) throw new BadRequestException('NOT_FOUND');
    if (current.assignedUserId !== userId) throw new BadRequestException('NOT_YOUR_TICKET');
    if (current.stage !== TicketStage.PSICO) throw new BadRequestException('INVALID_STAGE');
    if (current.status !== TicketStatus.EN_COLA) throw new BadRequestException('INVALID_STATUS');

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status: TicketStatus.EN_ATENCION },
    });
    this.realtime.emit('ticket.updated', updated);
    return updated;
  }

  /** CAJERO: pasar a EN_ATENCION */
  async cashierAttend(params: { ticketId: string; userId: string }) {
    const { ticketId, userId } = params;
    const current = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!current) throw new BadRequestException('NOT_FOUND');
    if (current.assignedUserId !== userId) throw new BadRequestException('NOT_YOUR_TICKET');
    if (current.stage !== TicketStage.CAJERO) throw new BadRequestException('INVALID_STAGE');
    if (current.status !== TicketStatus.EN_COLA) throw new BadRequestException('INVALID_STATUS');

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status: TicketStatus.EN_ATENCION },
    });
    this.realtime.emit('ticket.updated', updated);
    return updated;
  }

  // ========= CANCELAR LLAMADO =========
async cashierCall(params: { ticketId: string; userId: string }) {
  const { ticketId, userId } = params;
  const t = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!t) throw new BadRequestException('NOT_FOUND');
  if (t.stage !== TicketStage.CAJERO) throw new BadRequestException('INVALID_STAGE');
  if (t.status !== TicketStatus.EN_COLA) throw new BadRequestException('INVALID_STATUS');
  if (t.assignedUserId) throw new BadRequestException('ALREADY_RESERVED');

  const updated = await this.prisma.ticket.update({
    where: { id: ticketId },
    data: { assignedUserId: userId, calledAt: new Date() },
  });

  this.realtime.emit('ticket.called', updated);
  return updated;
}
  /** BOX/FINAL: cancelar llamado y liberar box */
  async cancelFromBox(params: { ticketId: string; box: number }) {
    const { ticketId, box } = params;
    const current = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!current) throw new BadRequestException('NOT_FOUND');
    if (current.assignedBox !== box) throw new BadRequestException('NOT_YOUR_TICKET');
    if (current.status !== TicketStatus.EN_COLA) throw new BadRequestException('INVALID_STATUS');

    const data: Prisma.TicketUpdateInput = {
      status: TicketStatus.EN_COLA,
      assignedBox: null,
      assignedUserId: null,
      calledAt: null,
    };
    if (current.stage === TicketStage.BOX) data.stage = TicketStage.RECEPCION;

    const updated = await this.prisma.ticket.update({ where: { id: ticketId }, data });
    this.realtime.emit('ticket.updated', updated);
    return updated;
  }

  /** PSICO: cancelar llamado (libera reserva) */
  async psyCancel(params: { ticketId: string; userId: string }) {
    const { ticketId, userId } = params;
    const current = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!current) throw new BadRequestException('NOT_FOUND');
    if (current.assignedUserId !== userId) throw new BadRequestException('NOT_YOUR_TICKET');
    if (current.stage !== TicketStage.PSICO) throw new BadRequestException('INVALID_STAGE');
    if (current.status !== TicketStatus.EN_COLA) throw new BadRequestException('INVALID_STATUS');

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { assignedUserId: null, calledAt: null },
    });
    this.realtime.emit('ticket.updated', updated);
    return updated;
  }

  /** CAJERO: cancelar llamado (libera reserva) */
  async cashierCancel(params: { ticketId: string; userId: string }) {
    const { ticketId, userId } = params;
    const current = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!current) throw new BadRequestException('NOT_FOUND');
    if (current.assignedUserId !== userId) throw new BadRequestException('NOT_YOUR_TICKET');
    if (current.stage !== TicketStage.CAJERO) throw new BadRequestException('INVALID_STAGE');
    if (current.status !== TicketStatus.EN_COLA) throw new BadRequestException('INVALID_STATUS');

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { assignedUserId: null, calledAt: null },
    });
    this.realtime.emit('ticket.updated', updated);
    return updated;
  }

  // ========= DERIVAR / FINALIZAR =========

  /** BOX decide a dónde mandar: PSICO | CAJERO | FINAL */
  // OpsService.boxDerive
async boxDerive(params: { ticketId: string; box: number; to: 'PSICO' | 'CAJERO' | 'FINAL' }) {
    const { ticketId, box, to } = params;
    const current = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!current) throw new BadRequestException('NOT_FOUND');
    if (current.assignedBox !== box) throw new BadRequestException('NOT_YOUR_TICKET');

    // ✅ evitar includes() con enums para que TS no se queje
    if (current.stage !== TicketStage.BOX && current.stage !== TicketStage.FINAL) {
      throw new BadRequestException('INVALID_STAGE');
    }
    if (current.status !== TicketStatus.EN_ATENCION) {
      throw new BadRequestException('INVALID_STATUS');
    }

    const targetStage =
      to === 'CAJERO' ? TicketStage.CAJERO :
      to === 'FINAL'  ? TicketStage.FINAL  :
                        TicketStage.PSICO;

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        stage: targetStage,
        status: TicketStatus.EN_COLA,
        assignedBox: null,
        assignedUserId: null,
        calledAt: null,
      },
    });

    this.realtime.emit('ticket.finished', updated);
    return updated;
  }

  // Finalizar desde BOX (cuando está atendiendo BOX o FINAL)
  async boxFinish(params: { ticketId: string; box: number }) {
    const { ticketId, box } = params;

    const current = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!current) throw new BadRequestException('NOT_FOUND');
    if (current.assignedBox !== box) throw new BadRequestException('NOT_YOUR_TICKET');
    if (current.status !== TicketStatus.EN_ATENCION) throw new BadRequestException('INVALID_STATUS');

    // ✅ chequeo explícito (sin includes)
    if (current.stage !== TicketStage.BOX && current.stage !== TicketStage.FINAL) {
      throw new BadRequestException('INVALID_STAGE');
    }

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        stage: TicketStage.FINAL,
        status: TicketStatus.FINALIZADO,
        assignedBox: null,
        assignedUserId: null,
        calledAt: null,
      },
    });

    this.realtime.emit('ticket.finished', updated);
    return updated;
  }


  /** CAJERO termina → pasa a FINAL (en cola) */
  async cashierFinish(params: { ticketId: string; userId: string }) {
    const { ticketId, userId } = params;
    const current = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!current) throw new BadRequestException('NOT_FOUND');
    if (current.assignedUserId !== userId) throw new BadRequestException('NOT_YOUR_TICKET');
    if (current.stage !== TicketStage.CAJERO) throw new BadRequestException('INVALID_STAGE');
    if (current.status !== TicketStatus.EN_ATENCION) throw new BadRequestException('INVALID_STATUS');

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        stage: TicketStage.FINAL,
        status: TicketStatus.EN_COLA,
        assignedUserId: null,
        calledAt: null,
      },
    });
    this.realtime.emit('ticket.finished', updated);
    return updated;
  }

  /** PSICO termina → pasa a FINAL (en cola) */
  async psyFinish(params: { ticketId: string; userId: string }) {
    const { ticketId, userId } = params;
    const current = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!current) throw new BadRequestException('NOT_FOUND');
    if (current.assignedUserId !== userId) throw new BadRequestException('NOT_YOUR_TICKET');
    if (current.stage !== TicketStage.PSICO) throw new BadRequestException('INVALID_STAGE');
    if (current.status !== TicketStatus.EN_ATENCION) throw new BadRequestException('INVALID_STATUS');

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        stage: TicketStage.FINAL,
        status: TicketStatus.EN_COLA,
        assignedUserId: null,
        calledAt: null,
      },
    });
    this.realtime.emit('ticket.finished', updated);
    return updated;
  }
   

}
