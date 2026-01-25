# 16 - Gin Routing and Validation

Gin significantly simplifies HTTP routing and request data validation compared to the standard `net/http` package. It provides a powerful router that supports parameters, groups, and a robust data binding and validation engine, essential for building robust RESTful APIs.

---

## 1. Basic Routing

Gin's router allows you to register handlers for specific HTTP methods and paths.

```go
package main

import (
    "net/http"
    "github.com/gin-gonic/gin"
)

func main() {
    router := gin.Default()

    // GET requests
    router.GET("/ping", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{"message": "pong"})
    })

    // POST requests
    router.POST("/users", func(c *gin.Context) {
        c.JSON(http.StatusCreated, gin.H{"message": "User created"})
    })

    // PUT requests
    router.PUT("/products", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{"message": "Product updated"})
    })

    // DELETE requests
    router.DELETE("/items", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{"message": "Item deleted"})
    })

    // Handle all HTTP methods for a path
    router.Any("/catchall", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{"message": "Caught by Any method"})
    })

    router.Run(":8080")
}
```

---

## 2. Route Parameters

Gin allows you to define routes with parameters (e.g., to fetch a specific user by ID).

```go
router.GET("/users/:id", func(c *gin.Context) {
    id := c.Param("id") // Get the parameter from the URL path
    c.JSON(http.StatusOK, gin.H{"user_id": id})
})

// Wildcard parameters (e.g., for serving files)
router.GET("/files/*filepath", func(c *gin.Context) {
    filepath := c.Param("filepath")
    c.JSON(http.StatusOK, gin.H{"path": filepath})
})
```

---

## 3. Query String Parameters

You can retrieve query parameters from the URL (e.g., `/search?name=john&age=30`).

```go
router.GET("/search", func(c *gin.Context) {
    name := c.Query("name")             // Get parameter 'name'. Empty string if not present.
    age := c.DefaultQuery("age", "0")   // Get parameter 'age', default to "0" if not present.

    c.JSON(http.StatusOK, gin.H{"name": name, "age": age})
})
```

---

## 4. Grouping Routes

You can group routes to share common middleware or prefixes. This is very useful for organizing your API by versions or modules.

```go
// API version 1 group
v1 := router.Group("/api/v1")
{
    v1.GET("/posts", func(c *gin.Context) { /* ... */ })
    v1.POST("/posts", func(c *gin.Context) { /* ... */ })
    v1.GET("/users", func(c *gin.Context) { /* ... */ })
}

// Another API version group
v2 := router.Group("/api/v2")
{
    v2.GET("/products", func(c *gin.Context) { /* ... */ })
}
```

---

## 5. Data Binding and Validation

Gin uses the `go-playground/validator` package for powerful data validation. You can bind request data (JSON, XML, form-data, query parameters, URI parameters) directly into a Go struct and validate it using `binding` tags.

### A. Binding JSON Request Body

```go
package main

import (
    "net/http"
    "github.com/gin-gonic/gin"
)

// Define a struct for the incoming JSON data
type CreateUserRequest struct {
    Name     string `json:"name" binding:"required,min=3,max=50"`
    Email    string `json:"email" binding:"required,email"`
    Password string `json:"password" binding:"required,min=6"`
    Age      int    `json:"age,omitempty" binding:"omitempty,gte=18"` // Optional, must be >= 18
}

func createUserHandler(c *gin.Context) {
    var req CreateUserRequest
    // c.ShouldBindJSON tries to bind the JSON body into the struct.
    // It returns an error if binding or validation fails.
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // Data is valid, proceed with business logic
    c.JSON(http.StatusCreated, gin.H{"message": "User created successfully", "user": req})
}

func main() {
    router := gin.Default()
    router.POST("/users", createUserHandler)
    router.Run(":8080")
}
```
**Testing with `curl`**:
```bash
# Valid request
curl -X POST -H "Content-Type: application/json" -d '{"name":"Alice","email":"alice@example.com","password":"securepassword","age":25}' http://localhost:8080/users

# Invalid request (missing name, invalid email, age too low)
curl -X POST -H "Content-Type: application/json" -d '{"email":"invalid","password":"short","age":15}' http://localhost:8080/users
```

### B. Common Binding/Validation Tags
-   `binding:"required"`: Field must be present and not its zero value.
-   `binding:"min=X"`, `binding:"max=Y"`: Minimum/maximum length or value.
-   `binding:"email"`, `binding:"url"`, `binding:"numeric"`: Specific format validation.
-   `binding:"omitempty"`: If the field is missing, validation rules are skipped.
-   `binding:"gte=X"`, `binding:"lte=Y"`: Greater than or equal to, less than or equal to.
-   `binding:"oneof=value1 value2"`: Field must be one of the specified values.

### C. Binding Query String to Struct
```go
type UserSearch struct {
    Name  string `form:"name" binding:"omitempty"`
    Email string `form:"email" binding:"omitempty,email"`
    Page  int    `form:"page" binding:"omitempty,min=1"`
}

router.GET("/users/search", func(c *gin.Context) {
    var search UserSearch
    if err := c.ShouldBindQuery(&search); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, gin.H{"message": "Search parameters", "params": search})
})
```
Test with `curl http://localhost:8080/users/search?name=bob&page=2`.

Gin's routing and validation features are powerful tools that simplify the development of robust and secure APIs.