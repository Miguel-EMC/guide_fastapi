# Caching

Caching improves performance by storing frequently accessed data in memory. NestJS supports in-memory caching and Redis for distributed caching.

## Installation

```bash
# In-memory cache
npm install @nestjs/cache-manager cache-manager

# Redis cache
npm install cache-manager-redis-yet redis
```

## Basic Setup (In-Memory)

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    CacheModule.register({
      ttl: 60000,      // Time to live in milliseconds (60 seconds)
      max: 100,        // Maximum number of items in cache
      isGlobal: true,  // Available globally
    }),
  ],
})
export class AppModule {}
```

## Redis Setup (Production)

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      isGlobal: true,
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          socket: {
            host: configService.get('REDIS_HOST'),
            port: configService.get('REDIS_PORT'),
          },
          password: configService.get('REDIS_PASSWORD'),
          ttl: 60000,
        }),
      }),
    }),
  ],
})
export class AppModule {}
```

## Environment Variables

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

## Using Cache in Services

### Inject Cache Manager

```typescript
// src/users/users.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findOne(id: number): Promise<User> {
    const cacheKey = `user:${id}`;

    // Try to get from cache
    const cached = await this.cacheManager.get<User>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const user = await this.userRepository.findOne({ where: { id } });

    // Store in cache (TTL: 5 minutes)
    if (user) {
      await this.cacheManager.set(cacheKey, user, 300000);
    }

    return user;
  }

  async update(id: number, data: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    Object.assign(user, data);
    await this.userRepository.save(user);

    // Invalidate cache
    await this.cacheManager.del(`user:${id}`);

    return user;
  }

  async remove(id: number): Promise<void> {
    await this.userRepository.delete(id);

    // Invalidate cache
    await this.cacheManager.del(`user:${id}`);
  }

  // Clear all users cache
  async clearUsersCache(): Promise<void> {
    await this.cacheManager.reset();
  }
}
```

## Auto-Caching with Interceptor

### Controller-Level Caching

```typescript
// src/posts/posts.controller.ts
import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheTTL, CacheKey } from '@nestjs/cache-manager';
import { PostsService } from './posts.service';

@Controller('posts')
@UseInterceptors(CacheInterceptor)  // Cache all GET endpoints
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  @CacheTTL(30000)  // 30 seconds TTL for this endpoint
  findAll() {
    return this.postsService.findAll();
  }

  @Get('popular')
  @CacheKey('popular-posts')  // Custom cache key
  @CacheTTL(60000)  // 1 minute
  findPopular() {
    return this.postsService.findPopular();
  }
}
```

### Global Auto-Caching

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CacheModule, CacheInterceptor } from '@nestjs/cache-manager';

@Module({
  imports: [CacheModule.register()],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
  ],
})
export class AppModule {}
```

## Custom Cache Interceptor

```typescript
// src/common/interceptors/http-cache.interceptor.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';

@Injectable()
export class HttpCacheInterceptor extends CacheInterceptor {
  // Only cache GET requests
  protected isRequestCacheable(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    return request.method === 'GET';
  }

  // Custom cache key generation
  trackBy(context: ExecutionContext): string | undefined {
    const request = context.switchToHttp().getRequest();
    const { httpAdapter } = this.httpAdapterHost;

    const isGetRequest = request.method === 'GET';
    const excludePaths = ['/health', '/metrics'];

    if (!isGetRequest || excludePaths.includes(request.path)) {
      return undefined;  // Don't cache
    }

    // Include query params in cache key
    return `${httpAdapter.getRequestUrl(request)}`;
  }
}
```

## Cache Decorator

```typescript
// src/common/decorators/cache.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY_METADATA = 'cache_key';
export const CACHE_TTL_METADATA = 'cache_ttl';

export const Cached = (key: string, ttl: number = 60000) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(CACHE_KEY_METADATA, key)(target, propertyKey, descriptor);
    SetMetadata(CACHE_TTL_METADATA, ttl)(target, propertyKey, descriptor);
    return descriptor;
  };
};
```

## Cache Service Wrapper

```typescript
// src/common/services/cache.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

@Injectable()
export class CacheService {
  constructor(
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    return this.cacheManager.get<T>(key);
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl);
  }

  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  async reset(): Promise<void> {
    await this.cacheManager.reset();
  }

  // Get or set pattern
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  // Delete by pattern (Redis only)
  async delByPattern(pattern: string): Promise<void> {
    const keys = await (this.cacheManager.store as any).keys(pattern);
    if (keys.length > 0) {
      await Promise.all(keys.map((key: string) => this.del(key)));
    }
  }
}
```

## Usage Example

```typescript
// src/posts/posts.service.ts
@Injectable()
export class PostsService {
  constructor(private readonly cacheService: CacheService) {}

  async findAll(): Promise<Post[]> {
    return this.cacheService.getOrSet(
      'posts:all',
      () => this.postRepository.find(),
      60000,  // 1 minute
    );
  }

  async findByCategory(categoryId: number): Promise<Post[]> {
    return this.cacheService.getOrSet(
      `posts:category:${categoryId}`,
      () => this.postRepository.find({ where: { categoryId } }),
      30000,  // 30 seconds
    );
  }

  async create(data: CreatePostDto): Promise<Post> {
    const post = await this.postRepository.save(data);

    // Invalidate related caches
    await this.cacheService.del('posts:all');
    await this.cacheService.delByPattern(`posts:category:*`);

    return post;
  }
}
```

## Docker Compose with Redis

```yaml
# docker-compose.yml
services:
  app:
    # ... app config
    depends_on:
      - redis
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379

  redis:
    image: redis:7-alpine
    container_name: redis
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

volumes:
  redis_data:
```

## Cache Strategies

| Strategy | Description | Use Case |
|----------|-------------|----------|
| Cache-Aside | App manages cache manually | Flexible control |
| Read-Through | Cache loads data automatically | Simple reads |
| Write-Through | Write to cache and DB together | Data consistency |
| Write-Behind | Write to cache, async to DB | High write throughput |

## Best Practices

| Practice | Description |
|----------|-------------|
| Use Redis in production | In-memory doesn't scale |
| Set appropriate TTLs | Balance freshness vs performance |
| Invalidate on mutations | Keep cache consistent |
| Use cache keys wisely | Include relevant params |
| Monitor cache hit rate | Measure effectiveness |
| Handle cache failures | App should work without cache |

---

[← Previous: Project Blog API](./13-project-blog-api.md) | [Back to Index](./README.md) | [Next: Rate Limiting →](./15-rate-limiting.md)
