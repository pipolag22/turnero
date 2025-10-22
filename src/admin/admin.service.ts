import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { Cron } from '@nestjs/schedule';
import { TicketStatus } from '@prisma/client'; // <-- 1. IMPORTAR TicketStatus

// Este es el tipo de datos que usaremos en todos lados
export type SystemStatus = {
  alertaEnabled: boolean;
  alertaText: string;
  teoricoStatus: string;
  practicoStatus: string;
};

@Injectable()
export class AdminService implements OnModuleInit {
  // --- 2. AÑADIR UN LOGGER ---
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly rt: RealtimeGateway,
    private readonly prisma: PrismaService,
  ) {}

  // Se asegura de que exista un registro de estado al iniciar la app
  async onModuleInit() {
    const status = await this.prisma.systemStatus.findUnique({
      where: { id: 'singleton' },
    });
    if (!status) {
      this.logger.log('Creando registro de estado inicial en la base de datos...');
      await this.prisma.systemStatus.create({
        data: {
          id: 'singleton',
          alertaText: 'El sistema se encuentra temporalmente fuera de servicio. Por favor aguarde instrucciones.',
        },
      });
    }
  }

  // Obtiene el estado actual desde la base de datos
  async getStatus(): Promise<SystemStatus> {
    const status = await this.prisma.systemStatus.findUnique({
      where: { id: 'singleton' },
    });
    return status!;
  }

  // Actualiza el estado en la base de datos y notifica a los clientes
  async setStatus(next: Partial<SystemStatus>): Promise<SystemStatus> {
    const updatedStatus = await this.prisma.systemStatus.update({
      where: { id: 'singleton' },
      data: next,
    });
    
    this.rt.emit('system.status', updatedStatus); // Emite el nuevo estado a la TV
    return updatedStatus;
  }

  // TAREA AUTOMÁTICA: Se ejecuta todos los días a las 13:00 hs
  @Cron('0 13 * * *', {
    name: 'disable_exams_at_13',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
  async handleCron() {
    this.logger.log('CRON (13:00): Desactivando exámenes...');
    const currentStatus = await this.getStatus();
    
    if (currentStatus.teoricoStatus !== 'INACTIVO' || currentStatus.practicoStatus !== 'INACTIVO') {
      await this.setStatus({
        ...currentStatus,
        teoricoStatus: 'INACTIVO',
        practicoStatus: 'INACTIVO',
      });
      this.logger.log('CRON (13:00): Exámenes desactivados.');
    } else {
      this.logger.log('CRON (13:00): Exámenes ya estaban inactivos.');
    }
  }

  // --- 3. ¡NUEVA TAREA AUTOMÁTICA DE LIMPIEZA! ---
  @Cron('59 23 * * *', { // Se ejecuta a las 23:59
    name: 'cleanup_eod_tickets',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
  async handleEodCleanup() {
    this.logger.log('CRON (23:59): Ejecutando limpieza de fin de día...');

    // Busca la fecha de "hoy" en UTC (igual que como creas los tickets)
    const today = new Date();
    const dateISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const day = new Date(`${dateISO}T00:00:00.000Z`);

    // Busca todos los tickets de hoy que sigan en cola o en atención
    const result = await this.prisma.ticket.updateMany({
      where: {
        date: day, // Filtra por la fecha de hoy
        status: {
          in: [TicketStatus.EN_COLA, TicketStatus.EN_ATENCION] // Busca tickets "colgados"
        }
      },
      data: {
        status: TicketStatus.CANCELADO, // Los marca como cancelados
        assignedBox: null,
        assignedUserId: null,
        calledAt: null,
      },
    });

    if (result.count > 0) {
      this.logger.log(`CRON (23:59): Se limpiaron ${result.count} tickets colgados.`);
      // Notificamos a las pantallas para que se refresquen
      this.rt.emit('ticket.updated', null); // Esto dispara un refresh en la TV
    } else {
      this.logger.log('CRON (23:59): No se encontraron tickets para limpiar.');
    }
  }
}