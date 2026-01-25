# API Versioning

API versioning allows you to make breaking changes while maintaining backward compatibility. NestJS supports multiple versioning strategies.

## Versioning Strategies

| Strategy | Example | Use Case |
|----------|---------|----------|
| URI | `/v1/users` | Most common, clear |
| Header | `X-API-Version: 1` | Clean URLs |
| Media Type | `Accept: application/vnd.api+json;version=1` | RESTful |
| Custom | Any custom logic | Flexible |

## URI Versioning (Recommended)

### Setup

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { VersioningType } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable URI versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',  // Default version if not specified
    prefix: 'v',          // Prefix for version (v1, v2)
  });

  await app.listen(3000);
}
bootstrap();
```

### Controller Versioning

```typescript
// src/users/users.controller.ts
import { Controller, Get, Version } from '@nestjs/common';

// Version 1 controller
@Controller('users')
@Version('1')
export class UsersV1Controller {
  @Get()
  findAll() {
    return { version: 1, users: [] };
  }
}

// Version 2 controller
@Controller('users')
@Version('2')
export class UsersV2Controller {
  @Get()
  findAll() {
    return {
      version: 2,
      data: { users: [] },
      meta: { total: 0 },
    };
  }
}
```

### Route-Level Versioning

```typescript
@Controller('users')
export class UsersController {
  @Get()
  @Version('1')
  findAllV1() {
    return { version: 1, users: [] };
  }

  @Get()
  @Version('2')
  findAllV2() {
    return { version: 2, data: { users: [] } };
  }

  // Works for all versions
  @Get('count')
  @Version(['1', '2'])
  getCount() {
    return { count: 100 };
  }
}
```

### Version Neutral Routes

```typescript
import { VERSION_NEUTRAL } from '@nestjs/common';

@Controller('health')
@Version(VERSION_NEUTRAL)  // Works without version prefix
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}
```

## Header Versioning

### Setup

```typescript
// src/main.ts
app.enableVersioning({
  type: VersioningType.HEADER,
  header: 'X-API-Version',
  defaultVersion: '1',
});
```

### Usage

```bash
# Request with version header
curl -H "X-API-Version: 2" http://localhost:3000/users
```

## Media Type Versioning

### Setup

```typescript
// src/main.ts
app.enableVersioning({
  type: VersioningType.MEDIA_TYPE,
  key: 'v=',  // Accept: application/json;v=2
  defaultVersion: '1',
});
```

### Usage

```bash
curl -H "Accept: application/json;v=2" http://localhost:3000/users
```

## Custom Versioning

```typescript
// src/main.ts
import { VersioningType } from '@nestjs/common';

app.enableVersioning({
  type: VersioningType.CUSTOM,
  extractor: (request: Request) => {
    // Extract version from query param
    const version = request.query['api-version'] as string;
    return version || '1';
  },
});
```

## Organizing Versioned Controllers

### Project Structure

```
src/
├── users/
│   ├── users.module.ts
│   ├── v1/
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── dto/
│   │       └── create-user.dto.ts
│   └── v2/
│       ├── users.controller.ts
│       ├── users.service.ts
│       └── dto/
│           └── create-user.dto.ts
```

### Module with Multiple Versions

```typescript
// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersV1Controller } from './v1/users.controller';
import { UsersV1Service } from './v1/users.service';
import { UsersV2Controller } from './v2/users.controller';
import { UsersV2Service } from './v2/users.service';

@Module({
  controllers: [UsersV1Controller, UsersV2Controller],
  providers: [UsersV1Service, UsersV2Service],
})
export class UsersModule {}
```

### Shared Service Pattern

```typescript
// src/users/users.service.ts (shared)
@Injectable()
export class UsersService {
  async findAll() {
    return this.userRepository.find();
  }
}

// src/users/v1/users.controller.ts
@Controller('users')
@Version('1')
export class UsersV1Controller {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll() {
    const users = await this.usersService.findAll();
    // V1 response format
    return { users };
  }
}

// src/users/v2/users.controller.ts
@Controller('users')
@Version('2')
export class UsersV2Controller {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll() {
    const users = await this.usersService.findAll();
    // V2 response format (new structure)
    return {
      data: users,
      meta: {
        total: users.length,
        version: 2,
      },
    };
  }
}
```

## DTO Versioning

### V1 DTO

```typescript
// src/users/v1/dto/create-user.dto.ts
import { IsEmail, IsString } from 'class-validator';

export class CreateUserDtoV1 {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  name: string;
}
```

### V2 DTO (Breaking Change)

```typescript
// src/users/v2/dto/create-user.dto.ts
import { IsEmail, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ProfileDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;
}

export class CreateUserDtoV2 {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @ValidateNested()
  @Type(() => ProfileDto)
  profile: ProfileDto;  // Breaking change: name -> profile object
}
```

## Swagger Documentation per Version

```typescript
// src/main.ts
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // V1 Documentation
  const v1Config = new DocumentBuilder()
    .setTitle('API V1')
    .setVersion('1.0')
    .addServer('/v1')
    .build();

  const v1Document = SwaggerModule.createDocument(app, v1Config, {
    include: [UsersV1Module, PostsV1Module],
  });
  SwaggerModule.setup('docs/v1', app, v1Document);

  // V2 Documentation
  const v2Config = new DocumentBuilder()
    .setTitle('API V2')
    .setVersion('2.0')
    .addServer('/v2')
    .build();

  const v2Document = SwaggerModule.createDocument(app, v2Config, {
    include: [UsersV2Module, PostsV2Module],
  });
  SwaggerModule.setup('docs/v2', app, v2Document);

  await app.listen(3000);
}
```

## Deprecation Handling

```typescript
// src/common/interceptors/deprecation.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';

export const DEPRECATED_KEY = 'deprecated';
export const Deprecated = (message: string, sunsetDate?: string) =>
  SetMetadata(DEPRECATED_KEY, { message, sunsetDate });

@Injectable()
export class DeprecationInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const deprecation = this.reflector.get(DEPRECATED_KEY, context.getHandler());

    if (deprecation) {
      const response = context.switchToHttp().getResponse();
      response.header('Deprecation', 'true');
      response.header('X-Deprecation-Message', deprecation.message);

      if (deprecation.sunsetDate) {
        response.header('Sunset', deprecation.sunsetDate);
      }
    }

    return next.handle();
  }
}

// Usage
@Controller('users')
@Version('1')
export class UsersV1Controller {
  @Get()
  @Deprecated('Use /v2/users instead', '2025-12-31')
  findAll() {
    return { users: [] };
  }
}
```

## Version Migration Helper

```typescript
// src/common/utils/version-migration.ts
export function migrateV1ToV2User(v1User: any) {
  return {
    id: v1User.id,
    email: v1User.email,
    profile: {
      firstName: v1User.name?.split(' ')[0] || '',
      lastName: v1User.name?.split(' ').slice(1).join(' ') || '',
    },
    createdAt: v1User.createdAt,
  };
}

// In V2 controller, support V1 format
@Controller('users')
@Version('2')
export class UsersV2Controller {
  @Post()
  async create(@Body() body: any, @Headers('x-accept-version') acceptVersion: string) {
    // If client sends V1 format, migrate it
    if (acceptVersion === '1') {
      body = {
        email: body.email,
        password: body.password,
        profile: {
          firstName: body.name?.split(' ')[0],
          lastName: body.name?.split(' ').slice(1).join(' '),
        },
      };
    }

    return this.usersService.create(body);
  }
}
```

## Best Practices

| Practice | Description |
|----------|-------------|
| Use URI versioning | Most explicit and cacheable |
| Version from start | Easier than adding later |
| Support 2 versions | Current + previous |
| Document changes | Changelog per version |
| Deprecate gracefully | Give clients time to migrate |
| Use semantic versioning | Major changes = new version |

## Version Lifecycle

```
v1 (Current)     → v2 (New)        → v3 (Future)
├─ Stable        ├─ Beta/Stable    ├─ Planning
├─ Maintained    ├─ Recommended    │
└─ Deprecated    └─ Default        │
   (sunset in 6mo)                 │
```

---

[← Previous: Logging and Monitoring](./20-logging-monitoring.md) | [Back to Index](./README.md) | [Next: Common Patterns →](./22-common-patterns.md)
