# 14 - Connecting to a Database with `database/sql`

Nearly every backend application needs to interact with a database. Go provides a clean, generic SQL interface through the built-in `database/sql` package. This package provides a standard way to work with SQL databases, but it doesn't provide a database driver itself. To connect to a specific database, you need to import a third-party driver.

---

## 1. Installing a Database Driver

You need to choose and install a driver for your specific database. For this guide, we'll use the popular `lib/pq` driver for PostgreSQL.

1.  **Add the driver dependency** to your project:
    ```bash
    go get github.com/lib/pq
    ```
2.  **Import the driver** in your Go code. You typically import the driver with a blank identifier (`_`) because you only need to run its initialization code, which registers it with the `database/sql` package. You won't be calling any functions from the driver directly.

    ```go
    import (
        "database/sql"
        _ "github.com/lib/pq" // The PostgreSQL driver
    )
    ```

---

## 2. Connecting to the Database

You connect to a database using `sql.Open`. This function returns a `*sql.DB` object, which represents a pool of database connections.

```go
package main

import (
    "database/sql"
    "fmt"
    "log"

    _ "github.com/lib/pq"
)

const (
    host     = "localhost"
    port     = 5432
    user     = "postgres"
    password = "yourpassword"
    dbname   = "yourdb"
)

func main() {
    // Create the connection string
    psqlInfo := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
        host, port, user, password, dbname)

    // Open a connection pool
    db, err := sql.Open("postgres", psqlInfo)
    if err != nil {
        log.Fatalf("Error opening database: %v", err)
    }
    // Ensure the connection is closed when the main function exits
    defer db.Close()

    // Verify the connection is alive
    err = db.Ping()
    if err != nil {
        log.Fatalf("Error connecting to database: %v", err)
    }

    fmt.Println("Successfully connected to the database!")
    // ... you can now use 'db' to run queries
}
```

---

## 3. Querying for Data (SELECT)

### Querying a Single Row (`QueryRow`)
Use `QueryRow` when you expect exactly one result.

```go
type User struct {
    ID    int
    Name  string
    Email string
}

var user User
err := db.QueryRow("SELECT id, name, email FROM users WHERE id = $1", 1).Scan(&user.ID, &user.Name, &user.Email)
if err != nil {
    if err == sql.ErrNoRows {
        // Handle case where no user was found
        fmt.Println("User not found")
    } else {
        log.Fatalf("Query failed: %v", err)
    }
}
fmt.Printf("Found user: %+v\n", user)
```
The `.Scan()` method copies the columns from the matched row into the destination variables.

### Querying Multiple Rows (`Query`)
Use `Query` when you expect multiple results.

```go
rows, err := db.Query("SELECT id, name FROM users WHERE is_active = true")
if err != nil {
    log.Fatalf("Query failed: %v", err)
}
defer rows.Close() // Important to close the rows iterator

var users []User
for rows.Next() {
    var u User
    if err := rows.Scan(&u.ID, &u.Name); err != nil {
        log.Fatalf("Failed to scan row: %v", err)
    }
    users = append(users, u)
}
// Check for errors from iterating over rows
if err := rows.Err(); err != nil {
    log.Fatalf("Error iterating rows: %v", err)
}

fmt.Printf("Found %d active users.\n", len(users))
```

---

## 4. Modifying Data (`INSERT`, `UPDATE`, `DELETE`)

For statements that modify data but don't return rows, use `db.Exec()`.

```go
// Example: INSERT
result, err := db.Exec(
    "INSERT INTO users (name, email) VALUES ($1, $2)",
    "John Doe", "john.doe@example.com",
)
if err != nil {
    log.Fatalf("Insert failed: %v", err)
}

// Get the ID of the newly inserted row
lastInsertID, err := result.LastInsertId()
// Note: LastInsertId() is not supported by all drivers, including lib/pq.
// For PostgreSQL, you would typically use `RETURNING id` in your query.

// Get the number of rows affected
rowsAffected, err := result.RowsAffected()
fmt.Printf("%d row(s) affected.\n", rowsAffected)
```

---

## 5. Prepared Statements

Prepared statements are a way to execute the same statement multiple times with different parameters. They offer better performance and are a crucial defense against **SQL injection attacks**.

```go
stmt, err := db.Prepare("SELECT id, name FROM users WHERE id = $1")
if err != nil {
    log.Fatal(err)
}
defer stmt.Close()

// Execute the prepared statement multiple times
rows, err := stmt.Query(1)
// ... scan rows

rows, err = stmt.Query(2)
// ... scan rows
```

---

## 6. Transactions

Transactions allow you to run a group of statements as a single, atomic unit. If any statement in the group fails, the entire transaction can be rolled back.

```go
// Start a new transaction
tx, err := db.Begin()
if err != nil {
    log.Fatal(err)
}

// Defer a rollback in case of panic or early return
defer tx.Rollback() // The rollback will be ignored if the transaction is committed

// Execute statements within the transaction
_, err = tx.Exec("UPDATE accounts SET balance = balance - 100 WHERE id = 1")
if err != nil {
    log.Fatal(err) // This will trigger the deferred rollback
}

_, err = tx.Exec("UPDATE accounts SET balance = balance + 100 WHERE id = 2")
if err != nil {
    log.Fatal(err) // This will trigger the deferred rollback
}

// If all statements were successful, commit the transaction
if err := tx.Commit(); err != nil {
    log.Fatal(err)
}

fmt.Println("Transaction successful!")
```
This ensures that the money is never "lost" if one of the `UPDATE` statements fails.

Working with `database/sql` directly provides a solid foundation for understanding how Go interacts with databases, even when you later choose to use an ORM or query builder.
