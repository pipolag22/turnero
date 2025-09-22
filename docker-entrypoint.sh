#!/bin/sh
set -e

echo "API: usando NODE_ENV=${NODE_ENV}, PORT=${PORT}"

# 1) Generar cliente Prisma
echo "Prisma: generate…"
npx prisma generate

# 2) Si HAY migraciones, aplicar. Si NO hay, usar db push para crear tablas.
if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations | wc -l)" -gt "0" ]; then
  echo "Prisma: migrate deploy…"
  npx prisma migrate deploy
else
  echo "Prisma: NO hay migraciones → db push (crea tablas segun schema)…"
  npx prisma db push
fi

# 3) Seed (que cree el admin si no existe). No tumbar el contenedor si falla.
echo "Prisma: seed…"
npx prisma db seed || true

# 4) Iniciar Nest: soportar dist/main.js y dist/src/main.js
echo "Iniciando NestJS…"
APP="dist/main.js"
[ -f "dist/src/main.js" ] && APP="dist/src/main.js"
node "$APP"
