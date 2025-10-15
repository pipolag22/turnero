const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@computo.local';
  const pass = 'computo22';

  const exists = await prisma.user.findUnique({ where: { email } });
  if (!exists) {
    await prisma.user.create({
      data: {
        email,
        name: 'Admin',
        role: 'ADMIN',
        passwordHash: await argon2.hash(pass),
      },
    });
    console.log(`Seed OK -> ${email} / ${pass}`);
  } else {
    console.log('Seed: usuario admin ya existe, no se crea.');
  }
}

main()
  .catch((e) => { console.error('Seed error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
