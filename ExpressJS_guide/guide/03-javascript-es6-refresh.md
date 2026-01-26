# 03 - JavaScript ES6+ Refresh

Node.js allows you to use the latest JavaScript features. This guide provides a quick refresh of essential ES6+ (ECMAScript 2015 and later) features that are fundamental for modern backend development with Node.js and Express. If you're already comfortable with these, feel free to skim through!

---

## 1. `let` and `const` (Variable Declarations)

The `var` keyword has been largely replaced by `let` and `const` due to their improved scoping rules.

-   **`let`**: Declares a block-scoped local variable. It is mutable (its value can be reassigned).
    ```typescript
    let count = 0;
    if (true) {
      let count = 1; // Different variable, scoped to this block
      console.log(count); // Output: 1
    }
    console.log(count); // Output: 0
    ```
-   **`const`**: Declares a block-scoped local variable whose value is constant. It cannot be reassigned after its initial assignment. For objects and arrays, `const` prevents reassignment of the variable itself, not the mutation of its contents.
    ```typescript
    const API_URL = 'http://localhost:3000/api';
    // API_URL = 'new_url'; // Error: Assignment to constant variable.

    const user = { name: 'Alice' };
    user.name = 'Bob'; // This is allowed, the object itself is mutable
    console.log(user); // Output: { name: 'Bob' }
    // user = { name: 'Charlie' }; // Error: Assignment to constant variable.
    ```
**Best Practice**: Prefer `const` by default. Use `let` only when you know the variable needs to be reassigned. Avoid `var`.

---

## 2. Arrow Functions (`=>`)

Arrow functions provide a more concise syntax for writing function expressions. They also have a different way of handling the `this` keyword (lexical `this`).

```typescript
// Traditional function expression
const add = function(a: number, b: number): number {
  return a + b;
};

// Arrow function (concise syntax)
const subtract = (a: number, b: number): number => {
  return a - b;
};

// Arrow function with implicit return (for single expressions)
const multiply = (a: number, b: number): number => a * b;

console.log(add(2, 3));      // Output: 5
console.log(subtract(5, 2)); // Output: 3
console.log(multiply(4, 5)); // Output: 20
```

---

## 3. Template Literals (`` ` ``)

Template literals (or template strings) allow for easy string interpolation and multi-line strings using backticks (`` ` ``).

```typescript
const username = 'Dev';
const greeting = `Hello, ${username}!
Welcome to the backend API.`;
console.log(greeting);
/* Output:
Hello, Dev!
Welcome to the backend API.
*/
```

---

## 4. Destructuring Assignment

Destructuring allows you to unpack values from arrays or properties from objects into distinct variables.

```typescript
// Array destructuring
const colors = ['red', 'green', 'blue'];
const [firstColor, secondColor] = colors;
console.log(firstColor, secondColor); // Output: red green

// Object destructuring
const user = { id: 1, name: 'Alice', email: 'alice@example.com' };
const { name, email } = user;
console.log(name, email); // Output: Alice alice@example.com

// With renaming and default values
const { id, name: userName, age = 30 } = user;
console.log(id, userName, age); // Output: 1 Alice 30
```

---

## 5. Spread (`...`) and Rest (`...`) Operators

The same `...` syntax is used for two distinct but related features:

-   **Spread Operator**: Expands an iterable (like an array or object) into individual elements.
    ```typescript
    // For arrays
    const arr1 = [1, 2];
    const arr2 = [...arr1, 3, 4]; // Output: [1, 2, 3, 4]

    // For objects (shallow copy)
    const userProfile = { name: 'Bob', age: 40 };
    const updatedProfile = { ...userProfile, city: 'NY' };
    console.log(updatedProfile); // Output: { name: 'Bob', age: 40, city: 'NY' }
    ```
-   **Rest Parameters**: Collects an indefinite number of arguments into an array.
    ```typescript
    function sum(message: string, ...numbers: number[]): void {
      console.log(message, numbers.reduce((acc, num) => acc + num, 0));
    }
    sum('Total:', 1, 2, 3, 4); // Output: Total: 10
    ```

---

## 6. Promises

Promises are objects that represent the eventual completion (or failure) of an asynchronous operation and its resulting value. They help manage asynchronous code more cleanly than callbacks.

```typescript
const fetchData = (shouldSucceed: boolean): Promise<string> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldSucceed) {
        resolve('Data fetched successfully!');
      } else {
        reject('Failed to fetch data.');
      }
    }, 1000);
  });
};

fetchData(true)
  .then((data) => console.log('Success:', data))    // Output after 1s: Success: Data fetched successfully!
  .catch((error) => console.error('Error:', error))
  .finally(() => console.log('Operation finished.'));
```

---

## 7. `async`/`await`

`async`/`await` is built on top of Promises and provides a much more readable, synchronous-looking way to write asynchronous code.

-   `async` functions: Always return a Promise.
-   `await` keyword: Can only be used inside an `async` function. It pauses the execution of the `async` function until the Promise settles (resolves or rejects).

```typescript
const processData = async () => {
  try {
    console.log('Fetching data...');
    const result = await fetchData(true); // Wait for fetchData Promise to resolve
    console.log(result);

    console.log('Attempting to fetch data again (will fail)...');
    const failedResult = await fetchData(false); // This will throw an error
    console.log(failedResult); // This line will not be reached
  } catch (error) {
    console.error('Caught error:', error); // Output: Caught error: Failed to fetch data.
  } finally {
    console.log('Async process finished.');
  }
};

processData();
```

These modern JavaScript features are used extensively in Node.js and Express.js development, making your code more efficient, readable, and powerful.