# 09 - Error Handling in Express

Robust error handling is crucial for any production API. It ensures that your application provides meaningful feedback to clients when something goes wrong and prevents sensitive information from being leaked. Express provides a dedicated mechanism for managing errors.

---

## 1. Express's Default Error Handling

By default, if you don't explicitly handle an error in Express, it will:
-   Log the error to the console.
-   Send a generic HTML error page to the client.

This is often not ideal for APIs, where you typically want to send a JSON response with a specific status code.

---

## 2. Custom Error Handling Middleware

Express recognizes an error-handling middleware by its unique signature: a function with four arguments `(err, req, res, next)`.

This middleware must be defined **after all other `app.use()` and route calls** to catch errors from them.

```typescript
// src/app.ts (after all other routes and middleware)

import express, { Request, Response, NextFunction } from 'express';

// ... (your app setup, routes, and other middleware) ...

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Error:', err); // Log the error for debugging purposes

  const statusCode = err.statusCode || 500; // Use custom status code if available, else 500
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
    // In development, you might send the full stack trace:
    // stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// Start server...
```

### Custom Error Classes
For more structured error handling, you can define custom error classes.

```typescript
// src/utils/AppError.ts
class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message); // Call parent constructor (Error)

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Mark as an expected error

    Error.captureStackTrace(this, this.constructor); // Maintain stack trace
  }
}

export default AppError;
```
Then, you can use it in your route handlers:
```typescript
// src/controllers/userController.ts
import AppError from '../utils/AppError';

export const getUser = (req: Request, res: Response, next: NextFunction) => {
  const user = /* find user by ID */;
  if (!user) {
    return next(new AppError('User not found', 404)); // Pass error to middleware
  }
  // ...
};
```

---

## 3. Handling 404 Not Found Errors

Requests for non-existent routes should be handled explicitly. This middleware should be placed **after all valid routes but before your main error-handling middleware**.

```typescript
// src/app.ts (after all app.use() and app.METHOD() calls, before main error handler)

app.all('*', (req: Request, res: Response, next: NextFunction) => {
  // Pass a 404 error to the next error middleware
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});
```
The `app.all('*')` will catch any request that hasn't been handled by a previous route.

---

## 4. Handling Asynchronous Errors

Express's default error handling doesn't directly catch errors thrown inside asynchronous route handlers or middleware (e.g., using `async/await`). You need to explicitly catch them and pass them to `next()`.

```typescript
// Without specific handling, errors here won't be caught by global middleware
app.get('/async-error', async (req: Request, res: Response, next: NextFunction) => {
  // This might throw an error
  const data = await someAsyncOperationThatMightFail();
  res.send(data);
});
```

To handle async errors, you can use `try...catch` blocks and pass the error to `next()`:

```typescript
app.get('/async-error-handled', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await someAsyncOperationThatMightFail();
    res.send(data);
  } catch (error) {
    next(error); // Pass the error to the global error handler
  }
});
```

### Simplifying Async Error Handling
Writing `try...catch(next(error))` everywhere can become tedious. A common pattern is to wrap your async route handlers in a utility function.

```typescript
// src/utils/catchAsync.ts
import { Request, Response, NextFunction } from 'express';

const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next); // Catch any errors and pass them to next()
  };
};

export default catchAsync;
```
Then, use `catchAsync` in your routes:
```typescript
// src/controllers/exampleController.ts
import catchAsync from '../utils/catchAsync';
import AppError from '../utils/AppError';

export const getSomething = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const data = await someAsyncOperation(); // This might fail
  if (!data) {
    return next(new AppError('Data not found', 404));
  }
  res.json({ status: 'success', data });
});
```

---

## 5. Complete Example (`src/app.ts`)

```typescript
import express, { Request, Response, NextFunction } from 'express';
import AppError from './utils/AppError'; // Assuming AppError is defined
import catchAsync from './utils/catchAsync'; // Assuming catchAsync is defined

const app = express();
const port = 3000;

app.use(express.json());

// Example route that might throw an error
app.get('/error-test', catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  // Simulate an async operation that fails
  const success = await Promise.resolve(false); 
  if (!success) {
    // Pass a custom error
    return next(new AppError('Failed to process data asynchronously!', 400));
  }
  res.send('Success!');
}));

app.get('/users/:id', catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.params.id;
    if (userId === '0') { // Simulate a not found user
        return next(new AppError('User with ID 0 not found', 404));
    }
    res.json({ message: `User ${userId} details.` });
}));

// Catch-all for 404 Not Found errors
app.all('*', (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handling middleware (must be last)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Global Error Handler:', err.stack);

  const statusCode = err.statusCode || 500;
  const status = err.status || 'error';
  const message = err.isOperational ? err.message : 'Something went very wrong!';

  res.status(statusCode).json({
    status,
    statusCode,
    message,
    // stack: process.env.NODE_ENV === 'development' ? err.stack : undefined, // Only for dev
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
```

Proper error handling is fundamental for building reliable and user-friendly APIs, especially when dealing with asynchronous operations.