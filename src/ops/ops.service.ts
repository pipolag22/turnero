// src/ops/ops.service.ts
import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { Prisma } from '@prisma/client';

type JwtUser = {
  sub: string;           // id del usuario (JWT subject)
  role: 'ADMIN' | 'BOX_AGENT' | 'PSYCHO_AGENT';
  boxNumber?: number | null;
};

@Injectable()
export class OpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  // BOX: crea ticket anónimo y lo asigna al box
  async callNextLic(user: JwtUser) {
    if (user.role !== 'BOX_AGENT' || !user.boxNumber) {
      throw new ForbiddenException('Solo BOX con boxNumber');
    }

    const ticket = await this.prisma.$transaction(async (tx) => {
      const t = await tx.ticket.create({
        data: {
          stage: 'LIC_DOCS_IN_SERVICE' as any,
          assignedBox: user.boxNumber!,
          assignedUserId: user.sub,
          calledAt: new Date(),
        },
        select: {
          id: true,
          queueNumber: true,
          stage: true,
          assignedBox: true,
          createdAt: true,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'CALL_NEXT',
          ticketId: t.id,
          userId: user.sub,
          meta: {
            fromStage: null,
            toStage: 'LIC_DOCS_IN_SERVICE',
            boxNumber: user.boxNumber,
          } as Prisma.InputJsonValue,
        },
      });

      return t;
    });

    // Emitimos después de confirmar la transacción
    this.realtime.emit('ticket.called', ticket, [
      'public:stage:LIC_DOCS_IN_SERVICE',
    ]);

    return ticket;
  }

  // PSICO: toma el primero en WAITING_PSY
  async callNextPsy(user: JwtUser) {
    if (user.role !== 'PSYCHO_AGENT') {
      throw new ForbiddenException('Solo PSICO');
    }

    const rows = await this.prisma.$queryRaw<
      Array<{ id: string; queueNumber: number; stage: string; assignedUserId: string; createdAt: Date }>
    >`
      WITH cte AS (
        SELECT id FROM "Ticket"
        WHERE stage = 'WAITING_PSY'
        ORDER BY "createdAt" ASC, "queueNumber" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      UPDATE "Ticket" t
      SET stage = 'PSY_IN_SERVICE',
          "assignedUserId" = ${user.sub},
          "updatedAt" = NOW()
      FROM cte
      WHERE t.id = cte.id
      RETURNING t.id, t."queueNumber", t.stage, t."assignedUserId", t."createdAt";
    `;

    const picked = rows?.[0] ?? null;

    if (picked) {
      // Audit
      await this.prisma.auditLog.create({
        data: {
          action: 'PICK_PSY',
          ticketId: picked.id,
          userId: user.sub,
          meta: {
            fromStage: 'WAITING_PSY',
            toStage: 'PSY_IN_SERVICE',
          } as Prisma.InputJsonValue,
        },
      });

      // Eventos para ambas colas
      this.realtime.emit(
        'ticket.transitioned',
        { id: picked.id, from: 'WAITING_PSY', to: 'PSY_IN_SERVICE' },
        ['public:stage:WAITING_PSY', 'public:stage:PSY_IN_SERVICE'],
      );
    }

    return picked;
  }
}
