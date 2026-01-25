# 12 - Routing and Handlers with `net/http`

As your API grows, you'll need to handle more than one endpoint. This guide covers how to organize your routes and handler logic using Go's standard `net/http` package, including how to structure your handlers and create simple middleware.

---

## 1. Using `http.ServeMux`

A "mux" or "request multiplexer" is essentially a router. It matches the URL of an incoming request against a list of registered patterns and calls the handler for the pattern that matches.

When you use `http.HandleFunc("/", ...)`, you are using Go's "Default ServeMux". For more control, you can create your own `ServeMux`.

```go
package main

import (
    "fmt"
    "log"
    "net/http"
)

func main() {
    // Create a new ServeMux
    mux := http.NewServeMux()

    // Register handlers on the new mux
    mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintln(w, "Welcome to the homepage!")
    })

    mux.HandleFunc("/users", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintln(w, "This is the users page.")
    })

    // Pass the custom mux to ListenAndServe instead of 'nil'
    fmt.Println("Server starting on port 8080...")
    log.Fatal(http.ListenAndServe(":8080", mux))
}
```

### Path Matching Rules
The `ServeMux` matches patterns based on the **longest matching prefix**.

-   A pattern ending with a trailing slash (`/users/`) matches all paths under that subtree (e.g., `/users/1`, `/users/profile`). This is a "subtree path".
-   A pattern without a trailing slash (`/users`) matches only that exact path. This is a "fixed path".
-   The `ServeMux` does *not* support wildcards or route parameters like `:id`. This is a key reason why third-party routers and frameworks like Gin are so popular.

---

## 2. Structuring Handlers

For more complex applications, it's better to organize handler logic into structs. This allows you to manage dependencies (like a database connection) more cleanly.

A common pattern is to have a struct that implements the `http.Handler` interface.

```go
// The http.Handler interface has just one method
type Handler interface {
    ServeHTTP(ResponseWriter, *Request)
}
```

Here's how to use it:
```go
package main

import (
    "fmt"
    "log"
    "net/http"
)

// Define a struct to hold our application's state/dependencies
type AppState struct {
    DBVersion string
}

// Implement the http.Handler interface for our AppState struct
func (s *AppState) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, "Hello! The current database version is %s", s.DBVersion)
}

func main() {
    mux := http.NewServeMux()
    
    appState := &AppState{DBVersion: "1.2.3"}

    // http.Handle takes an http.Handler, which our AppState now is.
    mux.Handle("/", appState) 

    fmt.Println("Server starting on port 8080...")
    log.Fatal(http.ListenAndServe(":8080", mux))
}
```

---

## 3. Middleware Pattern in Go

Middleware is a function that wraps another handler, allowing you to execute code before and/or after the main handler runs. It's perfect for logging, authentication, compression, etc.

A common middleware pattern in Go is a function that takes an `http.Handler` and returns a new `http.Handler`.

### Example: Logging Middleware
```go
package main

import (
    "fmt"
    "log"
    "net/http"
    "time"
)

// Middleware function
func loggingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        log.Printf("Started %s %s", r.Method, r.RequestURI)

        // Call the next handler in the chain
        next.ServeHTTP(w, r)

        log.Printf("Completed in %v", time.Since(start))
    })
}

// Our main handler
func helloHandler(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintln(w, "Hello, Middleware!")
}

func main() {
    mux := http.NewServeMux()

    // Wrap our helloHandler with the logging middleware
    mux.Handle("/", loggingMiddleware(http.HandlerFunc(helloHandler)))

    fmt.Println("Server starting on port 8080...")
    log.Fatal(http.ListenAndServe(":8080", mux))
}
```
When you run this server and make a request, you'll see log messages in your terminal for the start and end of the request. You can chain multiple middleware functions together to create a full request processing pipeline.

---

## 4. `context.Context` for Request-Scoped Values

The `context` package provides a way to carry request-scoped data, cancellation signals, and deadlines across API boundaries. It's an essential tool for passing data between middleware and handlers.

### Example: Authentication Middleware with Context
Imagine a middleware that validates an API key and passes the user ID to the next handler.

```go
package main

import (
    "context"
    "fmt"
    "log"
    "net/http"
)

// Define a custom type for our context key to avoid collisions
type contextKey string
const userIDKey contextKey = "userID"

func authMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        apiKey := r.Header.Get("X-API-KEY")
        if apiKey != "secret123" {
            http.Error(w, "Unauthorized", http.StatusUnauthorized)
            return
        }

        // Fake user ID lookup
        userID := "user-abc-789"
        
        // Create a new context with the user ID and pass it down
        ctx := context.WithValue(r.Context(), userIDKey, userID)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

func profileHandler(w http.ResponseWriter, r *http.Request) {
    // Retrieve the user ID from the context
    userID, ok := r.Context().Value(userIDKey).(string)
    if !ok {
        http.Error(w, "Could not retrieve user ID", http.StatusInternalServerError)
        return
    }
    
    fmt.Fprintf(w, "This is the profile for user: %s", userID)
}

func main() {
    mux := http.NewServeMux()
    mux.Handle("/profile", authMiddleware(http.HandlerFunc(profileHandler)))

    fmt.Println("Server starting on port 8080...")
    log.Fatal(http.ListenAndServe(":8080", mux))
}
```
To test this, you'd use a tool like `curl`:
```bash
curl -H "X-API-KEY: secret123" http://localhost:8080/profile
```
This shows how you can build a clean, organized, and extensible API using only Go's powerful standard library.