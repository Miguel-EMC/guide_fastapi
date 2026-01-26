# 12 - Building a CRUD API

This guide brings together everything we've learned so far—project structure, routing, controllers, services, and Prisma—to build a complete, real-world CRUD (Create, Read, Update, Delete) API for a "Post" resource.

---

## 1. Step 1: Define the Prisma Model

First, let's define our `Post` model in `prisma/schema.prisma`. We'll also add a relation to our existing `User` model.

```prisma
// prisma/schema.prisma

// ... (datasource and generator blocks)

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  password  String
  posts     Post[]   // Add this relation: a user can have many posts
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## 2. Step 2: Run the Migration

Apply the changes to your database:
```bash
npx prisma migrate dev --name add_posts_table
```
Prisma will create the new table and update the `User` table with the relationship. It also re-generates the Prisma Client to include the new `Post` model.

---

## 3. Step 3: Create the Validation Layer

For robust validation, we'll use `zod`, a popular TypeScript-first schema validation library.

1.  **Install Zod**:
    ```bash
    npm install zod
    ```
2.  **Create `src/api/posts/post.validation.ts`**:
    ```typescript
    // src/api/posts/post.validation.ts
    import { z } from 'zod';

    export const createPostSchema = z.object({
      body: z.object({
        title: z.string({ required_error: 'Title is required' }).min(3),
        content: z.string().optional(),
        authorId: z.number({ required_error: 'Author ID is required' }),
      }),
    });

    export const updatePostSchema = z.object({
      body: z.object({
        title: z.string().min(3).optional(),
        content: z.string().optional(),
        published: z.boolean().optional(),
      }),
    });
    ```
3.  **Create a generic validation middleware (`src/middleware/validate.ts`)**:
    ```typescript
    // src/middleware/validate.ts
    import { Request, Response, NextFunction } from 'express';
    import { AnyZodObject, ZodError } from 'zod';
    import AppError from '../utils/AppError'; // Your custom error class

    export const validate = (schema: AnyZodObject) => (req: Request, res: Response, next: NextFunction) => {
      try {
        schema.parse({
          body: req.body,
          query: req.query,
          params: req.params,
        });
        next();
      } catch (error) {
        if (error instanceof ZodError) {
          const message = error.errors.map(e => e.message).join(', ');
          return next(new AppError(message, 400));
        }
        next(error);
      }
    };
    ```

---

## 4. Step 4: Create the Service (`post.service.ts`)

This file contains the core business logic and database interactions for posts.

```typescript
// src/api/posts/post.service.ts
import prisma from '../../db';
import { Post } from '@prisma/client';
import AppError from '../../utils/AppError';

export const findAllPosts = async (): Promise<Post[]> => {
  return await prisma.post.findMany({
    where: { published: true },
    include: { author: { select: { name: true } } },
  });
};

export const createPost = async (postData: any): Promise<Post> => {
  return await prisma.post.create({
    data: postData,
  });
};

export const findPostById = async (id: number): Promise<Post | null> => {
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) {
      throw new AppError('Post not found', 404);
    }
    return post;
};

// ... (similar functions for updatePost and deletePost) ...
```

---

## 5. Step 5: Create the Controller (`post.controller.ts`)

The controller acts as the bridge between the HTTP layer and the service layer.

```typescript
// src/api/posts/post.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as postService from './post.service';
import catchAsync from '../../utils/catchAsync';

export const getAllPosts = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const posts = await postService.findAllPosts();
  res.status(200).json({ status: 'success', data: { posts } });
});

export const createPost = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const newPost = await postService.createPost(req.body);
  res.status(201).json({ status: 'success', data: { post: newPost } });
});

export const getPostById = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const post = await postService.findPostById(parseInt(req.params.id, 10));
    res.status(200).json({ status: 'success', data: { post } });
});

// ... (similar handlers for update and delete) ...
```

---

## 6. Step 6: Create the Routes (`post.routes.ts`)

This file defines the endpoints for our Post API, applies validation middleware, and connects them to the controller methods.

```typescript
// src/api/posts/post.routes.ts
import { Router } from 'express';
import * as postController from './post.controller';
import { validate } from '../../middleware/validate';
import { createPostSchema } from './post.validation';
// Assume auth middleware exists
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

router
  .route('/')
  .get(postController.getAllPosts)
  .post(authMiddleware, validate(createPostSchema), postController.createPost);

router
  .route('/:id')
  .get(postController.getPostById)
  // .put(authMiddleware, ...)
  // .delete(authMiddleware, ...);

export default router;
```

---

## 7. Step 7: Mount the Router (`app.ts`)

Finally, mount the new post router in your main `app.ts` file.

```typescript
// src/app.ts
import express from 'express';
import userRoutes from './api/users/user.routes';
import postRoutes from './api/posts/post.routes'; // Import the new router

const app = express();

// ... (global middleware) ...

// Mount Routers
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/posts', postRoutes); // Mount the posts router

// ... (error handlers) ...

export default app;
```

With this structure, you have built a complete, scalable, and maintainable CRUD API for posts. You can now run your application (`npm run dev`) and test the new `/api/v1/posts` endpoints.