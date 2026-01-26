# 06 - Routing in Express

Routing refers to how an application's endpoints (URIs) respond to client requests. In Express, you define routes for different HTTP methods and URL patterns, and then provide a handler function that is executed when that route is matched.

---

## 1. Basic Routing

A route definition has the following structure:
`app.METHOD(PATH, HANDLER)`

-   `app` is an instance of Express.
-   `METHOD` is an HTTP request method (e.g., `get`, `post`, `put`, `delete`).
-   `PATH` is a path on the server.
-   `HANDLER` is the function executed when the route is matched.

```typescript
// src/app.ts
import express, { Request, Response } from 'express';

const app = express();
const port = 3000;

// GET method route
app.get('/', (req: Request, res: Response) => {
  res.send('GET request to the homepage');
});

// POST method route
app.post('/', (req: Request, res: Response) => {
  res.send('POST request to the homepage');
});

// A route that accepts all HTTP methods
app.all('/secret', (req: Request, res: Response) => {
  res.send(`Handling a ${req.method} request to /secret`);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
```

---

## 2. Route Parameters

Route parameters are named URL segments used to capture values at specific positions in the URL. They are prefixed with a colon (`:`).

```typescript
// Route with a required 'userId' parameter
app.get('/users/:userId/books/:bookId', (req: Request, res: Response) => {
  // req.params contains the route parameters
  const { userId, bookId } = req.params;
  res.send(`User ID: ${userId}, Book ID: ${bookId}`);
});
```
If you navigate to `/users/123/books/456`, `req.params` will be `{ "userId": "123", "bookId": "456" }`.

---

## 3. Query String Parameters

Query parameters are key-value pairs that appear after the `?` in a URL. They are used for filtering, sorting, or pagination.

```typescript
// Route: /search?q=express&sort=asc
app.get('/search', (req: Request, res: Response) => {
  // req.query contains the query parameters
  const query = req.query.q;
  const sortBy = req.query.sort;
  res.send(`Search query: ${query}, Sort by: ${sortBy}`);
});
```

---

## 4. Modular Routing with `express.Router`

As your application grows, defining all your routes in a single file becomes unmanageable. `express.Router` is a mini-Express application that can be used to group route handlers and middleware.

This allows you to organize your routes into separate files by domain.

### Step 1: Create a Route File
Create a new file for your user-related routes, e.g., `src/routes/userRoutes.ts`.

```typescript
// src/routes/userRoutes.ts
import { Router, Request, Response } from 'express';

// Create a new router instance
const router = Router();

// Define routes on the router
router.get('/', (req: Request, res: Response) => {
  res.send('Get all users');
});

router.get('/:id', (req: Request, res: Response) => {
  res.send(`Get user with ID: ${req.params.id}`);
});

router.post('/', (req: Request, res: Response) => {
  res.send('Create a new user');
});

// Export the router
export default router;
```

### Step 2: Mount the Router in Your Main App
Now, import and "mount" this router in your main `app.ts` file using `app.use()`.

```typescript
// src/app.ts
import express, { Request, Response } from 'express';
import userRoutes from './routes/userRoutes'; // Import the user router

const app = express();
const port = 3000;

app.get('/', (req: Request, res: Response) => {
  res.send('Homepage');
});

// Mount the user router on the '/api/users' path
// All routes defined in userRoutes will now be prefixed with '/api/users'
app.use('/api/users', userRoutes);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
```

Now your routes are organized:
-   `GET /` -> Handled by `app.ts`
-   `GET /api/users` -> Handled by `userRoutes.ts`
-   `GET /api/users/123` -> Handled by `userRoutes.ts`
-   `POST /api/users` -> Handled by `userRoutes.ts`

This approach is essential for building scalable and maintainable Express applications. It keeps your code organized by feature or domain, making it much easier to manage as the API grows.