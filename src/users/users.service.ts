// src/users/users.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as argon2 from 'argon2';
import { Prisma } from '@prisma/client';



@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email ya registrado');

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        role: dto.role as any,
        office: dto.office ?? null,
        boxNumber: dto.boxNumber ?? null,
        passwordHash,
      },
      select: { id: true, email: true, name: true, role: true, office: true, boxNumber: true, createdAt: true },
    });

    const logData: Prisma.AuditLogCreateInput = {
      action: 'USER_CREATE',
      userId: user.id,
      meta: { email: user.email } as Prisma.InputJsonValue,
    };
    await this.prisma.auditLog.create({ data: logData });

    return user;
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, office: true, boxNumber: true, createdAt: true },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    const u = await this.prisma.user.findUnique({ where: { id } });
    if (!u) throw new NotFoundException('Usuario no existe');

    if ((dto as any).email && (dto as any).email !== u.email) {
      const emailUsed = await this.prisma.user.findUnique({ where: { email: (dto as any).email } });
      if (emailUsed) throw new ConflictException('Email ya registrado');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name ?? undefined,
        office: dto.office ?? undefined,
        boxNumber: dto.boxNumber ?? undefined,
        role: (dto as any).role ?? undefined,
      },
      select: { id: true, email: true, name: true, role: true, office: true, boxNumber: true, createdAt: true },
    });

    const logData: Prisma.AuditLogCreateInput = {
      action: 'USER_UPDATE',
      userId: id,
      meta: { changes: { ...dto } } as Prisma.InputJsonValue,
    };
    await this.prisma.auditLog.create({ data: logData });

    return updated;
  }

   async resetPassword(id: string, newPassword: string) {
    const u = await this.prisma.user.findUnique({ where: { id } });
    if (!u) throw new NotFoundException('Usuario no existe');

    const passwordHash = await argon2.hash(newPassword);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    try {
      await this.prisma.auditLog.create({
        data: {
          action: 'USER_RESET_PASSWORD',
          userId: id,
          meta: { by: 'admin', reason: 'manual reset' } as Prisma.InputJsonValue,
        },
      });
    } catch {
      // swallow
    }

    return { ok: true };
  }
  
  async remove(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const u = await tx.user.findUnique({ where: { id } });
      if (!u) throw new NotFoundException('Usuario no existe');

      // “Liberar cualquier ticket que estuviera reservado/asignado a este usuario
      await tx.ticket.updateMany({
        where: { assignedUserId: id },
        data: {
          assignedUserId: null,
          calledAt: null, 
        },
      });

      
      await tx.user.delete({ where: { id } });

      
      await tx.auditLog.create({
        data: {
          action: 'USER_DELETE',
          userId: id,
          meta: { hard: true } as Prisma.InputJsonValue,
        },
      });

      return { ok: true };
    });
  }
  
}
