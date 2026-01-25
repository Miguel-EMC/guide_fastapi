# 05 - Functions and Error Handling

Functions are the basic building blocks of a Go program, allowing you to organize code into reusable and manageable pieces. Go's approach to error handling is a core part of its design, emphasizing explicitness and clarity.

---

## 1. Defining Functions

A function declaration includes the `func` keyword, the function name, a list of parameters, an optional list of return types, and the function body.

```go
package main

import "fmt"

// A simple function that takes two integers and returns their sum.
// func name(parameter-name parameter-type) return-type
func add(x int, y int) int {
    return x + y
}

// If consecutive parameters share the same type, you can omit the type from all but the last one.
func multiply(x, y int) int {
    return x * y
}

func main() {
    sum := add(10, 20)
    product := multiply(10, 20)
    fmt.Println("Sum:", sum)       // Output: Sum: 30
    fmt.Println("Product:", product) // Output: Product: 200
}
```

### Multiple Return Values
A function in Go can return any number of results. This is a key feature used for error handling.

```go
package main

import "fmt"

// Returns both a result and an error (which we will cover later).
func divide(a, b float64) (float64, error) {
    if b == 0 {
        // We can't divide by zero, so return 0 and an error.
        return 0, fmt.Errorf("cannot divide by zero")
    }
    return a / b, nil // 'nil' indicates no error occurred.
}

func main() {
    result, err := divide(10, 2)
    if err != nil {
        fmt.Println("Error:", err)
    } else {
        fmt.Println("Result:", result) // Output: Result: 5
    }

    result, err = divide(10, 0)
    if err != nil {
        fmt.Println("Error:", err) // Output: Error: cannot divide by zero
    } else {
        fmt.Println("Result:", result)
    }
}
```

### Named Return Values
Go's return values may be named. If so, they are treated as variables defined at the top of the function. A `return` statement without arguments returns the named return values.

```go
func split(sum int) (x, y int) {
    x = sum * 4 / 9
    y = sum - x
    return // Returns the current values of x and y
}
```

### Variadic Functions
Functions that accept a variable number of arguments are known as variadic functions.

```go
func sum(nums ...int) int {
    total := 0
    for _, num := range nums {
        total += num
    }
    return total
}

func main() {
    fmt.Println(sum(1, 2, 3))    // Output: 6
    fmt.Println(sum(10, 20))     // Output: 30
}
```

---

## 2. Anonymous Functions and Closures

Go supports anonymous functions, which can be defined inline. They are often used when you need a function for a short period.

A **closure** is a function value that references variables from outside its body. The function "closes over" the variables it needs.

```go
package main

import "fmt"

func intSeq() func() int {
    i := 0
    return func() int { // This anonymous function is a closure
        i++
        return i
    }
}

func main() {
    nextInt := intSeq()

    fmt.Println(nextInt()) // Output: 1
    fmt.Println(nextInt()) // Output: 2
    fmt.Println(nextInt()) // Output: 3

    newInts := intSeq()   // This creates a new 'i' variable
    fmt.Println(newInts()) // Output: 1
}
```

---

## 3. The `defer` Statement

A `defer` statement defers the execution of a function until the surrounding function returns. The deferred call's arguments are evaluated immediately, but the function call is not executed until the surrounding function exits.

This is extremely useful for cleanup tasks, such as closing a file or releasing a resource.

```go
package main

import (
    "fmt"
    "os"
)

func main() {
    file, err := os.Create("test.txt")
    if err != nil {
        panic(err)
    g}
    // This will be executed at the end of the main function, ensuring the file is closed.
    defer file.Close() 

    file.WriteString("Hello, defer!")
    fmt.Println("File written.")
}
```
If multiple `defer` statements exist, they are pushed onto a stack and executed in **Last-In, First-Out (LIFO)** order.

---

## 4. Error Handling

Go's approach to error handling is explicit and part of the language's core philosophy. Instead of using `try/catch` blocks, functions that can fail return an `error` as their last return value.

### The `error` Type
`error` is a built-in interface type. A `nil` error value indicates success, while a non-`nil` value indicates failure.

### The `if err != nil` Pattern
This is the idiomatic way to handle errors in Go. You check if the `error` value is `nil` immediately after calling a function.

```go
// From the divide function example above:
result, err := divide(10, 0)
if err != nil {
    // Handle the error (log it, return it, etc.)
    fmt.Println("Error:", err)
    return
}
// Proceed with the successful result
```

### Creating Errors
-   **`errors.New()`**: Creates a simple error with a static string.
    ```go
    import "errors"
    err := errors.New("something went wrong")
    ```
-   **`fmt.Errorf()`**: Creates a formatted error string.
    ```go
    import "fmt"
    err := fmt.Errorf("user with ID %d not found", userId)
    ```

### Error Wrapping
Since Go 1.13, you can "wrap" errors to provide additional context without losing the original error information. Use the `%w` verb with `fmt.Errorf`.

```go
originalErr := errors.New("database connection failed")
newErr := fmt.Errorf("failed to process order: %w", originalErr)

// You can check if newErr contains the original error
if errors.Is(newErr, originalErr) {
    fmt.Println("This was a database connection error.")
}
```

---

## 5. `panic` and `recover`

Go has a `panic` function that stops the ordinary flow of control and begins "panicking". It's typically used for truly exceptional, unrecoverable programmer errors (like an index out of bounds). It's not for handling expected errors like a file not found.

A `recover` function can be used to regain control of a panicking goroutine. It's only useful inside a `defer` statement.

**In idiomatic Go, you should very rarely use `panic` and `recover`.** Always prefer returning an `error` for any foreseeable failure.

```go
func mayPanic() {
    defer func() {
        if r := recover(); r != nil {
            fmt.Println("Recovered from panic:", r)
        }
    }()
    
    fmt.Println("About to panic!")
    panic("something went wrong")
    fmt.Println("This will not be executed.")
}
```
This explicit error handling makes Go code robust, predictable, and easy to read.