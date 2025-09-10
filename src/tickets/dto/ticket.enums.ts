// src/tickets/ticket.enums.ts

// Estados y Etapas "nuevos" (los que usa el front)
export const EstadoEnum = ['EN_COLA','EN_ATENCION','DERIVADO','FINALIZADO','CANCELADO'] as const;
export type Estado = typeof EstadoEnum[number];

export const EtapaEnum = ['RECEPCION','BOX','PSICO','FINAL'] as const;
export type Etapa = typeof EtapaEnum[number];

// Stages legacy (si los venías usando en otros lugares/rooms públicos)
export const StageEnum = [
  'LIC_DOCS_IN_SERVICE',
  'WAITING_PSY',
  'PSY_IN_SERVICE',
  'WAITING_LIC_RETURN',
  'COMPLETED',
  'CANCELLED',
] as const;
export type Stage = typeof StageEnum[number];

// Aceptar cualquiera de los 2 set de valores en dtos (parches graduales)
export const StageAny = [...EtapaEnum, ...StageEnum] as const;
export type StageAny = typeof StageAny[number];
