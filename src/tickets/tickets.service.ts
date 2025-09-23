import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import type { Etapa, Estado } from './ticket.enums';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rt: RealtimeGateway,
  ) {}

 
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
      CAJERO: [],
      FINAL: [],
    };
    let nowServing: any = null;

    for (const t of all) {
      
      if (t.status === 'FINALIZADO' || t.status === 'CANCELADO') continue;

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

  
  async takeNext(stage: Etapa, dateISO: string) {
    const date = this.toDate(dateISO);

  
  const fallbackChain: Record<Etapa, Etapa[]> = {
    RECEPCION: [],
    BOX:       ['RECEPCION'],
    PSICO:     ['BOX'],
    CAJERO:    ['PSICO', 'BOX'], 
    FINAL:     ['CAJERO'],
  };

  const runTx = async (tx: PrismaService) => {
    const tryPick = async (from: Etapa, promoteTo?: Etapa) => {
      const next = await (tx as any).ticket.findFirst({
        where: { date, stage: from as any, status: 'EN_COLA' as any },
        orderBy: { createdAt: 'asc' },
      });
      if (!next) return null;

      const data: any = { status: 'EN_ATENCION' as any };
      if (promoteTo && promoteTo !== from) data.stage = promoteTo as any;

      return (tx as any).ticket.update({ where: { id: next.id }, data });
    };

    
    let updated = await tryPick(stage);
    if (updated) return updated;

    
    for (const prev of fallbackChain[stage]) {
      updated = await tryPick(prev, stage);
      if (updated) return updated;
    }

    return null;
  };

  let result: any;
  try {
    result = await (this.prisma as any).$transaction(
      async (tx: any) => runTx(tx as PrismaService),
      { isolationLevel: 'Serializable' },
    );
  } catch {
    result = await (this.prisma as any).$transaction(
      async (tx: any) => runTx(tx as PrismaService),
    );
  }

  if (result) {
    this.rt.emitTurnoUpdated(result);
    this.rt.emitNowServing(result);
    this.rt.emitQueueSnapshot(await this.snapshot(dateISO));
  }

  return result; 
 }
 }