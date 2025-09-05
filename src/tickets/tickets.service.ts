import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

type Stage =
  | 'LIC_DOCS_IN_SERVICE'
  | 'WAITING_PSY'
  | 'PSY_IN_SERVICE'
  | 'WAITING_LIC_RETURN'
  | 'COMPLETED'
  | 'CANCELLED';

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService, private realtime: RealtimeGateway) {}

  listByStage(stage: Stage) {
    return this.prisma.ticket.findMany({
      where: { stage: stage as any },
      orderBy: [{ createdAt: 'asc' }, { queueNumber: 'asc' }],
      select: { id:true, queueNumber:true, fullName:true, stage:true, assignedBox:true, assignedUserId:true, createdAt:true },
    });
  }

  async setFullName(user: any, id: string, fullName: string) {
    const t = await this.prisma.ticket.findUnique({ where: { id } });
    if (!t) throw new ForbiddenException('Ticket no existe');

    const isAdmin = user.role === 'ADMIN';
    const isBoxOwner = user.role === 'BOX_AGENT' && t.assignedBox && user.boxNumber && t.assignedBox === user.boxNumber;

    if (!(isAdmin || isBoxOwner)) {
      throw new ForbiddenException('No autorizado para nombrar este ticket');
    }

    const updated = await this.prisma.ticket.update({
      where: { id },
      data: { fullName },
      select: { id:true, queueNumber:true, fullName:true, stage:true, assignedBox:true },
    });

    this.realtime.emit('ticket.updated', updated, [ `public:stage:${updated.stage}` ]);
    return updated;
  }

  async transition(user:any, id:string, toStage:Stage) {
    const t = await this.prisma.ticket.findUnique({ where: { id } });
    if (!t) throw new ForbiddenException('Ticket no existe');

    const isAdmin = user.role === 'ADMIN';
    const isBox = user.role === 'BOX_AGENT';
    const isPsy  = user.role === 'PSYCHO_AGENT';

    const isMyBox = isBox && user.boxNumber && t.assignedBox === user.boxNumber;
    const isMyPsy = isPsy && t.assignedUserId === user.sub;

    //permisos
    const allowed =
      isAdmin ||
      (isBox && isMyBox && t.stage === 'LIC_DOCS_IN_SERVICE' && toStage === 'WAITING_PSY') ||
      (isBox && isMyBox && t.stage === 'WAITING_LIC_RETURN' && toStage === 'COMPLETED') ||
      (isPsy && isMyPsy && t.stage === 'PSY_IN_SERVICE' && (toStage === 'WAITING_LIC_RETURN' || toStage === 'CANCELLED'));

    if (!allowed) {
      throw new ForbiddenException('Transición no permitida para tu rol o ámbito');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.ticket.update({ where: { id }, data: { stage: toStage as any } });
      await tx.auditLog.create({
        data: {
          ticketId: id, userId: user?.sub, action: 'TRANSITION',
          fromStage: t.stage as any, toStage: toStage as any, metadata: {} as any
        }
      });
      return u;
    });

    this.realtime.emit('ticket.transitioned', { id, from: t.stage, to: toStage }, [
      `public:stage:${toStage}`,
      `public:stage:${t.stage}`,
    ]);

    return updated;
  }
}