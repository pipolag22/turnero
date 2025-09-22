import {
  WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

type TvAlert = { enabled: boolean; text: string };

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  transports: ['websocket'],
  namespace: '/', 
})
export class RealtimeGateway {
  @WebSocketServer() io!: Server;

  // === estado de alerta (in-memory) ===
  private alert: TvAlert = { enabled: false, text: '' };

  //suscripción a rooms públicos
  @SubscribeMessage('subscribe')
  handleSubscribe(@MessageBody() data: { rooms: string[] }, @ConnectedSocket() client: Socket) {
    data?.rooms?.forEach((r) => client.join(r));
  }

  // ----- emitters ya existentes -----
  emitQueueSnapshot(payload: any) { this.io.emit('queue.snapshot', payload); }
  emitTurnoCreated(payload: any)   { this.io.emit('turno.created', payload); }
  emitTurnoUpdated(payload: any)   { this.io.emit('turno.updated', payload); }
  emitNowServing(payload: any)     { this.io.emit('puesto.nowServing', payload); }
  emit(event: string, ...args: any[]) { this.io.emit(event, ...args); }

  // ----- API para la alerta -----
  setAlert(next: TvAlert) {
    this.alert = next;
    this.io.emit('tv.alert', this.alert); 
  }

  getAlert(): TvAlert {
    return this.alert;
  }
    }
