import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: '/realtime', cors: { origin: '*' } })
export class RealtimeGateway implements OnGatewayInit {
  @WebSocketServer() server: Server;

  afterInit() {
    // listo para emitir
  }

  // Cliente puede suscribirse a "rooms"
  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { rooms?: string[] },
  ) {
    const rooms = data?.rooms ?? [];
    rooms.forEach((r) => socket.join(r));
    socket.emit('subscribed', { rooms });
  }

  // Método helper para emitir a rooms o broadcast global
  emit(event: string, payload: any, rooms?: string[]) {
    if (!rooms || rooms.length === 0) {
      this.server.emit(event, payload);
    } else {
      rooms.forEach((r) => this.server.to(r).emit(event, payload));
    }
  }
}