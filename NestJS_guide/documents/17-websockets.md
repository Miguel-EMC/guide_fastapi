# WebSockets

WebSockets enable real-time bidirectional communication. NestJS supports both Socket.IO and native WebSockets.

## Installation

```bash
# Socket.IO (recommended)
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io

# Or native WebSockets
npm install @nestjs/websockets @nestjs/platform-ws ws
```

## Basic Gateway

```typescript
// src/chat/chat.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('ChatGateway');

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('message')
  handleMessage(
    @MessageBody() data: { text: string; room: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`Message from ${client.id}: ${data.text}`);

    // Broadcast to room
    this.server.to(data.room).emit('message', {
      text: data.text,
      sender: client.id,
      timestamp: new Date(),
    });

    return { event: 'message', data: 'Message received' };
  }
}
```

## Gateway Configuration

```typescript
@WebSocketGateway({
  port: 3001,                    // Different port (optional)
  namespace: '/chat',            // Namespace
  cors: {
    origin: ['http://localhost:3000'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class ChatGateway {}
```

## Room Management

```typescript
// src/chat/chat.gateway.ts
@WebSocketGateway()
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @MessageBody() room: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(room);
    client.to(room).emit('userJoined', {
      userId: client.id,
      room,
    });
    return { event: 'joinedRoom', room };
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @MessageBody() room: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(room);
    client.to(room).emit('userLeft', {
      userId: client.id,
      room,
    });
    return { event: 'leftRoom', room };
  }

  @SubscribeMessage('messageToRoom')
  handleRoomMessage(
    @MessageBody() data: { room: string; message: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Send to all in room except sender
    client.to(data.room).emit('roomMessage', {
      message: data.message,
      sender: client.id,
    });
  }

  // Broadcast to all clients
  broadcastToAll(event: string, data: any) {
    this.server.emit(event, data);
  }

  // Send to specific client
  sendToClient(clientId: string, event: string, data: any) {
    this.server.to(clientId).emit(event, data);
  }

  // Send to room
  sendToRoom(room: string, event: string, data: any) {
    this.server.to(room).emit(event, data);
  }
}
```

## Authentication

### JWT Authentication Guard

```typescript
// src/common/guards/ws-jwt.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const token = this.extractToken(client);

    if (!token) {
      throw new WsException('Unauthorized');
    }

    try {
      const payload = this.jwtService.verify(token);
      client.data.user = payload;  // Attach user to socket
      return true;
    } catch {
      throw new WsException('Invalid token');
    }
  }

  private extractToken(client: Socket): string | null {
    // From handshake auth
    const auth = client.handshake.auth?.token;
    if (auth) return auth;

    // From handshake headers
    const authHeader = client.handshake.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    // From query params
    return client.handshake.query?.token as string;
  }
}
```

### Using the Guard

```typescript
// src/chat/chat.gateway.ts
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../common/guards/ws-jwt.guard';

@WebSocketGateway()
@UseGuards(WsJwtGuard)  // Apply to all handlers
export class ChatGateway {
  @SubscribeMessage('privateMessage')
  handlePrivateMessage(
    @MessageBody() data: { to: string; message: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;  // Access authenticated user
    this.server.to(data.to).emit('privateMessage', {
      from: user.id,
      message: data.message,
    });
  }
}
```

## User Tracking

```typescript
// src/chat/chat.gateway.ts
@WebSocketGateway()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, { socketId: string; userId: number }>();

  handleConnection(client: Socket) {
    const userId = client.data.user?.id;
    if (userId) {
      this.connectedUsers.set(client.id, { socketId: client.id, userId });
      this.broadcastOnlineUsers();
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedUsers.delete(client.id);
    this.broadcastOnlineUsers();
  }

  private broadcastOnlineUsers() {
    const users = Array.from(this.connectedUsers.values());
    this.server.emit('onlineUsers', users);
  }

  getSocketByUserId(userId: number): string | null {
    for (const [socketId, data] of this.connectedUsers) {
      if (data.userId === userId) {
        return socketId;
      }
    }
    return null;
  }
}
```

## Service Integration

```typescript
// src/chat/chat.service.ts
import { Injectable } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';

@Injectable()
export class ChatService {
  constructor(private readonly chatGateway: ChatGateway) {}

  // Called from HTTP controller or other service
  notifyUser(userId: number, message: string) {
    const socketId = this.chatGateway.getSocketByUserId(userId);
    if (socketId) {
      this.chatGateway.server.to(socketId).emit('notification', { message });
    }
  }

  broadcastNotification(message: string) {
    this.chatGateway.server.emit('notification', { message });
  }
}

// Usage in another controller
@Controller('posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly chatService: ChatService,
  ) {}

  @Post()
  async create(@Body() dto: CreatePostDto) {
    const post = await this.postsService.create(dto);

    // Notify all connected clients
    this.chatService.broadcastNotification(`New post: ${post.title}`);

    return post;
  }
}
```

## Exception Handling

```typescript
// src/common/filters/ws-exception.filter.ts
import { Catch, ArgumentsHost } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Catch()
export class WsExceptionFilter extends BaseWsExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>();

    const error =
      exception instanceof WsException
        ? exception.getError()
        : { message: 'Internal server error' };

    client.emit('error', {
      status: 'error',
      message: typeof error === 'string' ? error : (error as any).message,
    });
  }
}

// Apply to gateway
@WebSocketGateway()
@UseFilters(new WsExceptionFilter())
export class ChatGateway {}
```

## Validation

```typescript
// src/chat/dto/message.dto.ts
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class MessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  text: string;

  @IsString()
  @IsNotEmpty()
  room: string;
}

// Gateway with validation
import { UsePipes, ValidationPipe } from '@nestjs/common';

@WebSocketGateway()
@UsePipes(new ValidationPipe({ transform: true }))
export class ChatGateway {
  @SubscribeMessage('message')
  handleMessage(@MessageBody() data: MessageDto) {
    // data is validated
  }
}
```

## Notifications Service

```typescript
// src/notifications/notifications.gateway.ts
@WebSocketGateway({ namespace: '/notifications' })
export class NotificationsGateway {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<number, string[]>();

  handleConnection(client: Socket) {
    const userId = client.data.user?.id;
    if (userId) {
      const sockets = this.userSockets.get(userId) || [];
      sockets.push(client.id);
      this.userSockets.set(userId, sockets);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.user?.id;
    if (userId) {
      const sockets = this.userSockets.get(userId) || [];
      const filtered = sockets.filter((id) => id !== client.id);
      if (filtered.length > 0) {
        this.userSockets.set(userId, filtered);
      } else {
        this.userSockets.delete(userId);
      }
    }
  }

  // Send notification to specific user (all their devices)
  sendToUser(userId: number, notification: any) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.forEach((socketId) => {
        this.server.to(socketId).emit('notification', notification);
      });
    }
  }

  // Send to multiple users
  sendToUsers(userIds: number[], notification: any) {
    userIds.forEach((userId) => this.sendToUser(userId, notification));
  }
}
```

## Chat Module

```typescript
// src/chat/chat.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';

@Module({
  imports: [JwtModule],
  providers: [ChatGateway, ChatService],
  exports: [ChatService],
})
export class ChatModule {}
```

## Client Example

```typescript
// Client-side (browser)
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'jwt-token-here',
  },
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);

  // Join room
  socket.emit('joinRoom', 'general');
});

socket.on('message', (data) => {
  console.log('Message received:', data);
});

socket.on('error', (error) => {
  console.error('Error:', error);
});

// Send message
socket.emit('message', {
  text: 'Hello world!',
  room: 'general',
});
```

## Best Practices

| Practice | Description |
|----------|-------------|
| Authenticate connections | Verify JWT on connect |
| Handle reconnection | Socket.IO auto-reconnects |
| Use namespaces | Separate concerns (chat, notifications) |
| Room-based messaging | Don't broadcast to everyone |
| Rate limit messages | Prevent spam |
| Validate payloads | Use DTOs and ValidationPipe |

---

[← Previous: File Uploads](./16-file-uploads.md) | [Back to Index](./README.md) | [Next: Queues and Jobs →](./18-queues-jobs.md)
