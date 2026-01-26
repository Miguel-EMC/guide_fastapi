# 07 - Middleware in Express

Middleware functions are core to Express.js. They are functions that have access to the request object (`req`), the response object (`res`), and the `next` function in the application's request-response cycle. The `next` function is a function in the Express router that, when invoked, executes the next middleware function in the stack.

Middleware can:
-   Execute any code.
-   Make changes to the request and the response objects.
-   End the request-response cycle.
-   Call the next middleware in the stack.

---

## 1. Middleware Signature

A middleware function typically looks like this:

```typescript
import { Request, Response, NextFunction } from 'express';

const myMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Do something with req and res
  console.log('Time:', Date.now());
  
  // Pass control to the next middleware function
  next(); 
};
```
If a middleware function does not call `next()`, it *must* end the request-response cycle by sending a response (e.g., `res.send()`, `res.json()`), otherwise, the client's request will hang.

---

## 2. Types of Middleware

### A. Application-level Middleware
Bound to an instance of the `app` object using `app.use()` or `app.METHOD()`.

```typescript
// src/app.ts
import express from 'express';
const app = express();

// A simple logger middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
  next(); // Don't forget to call next()!
});

app.get('/', (req, res) => {
  res.send('Hello from Express!');
});
```

### B. Router-level Middleware
Works in the same way as application-level middleware, but it is bound to an instance of `express.Router()`.

```typescript
// src/routes/userRoutes.ts
import { Router, Request, Response, NextFunction } from 'express';
const router = Router();

// Middleware specific to this router
router.use((req: Request, res: Response, next: NextFunction) => {
  console.log('Time:', Date.now(), ' - User Router Middleware');
  next();
});

router.get('/', (req: Request, res: Response) => {
  res.send('User list');
});

export default router;
```

### C. Built-in Middleware
Express comes with built-in middleware functions:
-   `express.static()`: Serves static assets (like HTML files, images, etc.).
-   `express.json()`: Parses incoming requests with JSON payloads.
-   `express.urlencoded()`: Parses incoming requests with URL-encoded payloads.

```typescript
// src/app.ts
app.use(express.json()); // Enable JSON body parsing for all routes
app.use(express.urlencoded({ extended: true })); // Enable URL-encoded body parsing
app.use(express.static('public')); // Serve static files from the 'public' directory
```

### D. Third-party Middleware
You can use third-party middleware for various tasks. Popular examples include:
-   **`cors`**: For enabling Cross-Origin Resource Sharing.
-   **`morgan`**: For HTTP request logging.
-   **`helmet`**: For securing your app by setting various HTTP headers.

You usually install them via `npm` and then `app.use()` them.
```bash
npm install cors helmet morgan
npm install -D @types/cors @types/morgan
```
```typescript
// src/app.ts
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

app.use(cors());        // Enable CORS for all routes
app.use(helmet());      // Add various HTTP headers for security
app.use(morgan('dev')); // Log HTTP requests to the console in 'dev' format
```

### E. Error-handling Middleware
Error-handling middleware functions have a special signature: they take four arguments: `(err, req, res, next)`.

```typescript
// src/app.ts
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack); // Log the error stack for debugging
  res.status(500).send('Something broke!');
});
```
**Important**: Error-handling middleware should be defined *last*, after all other `app.use()` and route calls.

---

## 3. Creating Custom Middleware (Authentication Example)

Let's create a simple authentication middleware that checks for an `X-API-KEY` header.

```typescript
// src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];

  if (apiKey === 'your-secret-api-key') {
    // Optionally, attach user info to req object
    // (You might extend the Request type in a types.d.ts file for this)
    (req as any).user = { id: 'user-123', username: 'authenticatedUser' }; 
    next(); // API key is valid, proceed
  } else {
    res.status(401).json({ message: 'Unauthorized: Invalid API Key' });
    // Do NOT call next() here, as we are ending the request cycle.
  }
};
```

### Applying Custom Middleware

You can apply middleware globally, to a group of routes, or to a single route.

```typescript
// src/app.ts
import express from 'express';
import { authMiddleware } from './middleware/authMiddleware'; // Import your middleware

const app = express();
const port = 3000;

app.use(express.json()); // Global middleware for JSON body parsing

// Public route
app.get('/', (req, res) => {
  res.send('Public homepage');
});

// Apply authMiddleware to a specific route
app.get('/protected-route', authMiddleware, (req, res) => {
  res.json({ message: 'This is a protected resource!', user: (req as any).user });
});

// Apply authMiddleware to a group of routes using express.Router
const protectedRouter = express.Router();
protectedRouter.use(authMiddleware); // Middleware applied to all routes in this router
protectedRouter.get('/admin', (req, res) => {
  res.json({ message: 'Welcome to the admin area!' });
});
app.use('/api/v1', protectedRouter); // Mount the protected router

// Error handling middleware (must be last)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
```
Middleware is a powerful and flexible feature of Express, allowing you to build modular, reusable components to handle various aspects of your API's request processing.