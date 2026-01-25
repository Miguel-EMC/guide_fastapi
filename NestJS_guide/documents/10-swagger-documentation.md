# Swagger Documentation

NestJS integrates with Swagger (OpenAPI) to generate interactive API documentation automatically.

## Installation

```bash
npm install @nestjs/swagger
```

## Basic Setup

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('My API')
    .setDescription('API description')
    .setVersion('1.0')
    .addTag('users')
    .addTag('posts')
    .addBearerAuth()  // JWT authentication
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);  // Available at /docs

  await app.listen(3000);
}
bootstrap();
```

## DocumentBuilder Options

```typescript
const config = new DocumentBuilder()
  .setTitle('Blog API')
  .setDescription('RESTful API for blog management')
  .setVersion('1.0.0')
  .setContact('Developer', 'https://example.com', 'dev@example.com')
  .setLicense('MIT', 'https://opensource.org/licenses/MIT')
  .setTermsOfService('https://example.com/terms')
  .setExternalDoc('Documentation', 'https://docs.example.com')
  .addServer('http://localhost:3000', 'Development')
  .addServer('https://api.example.com', 'Production')
  .addTag('users', 'User management endpoints')
  .addTag('posts', 'Blog post endpoints')
  .addTag('auth', 'Authentication endpoints')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'JWT',
      description: 'Enter JWT token',
      in: 'header',
    },
    'JWT-auth',  // Security name
  )
  .addApiKey({ type: 'apiKey', name: 'X-API-KEY', in: 'header' }, 'api-key')
  .build();
```

## Controller Decorators

### Basic Controller Documentation

```typescript
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';

@ApiTags('users')  // Group endpoints under "users" tag
@Controller('users')
export class UsersController {
  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'List of users', type: [User] })
  findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User found', type: User })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: number): Promise<User> {
    return this.usersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new user' })
  @ApiResponse({ status: 201, description: 'User created', type: User })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }
}
```

### Authentication in Swagger

```typescript
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';

@ApiTags('posts')
@Controller('posts')
@ApiBearerAuth('JWT-auth')  // Requires JWT for all endpoints
export class PostsController {
  @Post()
  @ApiOperation({ summary: 'Create post' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  create(@Body() createPostDto: CreatePostDto) {
    return this.postsService.create(createPostDto);
  }
}

// For specific endpoints only
@Controller('users')
export class UsersController {
  @Get()
  @ApiBearerAuth('JWT-auth')  // Only this endpoint requires auth
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile() {}

  @Post('register')
  // No @ApiBearerAuth - public endpoint
  @ApiOperation({ summary: 'Register new user' })
  register() {}
}
```

## DTO Decorators

### Basic DTO Documentation

```typescript
// src/users/dto/create-user.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'password123',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({
    description: 'User display name',
    example: 'John Doe',
  })
  @IsString()
  @IsOptional()
  name?: string;
}
```

### Advanced Property Options

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class ProductDto {
  @ApiProperty({
    description: 'Product name',
    example: 'iPhone 15',
    minLength: 3,
    maxLength: 100,
  })
  name: string;

  @ApiProperty({
    description: 'Product price in cents',
    example: 99900,
    minimum: 0,
    maximum: 1000000,
  })
  price: number;

  @ApiProperty({
    description: 'Product status',
    enum: ['active', 'inactive', 'draft'],
    default: 'draft',
  })
  status: string;

  @ApiProperty({
    description: 'Product tags',
    type: [String],
    example: ['electronics', 'smartphone'],
  })
  tags: string[];

  @ApiProperty({
    description: 'Available sizes',
    enum: ['S', 'M', 'L', 'XL'],
    isArray: true,
  })
  sizes: string[];

  @ApiProperty({
    description: 'Creation date',
    type: 'string',
    format: 'date-time',
  })
  createdAt: Date;
}
```

### Nested DTOs

```typescript
// src/users/dto/create-profile.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class CreateProfileDto {
  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;
}

// src/users/dto/create-user.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { CreateProfileDto } from './create-profile.dto';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ type: CreateProfileDto })
  @ValidateNested()
  @Type(() => CreateProfileDto)
  profile: CreateProfileDto;
}
```

## Entity Documentation

```typescript
// src/users/entities/user.entity.ts
import { ApiProperty, ApiHideProperty } from '@nestjs/swagger';
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @ApiProperty({ example: 1, description: 'Unique identifier' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'user@example.com' })
  @Column({ unique: true })
  email: string;

  @ApiHideProperty()  // Hide from Swagger
  @Column()
  password: string;

  @ApiProperty({ example: 'John Doe', nullable: true })
  @Column({ nullable: true })
  name: string;

  @ApiProperty({ example: true })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  @Column()
  createdAt: Date;
}
```

## Response Documentation

### Typed Responses

```typescript
import {
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';

@Controller('users')
export class UsersController {
  @Get()
  @ApiOkResponse({
    description: 'List of all users',
    type: [User],
  })
  findAll() {}

  @Get(':id')
  @ApiOkResponse({ description: 'User found', type: User })
  @ApiNotFoundResponse({ description: 'User not found' })
  findOne(@Param('id') id: number) {}

  @Post()
  @ApiCreatedResponse({ description: 'User created', type: User })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'Email already exists' })
  create(@Body() dto: CreateUserDto) {}
}
```

### Paginated Response

```typescript
// src/common/dto/paginated-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class PaginatedResponseDto<T> {
  @ApiProperty()
  data: T[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 10 })
  totalPages: number;
}

// Usage in controller
@Get()
@ApiOkResponse({
  description: 'Paginated list of users',
  schema: {
    allOf: [
      {
        properties: {
          data: {
            type: 'array',
            items: { $ref: getSchemaPath(User) },
          },
          total: { type: 'number', example: 100 },
          page: { type: 'number', example: 1 },
          limit: { type: 'number', example: 10 },
        },
      },
    ],
  },
})
findAll(@Query() query: PaginationDto) {}
```

## Query Parameters

```typescript
import { ApiQuery } from '@nestjs/swagger';

@Controller('users')
export class UsersController {
  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: ['asc', 'desc'],
    example: 'desc',
  })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sort') sort?: string,
    @Query('search') search?: string,
  ) {}
}
```

Or using DTO:

```typescript
// src/common/dto/pagination.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

// Controller
@Get()
findAll(@Query() pagination: PaginationDto) {}
```

## File Upload Documentation

```typescript
import { ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('upload')
export class UploadController {
  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    return { filename: file.originalname };
  }

  @Post('multiple')
  @UseInterceptors(FilesInterceptor('files', 5))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  uploadMultiple(@UploadedFiles() files: Express.Multer.File[]) {}
}
```

## Swagger CLI Plugin

Auto-generate Swagger decorators from TypeScript types.

```json
// nest-cli.json
{
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "plugins": [
      {
        "name": "@nestjs/swagger",
        "options": {
          "classValidatorShim": true,
          "introspectComments": true
        }
      }
    ]
  }
}
```

With plugin, this:

```typescript
export class CreateUserDto {
  /** User email address */
  @IsEmail()
  email: string;

  /** User password (min 8 chars) */
  @MinLength(8)
  password: string;
}
```

Automatically generates `@ApiProperty` decorators.

## Export OpenAPI JSON

```typescript
// main.ts
const document = SwaggerModule.createDocument(app, config);

// Save to file
const fs = require('fs');
fs.writeFileSync('./swagger.json', JSON.stringify(document, null, 2));

// Or serve as endpoint
SwaggerModule.setup('docs', app, document, {
  jsonDocumentUrl: 'swagger/json',  // Available at /swagger/json
});
```

## Best Practices

| Practice | Description |
|----------|-------------|
| Use descriptive examples | Real data examples |
| Document all responses | Including errors |
| Group with tags | Organize endpoints logically |
| Use CLI plugin | Reduce decorator boilerplate |
| Version your API | Include in documentation |

---

## Next Steps

- [Testing](./11-testing.md) - Unit and E2E tests

---

[← Previous: Guards, Interceptors and Pipes](./09-guards-interceptors.md) | [Back to Index](./README.md) | [Next: Testing →](./11-testing.md)
