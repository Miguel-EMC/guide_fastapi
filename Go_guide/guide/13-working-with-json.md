# 13 - Working with JSON

JSON (JavaScript Object Notation) is the de facto standard for data interchange in modern web APIs. Go's standard library provides robust support for encoding and decoding JSON data through the `encoding/json` package. This guide will cover how to convert Go data structures to JSON (marshalling) and JSON data back to Go data structures (unmarshalling).

---

## 1. Marshalling (Go Struct to JSON)

**Marshalling** is the process of converting a Go data structure (like a struct or map) into a JSON byte slice. You use the `json.Marshal()` function for this.

```go
package main

import (
    "encoding/json"
    "fmt"
    "log"
)

// Define a struct. Fields must be capitalized to be exported and thus marshallable.
type Product struct {
    ID       int     `json:"id"`        // Custom JSON field name
    Name     string  `json:"name"`
    Price    float64 `json:"price,omitempty"` // Omit if zero value (0.0 for float64)
    Category string  `json:"category"`
    InternalCode string `json:"-"`        // Ignore this field in JSON
}

func main() {
    p := Product{
        ID:          1,
        Name:        "Laptop",
        Price:       1200.50,
        Category:    "Electronics",
        InternalCode: "ABC-123",
    }

    // Marshal the struct into a JSON byte slice
    jsonData, err := json.Marshal(p)
    if err != nil {
        log.Fatalf("Error marshalling to JSON: %v", err)
    }

    fmt.Println(string(jsonData))
    // Output: {"id":1,"name":"Laptop","price":1200.5,"category":"Electronics"}
    // Notice Price is included, but InternalCode is ignored.
    // If p.Price was 0.0, it would be omitted due to "omitempty".

    // If Price was 0.0 and omitempty was used:
    p2 := Product{ID: 2, Name: "Mouse", Category: "Accessories"}
    jsonData2, _ := json.Marshal(p2)
    fmt.Println(string(jsonData2))
    // Output: {"id":2,"name":"Mouse","category":"Accessories"}
}
```

### Struct Field Tags (`json:"..."`)
-   `json:"fieldName"`: Specifies the key name in the JSON output.
-   `json:"fieldName,omitempty"`: The field will be omitted from the JSON if its value is the type's zero value (e.g., `0` for `int`, `""` for `string`, `false` for `bool`, `nil` for pointers/slices/maps).
-   `json:"-"`: The field will be completely ignored during marshalling and unmarshalling.

---

## 2. Unmarshalling (JSON to Go Struct)

**Unmarshalling** is the process of converting a JSON byte slice into a Go data structure. You use the `json.Unmarshal()` function.

```go
package main

import (
    "encoding/json"
    "fmt"
    "log"
)
// Product struct as defined above
type Product struct {
    ID          int     `json:"id"`
    Name        string  `json:"name"`
    Price       float64 `json:"price,omitempty"`
    Category    string  `json:"category"`
    InternalCode string `json:"-"`
}

func main() {
    jsonInput := []byte(`{"id":101,"name":"Keyboard","price":75.00,"category":"Peripherals"}`)
    
    var p Product
    err := json.Unmarshal(jsonInput, &p) // Pass a pointer to the struct
    if err != nil {
        log.Fatalf("Error unmarshalling JSON: %v", err)
    }

    fmt.Printf("Product: %+v\n", p)
    // Output: Product: {ID:101 Name:Keyboard Price:75 Category:Peripherals InternalCode:}
    // InternalCode remains its zero value because it was ignored.
}
```

### Working with Arbitrary JSON
If you don't know the structure of the incoming JSON or it's highly dynamic, you can unmarshal it into a `map[string]interface{}`.

```go
var genericData map[string]interface{}
jsonInput := []byte(`{"status":"success", "data":{"count":5,"items":["apple","banana"]}}`)

err := json.Unmarshal(jsonInput, &genericData)
if err != nil {
    log.Fatalf("Error unmarshalling generic JSON: %v", err)
}

fmt.Println(genericData)
// Output: map[data:map[count:5 items:[apple banana]] status:success]

// Accessing values (requires type assertion)
status := genericData["status"].(string)
fmt.Println("Status:", status) // Output: Status: success
```

---

## 3. Streaming Encoders and Decoders

For working with HTTP request bodies and response writers, or large files, it's more efficient to use streaming encoders and decoders (`json.NewEncoder` and `json.NewDecoder`). They read/write directly from/to `io.Reader` and `io.Writer` interfaces.

### Decoding Request Body
```go
package main

import (
    "encoding/json"
    "fmt"
    "log"
    "net/http"
)

type User struct {
    Name  string `json:"name"`
    Email string `json:"email"`
}

func createUser(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }

    var newUser User
    // Decode JSON directly from the request body
    err := json.NewDecoder(r.Body).Decode(&newUser)
    if err != nil {
        http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
        return
    }

    fmt.Printf("Created User: Name=%s, Email=%s\n", newUser.Name, newUser.Email)
    w.WriteHeader(http.StatusCreated) // 201 Created
    fmt.Fprint(w, "User created successfully")
}

func main() {
    http.HandleFunc("/users", createUser)
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

### Encoding Response Body
```go
// ... inside a handler function
func getUser(w http.ResponseWriter, r *http.Request) {
    user := User{Name: "Alice", Email: "alice@example.com"}

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)

    // Encode struct directly to the response writer
    err := json.NewEncoder(w).Encode(user)
    if err != nil {
        log.Printf("Error encoding response: %v", err)
        http.Error(w, "Error sending response", http.StatusInternalServerError)
    }
}
```

By effectively using the `encoding/json` package, you can reliably send and receive data in your Go backend APIs.
