import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type Stage =
  | 'LIC_DOCS_IN_SERVICE'
  | 'WAITING_PSY'
  | 'PSY_IN_SERVICE'
  | 'WAITING_LIC_RETURN'
  | 'COMPLETED'
  | 'CANCELLED';

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  listByStage(stage: Stage) {
    return this.prisma.ticket.findMany({
      where: { stage: stage as any },
      orderBy: [{ createdAt: 'asc' }, { queueNumber: 'asc' }],
      select: { id:true, queueNumber:true, fullName:true, stage:true, assignedBox:true, createdAt:true },
    });
  }

  async setFullName(user: any, id: string, fullName: string) {
    const t = await this.prisma.ticket.findUnique({ where: { id } });
    if (!t) throw new ForbiddenException('Ticket no existe');
    // Permite admin o el box que lo llamó
    if (!(user.role === 'ADMIN' || (user.role === 'BOX_AGENT' && user.sub === t.assignedUserId))) {
      throw new ForbiddenException('No autorizado');
    }
    return this.prisma.ticket.update({ where: { id }, data: { fullName },
      select: { id:true, queueNumber:true, fullName:true, stage:true } });
  }

  async transition(user:any, id:string, toStage:Stage) {
    const t = await this.prisma.ticket.findUnique({ where: { id } });
    if (!t) throw new ForbiddenException('Ticket no existe');

    const allowed =
      (user.role === 'BOX_AGENT'    && ['WAITING_PSY','WAITING_LIC_RETURN','COMPLETED'].includes(toStage)) ||
      (user.role === 'PSYCHO_AGENT' && ['PSY_IN_SERVICE','WAITING_LIC_RETURN','CANCELLED'].includes(toStage)) ||
      (user.role === 'ADMIN');

    if (!allowed) throw new ForbiddenException('Transición no permitida');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.ticket.update({ where: { id }, data: { stage: toStage as any } });
      await tx.auditLog.create({
        data: {
          ticketId: id, userId: user?.sub, action: 'TRANSITION',
          fromStage: t.stage as any, toStage: toStage as any, metadata: {} as any
        }
      });
      return updated;
    });
  }
}

