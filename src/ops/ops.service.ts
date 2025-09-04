import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OpsService {
  constructor(private prisma: PrismaService) {}

  // BOX: crea ticket anónimo y lo asigna al box
  async callNextLic(user:any) {
    if (user.role !== 'BOX_AGENT' || !user.boxNumber) throw new ForbiddenException('Solo BOX con boxNumber');
    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.create({
        data: {
          stage: 'LIC_DOCS_IN_SERVICE' as any,
          assignedBox: user.boxNumber,
          assignedUserId: user.sub,
          calledAt: new Date(),
        },
        select: { id:true, queueNumber:true, stage:true, assignedBox:true, createdAt:true },
      });
      await tx.auditLog.create({
        data: { ticketId: ticket.id, userId: user.sub, action:'CALL_NEXT',
                fromStage: null as any, toStage: 'LIC_DOCS_IN_SERVICE' as any, metadata: { boxNumber: user.boxNumber } as any }
      });
      return ticket;
    });
  }

  // PSICO: toma el primero en WAITING_PSY
  async callNextPsy(user:any) {
    if (user.role !== 'PSYCHO_AGENT') throw new ForbiddenException('Solo PSICO');
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<any[]>`
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
      return rows?.[0] ?? null;
    });
  }
}

