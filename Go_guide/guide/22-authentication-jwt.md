# 22 - Authentication with JWT

Most APIs need a way to identify and authenticate users to protect routes and personalize responses. While session-based authentication is common for traditional web apps, modern APIs—especially those consumed by mobile apps or other services—typically use stateless authentication with **JSON Web Tokens (JWT)**.

---

## 1. What is a JWT?

A JWT is a compact, URL-safe standard for representing claims to be transferred between two parties. A JWT is a single string composed of three parts, separated by dots (`.`):

1.  **Header**: Contains metadata about the token, like the signing algorithm used (e.g., HMAC, RSA).
2.  **Payload**: Contains the "claims" or data, such as the user's ID, their roles, and an expiration time for the token.
3.  **Signature**: A cryptographic signature created by hashing the header, payload, and a secret key known only to the server. This ensures that the token has not been tampered with.

The server generates a JWT upon successful login and sends it to the client. The client then includes this JWT in the `Authorization` header of subsequent requests. The server can validate the token's signature without needing to store any session state, making the system **stateless**.

---

## 2. Setting Up a JWT Library

We'll use one of the most popular JWT libraries for Go.

```bash
go get github.com/golang-jwt/jwt/v5
```

---

## 3. Generating a JWT

Let's create a login handler that validates a user (we'll use hardcoded values for this example) and returns a JWT.

```go
package main

import (
    "net/http"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/golang-jwt/jwt/v5"
)

// In a real app, this would be in a secure config file or environment variable
var jwtKey = []byte("my_secret_key")

type LoginRequest struct {
    Username string `json:"username" binding:"required"`
    Password string `json:"password" binding:"required"`
}

func login(c *gin.Context) {
    var req LoginRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
        return
    }

    // In a real app, you would validate the user against a database
    if req.Username != "testuser" || req.Password != "password" {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
        return
    }

    // Set token expiration time
    expirationTime := time.Now().Add(5 * time.Minute)

    // Create the JWT claims, which includes the username and expiry time
    claims := &jwt.RegisteredClaims{
        Subject:   req.Username, // Could also be user ID
        ExpiresAt: jwt.NewNumericDate(expirationTime),
    }

    // Create the token with the claims and sign it with the HS256 algorithm
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

    // Create the JWT string
    tokenString, err := token.SignedString(jwtKey)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not create token"})
        return
    }

    // Finally, send the token to the client
    c.JSON(http.StatusOK, gin.H{"token": tokenString})
}
```

---

## 4. JWT Authentication Middleware

Now, we need a middleware to protect our routes. This middleware will extract the JWT from the `Authorization` header, validate it, and if valid, allow the request to proceed.

```go
func authMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // Get the token from the Authorization header
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header not provided"})
            return
        }

        // The header should be in the format "Bearer <token>"
        tokenString := authHeader[len("Bearer "):]

        // Initialize a new instance of `Claims`
        claims := &jwt.RegisteredClaims{}

        // Parse the JWT string and store the result in `claims`.
        // The function will validate the signature and the expiration time.
        token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
            return jwtKey, nil
        })

        if err != nil {
            if err == jwt.ErrSignatureInvalid {
                c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token signature"})
                return
            }
            c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid token"})
            return
        }
        if !token.Valid {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
            return
        }

        // Store the user subject in the context for the handler to use
        c.Set("username", claims.Subject)

        // Continue to the next handler
        c.Next()
    }
}
```

---

## 5. Putting It All Together

Let's create a protected route and use our middleware.

```go
package main

import (
    // ... other imports
)

// ... LoginRequest struct, jwtKey, login handler, and authMiddleware as defined above

func welcome(c *gin.Context) {
    // Get the username from the context
    username, exists := c.Get("username")
    if !exists {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Username not found in context"})
        return
    }
    
    c.JSON(http.StatusOK, gin.H{"message": "Welcome, " + username.(string) + "!"})
}

func main() {
    router := gin.Default()

    // Public route
    router.POST("/login", login)

    // Protected route group
    protected := router.Group("/api")
    protected.Use(authMiddleware())
    {
        protected.GET("/welcome", welcome)
    }

    router.Run(":8080")
}
```

### Testing with `curl`

1.  **Get the token**:
    ```bash
    TOKEN=$(curl -s -X POST -H "Content-Type: application/json" -d '{"username":"testuser", "password":"password"}' http://localhost:8080/login | jq -r .token)
    ```
    *(Requires `jq` to parse JSON. You can also copy the token manually).*

2.  **Access the protected route**:
    ```bash
    curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/welcome
    # Expected output: {"message":"Welcome, testuser!"}
    ```

3.  **Try without a token**:
    ```bash
    curl http://localhost:8080/api/welcome
    # Expected output: {"error":"Authorization header not provided"}
    ```

This setup provides a robust and stateless authentication system for your Go APIs.