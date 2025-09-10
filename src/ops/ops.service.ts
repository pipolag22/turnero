import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { TicketStage, TicketStatus } from '@prisma/client';

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

  /**
   * Llama al siguiente ticket de la cola de una etapa,
   * lo pasa a EN_ATENCION y asigna box/usuario.
   */
  async callNext(params: {
    stage: TicketStage;
    box?: number | null;
    userId: string;
    date: string;
  }) {
    const { stage, box, userId, date } = params;
    const day = this.startOfDay(date);

    const next = await this.prisma.ticket.findFirst({
      where: { date: day, stage, status: TicketStatus.EN_COLA },
      orderBy: { createdAt: 'asc' },
    });
    if (!next) return null;

    const ticket = await this.prisma.ticket.update({
      where: { id: next.id },
      data: {
        status: TicketStatus.EN_ATENCION,
        assignedBox: box ?? null,
        assignedUserId: userId,
        calledAt: new Date(),
      },
      select: {
        id: true,
        nombre: true,
        stage: true,
        status: true,
        date: true,
        assignedBox: true,
        assignedUserId: true,
        calledAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    this.realtime.emit('ticket.called', ticket);
    return ticket;
  }

  /** Wrapper para tu endpoint existente /ops/call-next-lic */
  async callNextLic(user: JwtUser, date?: string) {
    return this.callNext({
      stage: TicketStage.BOX,
      box: user.boxNumber ?? null,
      userId: user.id,
      date: date ?? this.todayISO(),
    });
  }

  /** Wrapper para tu endpoint existente /ops/call-next-psy */
  async callNextPsy(user: JwtUser, date?: string) {
    return this.callNext({
      stage: TicketStage.PSICO,
      box: null,
      userId: user.id,
      date: date ?? this.todayISO(),
    });
  }

  /** Cerrar ticket (ejemplo) */
  async finish(id: string) {
    const ticket = await this.prisma.ticket.update({
      where: { id },
      data: { status: TicketStatus.FINALIZADO },
    });
    this.realtime.emit('ticket.finished', ticket);
    return ticket;
  }
}
