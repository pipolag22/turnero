-- ====== Compat: User.updatedAt con DEFAULT (por si faltaba) ======
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();

-- ====== Compat: AuditLog.createdAt vs columna antigua "at" ======
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'AuditLog'
      AND column_name = 'at'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'AuditLog'
      AND column_name = 'createdAt'
  )
  THEN
    ALTER TABLE "AuditLog" RENAME COLUMN "at" TO "createdAt";
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'AuditLog'
      AND column_name = 'createdAt'
  )
  THEN
    ALTER TABLE "AuditLog"
    ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();
  END IF;
END
$$;

-- ====== Índices Ticket ======
CREATE INDEX IF NOT EXISTS "Ticket_stage_createdAt_idx"        ON "Ticket"("stage","createdAt");
CREATE INDEX IF NOT EXISTS "Ticket_stage_queueNumber_idx"      ON "Ticket"("stage","queueNumber");
CREATE INDEX IF NOT EXISTS "Ticket_assignedUserId_stage_idx"   ON "Ticket"("assignedUserId","stage");
CREATE INDEX IF NOT EXISTS "Ticket_assignedBox_stage_idx"      ON "Ticket"("assignedBox","stage");

-- ====== Índices AuditLog ======
CREATE INDEX IF NOT EXISTS "AuditLog_ticketId_createdAt_idx"   ON "AuditLog"("ticketId","createdAt");

-- ====== Índices User ======
CREATE INDEX IF NOT EXISTS "User_role_idx"                     ON "User"("role");
CREATE INDEX IF NOT EXISTS "User_boxNumber_idx"                ON "User"("boxNumber");
