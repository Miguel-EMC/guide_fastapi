# Modules and Controllers

NestJS uses a modular architecture where the application is organized into modules. Each module encapsulates related functionality, and controllers handle incoming HTTP requests.

## Modules

A module is a class annotated with `@Module()` decorator. It organizes related components (controllers, services, etc.) into cohesive blocks.

### Module Structure

```typescript
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [],           // Modules this module depends on
  controllers: [UsersController],  // Controllers for this module
  providers: [UsersService],       // Services/providers
  exports: [UsersService],         // Providers available to other modules
})
export class UsersModule {}
```

### Module Decorator Properties

| Property | Description |
|----------|-------------|
| `imports` | List of modules whose exported providers are needed |
| `controllers` | Controllers that should be instantiated |
| `providers` | Services that will be available within this module |
| `exports` | Providers available for other modules that import this one |

### Creating a Module

```bash
# Using CLI
nest g module users
```

### Feature Module Example

```typescript
// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),  // Register entity for this module
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],  // Allow other modules to use UsersService
})
export class UsersModule {}
```

### Importing Modules

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { PostsModule } from './posts/posts.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    UsersModule,
    PostsModule,
    AuthModule,
  ],
})
export class AppModule {}
```

### Global Modules

Make a module available everywhere without importing:

```typescript
import { Module, Global } from '@nestjs/common';

@Global()  // Available globally
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
```

### Dynamic Modules

Modules that can be configured:

```typescript
import { Module, DynamicModule } from '@nestjs/common';

@Module({})
export class ConfigModule {
  static forRoot(options: ConfigOptions): DynamicModule {
    return {
      module: ConfigModule,
      providers: [
        {
          provide: 'CONFIG_OPTIONS',
          useValue: options,
        },
        ConfigService,
      ],
      exports: [ConfigService],
    };
  }
}

// Usage in AppModule
@Module({
  imports: [
    ConfigModule.forRoot({ folder: './config' }),
  ],
})
export class AppModule {}
```

---

## Controllers

Controllers handle incoming requests and return responses to the client. They use decorators to define routes and HTTP methods.

### Basic Controller

```typescript
import { Controller, Get } from '@nestjs/common';

@Controller('users')  // Route prefix: /users
export class UsersController {

  @Get()  // GET /users
  findAll(): string {
    return 'This action returns all users';
  }
}
```

### HTTP Method Decorators

| Decorator | HTTP Method | Example Route |
|-----------|-------------|---------------|
| `@Get()` | GET | GET /users |
| `@Post()` | POST | POST /users |
| `@Put()` | PUT | PUT /users/:id |
| `@Patch()` | PATCH | PATCH /users/:id |
| `@Delete()` | DELETE | DELETE /users/:id |
| `@Options()` | OPTIONS | OPTIONS /users |
| `@Head()` | HEAD | HEAD /users |
| `@All()` | All methods | Any /users |

### Route Parameters

```typescript
import { Controller, Get, Param } from '@nestjs/common';

@Controller('users')
export class UsersController {

  // GET /users/:id
  @Get(':id')
  findOne(@Param('id') id: string): string {
    return `User #${id}`;
  }

  // GET /users/:id/posts/:postId
  @Get(':id/posts/:postId')
  findUserPost(
    @Param('id') userId: string,
    @Param('postId') postId: string,
  ): string {
    return `Post #${postId} from User #${userId}`;
  }

  // Get all params as object
  @Get(':id/details/:section')
  getDetails(@Param() params: { id: string; section: string }): string {
    return `User ${params.id}, Section: ${params.section}`;
  }
}
```

### Query Parameters

```typescript
import { Controller, Get, Query } from '@nestjs/common';

@Controller('users')
export class UsersController {

  // GET /users?page=1&limit=10
  @Get()
  findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return `Page ${page}, Limit ${limit}`;
  }

  // Get all query params as object
  @Get('search')
  search(@Query() query: { name?: string; email?: string }) {
    return query;
  }
}
```

### Request Body

```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UsersController {

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return `Creating user: ${createUserDto.name}`;
  }

  // Get specific body field
  @Post('partial')
  createPartial(@Body('email') email: string) {
    return `Email: ${email}`;
  }
}
```

### Request Object

```typescript
import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';

@Controller('users')
export class UsersController {

  @Get()
  findAll(@Req() request: Request) {
    console.log(request.headers);
    console.log(request.query);
    console.log(request.params);
    return 'All users';
  }
}
```

### Response Handling

```typescript
import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Controller('users')
export class UsersController {

  // Standard approach (recommended)
  @Get()
  findAll() {
    return { users: [] };  // Automatically serialized to JSON
  }

  // Library-specific approach (full control)
  @Get('custom')
  findAllCustom(@Res() res: Response) {
    res.status(HttpStatus.OK).json({ users: [] });
  }

  // Passthrough mode (use decorators + res)
  @Get('passthrough')
  findAllPassthrough(@Res({ passthrough: true }) res: Response) {
    res.header('X-Custom-Header', 'value');
    return { users: [] };  // Still returns normally
  }
}
```

### Headers

```typescript
import { Controller, Get, Header, Headers } from '@nestjs/common';

@Controller('users')
export class UsersController {

  // Set response header
  @Get()
  @Header('Cache-Control', 'none')
  @Header('X-Custom-Header', 'custom-value')
  findAll() {
    return [];
  }

  // Get request headers
  @Get('info')
  getInfo(@Headers('authorization') auth: string) {
    return `Auth header: ${auth}`;
  }

  // Get all headers
  @Get('all-headers')
  getAllHeaders(@Headers() headers: Record<string, string>) {
    return headers;
  }
}
```

### Status Codes

```typescript
import { Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';

@Controller('users')
export class UsersController {

  @Post()
  @HttpCode(201)  // Set specific status code
  create() {
    return { created: true };
  }

  @Post('no-content')
  @HttpCode(HttpStatus.NO_CONTENT)  // Using HttpStatus enum
  createNoContent() {
    // No response body
  }
}
```

### Redirects

```typescript
import { Controller, Get, Redirect } from '@nestjs/common';

@Controller('users')
export class UsersController {

  @Get('old')
  @Redirect('https://example.com', 301)
  redirectOld() {
    // Redirects to https://example.com
  }

  // Dynamic redirect
  @Get('docs')
  @Redirect('https://docs.nestjs.com', 302)
  getDocs(@Query('version') version: string) {
    if (version === 'v5') {
      return { url: 'https://docs.nestjs.com/v5/' };
    }
    // Uses default redirect if nothing returned
  }
}
```

### Route Wildcards

```typescript
@Controller('users')
export class UsersController {

  // Matches /users/ab_cd, /users/acd, etc.
  @Get('ab*cd')
  findWildcard() {
    return 'Wildcard route';
  }
}
```

### Sub-Domain Routing

```typescript
@Controller({ host: 'admin.example.com' })
export class AdminController {
  @Get()
  index(): string {
    return 'Admin page';
  }
}

@Controller({ host: ':account.example.com' })
export class AccountController {
  @Get()
  getInfo(@HostParam('account') account: string) {
    return `Account: ${account}`;
  }
}
```

## Complete Controller Example

```typescript
// src/users/users.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // POST /users
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  // GET /users?page=1&limit=10
  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.usersService.findAll({ page, limit });
  }

  // GET /users/:id
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  // PUT /users/:id
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  // DELETE /users/:id
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
```

## Request Decorators Reference

| Decorator | Express Equivalent |
|-----------|-------------------|
| `@Request(), @Req()` | `req` |
| `@Response(), @Res()` | `res` |
| `@Next()` | `next` |
| `@Session()` | `req.session` |
| `@Param(key?)` | `req.params` / `req.params[key]` |
| `@Body(key?)` | `req.body` / `req.body[key]` |
| `@Query(key?)` | `req.query` / `req.query[key]` |
| `@Headers(name?)` | `req.headers` / `req.headers[name]` |
| `@Ip()` | `req.ip` |
| `@HostParam()` | `req.hosts` |

---

## Next Steps

- [Services and Providers](./03-services-providers.md) - Dependency injection and business logic

---

[← Previous: Introduction](./01-introduction.md) | [Back to Index](./README.md) | [Next: Services and Providers →](./03-services-providers.md)
