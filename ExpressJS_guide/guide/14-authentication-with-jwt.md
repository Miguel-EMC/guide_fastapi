# 14 - Authentication with JWT

Securing your API is a critical step. While the previous Go guide covered JWT, this guide will show you how to implement it in a Node.js/Express/TypeScript context, using popular libraries from the Node ecosystem. We will implement a stateless authentication system using **JSON Web Tokens (JWT)**.

---

## 1. Required Libraries

-   **`jsonwebtoken`**: For creating and verifying JWTs.
-   **`bcryptjs`**: For securely hashing and comparing user passwords.

### Installation
```bash
# Install libraries
npm install jsonwebtoken bcryptjs

# Install their TypeScript types
npm install --save-dev @types/jsonwebtoken @types/bcryptjs
```

---

## 2. Setup

### A. Environment Variables
Add your JWT secret and expiration time to a `.env` file at the root of your project. You'll need to install `dotenv` (`npm install dotenv`) to load it.

```env
# .env
PORT=3000
DATABASE_URL="postgresql://..."

JWT_SECRET="your-super-secret-and-long-key"
JWT_EXPIRES_IN="90d"
```

### B. Password Hashing on User Creation
Modify your `user.service.ts` to hash the user's password before saving it to the database.

```typescript
// src/api/users/user.service.ts
import prisma from '../../db';
import { User } from '@prisma/client';
import bcrypt from 'bcryptjs';

export const createUser = async (userData: any): Promise<User> => {
  // Hash the password
  const hashedPassword = await bcrypt.hash(userData.password, 12);
  
  // Create user with the hashed password
  return await prisma.user.create({
    data: {
      email: userData.email,
      name: userData.name,
      password: hashedPassword,
    },
  });
};
// ... other user service functions
```

---

## 3. Login Logic (JWT Generation)

We'll create a new `auth` feature with a controller and service to handle login.

### A. Create `src/api/auth/auth.service.ts`
This service will handle the core logic of validating a user and generating a token.

```typescript
// src/api/auth/auth.service.ts
import prisma from '../../db';
import AppError from '../../utils/AppError';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const loginUser = async (loginData: any) => {
  const { email, password } = loginData;

  // 1. Find user by email
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  // 2. Check if password is correct
  const isPasswordCorrect = await bcrypt.compare(password, user.password);
  if (!isPasswordCorrect) {
    throw new AppError('Invalid email or password', 401);
  }

  // 3. If correct, generate JWT
  const token = jwt.sign(
    { id: user.id, email: user.email }, // Payload
    process.env.JWT_SECRET as string,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  return token;
};
```

### B. Create `src/api/auth/auth.controller.ts` and `auth.routes.ts`
The controller and routes will handle the HTTP request and call the service.

```typescript
// src/api/auth/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import catchAsync from '../../utils/catchAsync';

export const login = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const token = await authService.loginUser(req.body);
  res.status(200).json({ status: 'success', token });
});
```
```typescript
// src/api/auth/auth.routes.ts
import { Router } from 'express';
import * as authController from './auth.controller';
const router = Router();
router.post('/login', authController.login);
export default router;
```
Finally, mount this router in `app.ts`: `app.use('/api/v1/auth', authRoutes);`

---

## 4. Authentication Middleware

This middleware will protect our routes by validating the JWT from the `Authorization` header.

```typescript
// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import AppError from '../utils/AppError';
import prisma from '../db';
import catchAsync from '../utils/catchAsync';

// Extend Express's Request type to include the user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const authMiddleware = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  // 1. Get token from header
  let token: string | undefined;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return next(new AppError('You are not logged in. Please log in to get access.', 401));
  }

  // 2. Verify token
  const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);

  // 3. Check if user still exists
  const currentUser = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!currentUser) {
    return next(new AppError('The user belonging to this token no longer exists.', 401));
  }
  
  // 4. Grant access
  req.user = currentUser;
  next();
});
```

---

## 5. Protecting Routes

Now you can easily apply the `authMiddleware` to any route or router you want to protect.

```typescript
// src/api/users/user.routes.ts
import { Router } from 'express';
import * as userController from './user.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

// This route is now protected
router.get('/me', authMiddleware, userController.getMe); 

// All routes below this line will be protected
// router.use(authMiddleware); 
// router.get('/', userController.getAllUsers);

export default router;
```

In your controller, you can now access the authenticated user from `req.user`.

```typescript
// src/api/users/user.controller.ts
export const getMe = (req: Request, res: Response, next: NextFunction) => {
  // The 'user' object was attached by the authMiddleware
  const user = req.user;
  res.status(200).json({ status: 'success', data: { user } });
};
```
This comprehensive setup provides a secure and standard way to handle authentication in your Express.js API.