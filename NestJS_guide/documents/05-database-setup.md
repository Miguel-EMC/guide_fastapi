# Database Setup

NestJS commonly uses TypeORM for database operations. This guide covers setting up PostgreSQL with TypeORM.

## Installation

```bash
npm install @nestjs/typeorm typeorm pg
npm install @nestjs/config  # For environment variables
```

## Configuration

### Environment Variables

```env
# .env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=mydb
```

### TypeORM Configuration

```typescript
// src/database/ormconfig.ts
import { DataSource, DataSourceOptions } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

config();  // Load .env file

const configService = new ConfigService();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: configService.get('DATABASE_HOST'),
  port: configService.get<number>('DATABASE_PORT'),
  username: configService.get('DATABASE_USER'),
  password: configService.get('DATABASE_PASSWORD'),
  database: configService.get('DATABASE_NAME'),
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/database/migrations/*.js'],
  synchronize: false,  // Never true in production!
  logging: process.env.NODE_ENV === 'development',
};

// For TypeORM CLI
const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
```

### Database Module

```typescript
// src/database/database.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT'),
        username: configService.get('DATABASE_USER'),
        password: configService.get('DATABASE_PASSWORD'),
        database: configService.get('DATABASE_NAME'),
        autoLoadEntities: true,  // Auto-load entities from modules
        synchronize: false,
        logging: configService.get('NODE_ENV') === 'development',
      }),
    }),
  ],
})
export class DatabaseModule {}
```

### App Module Setup

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    UsersModule,
  ],
})
export class AppModule {}
```

## Creating Entities

### Basic Entity

```typescript
// src/users/entities/user.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')  // Table name
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  name: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### Column Types

| Decorator | Description | Example |
|-----------|-------------|---------|
| `@Column()` | Basic column | `@Column()` |
| `@Column('text')` | Text type | Long strings |
| `@Column('decimal')` | Decimal numbers | `@Column('decimal', { precision: 10, scale: 2 })` |
| `@Column('json')` | JSON data | `@Column('json')` |
| `@Column('enum')` | Enum type | `@Column({ type: 'enum', enum: Status })` |

### Column Options

```typescript
@Entity()
export class Example {
  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
    unique: true,
    default: 'default value',
    name: 'column_name',  // Custom column name
    select: false,  // Excluded from SELECT by default
  })
  field: string;
}
```

## Registering Entities

```typescript
// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),  // Register entity
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

## Repository Pattern

### Injecting Repository

```typescript
// src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}
}
```

### Basic CRUD Operations

```typescript
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // CREATE
  async create(data: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(data);
    return this.userRepository.save(user);
  }

  // READ - All
  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  // READ - One
  async findOne(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  // READ - By condition
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  // UPDATE
  async update(id: number, data: UpdateUserDto): Promise<User> {
    await this.userRepository.update(id, data);
    return this.findOne(id);
  }

  // DELETE
  async remove(id: number): Promise<void> {
    await this.userRepository.delete(id);
  }
}
```

### Query Options

```typescript
// Find with options
async findAll() {
  return this.userRepository.find({
    where: { isActive: true },
    order: { createdAt: 'DESC' },
    skip: 0,
    take: 10,
    select: ['id', 'email', 'name'],
    relations: ['profile', 'posts'],
  });
}

// Find with multiple conditions (AND)
async findActive() {
  return this.userRepository.find({
    where: {
      isActive: true,
      role: 'admin',
    },
  });
}

// Find with OR conditions
async findByNameOrEmail(search: string) {
  return this.userRepository.find({
    where: [
      { name: search },
      { email: search },
    ],
  });
}
```

### Query Builder

```typescript
// Complex queries with QueryBuilder
async searchUsers(query: string, page: number, limit: number) {
  return this.userRepository
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.profile', 'profile')
    .where('user.name ILIKE :query', { query: `%${query}%` })
    .orWhere('user.email ILIKE :query', { query: `%${query}%` })
    .andWhere('user.isActive = :active', { active: true })
    .orderBy('user.createdAt', 'DESC')
    .skip((page - 1) * limit)
    .take(limit)
    .getMany();
}

// Count with query builder
async countActiveUsers() {
  return this.userRepository
    .createQueryBuilder('user')
    .where('user.isActive = :active', { active: true })
    .getCount();
}

// Select specific fields
async getUserEmails() {
  return this.userRepository
    .createQueryBuilder('user')
    .select(['user.id', 'user.email'])
    .getMany();
}
```

## Migrations

### Setup package.json Scripts

```json
{
  "scripts": {
    "typeorm": "typeorm-ts-node-commonjs",
    "migration:generate": "npm run typeorm -- migration:generate -d src/database/ormconfig.ts",
    "migration:run": "npm run typeorm -- migration:run -d src/database/ormconfig.ts",
    "migration:revert": "npm run typeorm -- migration:revert -d src/database/ormconfig.ts",
    "migration:create": "npm run typeorm -- migration:create"
  }
}
```

### Generate Migration

```bash
# After modifying entities
npm run migration:generate src/database/migrations/CreateUsersTable
```

### Migration File Example

```typescript
// src/database/migrations/1234567890-CreateUsersTable.ts
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateUsersTable1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'email',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'password',
            type: 'varchar',
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
  }
}
```

### Run Migrations

```bash
# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

## Transactions

```typescript
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async createWithProfile(data: CreateUserWithProfileDto) {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = queryRunner.manager.create(User, data.user);
      await queryRunner.manager.save(user);

      const profile = queryRunner.manager.create(Profile, {
        ...data.profile,
        userId: user.id,
      });
      await queryRunner.manager.save(profile);

      await queryRunner.commitTransaction();

      return user;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
```

## Docker Compose for PostgreSQL

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    container_name: myapp-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: mydb
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

```bash
# Start database
docker-compose up -d postgres

# View logs
docker-compose logs -f postgres

# Stop database
docker-compose down
```

## Best Practices

| Practice | Description |
|----------|-------------|
| Never use synchronize: true in production | Use migrations instead |
| Use transactions for related operations | Ensure data consistency |
| Index frequently queried columns | Improve query performance |
| Use select: false for sensitive data | Password, tokens, etc. |
| Create indexes for foreign keys | Better join performance |
| Use connection pooling | Handle multiple connections |

---

## Next Steps

- [Entities and Relationships](./06-entities-relationships.md) - OneToOne, OneToMany, ManyToMany

---

[← Previous: Data Validation](./04-data-validation.md) | [Back to Index](./README.md) | [Next: Entities and Relationships →](./06-entities-relationships.md)
