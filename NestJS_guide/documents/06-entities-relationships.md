# Entities and Relationships

TypeORM supports various relationship types between entities. This guide covers how to define and use relationships in NestJS.

## Relationship Types

| Type | Description | Example |
|------|-------------|---------|
| OneToOne | One record relates to exactly one other | User ↔ Profile |
| OneToMany / ManyToOne | One record relates to many others | User → Posts |
| ManyToMany | Many records relate to many others | Posts ↔ Categories |

## OneToOne Relationship

A user has exactly one profile, and a profile belongs to exactly one user.

### Entity Definitions

```typescript
// src/users/entities/user.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Profile } from './profile.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  // OneToOne with Profile - User owns the relationship
  @OneToOne(() => Profile, (profile) => profile.user, {
    cascade: true,  // Auto-save profile when saving user
    eager: false,   // Don't auto-load profile
  })
  @JoinColumn()  // Creates userId column in users table
  profile: Profile;
}
```

```typescript
// src/users/entities/profile.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
} from 'typeorm';
import { User } from './user.entity';

@Entity('profiles')
export class Profile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  avatarUrl: string;

  // Inverse side - no @JoinColumn needed
  @OneToOne(() => User, (user) => user.profile)
  user: User;
}
```

### Creating with Relationship

```typescript
// src/users/users.service.ts
async createWithProfile(data: CreateUserDto) {
  // Create profile first
  const profile = this.profileRepository.create(data.profile);

  // Create user with profile
  const user = this.userRepository.create({
    email: data.email,
    password: data.password,
    profile: profile,  // Assign profile
  });

  // cascade: true saves both
  return this.userRepository.save(user);
}
```

### Querying with Relationship

```typescript
// Load user with profile
async findOneWithProfile(id: number) {
  return this.userRepository.findOne({
    where: { id },
    relations: ['profile'],  // Include profile
  });
}

// Using query builder
async findOneWithProfileQB(id: number) {
  return this.userRepository
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.profile', 'profile')
    .where('user.id = :id', { id })
    .getOne();
}
```

## OneToMany / ManyToOne Relationship

A user can have many posts, but each post belongs to one user.

### Entity Definitions

```typescript
// src/users/entities/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Post } from '../../posts/entities/post.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  // One user has many posts
  @OneToMany(() => Post, (post) => post.author)
  posts: Post[];
}
```

```typescript
// src/posts/entities/post.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column({ default: true })
  isDraft: boolean;

  // Many posts belong to one user
  @ManyToOne(() => User, (user) => user.posts, {
    nullable: false,  // Post must have an author
    onDelete: 'CASCADE',  // Delete posts when user deleted
  })
  @JoinColumn({ name: 'authorId' })  // Custom FK column name
  author: User;

  @Column()
  authorId: number;  // Expose FK directly
}
```

### Creating Posts

```typescript
// src/posts/posts.service.ts
async create(createPostDto: CreatePostDto, userId: number) {
  const post = this.postRepository.create({
    ...createPostDto,
    authorId: userId,  // Set author by ID
  });
  return this.postRepository.save(post);
}

// Or with relation
async createWithRelation(createPostDto: CreatePostDto, user: User) {
  const post = this.postRepository.create({
    ...createPostDto,
    author: user,  // Set full user object
  });
  return this.postRepository.save(post);
}
```

### Querying

```typescript
// Get all posts with author
async findAll() {
  return this.postRepository.find({
    relations: ['author'],
  });
}

// Get posts by user
async findByUser(userId: number) {
  return this.postRepository.find({
    where: { authorId: userId },
    relations: ['author'],
  });
}

// Get user with their posts
async getUserWithPosts(userId: number) {
  return this.userRepository.findOne({
    where: { id: userId },
    relations: ['posts'],
  });
}
```

## ManyToMany Relationship

Posts can have many categories, and categories can have many posts.

### Entity Definitions

```typescript
// src/posts/entities/post.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Category } from './category.entity';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('text')
  content: string;

  // Many posts have many categories
  @ManyToMany(() => Category, (category) => category.posts, {
    cascade: true,
  })
  @JoinTable({
    name: 'posts_categories',  // Junction table name
    joinColumn: {
      name: 'postId',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'categoryId',
      referencedColumnName: 'id',
    },
  })
  categories: Category[];
}
```

```typescript
// src/posts/entities/category.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
} from 'typeorm';
import { Post } from './post.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  // Inverse side
  @ManyToMany(() => Post, (post) => post.categories)
  posts: Post[];
}
```

### Working with ManyToMany

```typescript
// src/posts/posts.service.ts
async create(createPostDto: CreatePostDto) {
  // Find categories by IDs
  const categories = await this.categoryRepository.findBy({
    id: In(createPostDto.categoryIds),
  });

  // Create post with categories
  const post = this.postRepository.create({
    title: createPostDto.title,
    content: createPostDto.content,
    categories: categories,  // Assign categories
  });

  return this.postRepository.save(post);
}

// Add category to existing post
async addCategory(postId: number, categoryId: number) {
  const post = await this.postRepository.findOne({
    where: { id: postId },
    relations: ['categories'],
  });

  const category = await this.categoryRepository.findOneBy({ id: categoryId });

  post.categories.push(category);
  return this.postRepository.save(post);
}

// Remove category from post
async removeCategory(postId: number, categoryId: number) {
  const post = await this.postRepository.findOne({
    where: { id: postId },
    relations: ['categories'],
  });

  post.categories = post.categories.filter(c => c.id !== categoryId);
  return this.postRepository.save(post);
}
```

### Querying ManyToMany

```typescript
// Get post with categories
async findOneWithCategories(id: number) {
  return this.postRepository.findOne({
    where: { id },
    relations: ['categories'],
  });
}

// Get posts by category
async findByCategory(categoryId: number) {
  return this.postRepository
    .createQueryBuilder('post')
    .innerJoin('post.categories', 'category')
    .where('category.id = :categoryId', { categoryId })
    .getMany();
}

// Get category with posts
async findCategoryWithPosts(id: number) {
  return this.categoryRepository.findOne({
    where: { id },
    relations: ['posts'],
  });
}
```

## Self-Referencing Relationships

For hierarchical data like categories with subcategories:

```typescript
// src/categories/entities/category.entity.ts
@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  // Parent category
  @ManyToOne(() => Category, (category) => category.children, {
    nullable: true,
  })
  parent: Category;

  // Child categories
  @OneToMany(() => Category, (category) => category.parent)
  children: Category[];
}
```

## Relationship Options

### Cascade Options

```typescript
@OneToMany(() => Post, (post) => post.author, {
  cascade: true,           // Enable all cascades
  cascade: ['insert'],     // Only on insert
  cascade: ['update'],     // Only on update
  cascade: ['remove'],     // Only on remove
  cascade: ['soft-remove'], // Only on soft-remove
  cascade: ['insert', 'update'],  // Multiple options
})
posts: Post[];
```

### Eager Loading

```typescript
@ManyToOne(() => User, {
  eager: true,  // Always load this relation
})
author: User;
```

### OnDelete Options

```typescript
@ManyToOne(() => User, {
  onDelete: 'CASCADE',   // Delete related records
  onDelete: 'SET NULL',  // Set FK to null
  onDelete: 'RESTRICT',  // Prevent deletion
  onDelete: 'NO ACTION', // Database default
})
author: User;
```

## Loading Relations

### Using find options

```typescript
// Load specific relations
const user = await this.userRepository.findOne({
  where: { id },
  relations: ['profile', 'posts', 'posts.categories'],
});

// Select specific relation fields
const user = await this.userRepository.findOne({
  where: { id },
  relations: ['posts'],
  select: {
    id: true,
    email: true,
    posts: {
      id: true,
      title: true,
    },
  },
});
```

### Using Query Builder

```typescript
const user = await this.userRepository
  .createQueryBuilder('user')
  .leftJoinAndSelect('user.profile', 'profile')
  .leftJoinAndSelect('user.posts', 'posts')
  .leftJoinAndSelect('posts.categories', 'categories')
  .where('user.id = :id', { id })
  .getOne();
```

### Relation loading strategies

```typescript
// Load relations after initial query
const user = await this.userRepository.findOneBy({ id });
const posts = await this.postRepository.findBy({ authorId: user.id });

// Using loadRelation
const user = await this.userRepository.findOneBy({ id });
await this.userRepository
  .createQueryBuilder()
  .relation(User, 'posts')
  .of(user)
  .loadMany();
```

## Complete Example

```typescript
// src/users/entities/user.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
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

  @OneToOne(() => Profile, (profile) => profile.user, {
    cascade: true,
  })
  @JoinColumn()
  profile: Profile;

  @OneToMany(() => Post, (post) => post.author)
  posts: Post[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

---

## Next Steps

- [Error Handling](./07-error-handling.md) - HTTP exceptions and custom filters

---

[← Previous: Database Setup](./05-database-setup.md) | [Back to Index](./README.md) | [Next: Error Handling →](./07-error-handling.md)
