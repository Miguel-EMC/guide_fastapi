# Data Validation

NestJS uses **class-validator** and **class-transformer** for validating and transforming incoming data. DTOs (Data Transfer Objects) define the shape of data for requests.

## Setup

```bash
npm install class-validator class-transformer
```

Enable validation globally in `main.ts`:

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable global validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,           // Strip non-whitelisted properties
    forbidNonWhitelisted: true, // Throw error for extra properties
    transform: true,           // Auto-transform to DTO types
    transformOptions: {
      enableImplicitConversion: true,  // Convert string "1" to number 1
    },
  }));

  await app.listen(3000);
}
bootstrap();
```

## ValidationPipe Options

| Option | Description |
|--------|-------------|
| `whitelist` | Strips properties without decorators |
| `forbidNonWhitelisted` | Throws error if extra properties sent |
| `transform` | Transforms payload to DTO instance |
| `disableErrorMessages` | Disables detailed error messages |
| `exceptionFactory` | Custom exception factory |
| `validateCustomDecorators` | Validates custom decorators |
| `stopAtFirstError` | Stop validation at first error |

## Creating DTOs

### Basic DTO

```typescript
// src/users/dto/create-user.dto.ts
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsOptional()
  name?: string;
}
```

### Using DTO in Controller

```typescript
// src/users/users.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UsersController {
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    // createUserDto is validated and typed
    return this.usersService.create(createUserDto);
  }
}
```

## Common Validators

### String Validators

```typescript
import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
  IsAlpha,
  IsAlphanumeric,
  IsUUID,
  IsUrl,
  Contains,
} from 'class-validator';

export class StringExamplesDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @MinLength(3)
  @MaxLength(50)
  username: string;

  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'slug must contain only letters, numbers, underscores and hyphens',
  })
  slug: string;

  @IsAlpha()
  firstName: string;

  @IsAlphanumeric()
  code: string;

  @IsUUID()
  uuid: string;

  @IsUrl()
  website: string;

  @Contains('hello')
  greeting: string;
}
```

### Number Validators

```typescript
import {
  IsNumber,
  IsInt,
  IsPositive,
  IsNegative,
  Min,
  Max,
  IsDecimal,
} from 'class-validator';

export class NumberExamplesDto {
  @IsNumber()
  price: number;

  @IsInt()
  quantity: number;

  @IsPositive()
  amount: number;

  @Min(0)
  @Max(100)
  percentage: number;

  @IsDecimal({ decimal_digits: '2' })
  total: string;  // Decimal as string for precision
}
```

### Boolean and Date Validators

```typescript
import {
  IsBoolean,
  IsDate,
  IsDateString,
  MinDate,
  MaxDate,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OtherTypesDto {
  @IsBoolean()
  isActive: boolean;

  @IsDate()
  @Type(() => Date)  // Transform string to Date
  birthDate: Date;

  @IsDateString()
  createdAt: string;  // ISO 8601 date string

  @MinDate(new Date('2020-01-01'))
  @MaxDate(new Date())
  @Type(() => Date)
  eventDate: Date;
}
```

### Array Validators

```typescript
import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ArrayUnique,
  ArrayNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class TagDto {
  @IsString()
  name: string;
}

export class ArrayExamplesDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })  // Validate each item
  tags: string[];

  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  categoryIds: number[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TagDto)
  tagObjects: TagDto[];
}
```

### Enum Validators

```typescript
import { IsEnum } from 'class-validator';

enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  MODERATOR = 'moderator',
}

enum Status {
  ACTIVE = 1,
  INACTIVE = 0,
}

export class EnumExamplesDto {
  @IsEnum(UserRole)
  role: UserRole;

  @IsEnum(Status)
  status: Status;
}
```

### Optional and Conditional

```typescript
import {
  IsOptional,
  IsNotEmpty,
  ValidateIf,
  IsDefined,
} from 'class-validator';

export class ConditionalDto {
  @IsOptional()
  @IsString()
  nickname?: string;

  @IsDefined()  // Must be defined (not undefined)
  type: string;

  // Only validate email if type is 'email'
  @ValidateIf(o => o.type === 'email')
  @IsEmail()
  email?: string;

  // Only validate phone if type is 'phone'
  @ValidateIf(o => o.type === 'phone')
  @IsString()
  phone?: string;
}
```

## Nested Objects

```typescript
// src/users/dto/create-profile.dto.ts
import { IsString, IsOptional, IsUrl } from 'class-validator';

export class CreateProfileDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsUrl()
  @IsOptional()
  avatarUrl?: string;
}

// src/users/dto/create-user.dto.ts
import { ValidateNested, IsEmail, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateProfileDto } from './create-profile.dto';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @ValidateNested()
  @Type(() => CreateProfileDto)  // Required for nested validation
  profile: CreateProfileDto;
}
```

## Update DTOs with PartialType

```typescript
// src/users/dto/update-user.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

// All properties from CreateUserDto become optional
export class UpdateUserDto extends PartialType(CreateUserDto) {}
```

### Other Mapped Types

```typescript
import {
  PartialType,    // All properties optional
  PickType,       // Pick specific properties
  OmitType,       // Omit specific properties
  IntersectionType  // Combine types
} from '@nestjs/mapped-types';

// Pick only email and name
export class UserEmailDto extends PickType(CreateUserDto, ['email', 'name']) {}

// Omit password
export class UserPublicDto extends OmitType(CreateUserDto, ['password']) {}

// Combine two DTOs
export class ExtendedUserDto extends IntersectionType(
  CreateUserDto,
  AdditionalInfoDto,
) {}

// Partial of picked properties
export class UpdateEmailDto extends PartialType(
  PickType(CreateUserDto, ['email']),
) {}
```

## Custom Validators

### Custom Decorator

```typescript
// src/common/validators/is-unique.validator.ts
import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsUnique(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isUnique',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [property],
      validator: {
        validate(value: any, args: ValidationArguments) {
          // Add your uniqueness check logic here
          // Usually involves database query
          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be unique`;
        },
      },
    });
  };
}

// Usage
export class CreateUserDto {
  @IsEmail()
  @IsUnique('email', { message: 'Email already exists' })
  email: string;
}
```

### Custom Validator Class

```typescript
// src/common/validators/match.validator.ts
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';

@ValidatorConstraint({ name: 'Match', async: false })
export class MatchConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as any)[relatedPropertyName];
    return value === relatedValue;
  }

  defaultMessage(args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    return `${args.property} must match ${relatedPropertyName}`;
  }
}

export function Match(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [property],
      validator: MatchConstraint,
    });
  };
}

// Usage
export class RegisterDto {
  @IsString()
  @MinLength(8)
  password: string;

  @Match('password', { message: 'Passwords do not match' })
  confirmPassword: string;
}
```

## Transformation

### Basic Transformation

```typescript
import { Transform, Type } from 'class-transformer';

export class QueryDto {
  // Transform string to number
  @Type(() => Number)
  page: number;

  // Transform string to boolean
  @Transform(({ value }) => value === 'true')
  isActive: boolean;

  // Trim whitespace
  @Transform(({ value }) => value?.trim())
  @IsString()
  search: string;

  // To lowercase
  @Transform(({ value }) => value?.toLowerCase())
  @IsEmail()
  email: string;

  // Parse JSON string to array
  @Transform(({ value }) => {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  })
  @IsArray()
  ids: number[];
}
```

### Exclude Properties

```typescript
import { Exclude, Expose } from 'class-transformer';

export class UserResponseDto {
  id: number;
  email: string;

  @Exclude()  // Never include in response
  password: string;

  @Expose({ groups: ['admin'] })  // Only for admin group
  role: string;
}

// In controller, use ClassSerializerInterceptor
@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.usersService.findOne(id);
  }
}
```

## Validation Error Response

Default validation error response:

```json
{
  "statusCode": 400,
  "message": [
    "email must be an email",
    "password must be longer than or equal to 8 characters"
  ],
  "error": "Bad Request"
}
```

### Custom Error Response

```typescript
// src/main.ts
import { ValidationPipe, BadRequestException } from '@nestjs/common';

app.useGlobalPipes(new ValidationPipe({
  exceptionFactory: (errors) => {
    const result = errors.map((error) => ({
      field: error.property,
      message: Object.values(error.constraints || {}).join(', '),
    }));
    return new BadRequestException({
      statusCode: 400,
      error: 'Validation Failed',
      details: result,
    });
  },
}));
```

Custom response:

```json
{
  "statusCode": 400,
  "error": "Validation Failed",
  "details": [
    {
      "field": "email",
      "message": "email must be an email"
    },
    {
      "field": "password",
      "message": "password must be longer than or equal to 8 characters"
    }
  ]
}
```

## Complete DTO Example

```typescript
// src/posts/dto/create-post.dto.ts
import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  IsBoolean,
  IsArray,
  IsInt,
  ArrayMinSize,
  ValidateNested,
  IsUrl,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  @Transform(({ value }) => value?.trim())
  title: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  content: string;

  @IsUrl()
  @IsOptional()
  coverImage?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  summary?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value ?? true)
  isDraft?: boolean;

  @IsArray()
  @IsInt({ each: true })
  @ArrayMinSize(1)
  @Type(() => Number)
  categoryIds: number[];
}
```

---

## Next Steps

- [Database Setup](./05-database-setup.md) - TypeORM and PostgreSQL configuration

---

[← Previous: Services and Providers](./03-services-providers.md) | [Back to Index](./README.md) | [Next: Database Setup →](./05-database-setup.md)
