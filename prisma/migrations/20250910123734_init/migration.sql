-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('ADMIN', 'BOX_AGENT', 'PSYCHO_AGENT');

-- CreateEnum
CREATE TYPE "public"."TicketStatus" AS ENUM ('EN_COLA', 'EN_ATENCION', 'DERIVADO', 'FINALIZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "public"."TicketStage" AS ENUM ('RECEPCION', 'BOX', 'PSICO', 'FINAL');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL,
    "office" TEXT,
    "boxNumber" INTEGER,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "ticketId" TEXT,
    "userId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Ticket" (
    "id" TEXT NOT NULL,
    "nombre" TEXT,
    "status" "public"."TicketStatus" NOT NULL DEFAULT 'EN_COLA',
    "stage" "public"."TicketStage" NOT NULL DEFAULT 'RECEPCION',
    "date" TIMESTAMP(3) NOT NULL,
    "assignedBox" INTEGER,
    "assignedUserId" TEXT,
    "calledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "public"."User"("role");

-- CreateIndex
CREATE INDEX "User_boxNumber_idx" ON "public"."User"("boxNumber");

-- CreateIndex
CREATE INDEX "Ticket_date_idx" ON "public"."Ticket"("date");

-- CreateIndex
CREATE INDEX "Ticket_date_stage_status_createdAt_idx" ON "public"."Ticket"("date", "stage", "status", "createdAt");
