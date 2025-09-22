export const EstadoEnum = ['EN_COLA','EN_ATENCION','DERIVADO','FINALIZADO','CANCELADO'] as const;
export type Estado = (typeof EstadoEnum)[number];


export const EtapaEnum = ['RECEPCION','BOX','PSICO','CAJERO','FINAL'] as const;
export type Etapa = (typeof EtapaEnum)[number];

export const LegacyStageEnum = [
  'LIC_DOCS_IN_SERVICE',
  'WAITING_PSY',
  'PSY_IN_SERVICE',
  'WAITING_CASHIER',    
  'WAITING_LIC_RETURN',
  'COMPLETED',
  'CANCELLED',
] as const;
export type LegacyStage = (typeof LegacyStageEnum)[number];


export const StageAny = [...EtapaEnum, ...LegacyStageEnum] as const;
export type StageAny = (typeof StageAny)[number];


export const StageEnum = StageAny;
export type Stage = StageAny;
