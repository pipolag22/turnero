// prisma/seed.ts
import { resolve } from 'node:path';
import * as dotenv from 'dotenv';
dotenv.config({ path: resolve(__dirname, '../.env') }); // 👈 carga api/.env

import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

// Pasamos la URL explícitamente para evitar problemas de carga de env
const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

// (opcional) descomentar si querés verificar que llegó la URL
// console.log('DATABASE_URL =', process.env.DATABASE_URL);

type RoleEnum = 'ADMIN' | 'BOX_AGENT' | 'PSYCHO_AGENT';

async function main() {
  const email = 'admin@demo.local';
  const exists = await prisma.user.findUnique({ where: { email } });
  if (!exists) {
    await prisma.user.create({
      data: {
        email,
        name: 'Admin',
        role: 'ADMIN' as RoleEnum,
        passwordHash: await argon2.hash('admin123'),
      },
    });
  }
  console.log('Seed OK -> admin@demo.local / admin123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
