# 04 - Node.js Modules and the Event Loop

Two concepts are absolutely fundamental to understanding how Node.js works: its **module system** for organizing code and the **event loop** for handling concurrency.

---

## 1. Node.js Modules

Node.js has two primary module systems for including and sharing code between files.

### A. CommonJS (CJS)
This is the original module system for Node.js. It uses `require()` to import modules and `module.exports` or `exports` to expose them.

```javascript
// math.js
function add(a, b) {
  return a + b;
}
module.exports = { add };

// app.js
const math = require('./math.js');
console.log(math.add(2, 3)); // Output: 5
```
You will see this system used in many older Node.js projects and tutorials.

### B. ES Modules (ESM)
This is the modern, standardized module system for JavaScript, introduced in ES6. It uses `import` and `export` statements. Node.js has supported ES Modules for several years, and it is the recommended standard for new applications.

To use ES Modules in Node.js, you must do one of the following:
1.  Add `"type": "module"` to your `package.json` file.
2.  Use the `.mjs` file extension for your files.

**We will use `"type": "module"` in our projects.**

```typescript
// math.ts
export function add(a: number, b: number): number {
  return a + b;
}

// app.ts
import { add } from './math.js'; // Note the .js extension is often required in imports
console.log(add(2, 3)); // Output: 5
```

**Best Practice**: Use **ES Modules** for all new projects. It's the modern standard and aligns JavaScript code on both the frontend and backend.

---

## 2. The Event Loop

How can Node.js handle thousands of concurrent connections when JavaScript is single-threaded? The answer is the **event loop** and its **non-blocking I/O** model.

-   **Single Thread**: Your JavaScript code runs on a single main thread.
-   **Event Loop**: An internal Node.js construct that constantly runs, processing events from a queue.
-   **Non-Blocking I/O**: When your code needs to perform a slow I/O operation (like reading a file, making a database query, or a network request), it doesn't wait. Instead, it gives the task to the underlying system (the OS kernel, which is multi-threaded) and provides a callback function. The main thread is then free to continue executing other code.
-   **Callback Queue**: When the I/O operation is complete, the OS places the associated callback function into a queue.
-   **Processing**: The event loop picks up events from the callback queue and executes their callback functions on the main thread.

![Event Loop Diagram](https://nodejs.org/static/images/docs/guides/event-loop-timers-and-nexttick/event-loop-fs.png)
*(Image from the official Node.js documentation)*

### Phases of the Event Loop
The event loop runs in phases. In each phase, it processes a specific type of callback. The main phases are:
1.  **timers**: Executes callbacks scheduled by `setTimeout()` and `setInterval()`.
2.  **pending callbacks**: Executes I/O callbacks deferred to the next loop iteration.
3.  **poll**: Retrieves new I/O events; executes their callbacks. This is where most I/O-related code runs.
4.  **check**: Executes callbacks scheduled by `setImmediate()`.
5.  **close callbacks**: Executes `close` event callbacks (e.g., `socket.on('close', ...)`).

### `process.nextTick()` vs. `setImmediate()`
These two functions can be confusing, but their place in the event loop is distinct:
-   **`process.nextTick(callback)`**: Its callback is *not* part of the event loop. It is executed **immediately** after the current operation completes, before the event loop continues to the next phase. It runs before any other I/O events or timers.
-   **`setImmediate(callback)`**: Its callback is executed in the **check** phase of the event loop, which runs after the **poll** phase. It's designed to run *after* any I/O events in the current loop.

**General Rule**: In most cases, developers should use `setImmediate()` or `setTimeout(() => {...}, 0)` as they interact more predictably with the event loop. Use `process.nextTick()` only when you need to ensure a callback executes before the event loop continues.

---

## 3. NPM (Node Package Manager) Review

`npm` is the command-line tool for interacting with the NPM registry. It manages your project's dependencies.

-   **`package.json`**: This file contains your project's metadata, including its name, version, and a list of its dependencies.
-   **`package-lock.json`**: An auto-generated file that records the exact version of every dependency your project uses. This ensures that `npm install` will always install the exact same package versions, leading to consistent and reliable builds. **You should always commit this file.**
-   **`node_modules/`**: The directory where all downloaded packages are stored. **You should always add this directory to your `.gitignore` file.**

### Common NPM Commands
-   **`npm install`**: Installs all dependencies listed in `package.json`.
-   **`npm install <package-name>`**: Installs a package and adds it to `dependencies` in `package.json`.
-   **`npm install --save-dev <package-name>`** (or `-D`): Installs a package and adds it to `devDependencies` (for tools used only during development, like TypeScript or testing libraries).
-   **`npm uninstall <package-name>`**: Uninstalls a package and removes it from `package.json`.
-   **`npm run <script-name>`**: Executes a script defined in the `scripts` section of `package.json`.

Understanding modules for organization and the event loop for concurrency is the key to mastering backend development in Node.js.