# Services and Providers

Providers are a fundamental concept in NestJS. Services, repositories, factories, and helpers can all be providers. The main idea is that they can be **injected** as dependencies.

## What is a Provider?

A provider is any class annotated with `@Injectable()` decorator. NestJS's built-in Dependency Injection (DI) system manages these providers.

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  private users = [];

  findAll() {
    return this.users;
  }

  create(user: any) {
    this.users.push(user);
    return user;
  }
}
```

## Dependency Injection

DI is a design pattern where dependencies are "injected" rather than created inside the class.

### Constructor Injection (Recommended)

```typescript
import { Controller, Get } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  // Service is injected through constructor
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }
}
```

### Property Injection

```typescript
import { Controller, Get, Inject } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  @Inject(UsersService)
  private readonly usersService: UsersService;

  @Get()
  findAll() {
    return this.usersService.findAll();
  }
}
```

## Registering Providers

Providers must be registered in a module:

```typescript
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService],  // Register provider
})
export class UsersModule {}
```

## Provider Scopes

| Scope | Description |
|-------|-------------|
| `DEFAULT` | Single instance shared across entire application (Singleton) |
| `REQUEST` | New instance for each incoming request |
| `TRANSIENT` | New instance for each consumer |

### Setting Scope

```typescript
import { Injectable, Scope } from '@nestjs/common';

// Request-scoped provider
@Injectable({ scope: Scope.REQUEST })
export class RequestScopedService {
  // New instance per request
}

// Transient provider
@Injectable({ scope: Scope.TRANSIENT })
export class TransientService {
  // New instance per injection
}
```

## Custom Providers

### Value Providers

```typescript
// Provide a constant value
@Module({
  providers: [
    {
      provide: 'API_KEY',
      useValue: 'my-api-key-12345',
    },
  ],
})
export class AppModule {}

// Usage
@Injectable()
export class ApiService {
  constructor(@Inject('API_KEY') private apiKey: string) {}
}
```

### Class Providers

```typescript
// Provide a different class
@Module({
  providers: [
    {
      provide: UsersService,
      useClass: MockUsersService,  // Use different implementation
    },
  ],
})
export class AppModule {}

// Conditional class provider
const configServiceProvider = {
  provide: ConfigService,
  useClass:
    process.env.NODE_ENV === 'development'
      ? DevelopmentConfigService
      : ProductionConfigService,
};
```

### Factory Providers

```typescript
// Create provider with factory function
@Module({
  providers: [
    {
      provide: 'DATABASE_CONNECTION',
      useFactory: async (configService: ConfigService) => {
        const options = configService.get('database');
        return createConnection(options);
      },
      inject: [ConfigService],  // Dependencies for factory
    },
  ],
})
export class AppModule {}
```

### Async Factory Provider

```typescript
@Module({
  providers: [
    {
      provide: 'ASYNC_CONNECTION',
      useFactory: async () => {
        const connection = await createConnection();
        return connection;
      },
    },
  ],
})
export class AppModule {}
```

### Alias Providers

```typescript
// Create alias for existing provider
@Module({
  providers: [
    UsersService,
    {
      provide: 'AliasedUsersService',
      useExisting: UsersService,
    },
  ],
})
export class AppModule {}
```

## Complete Service Example

```typescript
// src/users/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    return this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);  // Throws if not found
    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);  // Throws if not found
    await this.userRepository.remove(user);
  }
}
```

## Injecting Multiple Providers

```typescript
@Injectable()
export class OrdersService {
  constructor(
    private readonly usersService: UsersService,
    private readonly productsService: ProductsService,
    private readonly emailService: EmailService,
    @Inject('CONFIG') private readonly config: ConfigOptions,
  ) {}

  async createOrder(userId: number, productIds: number[]) {
    const user = await this.usersService.findOne(userId);
    const products = await this.productsService.findByIds(productIds);

    // Create order logic...

    await this.emailService.sendConfirmation(user.email);
    return order;
  }
}
```

## Circular Dependencies

When two providers depend on each other:

```typescript
// Forward reference to resolve circular dependency
@Injectable()
export class UsersService {
  constructor(
    @Inject(forwardRef(() => PostsService))
    private readonly postsService: PostsService,
  ) {}
}

@Injectable()
export class PostsService {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}
}
```

Better approach - use an intermediate service:

```typescript
// Avoid circular dependencies with proper architecture
@Injectable()
export class UserPostsService {
  constructor(
    private readonly usersService: UsersService,
    private readonly postsService: PostsService,
  ) {}

  async getUserWithPosts(userId: number) {
    const user = await this.usersService.findOne(userId);
    const posts = await this.postsService.findByUserId(userId);
    return { ...user, posts };
  }
}
```

## Optional Dependencies

```typescript
import { Injectable, Optional } from '@nestjs/common';

@Injectable()
export class HttpService {
  constructor(
    @Optional()
    private readonly logger?: LoggerService,
  ) {}

  request(url: string) {
    this.logger?.log(`Requesting ${url}`);  // Only logs if logger exists
    // ... make request
  }
}
```

## Exporting Providers

To make providers available to other modules:

```typescript
// src/users/users.module.ts
@Module({
  providers: [UsersService],
  exports: [UsersService],  // Now available to importing modules
})
export class UsersModule {}

// src/posts/posts.module.ts
@Module({
  imports: [UsersModule],  // Import the module
  providers: [PostsService],
})
export class PostsModule {}

// src/posts/posts.service.ts
@Injectable()
export class PostsService {
  constructor(
    private readonly usersService: UsersService,  // Now available
  ) {}
}
```

## Provider Tokens

```typescript
// String token
{
  provide: 'CONNECTION',
  useValue: connection,
}

// Symbol token
const CONNECTION = Symbol('CONNECTION');
{
  provide: CONNECTION,
  useValue: connection,
}

// Class token (default)
{
  provide: UsersService,
  useClass: UsersService,
}
```

## Best Practices

| Practice | Description |
|----------|-------------|
| Single Responsibility | Each service should do one thing well |
| Constructor Injection | Prefer over property injection |
| Interface Abstraction | Define interfaces for services |
| Avoid Circular Dependencies | Restructure code if needed |
| Use Scopes Wisely | DEFAULT scope for most cases |
| Export Consciously | Only export what's needed |

---

## Next Steps

- [Data Validation](./04-data-validation.md) - DTOs and input validation

---

[← Previous: Modules and Controllers](./02-modules-controllers.md) | [Back to Index](./README.md) | [Next: Data Validation →](./04-data-validation.md)
