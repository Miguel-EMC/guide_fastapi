# Project: Blog API

A complete Blog API implementation with users, posts, categories, authentication, and AI-powered content generation.

## Features

- User registration and authentication (JWT)
- User profiles (OneToOne relationship)
- Blog posts with CRUD operations
- Categories with ManyToMany relationships
- AI-generated summaries and cover images (OpenAI)
- Swagger documentation
- Docker support

## Project Structure

```
src/
├── main.ts                    # Application entry point
├── app.module.ts              # Root module
├── app.controller.ts          # Root controller
├── app.service.ts             # Root service
├── env.models.ts              # Environment interface
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   ├── dto/
│   │   ├── create-user.dto.ts
│   │   └── update-user.dto.ts
│   └── entities/
│       ├── user.entity.ts
│       └── profile.entity.ts
├── posts/
│   ├── posts.module.ts
│   ├── posts.controller.ts
│   ├── posts.service.ts
│   ├── categories.controller.ts
│   ├── categories.service.ts
│   ├── dto/
│   │   ├── create-post.dto.ts
│   │   ├── update-post.dto.ts
│   │   ├── create-category.dto.ts
│   │   └── update-category.dto.ts
│   └── entities/
│       ├── post.entity.ts
│       └── category.entity.ts
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── strategies/
│   │   ├── local.strategy.ts
│   │   └── jwt.strategy.ts
│   └── models/
│       └── payload.model.ts
├── ai/
│   ├── ai.module.ts
│   └── ai.service.ts
└── database/
    ├── database.module.ts
    ├── ormconfig.ts
    └── migrations/
```

---

## Environment Setup

```env
# .env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=myblog
JWT_SECRET=your-secret-key
OPENAI_API_KEY=sk-your-openai-key
```

---

## Entities

### User Entity

```typescript
// src/users/entities/user.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  BeforeInsert,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import * as bcrypt from 'bcrypt';
import { Profile } from './profile.entity';
import { Post } from '../../posts/entities/post.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()  // Hide password in responses
  password: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => Profile, (profile) => profile.user, {
    cascade: true,
  })
  @JoinColumn()
  profile: Profile;

  @OneToMany(() => Post, (post) => post.author)
  posts: Post[];

  @BeforeInsert()
  async hashPassword() {
    this.password = await bcrypt.hash(this.password, 10);
  }
}
```

### Profile Entity

```typescript
// src/users/entities/profile.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
} from 'typeorm';
import { User } from './user.entity';

@Entity('profiles')
export class Profile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  avatar: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => User, (user) => user.profile)
  user: User;
}
```

### Post Entity

```typescript
// src/posts/entities/post.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Category } from './category.entity';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column({ nullable: true })
  coverImage: string;

  @Column({ nullable: true })
  summary: string;

  @Column({ default: true })
  isDraft: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.posts)
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Column()
  authorId: number;

  @ManyToMany(() => Category, (category) => category.posts)
  @JoinTable({ name: 'posts_categories' })
  categories: Category[];
}
```

### Category Entity

```typescript
// src/posts/entities/category.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
} from 'typeorm';
import { Post } from './post.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToMany(() => Post, (post) => post.categories)
  posts: Post[];
}
```

---

## DTOs

### Create User DTO

```typescript
// src/users/dto/create-user.dto.ts
import { IsEmail, IsString, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateProfileDto } from './create-profile.dto';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @ValidateNested()
  @Type(() => CreateProfileDto)
  profile: CreateProfileDto;
}
```

### Create Post DTO

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
} from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  coverImage?: string;

  @IsString()
  @IsOptional()
  summary?: string;

  @IsBoolean()
  @IsOptional()
  isDraft?: boolean;

  @IsArray()
  @IsInt({ each: true })
  categoryIds: number[];
}
```

---

## Services

### Users Service

```typescript
// src/users/users.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Profile } from './entities/profile.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      relations: ['profile'],
    });
  }

  async getUserById(id: number): Promise<User> {
    if (id === 1) {
      throw new ForbiddenException('Access to user 1 is forbidden');
    }

    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['profile'],
    });

    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }

    return user;
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const profile = this.profileRepository.create(createUserDto.profile);
    const user = this.userRepository.create({
      email: createUserDto.email,
      password: createUserDto.password,
      profile,
    });

    return this.userRepository.save(user);
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.getUserById(id);
    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: ['profile'],
    });
  }
}
```

### Posts Service

```typescript
// src/posts/posts.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Post } from './entities/post.entity';
import { Category } from './entities/category.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { AiService } from '../ai/ai.service';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly aiService: AiService,
  ) {}

  async create(createPostDto: CreatePostDto, authorId: number): Promise<Post> {
    const categories = await this.categoryRepository.findBy({
      id: In(createPostDto.categoryIds),
    });

    const post = this.postRepository.create({
      ...createPostDto,
      authorId,
      categories,
      isDraft: true,
    });

    return this.postRepository.save(post);
  }

  async findAll(): Promise<Post[]> {
    return this.postRepository.find({
      relations: ['author', 'categories'],
    });
  }

  async findOne(id: number): Promise<Post> {
    const post = await this.postRepository.findOne({
      where: { id },
      relations: ['author', 'categories'],
    });

    if (!post) {
      throw new NotFoundException(`Post #${id} not found`);
    }

    return post;
  }

  async update(id: number, updatePostDto: UpdatePostDto): Promise<Post> {
    const post = await this.findOne(id);

    if (updatePostDto.categoryIds) {
      post.categories = await this.categoryRepository.findBy({
        id: In(updatePostDto.categoryIds),
      });
    }

    Object.assign(post, updatePostDto);
    return this.postRepository.save(post);
  }

  async remove(id: number): Promise<void> {
    const post = await this.findOne(id);
    await this.postRepository.remove(post);
  }

  async publish(id: number, userId: number): Promise<Post> {
    const post = await this.findOne(id);

    // Generate AI content
    const [summary, coverImage] = await Promise.all([
      this.aiService.generateSummary(post.content),
      this.aiService.generateImage(post.title),
    ]);

    post.summary = summary;
    post.coverImage = coverImage;
    post.isDraft = false;

    return this.postRepository.save(post);
  }
}
```

### AI Service

```typescript
// src/ai/ai.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get('OPENAI_API_KEY'),
    });
  }

  async generateSummary(content: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that summarizes blog posts.',
        },
        {
          role: 'user',
          content: `Summarize this blog post in 2-3 sentences:\n\n${content}`,
        },
      ],
      max_tokens: 150,
    });

    return response.choices[0].message.content || '';
  }

  async generateImage(title: string): Promise<string> {
    const response = await this.openai.images.generate({
      model: 'dall-e-3',
      prompt: `Blog cover image for: ${title}`,
      n: 1,
      size: '1024x1024',
    });

    return response.data[0].url || '';
  }
}
```

---

## Authentication

### Auth Service

```typescript
// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { Payload } from './models/payload.model';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.getUserByEmail(email);

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  generateToken(user: User) {
    const payload: Payload = { sub: user.id };

    return {
      user,
      accessToken: this.jwtService.sign(payload, { expiresIn: '6d' }),
    };
  }
}
```

### JWT Strategy

```typescript
// src/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { Payload } from '../models/payload.model';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: Payload) {
    const user = await this.usersService.getUserById(payload.sub);

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
```

### Auth Controller

```typescript
// src/auth/auth.controller.ts
import { Controller, Post, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(AuthGuard('local'))
  @Post('login')
  login(@Request() req) {
    return this.authService.generateToken(req.user);
  }
}
```

---

## Controllers

### Posts Controller

```typescript
// src/posts/posts.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Body() createPostDto: CreatePostDto, @Request() req) {
    return this.postsService.create(createPostDto, req.user.id);
  }

  @Get()
  findAll() {
    return this.postsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePostDto: UpdatePostDto) {
    return this.postsService.update(+id, updatePostDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.postsService.remove(+id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':id/publish')
  publish(@Param('id') id: string, @Request() req) {
    return this.postsService.publish(+id, req.user.id);
  }
}
```

---

## Main Application

```typescript
// src/main.ts
import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security
  app.use(helmet());
  app.enableCors({ origin: '*' });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Serialization (hide @Exclude() fields like password)
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Blog API')
    .setDescription('RESTful API for blog management')
    .setVersion('1.0')
    .addTag('users')
    .addTag('posts')
    .addTag('categories')
    .addTag('auth')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'swagger/json',
  });

  await app.listen(3000);
  console.log('Application running on http://localhost:3000');
  console.log('Swagger docs at http://localhost:3000/docs');
}
bootstrap();
```

---

## Docker Setup

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    container_name: blog-api
    ports:
      - '3000:3000'
    environment:
      - DATABASE_HOST=postgres
      - DATABASE_PORT=5432
      - DATABASE_USER=postgres
      - DATABASE_PASSWORD=postgres
      - DATABASE_NAME=myblog
      - JWT_SECRET=your-secret-key
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - postgres
    networks:
      - blog-network

  postgres:
    image: postgres:15
    container_name: blog-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: myblog
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - blog-network

networks:
  blog-network:

volumes:
  postgres_data:
```

---

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /auth/login | Login and get JWT | No |
| GET | /users | Get all users | No |
| GET | /users/:id | Get user by ID | No |
| POST | /users | Create user | No |
| PUT | /users/:id | Update user | No |
| GET | /posts | Get all posts | No |
| GET | /posts/:id | Get post by ID | No |
| POST | /posts | Create draft post | JWT |
| PATCH | /posts/:id | Update post | No |
| DELETE | /posts/:id | Delete post | No |
| PUT | /posts/:id/publish | Publish with AI | JWT |
| GET | /categories | Get all categories | No |
| GET | /categories/:id | Get category by ID | No |
| POST | /categories | Create category | No |
| PATCH | /categories/:id | Update category | No |
| DELETE | /categories/:id | Delete category | No |

---

## Running the Project

```bash
# Install dependencies
npm install

# Start database
docker-compose up -d postgres

# Run migrations
npm run migration:run

# Start development server
npm run start:dev

# Access API
# http://localhost:3000
# Swagger: http://localhost:3000/docs
```

---

## Summary

This Blog API demonstrates:

1. **Modular Architecture** - Feature-based modules
2. **TypeORM Integration** - Entities with relationships
3. **Authentication** - JWT with Passport strategies
4. **Validation** - DTOs with class-validator
5. **Serialization** - Hide sensitive data
6. **External APIs** - OpenAI integration
7. **Documentation** - Swagger/OpenAPI
8. **Docker** - Containerization

---

[← Previous: Deployment](./12-deployment.md) | [Back to Index](./README.md)
