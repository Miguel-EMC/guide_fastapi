# 09 - Interfaces

Interfaces are a powerful concept in Go that allow you to define behavior. An interface is a type that specifies a set of method signatures. A type "satisfies" an interface if it defines all the methods in that interface.

Go's approach is unique because the implementation is **implicit**. There is no `implements` keyword. If a type has the methods an interface requires, it automatically satisfies that interface. This promotes a flexible, decoupled architecture.

---

## 1. Defining an Interface

An interface is defined using the `type` keyword, followed by the interface name and the `interface` keyword, with a set of method signatures inside.

```go
package main

import "fmt"
import "math"

// Define a Shape interface
type Shape interface {
    Area() float64
}

// Define a Rectangle struct
type Rectangle struct {
    Width, Height float64
}

// Define a Circle struct
type Circle struct {
    Radius float64
}

// Rectangle implements the Shape interface because it has an Area() method.
func (r Rectangle) Area() float64 {
    return r.Width * r.Height
}

// Circle also implements the Shape interface.
func (c Circle) Area() float64 {
    return math.Pi * c.Radius * c.Radius
}

// This function can accept any type that satisfies the Shape interface.
func printShapeArea(s Shape) {
    fmt.Printf("The area of the shape is %0.2f\n", s.Area())
}

func main() {
    rect := Rectangle{Width: 10, Height: 5}
    circ := Circle{Radius: 7}

    // We can pass both Rectangle and Circle to the same function
    // because they both satisfy the Shape interface.
    printShapeArea(rect)  // Output: The area of the shape is 50.00
    printShapeArea(circ)  // Output: The area of the shape is 153.94
}
```

This "if it walks like a duck and quacks like a duck, it is a duck" philosophy makes Go's interfaces incredibly flexible.

---

## 2. Common Standard Library Interfaces

Many of Go's standard library packages are built around interfaces. Two of the most famous are:

### `io.Writer`
The `io.Writer` interface is used by any type that can be written to.

```go
type Writer interface {
    Write(p []byte) (n int, err error)
}
```
Types like `os.File`, `bytes.Buffer`, and even an HTTP response writer satisfy this interface. This means you can write a function that takes an `io.Writer` and it will be able to write to a file, a memory buffer, or an HTTP response without changing its code.

### `fmt.Stringer`
The `fmt.Stringer` interface is used for types that can represent themselves as a string.

```go
type Stringer interface {
    String() string
}
```
If you define a `String()` method on your struct, `fmt.Println` and other `fmt` functions will use it to print your struct.

```go
type User struct {
    Name string
    Age int
}

func (u User) String() string {
    return fmt.Sprintf("%s (%d years old)", u.Name, u.Age)
}

func main() {
    user := User{Name: "Alice", Age: 30}
    fmt.Println(user) // Output: Alice (30 years old)
}
```

---

## 3. The Empty Interface: `interface{}`

An interface that specifies zero methods is known as the **empty interface**, written as `interface{}`.

Since any type has zero or more methods, an empty interface can hold a value of **any type**.

```go
package main

import "fmt"

func describe(i interface{}) {
    fmt.Printf("Value: %v, Type: %T\n", i, i)
}

func main() {
    describe(42)          // Output: Value: 42, Type: int
    describe("hello")     // Output: Value: hello, Type: string
    describe(true)        // Output: Value: true, Type: bool
}
```
**Warning**: While powerful, the empty interface should be used with caution. It effectively bypasses Go's static type safety. You lose the ability to know what type of data you're working with at compile time.

---

## 4. Type Assertions and Type Switches

When you have a value stored in an empty interface, you often need to get its underlying concrete type back. This is done with **type assertions**.

### Type Assertion
A type assertion takes an interface value and extracts from it a value of the specified explicit type.

```go
var i interface{} = "hello"

s := i.(string) // Assert that i holds a string
fmt.Println(s) // Output: hello

// This would panic, because i does not hold an int
// n := i.(int) 
```

### The "Comma, ok" Idiom
To test whether an interface value holds a specific type without causing a panic, use a two-value assignment.

```go
var i interface{} = "hello"

s, ok := i.(string)
if ok {
    fmt.Println("It's a string:", s)
} else {
    fmt.Println("It's not a string.")
}

n, ok := i.(int)
if ok {
    fmt.Println("It's an int:", n)
} else {
    fmt.Println("It's not an int.") // This will be executed
}
```

### Type Switch
A type switch is like a regular switch statement, but it compares types instead of values. It's a clean way to handle an interface that could hold several possible types.

```go
package main

import "fmt"

func do(i interface{}) {
    switch v := i.(type) {
    case int:
        fmt.Printf("Twice %d is %d\n", v, v*2)
    case string:
        fmt.Printf("%q is %d bytes long\n", v, len(v))
    default:
        fmt.Printf("I don't know about type %T!\n", v)
    }
}

func main() {
    do(21)      // Output: Twice 21 is 42
    do("hello") // Output: "hello" is 5 bytes long
    do(true)    // Output: I don't know about type bool!
}
```
Interfaces are a cornerstone of Go's design, enabling the creation of flexible, extensible, and testable systems.
