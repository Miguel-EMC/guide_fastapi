# 11 - Building an HTTP Server with `net/http`

Go's standard library provides a robust and efficient HTTP package (`net/http`) that allows you to build web servers and clients without relying on third-party frameworks. Understanding `net/http` is fundamental to Go backend development, as it forms the basis for many web frameworks and microservices.

---

## 1. A Basic "Hello, World!" Server

Let's start by creating a simple HTTP server that responds with "Hello, World!" to any request.

```go
package main

import (
    "fmt"
    "log"
    "net/http"
)

// This is our HTTP handler function. It takes two arguments:
// - w: http.ResponseWriter, used to send the HTTP response back to the client.
// - r: *http.Request, which contains all information about the incoming request.
func helloHandler(w http.ResponseWriter, r *http.Request) {
    // We can use fmt.Fprintf to write a string to the ResponseWriter.
    // The path will be something like "/world" if the URL was "/world".
    fmt.Fprintf(w, "Hello, %s!", r.URL.Path[1:])
}

func main() {
    // http.HandleFunc registers a handler function for the given pattern.
    // "/" matches all requests that don't have a more specific handler.
    http.HandleFunc("/", helloHandler)

    // http.ListenAndServe starts an HTTP server.
    // It takes two arguments:
    // - The address to listen on (e.g., ":8080" means all interfaces on port 8080).
    // - A handler (nil means use the default ServeMux, which is what HandleFunc uses).
    fmt.Println("Server starting on port 8080...")
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

To run this server:
1.  Save the code as `main.go`.
2.  Open your terminal in the same directory.
3.  Run `go run main.go`.
4.  Open your web browser and go to `http://localhost:8080/`. You should see "Hello, !".
5.  Try `http://localhost:8080/go`. You should see "Hello, go!".

---

## 2. The `http.ResponseWriter` Interface

The `http.ResponseWriter` interface is used by an HTTP handler to construct an HTTP response. You use it to write headers and the response body.

```go
package main

import (
    "fmt"
    "log"
    "net/http"
)

func jsonHandler(w http.ResponseWriter, r *http.Request) {
    // Set the Content-Type header to indicate we are sending JSON
    w.Header().Set("Content-Type", "application/json")
    
    // Set the HTTP status code
    w.WriteHeader(http.StatusOK) // 200 OK

    // Write the JSON response body
    jsonResponse := `{"message": "Welcome to the Go API!"}`
    w.Write([]byte(jsonResponse))
}

func main() {
    http.HandleFunc("/api", jsonHandler)
    fmt.Println("JSON API Server starting on port 8080...")
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

---

## 3. The `*http.Request` Struct

The `*http.Request` struct represents the incoming HTTP request. It provides access to various parts of the request, such as the method, URL, headers, and body.

```go
package main

import (
    "encoding/json" // For JSON decoding
    "fmt"
    "io" // For reading request body
    "log"
    "net/http"
)

type User struct {
    Name  string `json:"name"`
    Email string `json:"email"`
}

func userHandler(w http.ResponseWriter, r *http.Request) {
    switch r.Method {
    case "GET":
        // Reading URL query parameters
        userID := r.URL.Query().Get("id")
        fmt.Fprintf(w, "GET request for user ID: %s\n", userID)
    case "POST":
        // Reading request body (e.g., JSON payload)
        body, err := io.ReadAll(r.Body)
        if err != nil {
            http.Error(w, "Error reading request body", http.StatusInternalServerError)
            return
        }
        defer r.Body.Close()

        var user User
        err = json.Unmarshal(body, &user)
        if err != nil {
            http.Error(w, "Error decoding JSON", http.StatusBadRequest)
            return
        }
        fmt.Fprintf(w, "POST request - Received user: Name=%s, Email=%s\n", user.Name, user.Email)
    default:
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
    }
}

func main() {
    http.HandleFunc("/users", userHandler)
    fmt.Println("User API Server starting on port 8080...")
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

You can test the `userHandler` with `curl`:
```bash

# GET request
curl http://localhost:8080/users?id=123

# POST request
curl -X POST -H "Content-Type: application/json" -d '{"name":"Jane Doe", "email":"jane@example.com"}' http://localhost:8080/users
```

---

## 4. Serving Static Files

The `net/http` package also makes it easy to serve static files (like HTML, CSS, JavaScript).

```go
package main

import (
    "fmt"
    "log"
    "net/http"
)

func main() {
    // Create a file server to serve content from the "static" directory.
    // http.Dir(".") means serve from the current directory.
    fs := http.FileServer(http.Dir("static"))

    // http.StripPrefix removes the "/static/" prefix from the URL path
    // before passing it to the file server.
    http.Handle("/static/", http.StripPrefix("/static/", fs))

    fmt.Println("Static file server starting on port 8080...")
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```
Create a `static` directory and put an `index.html` file inside. Then navigate to `http://localhost:8080/static/index.html`.

The `net/http` package is a powerful foundation. While frameworks like Gin build upon it, understanding this core package gives you a deep insight into how Go handles web requests.
