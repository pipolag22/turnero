import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export type AppRole = 'ADMIN' | 'BOX_AGENT' | 'PSYCHO_AGENT'| 'CASHIER_AGENT';

export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
