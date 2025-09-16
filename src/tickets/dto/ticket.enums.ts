// src/tickets/ticket.enums.ts

// Estados (única fuente de verdad)
export const EstadoEnum = ['EN_COLA','EN_ATENCION','DERIVADO','FINALIZADO','CANCELADO'] as const;
export type Estado = (typeof EstadoEnum)[number];

// Etapas nuevas (oficiales)
export const EtapaEnum = ['RECEPCION','BOX','PSICO','CAJERO','FINAL'] as const;
export type Etapa = (typeof EtapaEnum)[number];

// Nombres legacy que todavía aceptamos
export const LegacyStageEnum = [
  'LIC_DOCS_IN_SERVICE',
  'WAITING_PSY',
  'PSY_IN_SERVICE',
  'WAITING_CASHIER',     // cajero (legacy)
  'WAITING_LIC_RETURN',
  'COMPLETED',
  'CANCELLED',
] as const;
export type LegacyStage = (typeof LegacyStageEnum)[number];

// Superconjunto (nuevo + legacy). Útil para DTOs que aceptan ambos.
export const StageAny = [...EtapaEnum, ...LegacyStageEnum] as const;
export type StageAny = (typeof StageAny)[number];

/* -------------------- Compatibilidad hacia atrás -------------------- */
/* Si en algún archivo viejo importas StageEnum / Stage, seguirá funcionando */
export const StageEnum = StageAny;
export type Stage = StageAny;
