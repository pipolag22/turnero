import { Injectable, OnModuleInit } from '@nestjs/common';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { PrismaService } from '../prisma/prisma.service'; // Asegúrate de que PrismaService esté importado
import { Cron, CronExpression } from '@nestjs/schedule'; // Importa el programador de tareas

// Este es el nuevo "tipo" de datos que usaremos en toda la app para el estado
export type SystemStatus = {
  alertaEnabled: boolean;
  alertaText: string;
  teoricoStatus: string;   // "ACTIVO" o "INACTIVO"
  practicoStatus: string;  // "NINGUNA", "PISTA_CHICA", "PISTA_GRANDE", "AMBAS"
};

@Injectable()
export class AdminService implements OnModuleInit {
  constructor(
    private readonly rt: RealtimeGateway,
    private readonly prisma: PrismaService, // Inyectamos el servicio de Prisma
  ) {}

  // Esta función se ejecuta una vez cuando la API arranca
  // y se asegura de que haya un registro de estado en la base de datos.
  async onModuleInit() {
    const status = await this.prisma.systemStatus.findUnique({
      where: { id: 'singleton' },
    });
    if (!status) {
      console.log('Creando registro de estado inicial en la base de datos...');
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
    // Usamos "!" porque onModuleInit asegura que el registro siempre existirá
    return status!;
  }

  // Actualiza el estado en la base de datos y notifica a los clientes por WebSocket
  async setStatus(next: Partial<SystemStatus>): Promise<SystemStatus> {
    const updatedStatus = await this.prisma.systemStatus.update({
      where: { id: 'singleton' },
      data: {
        alertaEnabled: next.alertaEnabled,
        alertaText: next.alertaText,
        teoricoStatus: next.teoricoStatus,
        practicoStatus: next.practicoStatus,
      },
    });
    
    // Emitimos el nuevo estado completo a la TV y otros clientes
    this.rt.emit('system.status', updatedStatus);
    return updatedStatus;
  }

  // TAREA AUTOMÁTICA: Se ejecuta todos los días a las 13:00 hs
  @Cron('0 13 * * *', {
    name: 'disable_exams_at_13',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
  async handleCron() {
    console.log('CRON: Ejecutando tarea de las 13:00 para desactivar exámenes...');
    const currentStatus = await this.getStatus();
    
    // Solo actualiza si es necesario, para no emitir eventos inútiles
    if (currentStatus.teoricoStatus !== 'INACTIVO' || currentStatus.practicoStatus !== 'NINGUNA') {
      await this.setStatus({
        ...currentStatus, // Mantenemos la alerta como está
        teoricoStatus: 'INACTIVO',
        practicoStatus: 'NINGUNA',
      });
      console.log('CRON: Exámenes desactivados.');
    } else {
      console.log('CRON: Exámenes ya estaban inactivos, no se realizaron cambios.');
    }
  }
}