
import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';

type RoleEnum = 'ADMIN' | 'BOX_AGENT' | 'PSYCHO_AGENT';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

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
}

