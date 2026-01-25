# 03 - Go Basics: Variables, Types, and Structs

Understanding how to declare and use variables, basic data types, and custom data structures (structs) is fundamental to writing any Go program. This guide covers these essential building blocks of the Go language.

---

## 1. Variables

Variables are used to store data. Go provides several ways to declare and initialize them.

### A. Declaration with `var`
You declare a variable using the `var` keyword, followed by the variable name and its type.

```go
package main

import "fmt"

func main() {
    var name string = "Alice" // Explicit type and initial value
    var age int = 30          // Explicit type and initial value
    var isEmployed bool       // Declared, but not initialized (gets zero value)

    fmt.Println(name, age, isEmployed) // Output: Alice 30 false

    // Go will automatically initialize variables to their "zero value" if not given an initial value:
    // int: 0, float: 0.0, bool: false, string: "" (empty string), pointer: nil
}
```

### B. Type Inference
If you provide an initial value, Go can often infer the type of the variable, so you can omit the type declaration.

```go
package main

import "fmt"

func main() {
    var city = "New York" // Go infers type 'string'
    var height = 180      // Go infers type 'int'

    fmt.Printf("City: %s, Type: %T\n", city, city)   // Output: City: New York, Type: string
    fmt.Printf("Height: %d, Type: %T\n", height, height) // Output: Height: 180, Type: int
}
```

### C. Short Variable Declaration (`:=`)
This is the most common way to declare and initialize variables inside functions. The `:=` operator declares and initializes a variable, and Go infers its type.

```go
package main

import "fmt"

func main() {
    country := "USA" // Declares 'country' as a string and assigns "USA"
    population := 330000000 // Declares 'population' as an int and assigns 330,000,000

    fmt.Println(country, population)
}
```
**Important**: The `:=` operator can only be used inside functions. Also, it can only be used to declare *new* variables. If the variable already exists, you must use the `=` assignment operator.

### D. Multiple Variable Declarations
You can declare multiple variables at once.

```go
var x, y int = 10, 20
a, b := "hello", "world"
```

---

## 2. Constants

Constants are immutable values that are known at compile time. They are declared using the `const` keyword.

```go
package main

import "fmt"

const PI = 3.14159
const GREETING string = "Hello"

func main() {
    fmt.Println(PI, GREETING)
}
```
Go's constants are often "untyped", meaning they don't have a fixed type until they are used in an expression. This provides more flexibility.

---

## 3. Basic Data Types

Go has several built-in data types:

-   **Numeric Types**:
    -   `int`, `int8`, `int16`, `int32`, `int64`: Signed integers of various sizes. `int` is typically 32 or 64 bits depending on the system.
    -   `uint`, `uint8`, `uint16`, `uint32`, `uint64`, `uintptr`: Unsigned integers. `byte` is an alias for `uint8`.
    -   `float32`, `float64`: Floating-point numbers.
    -   `complex64`, `complex128`: Complex numbers.
    -   `rune`: An alias for `int32` and represents a Unicode code point.
-   **Boolean Type**: `bool` (can be `true` or `false`).
-   **String Type**: `string` (immutable sequence of bytes).

```go
var age int = 30
var temperature float64 = 25.5
var isActive bool = true
var message string = "Welcome to Go!"

// Raw string literal (multiline strings, no escape sequences)
var html string = `
<html>
    <body>Hello!</body>
</html>`
```

### Type Conversions
Go is a strongly typed language, meaning explicit type conversions are often required. You cannot implicitly convert types.

```go
var i int = 42
var f float64 = float64(i) // Convert int to float64
var u uint = uint(f)       // Convert float64 to uint

fmt.Println(i, f, u) // Output: 42 42 42

// You cannot convert a string directly to an int or vice-versa without using
// packages like strconv.
```

---

## 4. Structs

Structs are user-defined composite data types that group together zero or more named fields. They are similar to classes in object-oriented languages but without inheritance.

```go
package main

import "fmt"

// Define a User struct
type User struct {
    FirstName string
    LastName  string
    Email     string
    Age       int
    IsActive  bool
}

func main() {
    // Create an instance of User
    var user1 User
    user1.FirstName = "John"
    user1.LastName = "Doe"
    user1.Email = "john.doe@example.com"
    user1.Age = 30
    user1.IsActive = true

    fmt.Println(user1) // Output: {John Doe john.doe@example.com 30 true}

    // Struct literal (order matters if field names are omitted, better to name them)
    user2 := User{
        FirstName: "Jane",
        LastName:  "Smith",
        Email:     "jane.smith@example.com",
        Age:       25,
        IsActive:  false,
    }
    fmt.Println(user2.FirstName, user2.Email) // Output: Jane jane.smith@example.com

    // Anonymous struct (used when you need a struct only once)
    person := struct {
        Name string
        City string
    }{
        Name: "Go Gopher",
        City: "GoLand",
    }
    fmt.Println(person.Name, person.City) // Output: Go Gopher GoLand
}
```

### Embedded Structs (Composition)
Go achieves a form of "inheritance" or code reuse through **composition** by embedding one struct within another.

```go
package main

import "fmt"

type Person struct {
    Name string
    Age  int
}

type Employee struct {
    Person     // Embedded Person struct
    EmployeeID string
    Department string
}

func main() {
    emp := Employee{
        Person:     Person{Name: "Alice", Age: 40},
        EmployeeID: "EMP001",
        Department: "Engineering",
    }

    // Access fields of the embedded struct directly
    fmt.Println("Employee Name:", emp.Name) // Output: Employee Name: Alice
    fmt.Println("Employee Age:", emp.Age)   // Output: Employee Age: 40
    fmt.Println("Employee ID:", emp.EmployeeID)
}
```

---

## 5. Methods

In Go, you can define methods on types (including structs). A method is simply a function with a special `receiver` argument.

```go
package main

import "fmt"

type Rectangle struct {
    Width  float64
    Height float64
}

// Method with a value receiver
func (r Rectangle) Area() float64 {
    return r.Width * r.Height
}

// Method with a pointer receiver (to modify the original struct)
func (r *Rectangle) Scale(factor float64) {
    r.Width *= factor
    r.Height *= factor
}

func main() {
    rect := Rectangle{Width: 10, Height: 5}
    fmt.Println("Area:", rect.Area()) // Output: Area: 50

    rect.Scale(2) // Scales the original rect
    fmt.Println("Scaled Area:", rect.Area()) // Output: Scaled Area: 200
}
```
-   **Value Receiver**: The method operates on a copy of the receiver. Changes to the receiver inside the method will not affect the original value.
-   **Pointer Receiver**: The method operates on the original receiver. Changes to the receiver inside the method *will* affect the original value. Use pointer receivers when you need to modify the state of the struct or when the struct is large (to avoid copying).

These basic building blocks are essential for starting your journey in Go. In the next guide, we'll cover control flow.
