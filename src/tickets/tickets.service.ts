import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import type { Etapa, Estado } from './dto/ticket.enums'; 


@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rt: RealtimeGateway,
  ) {}

  /** YYYY-MM-DD -> Date (00:00 local) */
  private toDate(dateISO: string) {
    return new Date(`${dateISO}T00:00:00`);
  }

  async snapshot(dateISO: string) {
    const date = this.toDate(dateISO);
    const all = await this.prisma.ticket.findMany({
      where: { date },
      orderBy: { createdAt: 'asc' },
    });

    const colas: Record<Etapa, any[]> = {
      RECEPCION: [],
      BOX: [],
      PSICO: [],
      FINAL: [],
    };
    let nowServing: any = null;

    for (const t of all) {
      if (t.status === 'FINALIZADO' || t.status === 'CANCELADO') continue;
      // si tu Prisma enum ya devuelve strings compatibles, esto funciona directo
      colas[t.stage as Etapa].push(t);
      if (t.status === 'EN_ATENCION') nowServing = t;
    }

    return { date: dateISO, colas, nowServing };
  }

  async create(nombre: string | undefined, dateISO: string) {
    const date = this.toDate(dateISO);

    const created = await this.prisma.ticket.create({
      data: {
        nombre: nombre ?? null,
        date,
        status: 'EN_COLA' as any,
        stage: 'RECEPCION' as any,
      },
    });

    // Broadcast
    this.rt.emitTurnoCreated(created);
    this.rt.emitQueueSnapshot(await this.snapshot(dateISO));

    return created;
  }

  async patch(id: string, patch: { nombre?: string; status?: Estado; stage?: Etapa }) {
    const data: any = {};
    if (patch.nombre !== undefined) data.nombre = patch.nombre;
    if (patch.status !== undefined) data.status = patch.status as any;
    if (patch.stage  !== undefined) data.stage  = patch.stage as any;

    const updated = await this.prisma.ticket.update({
      where: { id },
      data,
    });

    // Broadcast
    this.rt.emitTurnoUpdated(updated);
    this.rt.emitQueueSnapshot(
      await this.snapshot(updated.date.toISOString().slice(0, 10)),
    );

    return updated;
  }

  /**
   * Toma el siguiente ticket de la cola de una etapa, en forma transaccional.
   * Intenta usar isolation level alto; si no está soportado (p.ej. SQLite), hace fallback.
   */
  async takeNext(stage: Etapa, dateISO: string) {
  const date = this.toDate(dateISO);

  // orden de búsqueda: primero la misma etapa, si no hay, la anterior
  const fallback: Record<Etapa, Etapa | null> = {
    RECEPCION: null,
    BOX: 'RECEPCION',
    PSICO: 'BOX',
    FINAL: null,
  };

  const runTx = async (tx: PrismaService) => {
    // helper para buscar y (opcionalmente) promover
    const pickFrom = async (fromStage: Etapa, promoteTo?: Etapa) => {
      const next = await (tx as any).ticket.findFirst({
        where: { date, stage: fromStage as any, status: 'EN_COLA' as any },
        orderBy: { createdAt: 'asc' },
      });
      if (!next) return null;

      const data: any = { status: 'EN_ATENCION' as any };
      if (promoteTo && promoteTo !== fromStage) data.stage = promoteTo as any;

      return await (tx as any).ticket.update({
        where: { id: next.id },
        data,
      });
    };

    // 1) intento en la etapa actual
    let updated = await pickFrom(stage);

    // 2) si no hay, pruebo en la anterior y promuevo
    if (!updated && fallback[stage]) {
      updated = await pickFrom(fallback[stage]!, stage);
    }

    return updated;
  };

  let result: any = null;
  try {
    result = await (this.prisma as any).$transaction(async (tx: any) => runTx(tx as PrismaService), { isolationLevel: 'Serializable' });
  } catch {
    result = await (this.prisma as any).$transaction(async (tx: any) => runTx(tx as PrismaService));
  }

  if (result) {
    this.rt.emitTurnoUpdated(result);
    this.rt.emitNowServing(result);
    this.rt.emitQueueSnapshot(await this.snapshot(dateISO));
  }

  return result; // puede ser null
}


}
