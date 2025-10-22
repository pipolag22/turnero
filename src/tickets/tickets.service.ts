import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import type { Etapa, Estado } from './ticket.enums';
import * as xlsx from 'xlsx';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rt: RealtimeGateway,
  ) {}

  // Convierte YYYY-MM-DD a objeto Date (UTC 00:00)
  private toDate(dateISO: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
        throw new BadRequestException(`Formato de fecha inválido: ${dateISO}. Usar YYYY-MM-DD.`);
    }
    const date = new Date(`${dateISO}T00:00:00.000Z`);
    if (isNaN(date.getTime())) {
        throw new BadRequestException(`Fecha inválida: ${dateISO}`);
    }
    return date;
  }

  // Obtiene el estado actual de las colas para una fecha dada
  async snapshot(dateISO: string) {
    const date = this.toDate(dateISO);
    const all = await this.prisma.ticket.findMany({
      where: { date },
      orderBy: { createdAt: 'asc' },
    });

    const colas: Record<Etapa, any[]> = {
      RECEPCION: [], BOX: [], PSICO: [], CAJERO: [], FINAL: [],
    };
    let nowServing: any = null;

    for (const t of all) {
      if (t.status === 'FINALIZADO' || t.status === 'CANCELADO') continue;
      colas[t.stage as Etapa].push(t);
      if (t.status === 'EN_ATENCION') nowServing = t;
    }

    return { date: dateISO, colas, nowServing };
  }

  // Crea un nuevo ticket manualmente
  async create(nombre: string | undefined, dateISO: string) {
    const date = this.toDate(dateISO);
    const created = await this.prisma.ticket.create({
      data: {
        nombre: nombre?.trim() ?? null,
        date,
        status: 'EN_COLA',
        stage: 'RECEPCION',
      },
    });

    this.rt.emitTurnoCreated(created);
    this.rt.emitQueueSnapshot(await this.snapshot(dateISO));

    return created;
  }

  // Actualiza un ticket existente (nombre, estado, etapa)
  async patch(id: string, patch: { nombre?: string; status?: Estado; stage?: Etapa }) {
    const data: any = {};
    if (patch.nombre !== undefined) data.nombre = patch.nombre?.trim() ?? null;
    if (patch.status !== undefined) data.status = patch.status;
    if (patch.stage  !== undefined) data.stage  = patch.stage;

    const existingTicket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!existingTicket) {
        throw new BadRequestException(`Ticket con ID ${id} no encontrado.`);
    }

    const updated = await this.prisma.ticket.update({
      where: { id },
      data,
    });

    this.rt.emitTurnoUpdated(updated);
    this.rt.emitQueueSnapshot(
      await this.snapshot(updated.date.toISOString().slice(0, 10)),
    );

    return updated;
  }
  
  // Llama al siguiente ticket en una etapa específica
  async takeNext(stage: Etapa, dateISO: string) {
    const date = this.toDate(dateISO);

    const fallbackChain: Record<Etapa, Etapa[]> = {
        RECEPCION: [],
        BOX:       ['RECEPCION'],
        PSICO:     ['BOX'],
        CAJERO:    ['PSICO', 'BOX'],
        FINAL:     ['CAJERO'],
    };

    const runTx = async (tx: PrismaService) => {
      const tryPick = async (from: Etapa, promoteTo?: Etapa) => {
        const next = await (tx as any).ticket.findFirst({
          where: { date, stage: from, status: 'EN_COLA' },
          orderBy: { createdAt: 'asc' },
        });
        if (!next) return null;

        const data: any = { status: 'EN_ATENCION' };
        if (promoteTo && promoteTo !== from) data.stage = promoteTo;

        return (tx as any).ticket.update({ where: { id: next.id }, data });
      };

      let updated = await tryPick(stage);
      if (updated) return updated;

      for (const prev of fallbackChain[stage]) {
        updated = await tryPick(prev, stage);
        if (updated) return updated;
      }

      return null;
    };

    let result: any;
    try {
        result = await this.prisma.$transaction(
            async (tx) => runTx(tx as PrismaService),
            { isolationLevel: 'Serializable' },
        );
    } catch {
        result = await this.prisma.$transaction(
            async (tx) => runTx(tx as PrismaService),
        );
    }

    if (result) {
        this.rt.emitTurnoUpdated(result);
        this.rt.emitNowServing(result);
        this.rt.emitQueueSnapshot(await this.snapshot(dateISO));
    }

    return result;
  }

  // --- ¡MÉTODO IMPORTAR (CORREGIDO)! ---
  async importFromExcel(fileBuffer: Buffer, targetDateISO: string) {
    let workbook: xlsx.WorkBook;
    try {
      // Leemos el buffer del archivo
      // dateNF:'hh:mm' es un *intento* de formatear celdas de fecha
      workbook = xlsx.read(fileBuffer, { type: 'buffer', cellDates: true, dateNF:'hh:mm' });
    } catch (error) {
      console.error("Error leyendo Excel:", error);
      throw new BadRequestException('Error al leer el archivo Excel. Asegúrate de que sea un .xlsx o .csv válido.');
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new BadRequestException('El archivo Excel está vacío.');
    const sheet = workbook.Sheets[sheetName];
    
    // Obtenemos los datos como un array de arrays
    const data: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false });

    if (data.length < 2) throw new BadRequestException('El archivo no contiene datos o encabezados.');

    // Función para normalizar encabezados (minúsculas, sin acentos, sin espacios)
    const normalizeHeader = (h: string) => 
        String(h || '').trim().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, '');

    const headers = (data.shift() as string[]).map(normalizeHeader);
    
    // Buscamos las columnas por sus nombres normalizados
    const nombreHeaderIndex = headers.indexOf('solicitante');
    const horaHeaderIndex = headers.indexOf('hora'); // <-- ¡CAMBIO AQUÍ!

    if (nombreHeaderIndex === -1) {
      throw new BadRequestException("El archivo Excel debe tener una columna llamada 'Solicitante'.");
    }
    
    if (horaHeaderIndex === -1) {
      throw new BadRequestException("El archivo Excel debe tener una columna llamada 'Hora'.");
    }

    const ticketsToCreate: { nombre: string; date: Date; }[] = [];
    const skippedRows: number[] = [];
    const targetDate = this.toDate(targetDateISO);

    // Regex para limpiar el DNI: [ cualquier cosa adentro ]
    const dniRegex = /\s*\[\s*.*?\s*\]/;

    data.forEach((rowArray, index) => {
      let nombre = rowArray[nombreHeaderIndex]?.trim();
      const horaRaw = rowArray[horaHeaderIndex];
      let hora: string | undefined = undefined;

      // --- ¡LÓGICA DE HORA MEJORADA! ---
      if (horaRaw != null) {
          if (horaRaw instanceof Date) {
              // Opción 1: La librería lo interpretó como fecha (común en .xlsx)
              hora = horaRaw.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Argentina/Buenos_Aires' });
          } else {
              // Opción 2: Es un string (ej: "07:00:00" o "7:00")
              const textoHora = String(horaRaw).trim();
              
              // Busca un patrón de hora "HH:MM" o "H:MM" al principio del string
              const match = textoHora.match(/^(\d{1,2}:\d{2})/);
              
              if (match) {
                  hora = match[1]; // match[1] es el grupo (ej: "07:00" o "7:00")
                  // Nos aseguramos de que tenga formato HH:MM
                  const partes = hora.split(':');
                  if (partes.length === 2) {
                    const h = partes[0].padStart(2, '0');
                    const m = partes[1].padStart(2, '0');
                    hora = `${h}:${m}`; // Formateado como "07:00"
                  }
              }
          }
      }
      // --- FIN LÓGICA DE HORA ---

      if (nombre && typeof nombre === 'string' && nombre.length > 0) {
        
        // 1. Limpiamos SOLAMENTE el DNI del string "Solicitante"
        let nombreLimpio = nombre.replace(dniRegex, '').trim();
        
        // 2. Agregamos la hora (si la encontramos)
        if (hora) {
            nombreLimpio = `${nombreLimpio} (${hora})`;
        }
        
        // 3. Reemplazamos espacios dobles (si quedaron) por uno solo
        const nombreFinal = nombreLimpio.replace(/\s+/g, ' ');

        ticketsToCreate.push({
          nombre: nombreFinal.slice(0, 255),
          date: targetDate, 
        });
      } else {
        skippedRows.push(index + 2); 
      }
    });

    if (ticketsToCreate.length === 0) {
      throw new BadRequestException('No se encontraron nombres válidos para importar en el archivo Excel.');
    }

    try {
      const result = await this.prisma.ticket.createMany({
        data: ticketsToCreate.map(t => ({
          ...t,
          status: 'EN_COLA',
          stage: 'RECEPCION'
        })),
        skipDuplicates: false, 
      });

      this.rt.emitQueueSnapshot(await this.snapshot(targetDateISO));

      return {
        message: `Importación completada para la fecha ${targetDateISO}.`,
        importedCount: result.count,
        skippedRows: skippedRows,
      };

    } catch (error: any) {
      console.error("Error al guardar tickets importados:", error);
      if (error?.code === 'P2002') {
          throw new BadRequestException('Error: Se encontraron turnos duplicados. Verifica el archivo.');
      }
      throw new BadRequestException('Error al guardar los turnos en la base de datos.');
    }
  }
}