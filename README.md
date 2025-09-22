# Turnero API (NestJS + Prisma + PostgreSQL)

API backend para la gestión de turnos de licencias.  
Construido con [NestJS](https://nestjs.com/), [Prisma](https://www.prisma.io/) y [PostgreSQL](https://www.postgresql.org/).

## 🚀 Funcionalidad
- Registro y autenticación de usuarios (JWT).
- Gestión de turnos:
  - Crear turnos.
  - Actualizar/cambiar de estado.
  - Obtener snapshot de la cola por fecha.
  - Llamar al próximo turno según etapa.
- Realtime con **WebSockets (Socket.IO)** para actualizar TV y boxes en vivo.
- Panel de administración con control de alertas y llamadas.
- Healthcheck `/health`.

---

## 📂 Estructura
api/
├─ prisma/ # Esquema y migraciones Prisma
├─ src/ # Código fuente NestJS
├─ Dockerfile # Dockerfile para build en producción
├─ docker-entrypoint.sh
└─ README.md

yaml
Copiar código

---

## ⚙️ Requisitos
- Node.js v20+
- PostgreSQL 15+
- npm o yarn
- (Opcional) Docker + Docker Compose

---

## 🔑 Variables de entorno

Crea un archivo `.env` en la carpeta `api/` con al menos:

```env
# Base de datos
DATABASE_URL="postgresql://usuario:password@localhost:5432/turnos?schema=public"

# JWT
JWT_SECRET="cambia_esto_por_un_secreto_largo_y_seguro"

# App
NODE_ENV=development
PORT=3000
🛠️ Instalación local (sin Docker)
bash
Copiar código
cd api
npm install
npx prisma generate
npx prisma migrate dev   # aplica migraciones
npx prisma db seed       # genera usuario admin inicial
npm run start:dev
Por defecto arranca en:
👉 http://localhost:3000

Usuario seed:

email: admin@computo.local

password: computo22

🐳 Uso con Docker
bash
Copiar código
docker build -t turnero-api .
docker run --env-file .env -p 3000:3000 turnero-api
📡 Endpoints principales
POST /auth/login → login

GET /users → lista usuarios

POST /tickets → crear turno

GET /tickets/snapshot?date=YYYY-MM-DD → snapshot

PATCH /tickets/:id → actualizar turno

POST /tickets/next → llamar siguiente

🧪 Test rápido
bash
Copiar código
curl http://localhost:3000/health
# {"status":"ok"}
