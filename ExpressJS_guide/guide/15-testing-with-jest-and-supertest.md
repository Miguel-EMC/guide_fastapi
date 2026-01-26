# 15 - Testing with Jest and Supertest

Testing is a critical practice that ensures your API is reliable, correct, and maintainable. This guide will introduce you to testing an Express.js/TypeScript application using two popular libraries:
-   **Jest**: A delightful JavaScript testing framework with a focus on simplicity.
-   **Supertest**: A library for testing Node.js HTTP servers, allowing you to make requests to your API endpoints and assert on the responses.

---

## 1. Setup

### A. Install Dependencies
Install Jest, Supertest, and their related TypeScript dependencies.
```bash
npm install --save-dev jest ts-jest @types/jest supertest @types/supertest
```

### B. Configure Jest
Create a `jest.config.js` file in your project root. This tells Jest how to handle TypeScript files.
```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'], // Look for files ending in .test.ts or .spec.ts
};
```

### C. Add Test Script
Add a `test` script to your `package.json`.
```json
// package.json
"scripts": {
  // ...
  "test": "jest"
}
```

---

## 2. Unit Tests with Jest

Unit tests focus on a small, isolated piece of your application, like a single function in a service.

Let's imagine a simple utility function.
```typescript
// src/utils/formatter.ts
export const capitalize = (s: string): string => {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
};
```

Now, let's write a test for it in `src/utils/formatter.test.ts`.
```typescript
// src/utils/formatter.test.ts
import { capitalize } from './formatter';

// `describe` groups related tests together
describe('capitalize', () => {
  // `it` or `test` defines an individual test case
  it('should capitalize the first letter of a string', () => {
    // Arrange
    const input = 'hello';
    const expected = 'Hello';

    // Act
    const result = capitalize(input);

    // Assert
    expect(result).toBe(expected);
  });

  it('should return an empty string if input is empty', () => {
    expect(capitalize('')).toBe('');
  });
});
```

To run your tests:
```bash
npm test
```
Jest will find and run all `*.test.ts` files.

### Mocking Dependencies
Jest has powerful mocking capabilities. For example, if you wanted to test a service without making a real database call, you could mock the Prisma client.

```typescript
// src/api/users/user.service.test.ts
import * as userService from './user.service';
import prisma from '../../db';

// Mock the entire prisma client
jest.mock('../../db', () => ({
  user: {
    findMany: jest.fn(),
  },
}));

describe('User Service', () => {
  it('findAllUsers should return a list of users', async () => {
    const mockUsers = [{ id: 1, name: 'Alice' }];
    (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

    const users = await userService.findAllUsers();

    expect(users).toEqual(mockUsers);
    expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
  });
});
```

---

## 3. Integration Tests with Supertest

Integration tests check how different parts of your system work together. For APIs, this usually means testing your HTTP endpoints. Supertest is perfect for this.

Let's test the `GET /api/v1/users` endpoint from a previous guide.

```typescript
// src/api/users/user.integration.test.ts
import request from 'supertest';
import app from '../../app'; // Import your main express app instance
import prisma from '../../db';

describe('GET /api/v1/users', () => {
  // beforeAll runs once before all tests in this block
  beforeAll(async () => {
    // Seed the database with a test user
    await prisma.user.create({
      data: {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        password: 'password' // In a real app, this would be hashed
      },
    });
  });

  // afterAll runs once after all tests in this block
  afterAll(async () => {
    // Clean up the database
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  it('should return a list of users', async () => {
    const response = await request(app)
      .get('/api/v1/users')
      .expect('Content-Type', /json/) // Assert header
      .expect(200); // Assert status code

    // Assert on the response body
    expect(response.body.status).toBe('success');
    expect(response.body.data.users).toBeInstanceOf(Array);
    expect(response.body.data.users.length).toBe(1);
    expect(response.body.data.users[0].name).toBe('Test User');
  });
});
```

### Testing Protected Routes
To test a protected route, you first need to get a token and then include it in the request.

```typescript
describe('GET /api/v1/me', () => {
  let token: string;

  beforeAll(async () => {
    // You would typically have a test setup that creates a user
    // and a login helper that returns a token.
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    token = response.body.token;
  });

  it('should return the authenticated user's data', async () => {
    const response = await request(app)
      .get('/api/v1/me') // Assuming you have a /me route
      .set('Authorization', `Bearer ${token}`) // Set the auth header
      .expect(200);

    expect(response.body.data.user.email).toBe('test@example.com');
  });

  it('should return 401 for unauthenticated requests', async () => {
    await request(app).get('/api/v1/me').expect(401);
  });
});
```

Testing is a deep subject, but combining Jest for unit tests and Supertest for API integration tests gives you excellent coverage and confidence in your Express.js backend.