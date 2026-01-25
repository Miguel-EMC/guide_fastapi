# Error Handling

NestJS provides a built-in exceptions layer for handling errors across the application. This guide covers HTTP exceptions, custom exceptions, and exception filters.

## Built-in HTTP Exceptions

NestJS provides standard HTTP exceptions out of the box:

| Exception | Status Code | Use Case |
|-----------|-------------|----------|
| `BadRequestException` | 400 | Invalid input data |
| `UnauthorizedException` | 401 | Missing/invalid authentication |
| `ForbiddenException` | 403 | No permission for resource |
| `NotFoundException` | 404 | Resource not found |
| `MethodNotAllowedException` | 405 | HTTP method not allowed |
| `NotAcceptableException` | 406 | Cannot produce acceptable response |
| `RequestTimeoutException` | 408 | Request timeout |
| `ConflictException` | 409 | Resource conflict (duplicate) |
| `GoneException` | 410 | Resource no longer available |
| `PayloadTooLargeException` | 413 | Request payload too large |
| `UnsupportedMediaTypeException` | 415 | Unsupported content type |
| `UnprocessableEntityException` | 422 | Semantic errors |
| `InternalServerErrorException` | 500 | Server error |
| `NotImplementedException` | 501 | Feature not implemented |
| `BadGatewayException` | 502 | Bad gateway |
| `ServiceUnavailableException` | 503 | Service unavailable |
| `GatewayTimeoutException` | 504 | Gateway timeout |

## Using Built-in Exceptions

### Basic Usage

```typescript
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

@Injectable()
export class UsersService {
  async findOne(id: number) {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }

    return user;
  }

  async create(data: CreateUserDto) {
    const existing = await this.userRepository.findOne({
      where: { email: data.email },
    });

    if (existing) {
      throw new ConflictException('Email already exists');
    }

    return this.userRepository.save(data);
  }

  async update(id: number, data: UpdateUserDto) {
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No data provided for update');
    }

    const user = await this.findOne(id);  // Throws NotFoundException
    Object.assign(user, data);
    return this.userRepository.save(user);
  }
}
```

### Exception with Custom Response

```typescript
// Simple message
throw new NotFoundException('User not found');

// Response: { "statusCode": 404, "message": "User not found" }

// Custom object response
throw new BadRequestException({
  statusCode: 400,
  message: 'Validation failed',
  errors: [
    { field: 'email', message: 'Invalid email format' },
    { field: 'password', message: 'Password too short' },
  ],
});

// With description
throw new ForbiddenException('Access denied', 'You do not have permission');
```

## HttpException Base Class

All built-in exceptions extend `HttpException`:

```typescript
import { HttpException, HttpStatus } from '@nestjs/common';

// Basic usage
throw new HttpException('Custom error message', HttpStatus.BAD_REQUEST);

// With response object
throw new HttpException(
  {
    status: HttpStatus.FORBIDDEN,
    error: 'Access Denied',
    message: 'You do not have permission to access this resource',
  },
  HttpStatus.FORBIDDEN,
);
```

## Custom Exceptions

### Simple Custom Exception

```typescript
// src/common/exceptions/user-not-found.exception.ts
import { NotFoundException } from '@nestjs/common';

export class UserNotFoundException extends NotFoundException {
  constructor(userId: number) {
    super(`User with ID ${userId} not found`);
  }
}

// Usage
throw new UserNotFoundException(123);
```

### Custom Exception with More Details

```typescript
// src/common/exceptions/business.exception.ts
import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(
      {
        statusCode: status,
        errorCode: code,
        message: message,
        timestamp: new Date().toISOString(),
      },
      status,
    );
  }
}

// Specific business exceptions
export class InsufficientFundsException extends BusinessException {
  constructor(required: number, available: number) {
    super(
      'INSUFFICIENT_FUNDS',
      `Required: ${required}, Available: ${available}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class DuplicateEmailException extends BusinessException {
  constructor(email: string) {
    super(
      'DUPLICATE_EMAIL',
      `Email ${email} is already registered`,
      HttpStatus.CONFLICT,
    );
  }
}

// Usage
throw new InsufficientFundsException(100, 50);
throw new DuplicateEmailException('user@example.com');
```

## Exception Filters

Exception filters give you full control over the exception handling flow.

### Basic Exception Filter

```typescript
// src/common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message:
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || 'Error',
    };

    response.status(status).json(errorResponse);
  }
}
```

### Catch All Exceptions

```typescript
// src/common/filters/all-exceptions.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()  // Catches all exceptions
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // Log the error (use proper logger in production)
    console.error('Exception:', exception);

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message:
        typeof message === 'string'
          ? message
          : (message as any).message || 'Unknown error',
    });
  }
}
```

### Exception Filter with Logging

```typescript
// src/common/filters/logging-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class LoggingExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(LoggingExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    // Log error details
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
```

## Applying Exception Filters

### Global Filter (main.ts)

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Apply globally
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(3000);
}
bootstrap();
```

### Global Filter with Dependency Injection

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
```

### Controller-Level Filter

```typescript
import { Controller, UseFilters } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

@Controller('users')
@UseFilters(HttpExceptionFilter)  // Apply to all routes
export class UsersController {
  // ...
}
```

### Method-Level Filter

```typescript
import { Controller, Post, UseFilters } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

@Controller('users')
export class UsersController {
  @Post()
  @UseFilters(HttpExceptionFilter)  // Apply to this route only
  create() {
    // ...
  }
}
```

## Handling Database Errors

```typescript
// src/common/filters/database-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { Response } from 'express';

@Catch(QueryFailedError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Database error';

    // PostgreSQL error codes
    const pgError = exception as any;

    switch (pgError.code) {
      case '23505':  // unique_violation
        status = HttpStatus.CONFLICT;
        message = 'Record already exists';
        break;
      case '23503':  // foreign_key_violation
        status = HttpStatus.BAD_REQUEST;
        message = 'Referenced record not found';
        break;
      case '23502':  // not_null_violation
        status = HttpStatus.BAD_REQUEST;
        message = 'Required field is missing';
        break;
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: process.env.NODE_ENV === 'development' ? pgError.detail : undefined,
    });
  }
}
```

## Error Response Standardization

```typescript
// src/common/interfaces/error-response.interface.ts
export interface ErrorResponse {
  statusCode: number;
  message: string;
  error?: string;
  timestamp: string;
  path: string;
  details?: Record<string, any>;
}

// src/common/filters/standard-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorResponse } from '../interfaces/error-response.interface';

@Catch()
export class StandardExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error: string | undefined;
    let details: Record<string, any> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const res = exceptionResponse as Record<string, any>;
        message = res.message || message;
        error = res.error;
        details = res.details;
      }
    }

    const errorResponse: ErrorResponse = {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
      details,
    };

    response.status(status).json(errorResponse);
  }
}
```

## Best Practices

| Practice | Description |
|----------|-------------|
| Use specific exceptions | `NotFoundException` over generic `HttpException` |
| Consistent error format | Standardize error response structure |
| Log errors properly | Use Logger service, not console.log |
| Hide internal details | Don't expose stack traces in production |
| Handle database errors | Convert DB errors to HTTP exceptions |
| Document error codes | API docs should list possible errors |

---

## Next Steps

- [Authentication](./08-authentication.md) - JWT and Passport strategies

---

[← Previous: Entities and Relationships](./06-entities-relationships.md) | [Back to Index](./README.md) | [Next: Authentication →](./08-authentication.md)
