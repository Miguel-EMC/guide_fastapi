# 02 - Setup: Node.js, NPM, and TypeScript

Setting up a robust development environment is the first step towards building a professional backend API. This guide will walk you through installing Node.js, understanding NPM (Node Package Manager), and configuring TypeScript for your project.

---

## 1. Installing Node.js and NPM

NPM (Node Package Manager) is included with Node.js. It's highly recommended to use a **Node Version Manager (NVM)** to manage multiple Node.js versions on your system.

### A. Installing NVM (Linux / macOS)
1.  **Install NVM**: Open your terminal and run the installation script.
    ```bash
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    # Or for wget:
    # wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    ```
    Follow the instructions to add NVM to your shell's profile (e.g., `~/.bashrc`, `~/.zshrc`). You might need to close and reopen your terminal.
2.  **Verify NVM**:
    ```bash
    nvm --version
    ```
3.  **Install Node.js (LTS Version)**:
    ```bash
    nvm install --lts      # Installs the latest LTS version
    nvm use --lts          # Uses the latest LTS version
    nvm alias default node # Sets the LTS version as default for new shells
    ```
4.  **Verify Node.js and NPM**:
    ```bash
    node -v # Should show vX.Y.Z
    npm -v  # Should show A.B.C
    ```

### B. Installing Node.js (Windows)
For Windows, you can use the official installer from [nodejs.org](https://nodejs.org/) or a Windows-specific NVM like [nvm-windows](https://github.com/coreybutler/nvm-windows). The official installer is the simplest way to get started.

---

## 2. Initializing Your Project

Now that Node.js and NPM are installed, let's set up a new Express.js project.

1.  **Create a project directory**:
    ```bash
    mkdir my-express-api
    cd my-express-api
    ```
2.  **Initialize NPM**: This creates a `package.json` file, which manages your project's metadata and dependencies.
    ```bash
    npm init -y
    ```
    The `-y` flag answers "yes" to all prompts. You can edit `package.json` later.

---

## 3. Setting Up TypeScript

### A. Install TypeScript and Types
We need to install TypeScript itself, a utility to run TypeScript directly (`ts-node`), and type definitions for Node.js (`@types/node`).

```bash
npm install --save-dev typescript ts-node @types/node
```
The `--save-dev` flag adds these as development dependencies.

### B. Initialize `tsconfig.json`
The `tsconfig.json` file configures the TypeScript compiler.
```bash
npx tsc --init
```
This creates a `tsconfig.json` file with many commented-out options. We'll modify a few key ones.

### C. Configure `tsconfig.json`
Open `tsconfig.json` and adjust these settings. Here's a recommended basic setup for a backend project:

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "es2022", // Specify ECMAScript target version for output JavaScript
    "module": "commonjs", // Specify module code generation: "CommonJS" for Node.js
    "rootDir": "./src", // Specify the root directory of source files
    "outDir": "./dist", // Specify the output directory for compiled JavaScript
    "esModuleInterop": true, // Enables 'allowSyntheticDefaultImports' for better module interoperability
    "forceConsistentCasingInFileNames": true, // Disallow inconsistently-cased file names
    "strict": true, // Enable all strict type-checking options
    "skipLibCheck": true, // Skip type checking all .d.ts files.
    "sourceMap": true // Generate sourcemaps for easier debugging
  },
  "include": ["src/**/*.ts"], // Include all .ts files in the src directory
  "exclude": ["node_modules"]
}
```

---

## 4. Installing Express.js

Now, let's install Express.js and its TypeScript type definitions.
```bash
npm install express
npm install --save-dev @types/express
```

---

## 5. Your First TypeScript Express App

Let's create a simple "Hello, Express!" application.

1.  **Create `src/app.ts`**:
    ```typescript
    // src/app.ts
    import express, { Request, Response } from 'express';

    const app = express();
    const port = process.env.PORT || 3000;

    app.get('/', (req: Request, res: Response) => {
      res.send('Hello, Express with TypeScript!');
    });

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
      console.log(`Open http://localhost:${port} in your browser`);
    });
    ```

---

## 6. Running the Application

You'll typically have two ways to run your app: for development (using `ts-node`) and for production (using compiled JavaScript).

### Add Scripts to `package.json`
Open your `package.json` file and add the following scripts:

```json
// package.json
{
  "name": "my-express-api",
  "version": "1.0.0",
  // ... other fields
  "main": "dist/app.js", // Point to the compiled JS file
  "scripts": {
    "build": "tsc", // Compiles TypeScript to JavaScript
    "start": "node dist/app.js", // Runs the compiled JavaScript
    "dev": "ts-node src/app.ts", // Runs TypeScript directly (for development)
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  // ... dependencies and devDependencies
}
```

### Run in Development Mode
```bash
npm run dev
```
This will start your server directly from `src/app.ts` using `ts-node`.

### Build for Production
```bash
npm run build # Compiles TypeScript files into the 'dist' directory
npm run start # Runs the compiled JavaScript files
```

You now have a fully configured Node.js, Express, and TypeScript development environment ready to build powerful backend APIs!
