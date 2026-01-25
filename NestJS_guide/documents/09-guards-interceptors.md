# Guards, Interceptors and Pipes

NestJS provides several mechanisms for handling cross-cutting concerns: Guards for authorization, Interceptors for request/response transformation, and Pipes for validation/transformation.

## Request Lifecycle

```
Request → Middleware → Guards → Interceptors (before) → Pipes → Handler → Interceptors (after) → Response
```

---

## Guards

Guards determine whether a request will be handled by the route handler. Used primarily for authorization.

### Basic Guard

```typescript
// src/common/guards/auth.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization;

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    // Validate token...
    return true;
  }
}
```

### Roles Guard

```typescript
// src/common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

```typescript
// src/common/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;  // No roles required
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      return false;
    }

    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
```

### Using Roles Guard

```typescript
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  @Get('users')
  @Roles('admin')
  findAllUsers() {
    return this.usersService.findAll();
  }

  @Delete('users/:id')
  @Roles('admin', 'moderator')
  deleteUser(@Param('id') id: number) {
    return this.usersService.remove(id);
  }
}
```

### Resource Owner Guard

```typescript
// src/common/guards/owner.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PostsService } from '../../posts/posts.service';

@Injectable()
export class PostOwnerGuard implements CanActivate {
  constructor(private readonly postsService: PostsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const postId = request.params.id;

    const post = await this.postsService.findOne(postId);

    if (post.authorId !== user.id) {
      throw new ForbiddenException('You can only modify your own posts');
    }

    return true;
  }
}
```

### Applying Guards

```typescript
// Global guard
// app.module.ts
@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}

// Controller-level
@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {}

// Method-level
@Delete(':id')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
remove(@Param('id') id: number) {}
```

---

## Interceptors

Interceptors can transform the result returned from a function, transform exceptions, extend basic function behavior, or completely override a function.

### Response Transformation Interceptor

```typescript
// src/common/interceptors/transform.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
  meta: {
    timestamp: string;
    path: string;
  };
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      map((data) => ({
        data,
        meta: {
          timestamp: new Date().toISOString(),
          path: request.url,
        },
      })),
    );
  }
}
```

### Logging Interceptor

```typescript
// src/common/interceptors/logging.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const { statusCode } = response;
        const duration = Date.now() - now;

        this.logger.log(`${method} ${url} ${statusCode} - ${duration}ms`);
      }),
    );
  }
}
```

### Cache Interceptor

```typescript
// src/common/interceptors/cache.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private cache = new Map<string, any>();

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const key = `${request.method}:${request.url}`;

    // Check cache
    if (this.cache.has(key)) {
      return of(this.cache.get(key));
    }

    // Execute and cache
    return next.handle().pipe(
      tap((data) => {
        this.cache.set(key, data);
        // Clear after 60 seconds
        setTimeout(() => this.cache.delete(key), 60000);
      }),
    );
  }
}
```

### Timeout Interceptor

```typescript
// src/common/interceptors/timeout.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
} from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      timeout(5000),  // 5 seconds timeout
      catchError((err) => {
        if (err instanceof TimeoutError) {
          return throwError(() => new RequestTimeoutException());
        }
        return throwError(() => err);
      }),
    );
  }
}
```

### Applying Interceptors

```typescript
// Global interceptor
// main.ts
app.useGlobalInterceptors(new LoggingInterceptor());

// Or in module
@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}

// Controller-level
@Controller('posts')
@UseInterceptors(CacheInterceptor)
export class PostsController {}

// Method-level
@Get()
@UseInterceptors(TransformInterceptor)
findAll() {}
```

---

## Pipes

Pipes transform input data or validate it. NestJS provides several built-in pipes.

### Built-in Pipes

| Pipe | Description |
|------|-------------|
| `ValidationPipe` | Validates input using class-validator |
| `ParseIntPipe` | Transforms string to integer |
| `ParseFloatPipe` | Transforms string to float |
| `ParseBoolPipe` | Transforms string to boolean |
| `ParseArrayPipe` | Transforms string to array |
| `ParseUUIDPipe` | Validates UUID string |
| `ParseEnumPipe` | Validates enum value |
| `DefaultValuePipe` | Provides default value |

### Using Built-in Pipes

```typescript
@Controller('users')
export class UsersController {
  // Parse ID to integer
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  // Parse with custom error
  @Get(':id')
  findOneCustom(
    @Param(
      'id',
      new ParseIntPipe({
        errorHttpStatusCode: HttpStatus.NOT_ACCEPTABLE,
      }),
    )
    id: number,
  ) {
    return this.usersService.findOne(id);
  }

  // Default value
  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.usersService.findAll({ page, limit });
  }

  // Parse boolean
  @Get()
  findActive(
    @Query('active', new DefaultValuePipe(true), ParseBoolPipe) active: boolean,
  ) {
    return this.usersService.findByStatus(active);
  }

  // Parse UUID
  @Get(':uuid')
  findByUuid(@Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.usersService.findByUuid(uuid);
  }

  // Parse Enum
  @Get()
  findByRole(@Query('role', new ParseEnumPipe(UserRole)) role: UserRole) {
    return this.usersService.findByRole(role);
  }
}
```

### Custom Validation Pipe

```typescript
// src/common/pipes/parse-date.pipe.ts
import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';

@Injectable()
export class ParseDatePipe implements PipeTransform<string, Date> {
  transform(value: string, metadata: ArgumentMetadata): Date {
    const date = new Date(value);

    if (isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid date: ${value}`);
    }

    return date;
  }
}

// Usage
@Get()
findByDate(@Query('date', ParseDatePipe) date: Date) {
  return this.service.findByDate(date);
}
```

### Custom Trim Pipe

```typescript
// src/common/pipes/trim.pipe.ts
import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class TrimPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (typeof value === 'string') {
      return value.trim();
    }

    if (typeof value === 'object' && value !== null) {
      return this.trimObject(value);
    }

    return value;
  }

  private trimObject(obj: Record<string, any>): Record<string, any> {
    const trimmed: Record<string, any> = {};

    for (const key of Object.keys(obj)) {
      const value = obj[key];
      trimmed[key] = typeof value === 'string' ? value.trim() : value;
    }

    return trimmed;
  }
}
```

### Validation Pipe Configuration

```typescript
// main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,           // Strip unknown properties
    forbidNonWhitelisted: true, // Throw on unknown properties
    transform: true,           // Transform to DTO class
    transformOptions: {
      enableImplicitConversion: true,  // Auto type conversion
    },
    disableErrorMessages: false,
    validateCustomDecorators: true,
    stopAtFirstError: false,
    exceptionFactory: (errors) => {
      const messages = errors.map((error) => ({
        field: error.property,
        errors: Object.values(error.constraints || {}),
      }));
      return new BadRequestException({
        message: 'Validation failed',
        errors: messages,
      });
    },
  }),
);
```

---

## Custom Decorators

### Combine Multiple Decorators

```typescript
// src/common/decorators/auth.decorator.ts
import { applyDecorators, UseGuards, SetMetadata } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';

export function Auth(...roles: string[]) {
  return applyDecorators(
    SetMetadata('roles', roles),
    UseGuards(JwtAuthGuard, RolesGuard),
  );
}

// Usage
@Controller('admin')
export class AdminController {
  @Get('dashboard')
  @Auth('admin')
  getDashboard() {
    return 'Admin dashboard';
  }
}
```

### API Version Decorator

```typescript
// src/common/decorators/api-version.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const API_VERSION_KEY = 'apiVersion';
export const ApiVersion = (version: string) =>
  SetMetadata(API_VERSION_KEY, version);
```

## Execution Order

```typescript
@Controller('example')
@UseGuards(Guard1, Guard2)
@UseInterceptors(Interceptor1, Interceptor2)
export class ExampleController {
  @Get()
  @UseGuards(Guard3)
  @UseInterceptors(Interceptor3)
  @UsePipes(Pipe1)
  handler(@Query('id', Pipe2) id: number) {}
}

// Execution order:
// 1. Guard1 → Guard2 → Guard3
// 2. Interceptor1 (before) → Interceptor2 (before) → Interceptor3 (before)
// 3. Pipe1 → Pipe2
// 4. Handler
// 5. Interceptor3 (after) → Interceptor2 (after) → Interceptor1 (after)
```

## Best Practices

| Practice | Description |
|----------|-------------|
| Global ValidationPipe | Apply validation globally |
| Specific guards per route | Don't over-guard |
| Logging interceptor | Track all requests |
| Transform responses | Consistent API format |
| Handle timeouts | Prevent hanging requests |

---

## Next Steps

- [Swagger Documentation](./10-swagger-documentation.md) - OpenAPI documentation

---

[← Previous: Authentication](./08-authentication.md) | [Back to Index](./README.md) | [Next: Swagger Documentation →](./10-swagger-documentation.md)
