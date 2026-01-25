# 18 - Building a CRUD API with Gin

Now let's apply everything we've learned about Gin to build a practical example: a RESTful API for managing a collection of books. CRUD stands for Create, Read, Update, and Delete, which are the four basic functions of persistent storage.

For simplicity, we will use an in-memory slice to store our data instead of a real database.

---

## 1. Project Setup

Create a new `main.go` file. We'll define our data structure and our "database" (a slice) at the top.

```go
package main

import (
    "net/http"
    "strconv"

    "github.com/gin-gonic/gin"
)

// Book represents data about a book.
type Book struct {
    ID     int    `json:"id"`
    Title  string `json:"title" binding:"required"`
    Author string `json:"author" binding:"required"`
}

// In-memory "database"
var books = []Book{
    {ID: 1, Title: "The Hitchhiker's Guide to the Galaxy", Author: "Douglas Adams"},
    {ID: 2, Title: "Dune", Author: "Frank Herbert"},
    {ID: 3, Title: "1984", Author: "George Orwell"},
}
```

---

## 2. Implementing CRUD Handlers

We'll create a handler function for each CRUD operation.

### A. Get All Books (Read)
This handler will return the entire list of books.

```go
func getBooks(c *gin.Context) {
    c.JSON(http.StatusOK, books)
}
```

### B. Get a Single Book (Read)
This handler will find and return a single book by its ID from the URL parameter.

```go
func getBookByID(c *gin.Context) {
    idStr := c.Param("id")
    id, err := strconv.Atoi(idStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
        return
    }

    for _, b := range books {
        if b.ID == id {
            c.JSON(http.StatusOK, b)
            return
        }
    }

    c.JSON(http.StatusNotFound, gin.H{"error": "Book not found"})
}
```

### C. Create a New Book (Create)
This handler will add a new book to our collection, validating the input.

```go
func createBook(c *gin.Context) {
    var newBook Book

    if err := c.ShouldBindJSON(&newBook); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // Assign a new ID (in a real app, the DB would do this)
    newBook.ID = len(books) + 1
    books = append(books, newBook)

    c.JSON(http.StatusCreated, newBook)
}
```

### D. Update a Book (Update)
This handler will update an existing book's information.

```go
func updateBook(c *gin.Context) {
    idStr := c.Param("id")
    id, err := strconv.Atoi(idStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
        return
    }

    var updatedBook Book
    if err := c.ShouldBindJSON(&updatedBook); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    for i, b := range books {
        if b.ID == id {
            books[i].Title = updatedBook.Title
            books[i].Author = updatedBook.Author
            c.JSON(http.StatusOK, books[i])
            return
        }
    }

    c.JSON(http.StatusNotFound, gin.H{"error": "Book not found"})
}
```

### E. Delete a Book (Delete)
This handler will remove a book from the collection.

```go
func deleteBook(c *gin.Context) {
    idStr := c.Param("id")
    id, err := strconv.Atoi(idStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
        return
    }

    for i, b := range books {
        if b.ID == id {
            // Remove the book from the slice
            books = append(books[:i], books[i+1:]...)
            c.Status(http.StatusNoContent) // 204 No Content
            return
        }
    }

    c.JSON(http.StatusNotFound, gin.H{"error": "Book not found"})
}
```

---

## 3. Putting It All Together in `main.go`

Now we combine our handlers and register the routes in our `main` function.

```go
// main.go

package main

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type Book struct {
	ID     int    `json:"id"`
	Title  string `json:"title" binding:"required"`
	Author string `json:"author" binding:"required"`
}

var books = []Book{
	{ID: 1, Title: "The Hitchhiker's Guide to the Galaxy", Author: "Douglas Adams"},
	{ID: 2, Title: "Dune", Author: "Frank Herbert"},
	{ID: 3, Title: "1984", Author: "George Orwell"},
}

func getBooks(c *gin.Context) { /* ... as defined above ... */ }
func getBookByID(c *gin.Context) { /* ... as defined above ... */ }
func createBook(c *gin.Context) { /* ... as defined above ... */ }
func updateBook(c *gin.Context) { /* ... as defined above ... */ }
func deleteBook(c *gin.Context) { /* ... as defined above ... */ }


func main() {
    router := gin.Default()

    // Group routes under /api
    api := router.Group("/api")
    {
        api.GET("/books", getBooks)
        api.GET("/books/:id", getBookByID)
        api.POST("/books", createBook)
        api.PUT("/books/:id", updateBook)
        api.DELETE("/books/:id", deleteBook)
    }

    router.Run(":8080")
}
```
*(You would copy the handler function bodies from the previous section into the complete `main.go` file)*

---

## 4. Testing with `curl`

You can now run your server (`go run .`) and test your API endpoints:

```bash
# Get all books
curl http://localhost:8080/api/books

# Get book with ID 2
curl http://localhost:8080/api/books/2

# Create a new book
curl -X POST -H "Content-Type: application/json" -d '{"title":"The Lord of the Rings","author":"J.R.R. Tolkien"}' http://localhost:8080/api/books

# Update book with ID 1
curl -X PUT -H "Content-Type: application/json" -d '{"title":"Hitchhiker's Guide","author":"Douglas Adams"}' http://localhost:8080/api/books/1

# Delete book with ID 3
curl -X DELETE http://localhost:8080/api/books/3
```

This simple CRUD API demonstrates the core functionality of Gin for building RESTful services, combining routing, data binding, validation, and JSON responses.