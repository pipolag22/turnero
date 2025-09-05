import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';

type RoleEnum = 'ADMIN' | 'BOX_AGENT' | 'PSYCHO_AGENT';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /** Crear usuario (solo admin) */
  async create(requestUser: any, dto: { email:string; name:string; password:string; role:RoleEnum; office?:string; boxNumber?:number }) {
    if (requestUser.role !== 'ADMIN') throw new ForbiddenException('Solo ADMIN');
    return this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        role: dto.role as any,
        office: dto.office,
        boxNumber: dto.boxNumber,
        passwordHash: await argon2.hash(dto.password),
      },
      select: { id:true, email:true, name:true, role:true, office:true, boxNumber:true, createdAt:true },
    });
  }

  /** Listar usuarios  */
  async list(requestUser: any) {
    if (requestUser.role !== 'ADMIN') throw new ForbiddenException('Solo ADMIN');
    return this.prisma.user.findMany({
      orderBy: [{ createdAt: 'desc' }],
      select: { id:true, email:true, name:true, role:true, office:true, boxNumber:true, createdAt:true },
    });
  }

  /** Editar nombre/office/boxNumber/role */
  async update(requestUser: any, id: string, patch: Partial<{ name:string; role:RoleEnum; office:string|null; boxNumber:number|null }>) {
    if (requestUser.role !== 'ADMIN') throw new ForbiddenException('Solo ADMIN');
    const exists = await this.prisma.user.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Usuario no existe');

    return this.prisma.user.update({
      where: { id },
      data: {
        name: patch.name ?? undefined,
        role: (patch.role as any) ?? undefined,
        office: patch.office === null ? null : patch.office ?? undefined,
        boxNumber: patch.boxNumber === null ? null : patch.boxNumber ?? undefined,
      },
      select: { id:true, email:true, name:true, role:true, office:true, boxNumber:true, createdAt:true },
    });
  }

  /** Resetear password */
  async resetPassword(requestUser: any, id: string, newPassword: string) {
    if (requestUser.role !== 'ADMIN') throw new ForbiddenException('Solo ADMIN');
    const exists = await this.prisma.user.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Usuario no existe');

    return this.prisma.user.update({
      where: { id },
      data: { passwordHash: await argon2.hash(newPassword) },
      select: { id:true, email:true, name:true, role:true },
    });
  }

  /** Eliminar */
  async remove(requestUser: any, id: string) {
    if (requestUser.role !== 'ADMIN') throw new ForbiddenException('Solo ADMIN');
    const exists = await this.prisma.user.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Usuario no existe');

    return this.prisma.user.delete({
      where: { id },
      select: { id:true, email:true },
    });
  }
}
