# 08 - Request and Response Objects

In every Express route handler, you receive two crucial objects: `req` (the request object) and `res` (the response object). These objects are the core of how you interact with incoming HTTP requests from clients and send back HTTP responses. Understanding them thoroughly is fundamental for building any Express.js API.

---

## 1. The Request Object (`req`)

The `req` object represents the HTTP request and contains properties for the request query strings, parameters, body, HTTP headers, and so on.

### A. Core Properties

-   **`req.params`**: An object containing properties mapped to the named route parameters.
    ```typescript
    // Route: /users/:id
    // Request: GET /users/123
    // req.params.id will be "123"
    ```
-   **`req.query`**: An object containing a property for each query string parameter in the route.
    ```typescript
    // Route: /search?name=john&age=30
    // req.query.name will be "john"
    // req.query.age will be "30"
    ```
-   **`req.body`**: Contains key-value pairs of data submitted in the request body. Available only after processing by `express.json()` or `express.urlencoded()`.
    ```typescript
    // For a POST request with JSON body {"name": "Alice"}
    // req.body.name will be "Alice"
    ```
-   **`req.headers`**: An object containing the request HTTP headers.
-   **`req.method`**: The HTTP method of the request (e.g., 'GET', 'POST').
-   **`req.url`**: The request URL string.
-   **`req.path`**: The path part of the request URL.
-   **`req.ip`**: The remote IP address of the request.
-   **`req.protocol`**: The request protocol string (e.g., 'http' or 'https').

### B. Useful Methods

-   **`req.get(headerName)`**: Returns the specified HTTP header field (case-insensitive).
    ```typescript
    const userAgent = req.get('User-Agent');
    ```
-   **`req.is(type)`**: Checks if the incoming request's `Content-Type` header matches the `type` argument.
    ```typescript
    if (req.is('json')) { // checks if Content-Type is application/json
        // ...
    }
    ```

---

## 2. The Response Object (`res`)

The `res` object represents the HTTP response that an Express app sends when it receives an HTTP request.

### A. Sending Responses

-   **`res.send([body])`**: Sends the HTTP response. The `body` can be a `string`, `Buffer`, `object`, `boolean`, or `array`. Express will automatically set the `Content-Type` header.
    ```typescript
    res.send('Hello World!');
    res.send({ user: 'John Doe' }); // Sends JSON
    ```
-   **`res.json([body])`**: Sends a JSON response. It automatically sets the `Content-Type` header to `application/json`.
    ```typescript
    res.json({ message: 'Success', data: user });
    ```
-   **`res.status(code)`**: Sets the HTTP status for the response. Can be chained with other `res` methods.
    ```typescript
    res.status(404).send('Not Found');
    res.status(201).json({ message: 'Created' });
    ```
-   **`res.sendStatus(statusCode)`**: Sets the status code and sends its string representation as the response body.
    ```typescript
    res.sendStatus(400); // Sets status to 400 and sends "Bad Request"
    ```

### B. Setting Headers

-   **`res.set(field, [value])`** or **`res.header(field, [value])`**: Sets the response HTTP header `field` to `value`.
    ```typescript
    res.set('X-Powered-By', 'Express');
    ```

### C. Redirections

-   **`res.redirect([status,] path)`**: Redirects the client to the `path`. The default status is 302 (Found).
    ```typescript
    res.redirect('/new-page');
    res.redirect(301, 'http://example.com'); // Permanent redirect
    ```

### D. Cookies

-   **`res.cookie(name, value, [options])`**: Sets a cookie.
    ```typescript
    res.cookie('token', 'somejwttoken', { httpOnly: true, secure: true, maxAge: 3600000 });
    ```
-   **`res.clearCookie(name, [options])`**: Clears a cookie.
    ```typescript
    res.clearCookie('token');
    ```

---

## 3. Complete Example

```typescript
// src/app.ts
import express, { Request, Response } from 'express';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json()); // Built-in middleware to parse JSON bodies

app.get('/headers', (req: Request, res: Response) => {
  // Accessing request headers
  const userAgent = req.get('User-Agent');
  res.json({
    message: 'Headers received',
    userAgent: userAgent,
    host: req.headers.host,
    ip: req.ip,
    method: req.method,
    path: req.path,
  });
});

app.post('/data', (req: Request, res: Response) => {
  // Accessing request body (parsed by express.json())
  const receivedData = req.body;
  res.status(201).json({
    message: 'Data received and processed',
    yourData: receivedData,
  });
});

app.get('/user/:id', (req: Request, res: Response) => {
  // Accessing route parameters
  const userId = req.params.id;
  // Accessing query parameters
  const filter = req.query.filter || 'all'; 

  res.json({
    message: `Fetching user ${userId} with filter ${filter}`,
    userId: userId,
    filter: filter,
  });
});

app.get('/redirect-me', (req: Request, res: Response) => {
    res.redirect('/headers'); // Redirects to /headers
});

// Error handling middleware (defined last)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
```
By mastering the `req` and `res` objects, you gain full control over the incoming requests and the outgoing responses of your Express.js API.