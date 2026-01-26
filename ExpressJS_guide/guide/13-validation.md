# 13 - Data Validation with Zod

Server-side data validation is a critical aspect of API development. It ensures the integrity of your data, protects your application from malicious input, and provides clear feedback to clients. While you could validate data manually, using a powerful library significantly streamlines the process.

For TypeScript projects, **Zod** is an excellent, type-first schema declaration and validation library.

---

## 1. Why Server-Side Validation?

-   **Security**: Prevents injection attacks and other vulnerabilities by rejecting malformed data.
-   **Data Integrity**: Ensures that only valid and consistent data enters your database.
-   **Reliability**: Your business logic can assume it's working with correct data, simplifying development.
-   **User Experience**: Provides clear and immediate feedback to clients about their input.

---

## 2. What is Zod?

Zod is a TypeScript-first schema declaration and validation library. It allows you to define the expected shape of your data, and then validate actual data against that schema. A key feature is that Zod schemas infer static TypeScript types, giving you end-to-end type safety.

### Installation
```bash
npm install zod
```

---

## 3. Creating Validation Schemas with Zod

Let's define some example schemas.

```typescript
// src/api/users/user.validation.ts (example)
import { z } from 'zod';

// Schema for creating a new user
export const createUserSchema = z.object({
  body: z.object({
    username: z.string({ required_error: 'Username is required' })
      .min(3, 'Username must be at least 3 characters')
      .max(20, 'Username cannot exceed 20 characters'),
    email: z.string({ required_error: 'Email is required' })
      .email('Invalid email format'),
    password: z.string({ required_error: 'Password is required' })
      .min(6, 'Password must be at least 6 characters'),
    age: z.number().int().positive().optional(), // Optional, integer, positive
    role: z.enum(['ADMIN', 'USER']).default('USER'), // Enum with default
  }),
});

// Schema for updating an existing user
export const updateUserSchema = z.object({
  // Params validation (e.g., from /users/:id)
  params: z.object({
    id: z.string().uuid('Invalid user ID format'), // Assuming UUIDs for IDs
  }),
  // Body validation (all fields optional for update)
  body: z.object({
    username: z.string().min(3).max(20).optional(),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
    age: z.number().int().positive().optional(),
    role: z.enum(['ADMIN', 'USER']).optional(),
  }).partial(), // .partial() makes all fields in the body optional
});

// Zod schemas infer TypeScript types
export type CreateUserInput = z.infer<typeof createUserSchema>['body'];
export type UpdateUserInput = z.infer<typeof updateUserSchema>['body'];
```

### Common Zod Schema Types and Refinements

-   **`z.string()`**: For strings.
    -   `.min(len)`, `.max(len)`: Length constraints.
    -   `.email()`, `.url()`, `.uuid()`, `.datetime()`: Format validations.
    -   `.regex(regex)`: Custom regex pattern.
-   **`z.number()`**: For numbers.
    -   `.int()`: Must be an integer.
    -   `.positive()`, `.negative()`, `.min(val)`, `.max(val)`.
-   **`z.boolean()`**: For booleans.
-   **`z.date()`**: For Date objects.
-   **`z.object({})`**: For objects, defining their properties.
-   **`z.array(z.string())`**: For arrays of a specific type.
-   **`.optional()`**: Makes a field optional.
-   **`.nullable()`**: Allows a field to be `null`.
-   **`z.enum(['value1', 'value2'])`**: For a field that must be one of a few specific string values.
-   **`z.union([z.string(), z.number()])`**: For a field that could be one of several types.
-   **`.default(value)`**: Sets a default value if the field is missing.

---

## 4. The `validate` Middleware

To apply Zod validation to your Express routes, we use a generic middleware.

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
      // Format Zod errors into a more readable message
      const errors = error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
      }));
      return next(new AppError('Validation failed', 400, errors)); // Pass a structured error
    }
    next(error); // Pass other errors down the chain
  }
};
```
*(Note: We've enhanced the `AppError` to accept an optional `errors` array)*

---

## 5. Applying Validation to Routes

You integrate the `validate` middleware directly into your route definitions.

```typescript
// src/api/users/user.routes.ts
import { Router } from 'express';
import * as userController from './user.controller';
import { validate } from '../../middleware/validate';
import { createUserSchema, updateUserSchema } from './user.validation';

const router = Router();

router.get('/', userController.getAllUsers);
router.post('/', validate(createUserSchema), userController.createUser); // Apply validation for POST
router.get('/:id', userController.getUserById);
router.put('/:id', validate(updateUserSchema), userController.updateUser); // Apply validation for PUT
router.delete('/:id', userController.deleteUser);

export default router;
```
Now, whenever a request hits these routes, the `validate` middleware will ensure the incoming `req.body` (or `req.query`, `req.params`) conforms to the defined Zod schema before it even reaches your controller logic. This keeps your controllers clean and focused on business operations.