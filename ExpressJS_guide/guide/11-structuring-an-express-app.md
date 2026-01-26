# 11 - Structuring an Express App

As an application grows, placing all your logic in a single `app.ts` file becomes unmanageable. A well-defined project structure is essential for maintainability, scalability, and collaboration. This guide presents a common and effective way to structure your Express.js projects, organized by business domain or feature.

---

## 1. The Domain-Oriented Structure

Instead of grouping files by their technical type (e.g., all controllers in one folder, all routes in another), we group them by the business feature they represent. This is a more scalable approach.

### Example Directory Structure

```
src/
├── api/
│   ├── users/
│   │   ├── user.controller.ts  // Handles HTTP req/res for users
│   │   ├── user.routes.ts      // Defines all routes for /users
│   │   ├── user.service.ts     // Core business logic for users
│   │   └── user.validation.ts  // Validation schemas for user data
│   │
│   └── posts/                  // Another feature domain
│       ├── post.controller.ts
│       ├── post.routes.ts
│       ├── post.service.ts
│       └── post.validation.ts
│
├── middleware/                 // Shared middleware (e.g., auth)
│   └── auth.middleware.ts
│
├── utils/                      // Utility functions, custom error classes
│   └── AppError.ts
│
├── config/                     // Configuration loader
│   └── index.ts
│
├── app.ts                      // Main Express application setup
└── server.ts                   // Server bootstrap (entry point)
```

---

## 2. Component Responsibilities

### A. `server.ts` (The Entry Point)
This file's only job is to import the main `app` object and start the server. It keeps the server logic separate from the application logic.

```typescript
// src/server.ts
import app from './app';

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
```
You would run this file: `ts-node src/server.ts`.

### B. `app.ts` (Express Application Setup)
This file creates the Express app, applies global middleware, and mounts all the feature routers. It acts as the central hub of your application.

```typescript
// src/app.ts
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import userRoutes from './api/users/user.routes'; // Import feature router
import AppError from './utils/AppError'; // Import custom error class

const app: Application = express();

// 1. Global Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Mount Routers
app.use('/api/v1/users', userRoutes);
// app.use('/api/v1/posts', postRoutes);

// 3. 404 Not Found Handler
app.all('*', (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// 4. Global Error Handling Middleware (must be last)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // ... (your global error handler logic from the previous guide)
});

export default app;
```

### C. `user.routes.ts` (The Router)
This file defines all endpoints for a specific feature and maps them to controller methods.

```typescript
// src/api/users/user.routes.ts
import { Router } from 'express';
import * as userController from './user.controller';
import { validate } from '../../middleware/validationMiddleware'; // Hypothetical validation middleware
import { createUserSchema } from './user.validation';

const router = Router();

router.get('/', userController.getAllUsers);
router.post('/', validate(createUserSchema), userController.createUser);
router.get('/:id', userController.getUserById);

export default router;
```

### D. `user.controller.ts` (The Controller)
The controller's job is to handle the HTTP request and response. It should be as "thin" as possible, containing no business logic. It calls a service to perform the actual work.

```typescript
// src/api/users/user.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as userService from './user.service';
import catchAsync from '../../utils/catchAsync'; // Wrapper for async error handling

export const getAllUsers = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const users = await userService.findAllUsers();
  res.status(200).json({ status: 'success', data: { users } });
});

export const createUser = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const newUser = await userService.createUser(req.body);
  res.status(201).json({ status: 'success', data: { user: newUser } });
});

export const getUserById = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // ...
});
```

### E. `user.service.ts` (The Service)
This is where the core business logic resides. The service interacts with the database (via an ORM like Prisma or a repository), performs calculations, and implements the rules of your application.

```typescript
// src/api/users/user.service.ts
import prisma from '../../db'; // Assuming a prisma client instance
import { User } from '@prisma/client';

export const findAllUsers = async (): Promise<User[]> => {
  return await prisma.user.findMany();
};

export const createUser = async (userData: any): Promise<User> => {
  // Hash password, perform checks, etc.
  // ... business logic ...
  return await prisma.user.create({
    data: userData,
  });
};
```

---

## 3. The Data Flow

This structure creates a clear, one-way data flow for each request:

**`Request`** -> `app.ts` (global middleware) -> `user.routes.ts` (routing) -> `user.controller.ts` (HTTP layer) -> `user.service.ts` (business logic) -> **`Database`**

The response then flows back up the same chain. This separation of concerns makes the application much easier to understand, debug, and test.