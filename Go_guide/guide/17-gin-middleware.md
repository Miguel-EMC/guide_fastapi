# 17 - Gin Middleware

Middleware in Gin (and web frameworks in general) is a function that can intercept HTTP requests and responses. It sits in the middle of the request-response cycle, allowing you to execute code before or after the main handler for a route. Middleware is perfect for handling cross-cutting concerns like logging, authentication, authorization, CORS, and more.

---

## 1. How Gin Middleware Works

-   A middleware function takes a `*gin.Context` object as its argument.
-   It can perform actions (e.g., logging, validation).
-   It calls `c.Next()` to pass control to the next middleware or the final handler in the chain.
-   It can perform actions after `c.Next()` returns (e.g., logging response time).
-   It can call `c.Abort()` or `c.AbortWithStatusJSON()` to stop the request chain and send a response immediately.

---

## 2. Built-in Gin Middleware

When you create your Gin router with `gin.Default()`, it automatically includes two essential middleware:

-   **`gin.Logger()`**: Prints API requests to the console, including method, path, status, latency, etc.
-   **`gin.Recovery()`**: Recovers from any panics that occur during request processing and returns a 500 HTTP response. This prevents your server from crashing.

Other useful built-in middleware includes `gin.BasicAuth()` for HTTP Basic Authentication.

---

## 3. Creating Custom Middleware

A custom middleware function typically returns a `gin.HandlerFunc`.

```go
package main

import (
    "fmt"
    "log"
    "net/http"
    "time"

    "github.com/gin-gonic/gin"
)

// RequestLogger middleware logs details about each request.
func RequestLogger() gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now() // Start timer

        // Process the request (call the next handler/middleware)
        c.Next()

        // After the request is processed, log details
        duration := time.Since(start)
        log.Printf("Method: %s | Path: %s | Status: %d | Duration: %v\n",
            c.Request.Method, c.Request.URL.Path, c.Writer.Status(), duration)
    }
}

// AuthRequired middleware checks for a valid API key.
func AuthRequired() gin.HandlerFunc {
    return func(c *gin.Context) {
        apiKey := c.GetHeader("X-API-KEY")
        if apiKey != "your-secret-api-key" {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: Invalid API Key"})
            return // Stop further processing
        }
        // If authentication passes, continue to the next handler
        c.Next()
    }
}

func main() {
    router := gin.New() // Use gin.New() to start without default Logger/Recovery
    
    // Apply our custom logger middleware globally
    router.Use(RequestLogger())
    router.Use(gin.Recovery()) // Add recovery explicitly if using gin.New()

    // Protected route
    router.GET("/protected", AuthRequired(), func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{"message": "Welcome to the protected area!"})
    })

    // Public route
    router.GET("/public", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{"message": "This is a public endpoint."})
    })

    router.Run(":8080")
}
```
To test `AuthRequired`:
```bash
# Public:
curl http://localhost:8080/public

# Protected (Unauthorized):
curl http://localhost:8080/protected

# Protected (Authorized):
curl -H "X-API-KEY: your-secret-api-key" http://localhost:8080/protected
```

---

## 4. Applying Middleware

You can apply middleware at different scopes:

### A. Globally
To apply middleware to all routes in your application:
```go
router.Use(RequestLogger(), AuthRequired())
```

### B. Per Route
To apply middleware to a specific route:
```go
router.GET("/specific-protected", AuthRequired(), func(c *gin.Context) {
    c.JSON(http.StatusOK, gin.H{"message": "This route is specifically protected."})
})
```

### C. To Route Groups
To apply middleware to a group of routes (e.g., all routes under `/api/v1`):
```go
apiV1 := router.Group("/api/v1")
apiV1.Use(AuthRequired()) // All routes in this group will use AuthRequired
{
    apiV1.GET("/users", func(c *gin.Context) { /* ... */ })
    apiV1.POST("/posts", func(c *gin.Context) { /* ... */ })
}
```

---

## 5. Passing Data with `gin.Context`

The `*gin.Context` object is request-scoped and allows you to store and retrieve data that can be accessed by subsequent middleware or the final handler.

```go
func UserIDMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // Assume you've authenticated and retrieved the user ID
        userID := "user-123" 
        c.Set("userID", userID) // Store the user ID in the context
        c.Next()
    }
}

router.GET("/me", UserIDMiddleware(), func(c *gin.Context) {
    userID, exists := c.Get("userID") // Retrieve the user ID from the context
    if !exists {
        c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "User ID not found in context"})
        return
    }
    c.JSON(http.StatusOK, gin.H{"message": "Your user ID is", "id": userID})
})
```
Middleware is a powerful tool for abstracting common logic, leading to cleaner, more maintainable, and modular API code.
