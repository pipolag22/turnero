import {
  Body, Controller, Get, Param, Patch, Post, Query,
  UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, UseGuards, HttpCode, Logger, BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SkipThrottle } from '@nestjs/throttler';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { PatchTicketDto } from './dto/patch-ticket.dto';
import { NextDto } from './dto/next.dto';
import type { Etapa } from './ticket.enums';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles, AppRole } from '../auth/roles.decorator';

// --- Funciones auxiliares (sin cambios) ---
function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function mapStageAnyToEtapa(s?: string): Etapa | undefined {
  switch (s) {
    case 'RECEPCION':
    case 'BOX':
    case 'PSICO':
    case 'CAJERO':
    case 'FINAL':
      return s;
    default: return undefined;
  }
}
// --- Fin Funciones auxiliares ---

@Controller('tickets')
export class TicketsController {
  // Define el logger para esta clase
  private readonly logger = new Logger(TicketsController.name);

  constructor(private readonly service: TicketsService) {}

  @Get('snapshot')
  @SkipThrottle()
  snapshot(@Query('date') date: string) {
    return this.service.snapshot(date);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN' as AppRole)
  async create(@Body() dto: CreateTicketDto) {
    const nombre = dto.nombre ?? dto.fullName ?? undefined;
    const date = dto.date || todayISO();
    return this.service.create(nombre, date);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async patch(@Param('id') id: string, @Body() dto: PatchTicketDto) {
    const etapa = mapStageAnyToEtapa(dto.stage);
    return this.service.patch(id, {
      nombre: dto.nombre,
      status: dto.status,
      stage: etapa,
    });
  }

  @Post('next')
  @UseGuards(JwtAuthGuard)
  async next(@Body() dto: NextDto) {
    return this.service.takeNext(dto.stage, dto.date);
  }
  
  // --- ENDPOINT DE IMPORTAR MODIFICADO (SIN PIPE) ---
  @Post('import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN' as AppRole)
  @UseInterceptors(FileInterceptor('file')) // El interceptor sigue siendo necesario
  @HttpCode(200)
  async importFromExcel(
    // --- ¡CAMBIO DRÁSTICO! Quitamos el ParseFilePipe ---
    @UploadedFile() file: Express.Multer.File | undefined, // El tipo ahora puede ser undefined
    @Query('date') date?: string,
  ) {
    // Este log ahora SÍ o SÍ debería aparecer
    this.logger.log(`Recibida petición POST /tickets/import (sin pipe). Archivo: ${file?.originalname ?? 'NINGUNO'}, Tamaño: ${file?.size ?? 0} bytes`);
    
    // Hacemos la validación manualmente
    if (!file) {
        this.logger.error('Error: No se recibió ningún archivo. Revisa el FileInterceptor o el FormData del frontend.');
        throw new BadRequestException('No se recibió ningún archivo. Asegúrate de que el campo se llame "file".');
    }
    
    // Validación manual de tamaño (5MB)
    if (file.size > 1024 * 1024 * 5) {
        throw new BadRequestException(`El archivo es demasiado grande (${(file.size / (1024*1024)).toFixed(1)} MB). El límite es 5MB.`);
    }

    const targetDate = date || todayISO();
    try {
      const result = await this.service.importFromExcel(file.buffer, targetDate);
      this.logger.log(`Importación exitosa: ${result.importedCount} turnos creados.`);
      return result;
    } catch (error) {
        this.logger.error(`Error durante la importación desde el servicio: ${error.message}`, error.stack);
        throw error;
    }
  }
}