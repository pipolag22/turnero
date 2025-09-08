/*
  Warnings:

  - You are about to drop the column `fromStage` on the `AuditLog` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."AuditLog_ticketId_createdAt_idx";

-- DropIndex
DROP INDEX "public"."Ticket_assignedBox_stage_idx";

-- DropIndex
DROP INDEX "public"."Ticket_assignedUserId_stage_idx";

-- DropIndex
DROP INDEX "public"."Ticket_stage_createdAt_idx";

-- DropIndex
DROP INDEX "public"."Ticket_stage_queueNumber_idx";

-- AlterTable
ALTER TABLE "public"."AuditLog" DROP COLUMN "fromStage",
ALTER COLUMN "ticketId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Ticket" ALTER COLUMN "queueNumber" SET DEFAULT nextval('ticket_number_seq'::regclass),
ALTER COLUMN "queueNumber" DROP DEFAULT;
DROP SEQUENCE "ticket_number_seq";

-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "updatedAt" DROP DEFAULT;
