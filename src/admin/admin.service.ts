import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from '../realtime/realtime.gateway';

export type TvAlert = { enabled: boolean; text: string };

@Injectable()
export class AdminService {
  // guardamos en memoria; si querés persistirlo, reemplazá por Prisma.
  private state: TvAlert = {
    enabled: false,
    text: 'El sistema se encuentra temporalmente fuera de servicio. Por favor aguarde instrucciones.',
  };

  constructor(private readonly rt: RealtimeGateway) {}

  getAlert(): TvAlert {
    return this.state;
  }

  setAlert(next: TvAlert): TvAlert {
    this.state = {
      enabled: !!next.enabled,
      text: String(next.text ?? '').slice(0, 500),
    };
    // avisamos a todas las pantallas
    this.rt.emit('tv.alert', this.state);
    return this.state;
  }
}
