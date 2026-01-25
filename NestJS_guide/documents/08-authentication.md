# Authentication

NestJS uses Passport.js for authentication. This guide covers local (username/password) and JWT authentication strategies.

## Installation

```bash
npm install @nestjs/passport passport passport-local passport-jwt
npm install @nestjs/jwt
npm install bcrypt
npm install -D @types/passport-local @types/passport-jwt @types/bcrypt
```

## Project Structure

```
src/
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── strategies/
│   │   ├── local.strategy.ts
│   │   └── jwt.strategy.ts
│   ├── guards/
│   │   ├── local-auth.guard.ts
│   │   └── jwt-auth.guard.ts
│   └── dto/
│       └── login.dto.ts
```

## Auth Module Setup

```typescript
// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '1d'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

## Auth Service

```typescript
// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';

export interface JwtPayload {
  sub: number;  // User ID
  email: string;
}

export interface LoginResponse {
  user: Partial<User>;
  accessToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  // Validate user credentials (used by LocalStrategy)
  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  // Generate JWT token
  async login(user: User): Promise<LoginResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      accessToken: this.jwtService.sign(payload),
    };
  }

  // Validate JWT payload (used by JwtStrategy)
  async validateJwtPayload(payload: JwtPayload): Promise<User> {
    const user = await this.usersService.findOne(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
```

## Local Strategy (Username/Password)

```typescript
// src/auth/strategies/local.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'email',  // Use 'email' instead of 'username'
      passwordField: 'password',
    });
  }

  // Called automatically by Passport
  async validate(email: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(email, password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;  // Attached to request.user
  }
}
```

## JWT Strategy

```typescript
// src/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService, JwtPayload } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  // Called after JWT is verified
  async validate(payload: JwtPayload) {
    return this.authService.validateJwtPayload(payload);
  }
}
```

## Auth Guards

```typescript
// src/auth/guards/local-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
```

```typescript
// src/auth/guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}
```

## Public Decorator

```typescript
// src/auth/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

## Current User Decorator

```typescript
// src/auth/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
```

## Auth Controller

```typescript
// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  UseGuards,
  Request,
  Body,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req, @Body() loginDto: LoginDto) {
    // req.user is populated by LocalStrategy
    return this.authService.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@CurrentUser() user) {
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUser('id') userId: number) {
    return { userId };
  }
}
```

## Login DTO

```typescript
// src/auth/dto/login.dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
```

## Global JWT Guard

Apply JWT authentication globally:

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
```

Now all routes require JWT by default. Use `@Public()` decorator for public routes:

```typescript
@Controller('users')
export class UsersController {
  @Public()
  @Post('register')  // Public - no auth required
  register(@Body() createUserDto: CreateUserDto) {}

  @Get('profile')  // Protected - JWT required
  getProfile(@CurrentUser() user) {}
}
```

## Password Hashing

```typescript
// src/users/users.service.ts
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private readonly SALT_ROUNDS = 10;

  async create(createUserDto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      this.SALT_ROUNDS,
    );

    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return this.userRepository.save(user);
  }
}
```

## Refresh Tokens

```typescript
// src/auth/auth.service.ts
@Injectable()
export class AuthService {
  async login(user: User) {
    const payload = { sub: user.id, email: user.email };

    return {
      accessToken: this.jwtService.sign(payload, { expiresIn: '15m' }),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.usersService.findOne(payload.sub);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return {
        accessToken: this.jwtService.sign(
          { sub: user.id, email: user.email },
          { expiresIn: '15m' },
        ),
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
```

## Protecting Routes in Controllers

```typescript
@Controller('posts')
export class PostsController {
  // Public route
  @Public()
  @Get()
  findAll() {
    return this.postsService.findAll();
  }

  // Protected route - user must be authenticated
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user, @Body() createPostDto: CreatePostDto) {
    return this.postsService.create(createPostDto, user.id);
  }

  // Protected route with user data
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(
    @Param('id') id: number,
    @CurrentUser() user,
    @Body() updatePostDto: UpdatePostDto,
  ) {
    return this.postsService.update(id, updatePostDto, user.id);
  }
}
```

## Environment Variables

```env
# .env
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=1d
```

## Complete Auth Flow

```
1. User Registration
   POST /users/register
   Body: { email, password, name }
   Response: { id, email, name }

2. User Login
   POST /auth/login
   Body: { email, password }
   Response: { user: {...}, accessToken: "jwt..." }

3. Access Protected Route
   GET /auth/profile
   Headers: Authorization: Bearer <accessToken>
   Response: { id, email, name }

4. Token Refresh (optional)
   POST /auth/refresh
   Body: { refreshToken: "..." }
   Response: { accessToken: "new-jwt..." }
```

## Best Practices

| Practice | Description |
|----------|-------------|
| Strong secrets | Use long, random JWT secrets |
| Short token expiry | 15min access, 7d refresh |
| HTTPS only | Never send tokens over HTTP |
| Hash passwords | Use bcrypt with 10+ rounds |
| Validate payloads | Always verify user exists |
| Secure cookies | httpOnly, secure, sameSite |

---

## Next Steps

- [Guards, Interceptors and Pipes](./09-guards-interceptors.md) - Advanced middleware

---

[← Previous: Error Handling](./07-error-handling.md) | [Back to Index](./README.md) | [Next: Guards, Interceptors and Pipes →](./09-guards-interceptors.md)
