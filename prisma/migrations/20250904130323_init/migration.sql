CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START WITH 1 INCREMENT BY 1;
-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('ADMIN', 'BOX_AGENT', 'PSYCHO_AGENT');

-- CreateEnum
CREATE TYPE "public"."Stage" AS ENUM ('LIC_DOCS_IN_SERVICE', 'WAITING_PSY', 'PSY_IN_SERVICE', 'WAITING_LIC_RETURN', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL,
    "office" TEXT,
    "boxNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Ticket" (
    "id" TEXT NOT NULL,
    "queueNumber" INTEGER NOT NULL DEFAULT nextval('ticket_number_seq'),
    "fullName" TEXT,
    "stage" "public"."Stage" NOT NULL,
    "assignedBox" INTEGER,
    "assignedUserId" TEXT,
    "calledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "fromStage" "public"."Stage",
    "toStage" "public"."Stage",
    "metadata" JSONB,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");
