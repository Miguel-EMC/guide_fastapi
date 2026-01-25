# Common Patterns

This guide covers commonly used patterns in NestJS: pagination, soft deletes, filtering, and other production patterns.

## Pagination

### Pagination DTO

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

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}
```

### Paginated Response

```typescript
// src/common/dto/paginated-response.dto.ts
export class PaginatedResponseDto<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };

  constructor(data: T[], total: number, page: number, limit: number) {
    const totalPages = Math.ceil(total / limit);

    this.data = data;
    this.meta = {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }
}
```

### Service Implementation

```typescript
// src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAllPaginated(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponseDto<User>> {
    const { page, limit, skip } = paginationDto;

    const [data, total] = await this.userRepository.findAndCount({
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return new PaginatedResponseDto(data, total, page, limit);
  }
}
```

### Controller Usage

```typescript
// src/users/users.controller.ts
@Controller('users')
export class UsersController {
  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    return this.usersService.findAllPaginated(paginationDto);
  }
}
```

## Filtering and Sorting

### Filter DTO

```typescript
// src/posts/dto/filter-posts.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsBoolean, IsInt } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum PostSortField {
  CREATED_AT = 'createdAt',
  TITLE = 'title',
  VIEWS = 'views',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class FilterPostsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  authorId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isDraft?: boolean;

  @ApiPropertyOptional({ enum: PostSortField })
  @IsOptional()
  @IsEnum(PostSortField)
  sortBy?: PostSortField = PostSortField.CREATED_AT;

  @ApiPropertyOptional({ enum: SortOrder })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;
}
```

### Service with Filtering

```typescript
// src/posts/posts.service.ts
@Injectable()
export class PostsService {
  async findAll(
    pagination: PaginationDto,
    filter: FilterPostsDto,
  ): Promise<PaginatedResponseDto<Post>> {
    const query = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.categories', 'categories');

    // Search
    if (filter.search) {
      query.andWhere(
        '(post.title ILIKE :search OR post.content ILIKE :search)',
        { search: `%${filter.search}%` },
      );
    }

    // Filter by category
    if (filter.categoryId) {
      query.andWhere('categories.id = :categoryId', {
        categoryId: filter.categoryId,
      });
    }

    // Filter by author
    if (filter.authorId) {
      query.andWhere('post.authorId = :authorId', {
        authorId: filter.authorId,
      });
    }

    // Filter by draft status
    if (filter.isDraft !== undefined) {
      query.andWhere('post.isDraft = :isDraft', { isDraft: filter.isDraft });
    }

    // Sorting
    query.orderBy(`post.${filter.sortBy}`, filter.sortOrder);

    // Pagination
    query.skip(pagination.skip).take(pagination.limit);

    const [data, total] = await query.getManyAndCount();

    return new PaginatedResponseDto(data, total, pagination.page, pagination.limit);
  }
}
```

## Soft Deletes

### Entity with Soft Delete

```typescript
// src/posts/entities/post.entity.ts
import {
  Entity,
  Column,
  DeleteDateColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;  // Soft delete column
}
```

### Service with Soft Delete

```typescript
// src/posts/posts.service.ts
@Injectable()
export class PostsService {
  // Find all (excludes soft-deleted by default)
  async findAll(): Promise<Post[]> {
    return this.postRepository.find();
  }

  // Find all including soft-deleted
  async findAllWithDeleted(): Promise<Post[]> {
    return this.postRepository.find({ withDeleted: true });
  }

  // Find only soft-deleted
  async findDeleted(): Promise<Post[]> {
    return this.postRepository
      .createQueryBuilder('post')
      .withDeleted()
      .where('post.deletedAt IS NOT NULL')
      .getMany();
  }

  // Soft delete
  async remove(id: number): Promise<void> {
    await this.postRepository.softDelete(id);
  }

  // Restore soft-deleted
  async restore(id: number): Promise<void> {
    await this.postRepository.restore(id);
  }

  // Permanently delete
  async permanentDelete(id: number): Promise<void> {
    await this.postRepository.delete(id);
  }
}
```

### Controller

```typescript
@Controller('posts')
export class PostsController {
  @Delete(':id')
  async remove(@Param('id') id: number) {
    await this.postsService.remove(id);
    return { message: 'Post deleted' };
  }

  @Patch(':id/restore')
  @Roles(Role.ADMIN)
  async restore(@Param('id') id: number) {
    await this.postsService.restore(id);
    return { message: 'Post restored' };
  }

  @Get('trash')
  @Roles(Role.ADMIN)
  async getDeleted() {
    return this.postsService.findDeleted();
  }
}
```

## Slug Generation

### Slug Utility

```typescript
// src/common/utils/slug.ts
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')  // Remove special chars
    .replace(/[\s_-]+/g, '-')  // Replace spaces with hyphens
    .replace(/^-+|-+$/g, '');  // Remove leading/trailing hyphens
}

export function generateUniqueSlug(text: string): string {
  const baseSlug = generateSlug(text);
  const uniqueSuffix = Date.now().toString(36);
  return `${baseSlug}-${uniqueSuffix}`;
}
```

### Entity with Slug

```typescript
// src/posts/entities/post.entity.ts
import { Entity, Column, BeforeInsert, BeforeUpdate } from 'typeorm';
import { generateSlug } from '../../common/utils/slug';

@Entity('posts')
export class Post {
  @Column()
  title: string;

  @Column({ unique: true })
  slug: string;

  @BeforeInsert()
  @BeforeUpdate()
  generateSlug() {
    if (this.title) {
      this.slug = generateSlug(this.title);
    }
  }
}
```

### Service with Unique Slug

```typescript
@Injectable()
export class PostsService {
  async create(data: CreatePostDto): Promise<Post> {
    let slug = generateSlug(data.title);

    // Ensure unique slug
    const existing = await this.postRepository.findOne({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const post = this.postRepository.create({ ...data, slug });
    return this.postRepository.save(post);
  }

  async findBySlug(slug: string): Promise<Post> {
    return this.postRepository.findOne({ where: { slug } });
  }
}
```

## Search

### Full-Text Search (PostgreSQL)

```typescript
// src/posts/posts.service.ts
@Injectable()
export class PostsService {
  async search(query: string): Promise<Post[]> {
    return this.postRepository
      .createQueryBuilder('post')
      .where(
        `to_tsvector('english', post.title || ' ' || post.content) @@ plainto_tsquery('english', :query)`,
        { query },
      )
      .orderBy(
        `ts_rank(to_tsvector('english', post.title || ' ' || post.content), plainto_tsquery('english', :query))`,
        'DESC',
      )
      .getMany();
  }
}
```

### Simple Search

```typescript
async search(query: string): Promise<Post[]> {
  return this.postRepository
    .createQueryBuilder('post')
    .where('post.title ILIKE :query', { query: `%${query}%` })
    .orWhere('post.content ILIKE :query', { query: `%${query}%` })
    .orderBy('post.createdAt', 'DESC')
    .limit(20)
    .getMany();
}
```

## Response Transformer

### Transform Interceptor

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
  success: boolean;
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
```

## Request ID

### Request ID Middleware

```typescript
// src/common/middleware/request-id.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId = req.headers['x-request-id'] || uuid();
    req['requestId'] = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
  }
}
```

### Request ID Decorator

```typescript
// src/common/decorators/request-id.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const RequestId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.requestId;
  },
);

// Usage
@Get()
findAll(@RequestId() requestId: string) {
  this.logger.log(`Request ${requestId}: Finding all users`);
}
```

## Base Entity

```typescript
// src/common/entities/base.entity.ts
import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

export abstract class BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}

// Usage
@Entity('posts')
export class Post extends BaseEntity {
  @Column()
  title: string;

  @Column('text')
  content: string;
}
```

## Repository Pattern

```typescript
// src/common/repositories/base.repository.ts
import { Repository, FindOptionsWhere, DeepPartial } from 'typeorm';

export abstract class BaseRepository<T> {
  constructor(protected readonly repository: Repository<T>) {}

  async findAll(): Promise<T[]> {
    return this.repository.find();
  }

  async findById(id: number): Promise<T | null> {
    return this.repository.findOne({
      where: { id } as FindOptionsWhere<T>,
    });
  }

  async create(data: DeepPartial<T>): Promise<T> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async update(id: number, data: DeepPartial<T>): Promise<T> {
    await this.repository.update(id, data as any);
    return this.findById(id);
  }

  async delete(id: number): Promise<void> {
    await this.repository.softDelete(id);
  }
}
```

## Best Practices Summary

| Pattern | Use Case |
|---------|----------|
| Pagination | Large datasets |
| Soft deletes | Data recovery, audit |
| Filtering | Complex queries |
| Slugs | SEO-friendly URLs |
| Request IDs | Distributed tracing |
| Base entities | DRY principle |
| Transform interceptor | Consistent responses |

---

[← Previous: API Versioning](./21-api-versioning.md) | [Back to Index](./README.md)
