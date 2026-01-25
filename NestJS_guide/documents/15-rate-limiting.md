# Rate Limiting

Rate limiting protects your API from abuse and ensures fair usage. NestJS provides the `@nestjs/throttler` package for this purpose.

## Installation

```bash
npm install @nestjs/throttler
```

## Basic Setup

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,    // 1 second
        limit: 3,     // 3 requests per second
      },
      {
        name: 'medium',
        ttl: 10000,   // 10 seconds
        limit: 20,    // 20 requests per 10 seconds
      },
      {
        name: 'long',
        ttl: 60000,   // 1 minute
        limit: 100,   // 100 requests per minute
      },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,  // Apply globally
    },
  ],
})
export class AppModule {}
```

## Configuration with Environment

```typescript
// src/app.module.ts
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get('THROTTLE_TTL', 60000),
          limit: config.get('THROTTLE_LIMIT', 100),
        },
      ],
    }),
  ],
})
export class AppModule {}
```

## Redis Storage (Distributed)

For multiple server instances, use Redis storage:

```bash
npm install @nestjs/throttler-storage-redis ioredis
```

```typescript
// src/app.module.ts
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nestjs/throttler-storage-redis';
import Redis from 'ioredis';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        { ttl: 60000, limit: 100 },
      ],
      storage: new ThrottlerStorageRedisService(
        new Redis({
          host: 'localhost',
          port: 6379,
        }),
      ),
    }),
  ],
})
export class AppModule {}
```

## Controller-Level Rate Limiting

```typescript
// src/auth/auth.controller.ts
import { Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle, SkipThrottle, ThrottlerGuard } from '@nestjs/throttler';

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  // Override global limits - stricter for login
  @Throttle([
    { name: 'short', limit: 1, ttl: 1000 },   // 1 per second
    { name: 'long', limit: 5, ttl: 60000 },   // 5 per minute
  ])
  @Post('login')
  login() {
    return 'Login attempt';
  }

  // Very strict for password reset
  @Throttle([{ name: 'long', limit: 3, ttl: 3600000 }])  // 3 per hour
  @Post('forgot-password')
  forgotPassword() {
    return 'Password reset email sent';
  }

  // Skip rate limiting for this endpoint
  @SkipThrottle()
  @Post('refresh')
  refresh() {
    return 'Token refreshed';
  }
}
```

## Skip Throttling for Specific Routes

```typescript
// Skip for entire controller
@SkipThrottle()
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}

// Skip specific throttler only
@SkipThrottle({ short: true })  // Skip 'short' throttler
@Controller('api')
export class ApiController {
  @Get('data')
  getData() {}
}
```

## Custom Throttler Guard

```typescript
// src/common/guards/custom-throttler.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  // Use IP + User ID for tracking (if authenticated)
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const userId = req.user?.id;
    const ip = req.ip;
    return userId ? `${ip}-${userId}` : ip;
  }

  // Custom error message
  protected throwThrottlingException(): Promise<void> {
    throw new ThrottlerException('Too many requests. Please try again later.');
  }

  // Skip throttling for certain conditions
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Skip for admin users
    if (request.user?.role === 'admin') {
      return true;
    }

    // Skip for whitelisted IPs
    const whitelistedIps = ['127.0.0.1', '::1'];
    if (whitelistedIps.includes(request.ip)) {
      return true;
    }

    return false;
  }
}
```

## Different Limits by User Type

```typescript
// src/common/guards/user-throttler.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getLimit(context: ExecutionContext): Promise<number> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Different limits based on user tier
    if (user?.tier === 'premium') {
      return 1000;  // 1000 requests
    }
    if (user?.tier === 'basic') {
      return 100;   // 100 requests
    }
    return 10;      // Anonymous users: 10 requests
  }

  protected async getTtl(context: ExecutionContext): Promise<number> {
    return 60000;  // Per minute
  }
}
```

## Rate Limit Headers

Add headers to inform clients of their rate limit status:

```typescript
// src/common/interceptors/rate-limit-headers.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class RateLimitHeadersInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();

        // These are typically set by the throttler
        // But you can add custom headers
        response.header('X-RateLimit-Policy', '100 requests per minute');
      }),
    );
  }
}
```

## API Key Rate Limiting

```typescript
// src/common/guards/api-key-throttler.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

interface ApiKeyConfig {
  limit: number;
  ttl: number;
}

@Injectable()
export class ApiKeyThrottlerGuard extends ThrottlerGuard {
  private apiKeyLimits: Map<string, ApiKeyConfig> = new Map([
    ['free-tier-key', { limit: 100, ttl: 86400000 }],    // 100/day
    ['basic-tier-key', { limit: 1000, ttl: 86400000 }],  // 1000/day
    ['premium-tier-key', { limit: 10000, ttl: 86400000 }], // 10000/day
  ]);

  protected async getTracker(req: Record<string, any>): Promise<string> {
    const apiKey = req.headers['x-api-key'];
    return apiKey || req.ip;
  }

  protected async getLimit(context: ExecutionContext): Promise<number> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (apiKey && this.apiKeyLimits.has(apiKey)) {
      return this.apiKeyLimits.get(apiKey)!.limit;
    }
    return 10;  // Default for unauthenticated
  }
}
```

## Endpoint-Specific Limits

```typescript
// src/posts/posts.controller.ts
import { Controller, Get, Post, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

@Controller('posts')
export class PostsController {
  // Reading is less restricted
  @Throttle([{ name: 'default', limit: 100, ttl: 60000 }])
  @Get()
  findAll() {
    return this.postsService.findAll();
  }

  // Writing is more restricted
  @Throttle([{ name: 'default', limit: 10, ttl: 60000 }])
  @Post()
  create(@Body() dto: CreatePostDto) {
    return this.postsService.create(dto);
  }

  // Expensive operations are very restricted
  @Throttle([{ name: 'default', limit: 5, ttl: 60000 }])
  @Post('export')
  export() {
    return this.postsService.export();
  }
}
```

## WebSocket Rate Limiting

```typescript
// src/common/guards/ws-throttler.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class WsThrottlerGuard extends ThrottlerGuard {
  async handleRequest(
    context: ExecutionContext,
    limit: number,
    ttl: number,
  ): Promise<boolean> {
    const client = context.switchToWs().getClient();
    const ip = client.handshake.address;

    const key = this.generateKey(context, ip, 'ws');
    const { totalHits } = await this.storageService.increment(key, ttl);

    if (totalHits > limit) {
      client.emit('error', { message: 'Rate limit exceeded' });
      return false;
    }

    return true;
  }
}
```

## Error Response

Default throttle error (HTTP 429):

```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

Custom error:

```typescript
// src/common/filters/throttler-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Response } from 'express';

@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
  catch(exception: ThrottlerException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    response.status(429).json({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'You have exceeded the rate limit. Please wait before retrying.',
      retryAfter: 60,  // seconds
    });
  }
}
```

## Best Practices

| Practice | Description |
|----------|-------------|
| Use Redis in production | In-memory doesn't work with multiple instances |
| Different limits by endpoint | Stricter for auth, uploads |
| Include rate limit headers | Help clients manage requests |
| Log rate limit hits | Monitor for abuse |
| Whitelist internal services | Don't limit health checks |
| Consider user tiers | Premium users get higher limits |

---

[← Previous: Caching](./14-caching.md) | [Back to Index](./README.md) | [Next: File Uploads →](./16-file-uploads.md)
