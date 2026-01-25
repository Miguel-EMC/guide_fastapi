# 20 - Project Structure and Best Practices

While Go is flexible and doesn't enforce a strict project structure like some frameworks, several community-driven patterns have emerged to help organize projects for clarity, scalability, and maintainability. This guide outlines these common layouts and best practices.

---

## 1. The Standard Go Project Layout

A widely recognized (though not official) template is the **Standard Go Project Layout**. It's a good starting point for larger projects, but can be overkill for small applications.

-   **GitHub**: [https://github.com/golang-standards/project-layout](https://github.com/golang-standards/project-layout)

### Key Directories
-   **/cmd**: Contains the `main` packages for your application's executables. For a web API, you'd typically have a directory like `cmd/api/main.go`.
-   **/internal**: Private application and library code. This is the most important directory. Code in here can only be imported by code within the same parent directory (e.g., code in `cmd/api/` can import from `internal/`). It enforces that your application's internal logic is not imported by other projects.
-   **/pkg**: Public library code that's okay to be used by external applications. If you're not planning for others to import your code, you may not need this directory. Start with `internal` and move code to `pkg` only when necessary.
-   **/api**: Contains API definition files, such as OpenAPI/Swagger specs, JSON schemas, etc.
-   **/configs**: Configuration file templates.
-   **/build**: Build scripts, Dockerfiles, etc.

---

## 2. A Practical Backend Structure (Domain-Oriented)

For many backend APIs, organizing code by **business domain** (or feature) within the `internal` directory is a highly effective pattern.

```
/
├── go.mod
├── cmd/
│   └── api/                  // Application entry point
│       └── main.go
└── internal/
    ├── auth/                 // "Auth" domain
    │   ├── handler.go        // HTTP handlers for auth
    │   ├── service.go        // Business logic for auth
    │   └── repository.go     // Database interactions for auth
    ├── user/                 // "User" domain
    │   ├── handler.go
    │   ├── model.go
    │   └── repository.go
    └── server/               // Server setup
        └── http.go           // HTTP server initialization, routing
```
In this structure:
-   `cmd/api/main.go` is responsible for setting up configuration, database connections, and starting the HTTP server.
-   `internal/server/http.go` defines the routes and wires them to the handlers.
-   Each domain (e.g., `auth`, `user`) is self-contained.
    -   The `handler` layer interacts with HTTP.
    -   The `service` layer contains the core business logic.
    -   The `repository` layer handles database operations.

---

## 3. Key Best Practices

### A. Keep it Simple
Don't start with a complex structure. For a small service, a single `main.go` file might be enough. As your application grows, refactor and group related code into packages by domain. The "Standard Layout" is a guide, not a strict rule.

### B. Use Interfaces for Decoupling
Interfaces are Go's most powerful tool for decoupling. Define interfaces for your repositories and services. This makes your application easier to test (you can swap real implementations with mocks) and more flexible.

```go
// internal/user/repository.go
package user

type Repository interface {
    GetUserByID(ctx context.Context, id int) (*User, error)
    CreateUser(ctx context.Context, user *User) error
}

// Your handler depends on the interface, not the concrete implementation.
// internal/user/handler.go
type Handler struct {
    UserRepo Repository
}

func (h *Handler) GetUser(c *gin.Context) {
    // ...
}
```

### C. Explicit Error Handling
Embrace `if err != nil`. It makes the control flow clear and forces you to handle errors explicitly.
-   **Wrap errors** to add context: `return fmt.Errorf("repository: failed to get user: %w", err)`
-   Use `errors.Is` and `errors.As` to inspect error chains.

### D. Configuration Management
-   **Use environment variables** for configuration. This follows the 12-Factor App methodology.
-   Read them at startup using `os.Getenv("VAR_NAME")`.
-   You can create a `config` struct and populate it at the beginning of your `main()` function. Avoid accessing `os.Getenv` throughout your application.
-   For complex scenarios, consider a library like `viper`.

### E. Dependency Injection
Pass dependencies (like database connections, repositories, and services) explicitly to the components that need them. This is typically done in your `main.go` function.

```go
// cmd/api/main.go
func main() {
    // 1. Setup config and database connection
    db := setupDatabase()
    
    // 2. Initialize dependencies (repositories)
    userRepo := user.NewSQLRepository(db)
    authRepo := auth.NewSQLRepository(db)

    // 3. Inject repositories into services
    authService := auth.NewService(authRepo, userRepo)
    
    // 4. Inject services into handlers
    authHandler := auth.NewHandler(authService)

    // 5. Setup router and inject handlers
    router := server.SetupRouter(authHandler, ...)
    
    router.Run(":8080")
}
```
This pattern, known as **Dependency Injection**, makes your code highly modular, testable, and easy to reason about. It avoids the use of global variables, which can make applications difficult to maintain.

### F. Use `context.Context`
Pass a `context.Context` as the first argument to any function that makes a database call, an external API call, or performs any I/O. This allows for request cancellation, deadlines, and passing request-scoped data like trace IDs.

By following these patterns, you can build Go applications that are not only performant but also robust, scalable, and a pleasure to work on.