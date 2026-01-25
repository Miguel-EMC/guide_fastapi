# 19 - Testing in Go

Testing is an integral part of software development, ensuring the correctness and reliability of your code. Go has a built-in, lightweight testing framework accessible via the `testing` package and the `go test` command. This guide covers how to write and run various types of tests in Go, with a focus on backend APIs.

---

## 1. Basics of `go test`

-   **Test Files**: Test files must end with `_test.go`. For example, `main_test.go` or `math_test.go`.
-   **Test Functions**: Test functions must begin with the word `Test`, followed by an uppercase letter (e.g., `TestAdd`, `TestGetUserByID`). They take one argument: `t *testing.T`.
-   **Running Tests**:
    -   `go test`: Runs all tests in the current directory.
    -   `go test ./...`: Runs all tests in the current module.
    -   `go test -v`: Runs tests with verbose output.
    -   `go test -run TestMyFunction`: Runs a specific test function.
-   **Helper Methods**: The `*testing.T` object provides methods like `t.Error`, `t.Errorf`, `t.Fatal`, `t.Fatalf` for reporting test failures.

---

## 2. Unit Tests

Unit tests focus on testing small, isolated units of code, such as individual functions or methods.

```go
// math.go
package mathutils

// Add returns the sum of two integers.
func Add(a, b int) int {
    return a + b
}
```

```go
// math_test.go
package mathutils_test // Often a convention to add _test suffix to package name

import (
    "testing"
    "example.com/my_app/mathutils" // Adjust module path
)

func TestAdd(t *testing.T) {
    result := mathutils.Add(2, 3)
    expected := 5

    if result != expected {
        t.Errorf("Add(2, 3) failed, got %d, want %d", result, expected)
    }

    result = mathutils.Add(-1, 1)
    expected = 0
    if result != expected {
        t.Errorf("Add(-1, 1) failed, got %d, want %d", result, expected)
    }
}
```

### Table-Driven Tests
For functions with multiple test cases, table-driven tests are an idiomatic Go way to organize them efficiently.

```go
func TestAddTableDriven(t *testing.T) {
    var tests = []struct {
        name string
        a, b int
        want int
    }{
        {"positive numbers", 2, 3, 5},
        {"negative numbers", -1, -1, -2},
        {"zero", 0, 0, 0},
        {"mixed", -5, 10, 5},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) { // t.Run allows running subtests
            if got := mathutils.Add(tt.a, tt.b); got != tt.want {
                t.Errorf("Add(%d, %d) = %d; want %d", tt.a, tt.b, got, tt.want)
            }
        })
    }
}
```

---

## 3. Testing HTTP Handlers (Feature Tests)

Testing HTTP handlers (controllers) involves making simulated HTTP requests and asserting on the response. Go's `net/http/httptest` package is perfect for this.

```go
// main.go (for context, assume it has a Gin handler)
package main

import (
    "net/http"
    "github.com/gin-gonic/gin"
)

type Book struct {
    ID     int    `json:"id"`
    Title  string `json:"title"`
    Author string `json:"author"`
}

var books = []Book{
    {ID: 1, Title: "Book One", Author: "Author A"},
}

func getBooks(c *gin.Context) {
    c.JSON(http.StatusOK, books)
}

func setupRouter() *gin.Engine {
    router := gin.Default()
    router.GET("/api/books", getBooks)
    return router
}
```

```go
// handlers_test.go
package main_test // Adjust package name as needed

import (
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"

    "github.com/stretchr/testify/assert" // Popular assertion library
    "example.com/my_app" // Import your main package
)

func TestGetBooks(t *testing.T) {
    // 1. Arrange: Setup the router and recorder
    router := main.setupRouter() // Assuming setupRouter() is in main.go
    w := httptest.NewRecorder()
    req, _ := http.NewRequest("GET", "/api/books", nil)

    // 2. Act: Perform the request
    router.ServeHTTP(w, req)

    // 3. Assert: Check the response
    assert.Equal(t, http.StatusOK, w.Code)

    var responseBooks []main.Book // Assuming main.Book is your Book struct
    err := json.Unmarshal(w.Body.Bytes(), &responseBooks)
    assert.NoError(t, err)
    assert.Len(t, responseBooks, 1)
    assert.Equal(t, "Book One", responseBooks[0].Title)
}
```

---

## 4. `TestMain` for Setup and Teardown

For more complex tests that require global setup (e.g., database connection) or teardown, you can use `TestMain`.

```go
package main_test

import (
    "fmt"
    "os"
    "testing"
)

func TestMain(m *testing.M) {
    fmt.Println("Performing global setup...")
    // e.g., Set up a test database connection
    
    // Run all tests
    code := m.Run()

    fmt.Println("Performing global teardown...")
    // e.g., Close the test database connection

    os.Exit(code)
}
```

---

## 5. Mocking/Stubbing (with Interfaces)

When testing a component that interacts with external dependencies (like a database or an external API), you often want to "mock" those dependencies to isolate the component being tested. In Go, this is elegantly done using **interfaces**.

```go
// Define an interface for your repository
type UserRepository interface {
    GetUserByID(id int) (*User, error)
}

// Your actual database implementation
type SQLUserRepository struct { /* db connection */ }
func (repo *SQLUserRepository) GetUserByID(id int) (*User, error) { /* ... */ }

// A mock implementation for testing
type MockUserRepository struct {
    Users map[int]*User
}
func (repo *MockUserRepository) GetUserByID(id int) (*User, error) {
    user, ok := repo.Users[id]
    if !ok {
        return nil, errors.New("user not found")
    }
    return user, nil
}

// Your service that uses the repository
type UserService struct {
    UserRepo UserRepository
}
func (s *UserService) GetUserDetails(id int) (*User, error) {
    return s.UserRepo.GetUserByID(id)
}

// In your test:
func TestGetUserDetails(t *testing.T) {
    mockRepo := &MockUserRepository{
        Users: map[int]*User{
            1: {ID: 1, Name: "Test User"},
        },
    }
    userService := &UserService{UserRepo: mockRepo}

    user, err := userService.GetUserDetails(1)
    assert.NoError(t, err)
    assert.Equal(t, "Test User", user.Name)
}
```
This pattern allows you to swap out real implementations for test doubles, ensuring your tests are fast, reliable, and isolated.