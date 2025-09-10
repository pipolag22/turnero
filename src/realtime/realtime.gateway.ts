import {
  WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  transports: ['websocket'],
  namespace: '/', // mismo que usa el front
})
export class RealtimeGateway {
  @WebSocketServer() io!: Server;

  // opcional: suscripción a rooms públicos
  @SubscribeMessage('subscribe')
  handleSubscribe(@MessageBody() data: { rooms: string[] }, @ConnectedSocket() client: Socket) {
    data?.rooms?.forEach((r) => client.join(r));
  }

  emitQueueSnapshot(payload: any) {
    this.io.emit('queue.snapshot', payload);
  }

  emitTurnoCreated(payload: any) {
    this.io.emit('turno.created', payload);
  }

  emitTurnoUpdated(payload: any) {
    this.io.emit('turno.updated', payload);
  }

  emitNowServing(payload: any) {
    this.io.emit('puesto.nowServing', payload);
  }

  emit(event: string, ...args: any[]) {
    this.io.emit(event, ...args);
  }
}

