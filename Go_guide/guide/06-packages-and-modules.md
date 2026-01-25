# 06 - Packages and Modules

Organizing your code and managing external dependencies are crucial aspects of software development. Go uses **packages** for code organization and **modules** for dependency management. Understanding these concepts is fundamental to building any non-trivial Go application.

---

## 1. Packages: Code Organization

A Go program is made up of packages. A package is a collection of source files in the same directory that are compiled together.

### A. The `package` Keyword
Every Go source file must belong to a package. The `package` keyword specifies the package name.

-   **`package main`**: This is a special package that defines a standalone executable program. The `main` package must contain a `main()` function, which is the entry point of the program.
-   **Named Packages**: All other packages are library packages. Their name should typically be the same as the directory they reside in.

### B. Creating a Custom Package
Let's create a simple utility package.

1.  **Create a directory for your package**:
    ```bash
    # Assuming you are in your Go_guide/guide/ directory
    mkdir mypackage
    cd mypackage
    touch mathutils.go
    ```
2.  **Define the package and add functions**:
    ```go
    // mypackage/mathutils.go
    package mypackage // Package name is 'mypackage'

    // Add returns the sum of two integers.
    func Add(a, b int) int {
        return a + b
    }

    // subtract returns the difference of two integers. (Not exported)
    func subtract(a, b int) int {
        return a - b
    }
    ```

### C. Exported vs. Unexported Names
In Go, visibility is controlled by the case of the first letter of an identifier (function name, variable name, struct field, etc.):

-   **Exported (Public)**: If an identifier starts with an **uppercase** letter, it is exported and can be accessed from outside its package. (e.g., `Add`).
-   **Unexported (Private)**: If an identifier starts with a **lowercase** letter, it is unexported and can only be accessed from within the same package. (e.g., `subtract`).

### D. Importing Packages
To use functions or types from another package, you must `import` it.

```go
// my_app/main.go (assuming my_app is your main module)
package main

import (
    "fmt"
    "example.com/my_app/mypackage" // Import your custom package
    // "mypackage" if it's within the same module hierarchy
)

func main() {
    result := mypackage.Add(5, 3) // Access the exported Add function
    fmt.Println("Sum:", result) // Output: Sum: 8
    // mypackage.subtract(5,3) // This would cause a compile-time error
}
```
The import path is typically the module path followed by the directory containing the package.

---

## 2. Go Modules: Dependency Management

Go Modules are Go's dependency management system. A module is a collection of related Go packages.

### A. The `go.mod` File
The `go.mod` file defines a module. It contains:
-   `module path`: The module's identity (e.g., `github.com/yourusername/yourproject`).
-   `go version`: The minimum Go version required.
-   `require` directives: List of direct and indirect dependencies.
-   `replace` directives: (Optional) Used to replace a dependency with a local path or a different version.

### B. Initializing a New Module
When you start a new Go project, navigate to its root directory and initialize a module:
```bash
go mod init example.com/my_app
```
This creates the `go.mod` file.

### C. Adding and Updating Dependencies (`go get`)
When you `import` a new package in your code that is not part of the standard library, Go will automatically download it the next time you run `go build` or `go run`.
Alternatively, you can explicitly add a dependency:

```bash
go get github.com/gin-gonic/gin@v1.9.1 // Get a specific version
go get github.com/gin-gonic/gin       // Get the latest compatible version
```
This command adds the dependency to your `go.mod` file and downloads it to your module cache.

### D. Cleaning Up Dependencies (`go mod tidy`)
The `go mod tidy` command adds any missing module requirements to `go.mod` and removes unused module requirements. It ensures your `go.mod` file is accurate and reflects the actual dependencies used by your code.

```bash
go mod tidy
```

### E. Workspace Mode (`go work`)
For projects involving multiple Go modules (e.g., a monorepo with several microservices, each as its own module), Go 1.18 introduced **Workspaces**.

-   **`go work init`**: Creates a `go.work` file.
-   **`go work use ./moduleA ./moduleB`**: Adds existing modules to the workspace.

This allows you to work across multiple modules locally without needing `replace` directives in each `go.mod` file. The `go.work` file tells Go's tools how to find all the modules you're developing locally.

Packages and modules are foundational for building maintainable and scalable Go applications, allowing for clear separation of concerns and efficient dependency management. In the next guide, we'll delve into Go's data structures: arrays, slices, and maps.