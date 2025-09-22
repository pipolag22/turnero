// prisma/seed.ts
import { resolve } from 'node:path';
import * as dotenv from 'dotenv';
dotenv.config({ path: resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';


const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});



type RoleEnum = 'ADMIN' | 'BOX_AGENT' | 'PSYCHO_AGENT';

async function main() {
  const email = 'admin@computo.local';
  const exists = await prisma.user.findUnique({ where: { email } });
  if (!exists) {
    await prisma.user.create({
      data: {
        email,
        name: 'Admin',
        role: 'ADMIN' as RoleEnum,
        passwordHash: await argon2.hash('computo22'),
      },
    });
  }
  console.log('Seed OK -> admin@computo.local / computo22');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
