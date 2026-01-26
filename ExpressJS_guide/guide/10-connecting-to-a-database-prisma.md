# 10 - Connecting to a Database with Prisma

Interacting with a database is a core requirement for almost any backend API. Instead of writing raw SQL queries, modern applications often use an **Object-Relational Mapper (ORM)** to work with databases in a more intuitive, object-oriented way.

For TypeScript/Node.js applications, **Prisma** is a next-generation ORM that provides a powerful, type-safe database client, making it an excellent choice for Express.js APIs.

---

## 1. What is Prisma?

Prisma consists of three main parts:
1.  **Prisma Schema**: A declarative file (`schema.prisma`) where you define your database models and connection.
2.  **Prisma Migrate**: A migration tool that generates SQL migrations from your schema file to keep your database schema in sync.
3.  **Prisma Client**: An auto-generated and type-safe query builder that you use in your application code to interact with your database.

---

## 2. Setting Up Prisma

### Step 1: Install Prisma CLI and Client
```bash
# Install the Prisma CLI as a dev dependency
npm install --save-dev prisma

# Install the Prisma Client as a regular dependency
npm install @prisma/client
```

### Step 2: Initialize Prisma
This command creates a `prisma` directory with a `schema.prisma` file and a `.env` file for your database connection URL.
```bash
npx prisma init
```

### Step 3: Configure Database Connection
Open the `.env` file and set the `DATABASE_URL` for your database. For this example, we'll use PostgreSQL.

```env
# .env
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/your_database?schema=public"
```
*(Make sure you have PostgreSQL running and have created a database named `your_database`)*.

Now, open `prisma/schema.prisma` and ensure the `datasource` block is configured correctly.

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql" // or "mysql", "sqlite", etc.
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

---

## 3. Defining Models in the Prisma Schema

You define your application's models in the `schema.prisma` file. Let's define a simple `User` model.

```prisma
// prisma/schema.prisma

// ... (datasource and generator blocks)

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?  // The '?' makes this field optional
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```
-   `@id`: Marks the field as the primary key.
-   `@default(autoincrement())`: Sets up an auto-incrementing integer.
-   `@unique`: Enforces a unique constraint on the field.
-   `@updatedAt`: Automatically updates this field whenever the record is updated.

---

## 4. Migrating Your Database

Prisma Migrate generates and applies SQL migrations based on your schema.

1.  **Create and apply the migration**: This command will create a new SQL migration file and run it against your database.
    ```bash
    npx prisma migrate dev --name init
    ```
    This command does three things:
    -   Saves the migration (`.sql` file).
    -   Applies the migration to the database.
    -   **Generates the Prisma Client** based on your schema.

2.  **Generate Prisma Client (manually)**: If you ever change your schema without migrating, you can regenerate the client manually.
    ```bash
    npx prisma generate
    ```
    This command reads your `schema.prisma` and creates the type-safe `@prisma/client` in your `node_modules` directory.

---

## 5. Using Prisma Client

You can now use the Prisma Client in your Express application to interact with your database.

### Create a Prisma Client Instance
It's a best practice to create a single instance of `PrismaClient` and share it across your application.

```typescript
// src/db.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default prisma;
```

### Basic CRUD Operations
Here's how you would use the Prisma Client in a route handler:

```typescript
// src/app.ts
import express, { Request, Response } from 'express';
import prisma from './db'; // Import your prisma client instance

const app = express();
app.use(express.json());

// CREATE a new user
app.post('/users', async (req: Request, res: Response) => {
  try {
    const { email, name, password } = req.body;
    const newUser = await prisma.user.create({
      data: { email, name, password },
    });
    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ error: 'Could not create user' });
  }
});

// READ all users
app.get('/users', async (req: Request, res: Response) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

// READ a single user by ID
app.get('/users/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = await prisma.user.findUnique({
    where: { id: parseInt(id) },
  });
  if (user) {
    res.json(user);
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// UPDATE a user
app.put('/users/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;
  const updatedUser = await prisma.user.update({
    where: { id: parseInt(id) },
    data: { name: name || undefined },
  });
  res.json(updatedUser);
});

// DELETE a user
app.delete('/users/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  await prisma.user.delete({
    where: { id: parseInt(id) },
  });
  res.status(204).send();
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
```
Notice how Prisma Client methods (`create`, `findMany`, etc.) are fully typed, providing excellent autocompletion and preventing common typos and errors in your IDE. This is the power of using a modern ORM like Prisma with TypeScript.