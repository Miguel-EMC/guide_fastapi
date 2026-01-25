# RBAC and Permissions

Role-Based Access Control (RBAC) manages user permissions based on roles. This guide covers implementing a flexible permission system.

## Basic Roles Setup

### Role Enum

```typescript
// src/common/enums/role.enum.ts
export enum Role {
  USER = 'user',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}
```

### User Entity with Role

```typescript
// src/users/entities/user.entity.ts
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from '../../common/enums/role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;

  @Column()
  password: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.USER,
  })
  role: Role;

  // Or multiple roles
  @Column('simple-array', { default: Role.USER })
  roles: Role[];
}
```

## Roles Decorator and Guard

### Roles Decorator

```typescript
// src/common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

### Roles Guard

```typescript
// src/common/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../enums/role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      return false;
    }

    // Single role
    if (user.role) {
      return requiredRoles.includes(user.role);
    }

    // Multiple roles
    if (user.roles) {
      return requiredRoles.some((role) => user.roles.includes(role));
    }

    return false;
  }
}
```

### Usage

```typescript
// src/admin/admin.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  @Get('dashboard')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  getDashboard() {
    return { message: 'Admin dashboard' };
  }

  @Get('users')
  @Roles(Role.MODERATOR, Role.ADMIN, Role.SUPER_ADMIN)
  getUsers() {
    return { message: 'User management' };
  }

  @Get('settings')
  @Roles(Role.SUPER_ADMIN)
  getSettings() {
    return { message: 'System settings' };
  }
}
```

## Advanced: Permission-Based System

### Permission Entity

```typescript
// src/permissions/entities/permission.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { Role } from './role.entity';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;  // e.g., 'posts:create', 'users:delete'

  @Column({ nullable: true })
  description: string;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];
}
```

### Role Entity

```typescript
// src/permissions/entities/role.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Permission } from './permission.entity';
import { User } from '../../users/entities/user.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @ManyToMany(() => Permission, (permission) => permission.roles, {
    eager: true,
  })
  @JoinTable({ name: 'role_permissions' })
  permissions: Permission[];

  @ManyToMany(() => User, (user) => user.roles)
  users: User[];
}
```

### Updated User Entity

```typescript
// src/users/entities/user.entity.ts
import { Entity, Column, ManyToMany, JoinTable } from 'typeorm';
import { Role } from '../../permissions/entities/role.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;

  @Column()
  password: string;

  @ManyToMany(() => Role, (role) => role.users, { eager: true })
  @JoinTable({ name: 'user_roles' })
  roles: Role[];

  // Helper to get all permissions
  getPermissions(): string[] {
    const permissions: string[] = [];
    this.roles?.forEach((role) => {
      role.permissions?.forEach((permission) => {
        if (!permissions.includes(permission.name)) {
          permissions.push(permission.name);
        }
      });
    });
    return permissions;
  }

  hasPermission(permission: string): boolean {
    return this.getPermissions().includes(permission);
  }

  hasRole(roleName: string): boolean {
    return this.roles?.some((role) => role.name === roleName);
  }
}
```

### Permissions Decorator

```typescript
// src/common/decorators/permissions.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
```

### Permissions Guard

```typescript
// src/common/guards/permissions.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const userPermissions = user.getPermissions();
    const hasAllPermissions = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
```

### Usage with Permissions

```typescript
// src/posts/posts.controller.ts
import { Controller, Get, Post, Delete, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('posts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PostsController {
  @Get()
  @RequirePermissions('posts:read')
  findAll() {}

  @Post()
  @RequirePermissions('posts:create')
  create() {}

  @Delete(':id')
  @RequirePermissions('posts:delete')
  remove() {}
}
```

## Resource Ownership

### Owner Guard

```typescript
// src/common/guards/owner.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const OWNER_KEY = 'owner';

// Decorator
export const CheckOwnership = (
  resourceType: string,
  ownerField: string = 'userId',
) => SetMetadata(OWNER_KEY, { resourceType, ownerField });

@Injectable()
export class OwnerGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly postsService: PostsService,
    private readonly commentsService: CommentsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ownerConfig = this.reflector.get(OWNER_KEY, context.getHandler());

    if (!ownerConfig) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const resourceId = request.params.id;

    // Admin bypass
    if (user.hasRole('admin')) {
      return true;
    }

    const resource = await this.getResource(
      ownerConfig.resourceType,
      resourceId,
    );

    if (!resource) {
      return true;  // Let controller handle 404
    }

    if (resource[ownerConfig.ownerField] !== user.id) {
      throw new ForbiddenException('You can only access your own resources');
    }

    return true;
  }

  private async getResource(type: string, id: number) {
    switch (type) {
      case 'post':
        return this.postsService.findOne(id);
      case 'comment':
        return this.commentsService.findOne(id);
      default:
        return null;
    }
  }
}
```

### Usage

```typescript
@Controller('posts')
@UseGuards(JwtAuthGuard, OwnerGuard)
export class PostsController {
  @Put(':id')
  @CheckOwnership('post', 'authorId')
  update(@Param('id') id: number, @Body() dto: UpdatePostDto) {
    return this.postsService.update(id, dto);
  }

  @Delete(':id')
  @CheckOwnership('post', 'authorId')
  remove(@Param('id') id: number) {
    return this.postsService.remove(id);
  }
}
```

## CASL Integration (Advanced)

CASL is a powerful authorization library.

```bash
npm install @casl/ability
```

### Define Abilities

```typescript
// src/casl/casl-ability.factory.ts
import {
  AbilityBuilder,
  createMongoAbility,
  MongoAbility,
  InferSubjects,
} from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { User } from '../users/entities/user.entity';
import { Post } from '../posts/entities/post.entity';

export enum Action {
  Manage = 'manage',
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
}

type Subjects = InferSubjects<typeof Post | typeof User> | 'all';

export type AppAbility = MongoAbility<[Action, Subjects]>;

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: User): AppAbility {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(
      createMongoAbility,
    );

    if (user.hasRole('admin')) {
      // Admin can do everything
      can(Action.Manage, 'all');
    } else if (user.hasRole('moderator')) {
      // Moderator can read all, update posts
      can(Action.Read, 'all');
      can(Action.Update, Post);
      cannot(Action.Delete, Post);
    } else {
      // Regular user
      can(Action.Read, Post);
      can(Action.Create, Post);

      // Can only update/delete own posts
      can(Action.Update, Post, { authorId: user.id });
      can(Action.Delete, Post, { authorId: user.id });

      // Can read own user data
      can(Action.Read, User, { id: user.id });
      can(Action.Update, User, { id: user.id });
    }

    return build();
  }
}
```

### CASL Guard

```typescript
// src/casl/policies.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CaslAbilityFactory, Action } from './casl-ability.factory';

export const CHECK_POLICIES_KEY = 'check_policy';

export interface PolicyHandler {
  action: Action;
  subject: any;
}

export const CheckPolicies = (...handlers: PolicyHandler[]) =>
  SetMetadata(CHECK_POLICIES_KEY, handlers);

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private caslAbilityFactory: CaslAbilityFactory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policyHandlers = this.reflector.get<PolicyHandler[]>(
      CHECK_POLICIES_KEY,
      context.getHandler(),
    );

    if (!policyHandlers) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    const ability = this.caslAbilityFactory.createForUser(user);

    return policyHandlers.every((handler) =>
      ability.can(handler.action, handler.subject),
    );
  }
}
```

### Usage with CASL

```typescript
@Controller('posts')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class PostsController {
  @Post()
  @CheckPolicies({ action: Action.Create, subject: Post })
  create() {}

  @Delete(':id')
  @CheckPolicies({ action: Action.Delete, subject: Post })
  async remove(@Param('id') id: number, @CurrentUser() user: User) {
    const post = await this.postsService.findOne(id);
    const ability = this.caslAbilityFactory.createForUser(user);

    if (!ability.can(Action.Delete, post)) {
      throw new ForbiddenException();
    }

    return this.postsService.remove(id);
  }
}
```

## Seeding Roles and Permissions

```typescript
// src/database/seeds/roles.seed.ts
import { DataSource } from 'typeorm';
import { Role } from '../../permissions/entities/role.entity';
import { Permission } from '../../permissions/entities/permission.entity';

export async function seedRolesAndPermissions(dataSource: DataSource) {
  const permissionRepo = dataSource.getRepository(Permission);
  const roleRepo = dataSource.getRepository(Role);

  // Create permissions
  const permissions = await permissionRepo.save([
    { name: 'posts:create', description: 'Create posts' },
    { name: 'posts:read', description: 'Read posts' },
    { name: 'posts:update', description: 'Update posts' },
    { name: 'posts:delete', description: 'Delete posts' },
    { name: 'users:read', description: 'Read users' },
    { name: 'users:update', description: 'Update users' },
    { name: 'users:delete', description: 'Delete users' },
    { name: 'admin:access', description: 'Access admin panel' },
  ]);

  // Create roles with permissions
  await roleRepo.save([
    {
      name: 'user',
      description: 'Regular user',
      permissions: permissions.filter((p) =>
        ['posts:create', 'posts:read'].includes(p.name),
      ),
    },
    {
      name: 'moderator',
      description: 'Moderator',
      permissions: permissions.filter((p) =>
        ['posts:create', 'posts:read', 'posts:update', 'users:read'].includes(
          p.name,
        ),
      ),
    },
    {
      name: 'admin',
      description: 'Administrator',
      permissions: permissions,
    },
  ]);
}
```

## Best Practices

| Practice | Description |
|----------|-------------|
| Use permission-based | More flexible than role-based |
| Cache permissions | Don't query DB every request |
| Admin bypass | Allow admins to do everything |
| Resource ownership | Users can modify their own data |
| Audit logging | Log authorization failures |
| Least privilege | Default to minimal permissions |

---

[← Previous: Queues and Jobs](./18-queues-jobs.md) | [Back to Index](./README.md) | [Next: Logging and Monitoring →](./20-logging-monitoring.md)
