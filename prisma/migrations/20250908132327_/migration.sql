

DO $$
BEGIN
  -- Agrega meta si aún no existe
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'AuditLog'
      AND column_name  = 'meta'
  ) THEN
    ALTER TABLE "public"."AuditLog" ADD COLUMN "meta" JSONB;
  END IF;

  -- Si en tu historial quedaron columnas viejas, las borramos de forma segura
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'AuditLog'
      AND column_name  = 'metadata'
  ) THEN
    ALTER TABLE "public"."AuditLog" DROP COLUMN "metadata";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'AuditLog'
      AND column_name  = 'toStage'
  ) THEN
    ALTER TABLE "public"."AuditLog" DROP COLUMN "toStage";
  END IF;
END
$$;
