# 05 - "Hello, World!" with Express

Now that our Node.js and TypeScript environment is set up, it's time to create our first Express.js application. This "Hello, World!" example will demonstrate how to initialize an Express app, define a simple route, and start the server.

---

## 1. Project Setup Recap

Before we begin, ensure you have completed the setup from Guide 02:
1.  Initialized `package.json` (`npm init -y`).
2.  Installed TypeScript and types (`npm install -D typescript ts-node @types/node`).
3.  Configured `tsconfig.json` (`npx tsc --init` and edit as specified).
4.  Installed Express and its types (`npm install express @types/express`).
5.  Added `dev`, `build`, and `start` scripts to your `package.json`.

Your `package.json` should look something like this (simplified):
```json
// package.json
{
  "name": "my-express-api",
  "version": "1.0.0",
  "main": "dist/app.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/app.js",
    "dev": "ts-node src/app.ts"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.12.12",
    "ts-node": "^10.9.2",
    "typescript": "^5.4.5"
  },
  "dependencies": {
    "express": "^4.19.2"
  }
}
```

---

## 2. Creating Your First Express App

Create a new file `src/app.ts` (or `src/index.ts` if you prefer). This will be the entry point of your application.

```typescript
// src/app.ts
import express, { Request, Response } from 'express'; // Import express and types

// Create an instance of the Express application
const app = express();
// Define the port the server will listen on.
// Use process.env.PORT for production deployment, default to 3000 for development.
const port = process.env.PORT || 3000;

// Define your first route: GET request to the root URL '/'
// The handler function receives Request and Response objects.
app.get('/', (req: Request, res: Response) => {
  // res.send() sends a string response
  // res.json() sends a JSON response
  res.send('Hello from Express with TypeScript!');
});

// Start the server and listen for incoming requests
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`Open http://localhost:${port} in your browser.`);
});
```

---

## 3. Running the Application

Open your terminal in the project's root directory and run the development script:

```bash
npm run dev
```

You should see output similar to:
```
Server is running on http://localhost:3000
Open http://localhost:3000 in your browser.
```

Now, open your web browser and navigate to `http://localhost:3000`. You should see the message "Hello from Express with TypeScript!".

You can also use `curl` from your terminal:
```bash
curl http://localhost:3000
```

Congratulations! You've successfully built and run your first Express.js application with TypeScript. This is the foundation for building all your backend APIs.