# 04 - Control Flow: Loops and Conditionals

Controlling the flow of execution is fundamental to any programming language. Go provides straightforward constructs for making decisions (conditionals) and repeating actions (loops). Understanding these mechanisms is crucial for building any application logic.

---

## 1. Conditional Statements (`if`, `else if`, `else`)

Go's `if` statements are similar to other languages, but with a few key differences:
-   The condition does not require parentheses.
-   The curly braces `{}` are mandatory, even for single-line statements.

### Basic `if`
```go
package main

import "fmt"

func main() {
    age := 20

    if age >= 18 {
        fmt.Println("You are an adult.")
    }
}
```

### `if` with an Optional Short Statement
You can include a short statement to execute before the condition is evaluated. Any variables declared in this short statement are only scoped to the `if` and `else` blocks.

```go
package main

import "fmt"

func main() {
    if num := 10; num%2 == 0 { // num is only accessible within this if/else block
        fmt.Println(num, "is even")
    } else {
        fmt.Println(num, "is odd")
    }
    // fmt.Println(num) // This would cause a compile-time error: undefined: num
}
```

### `else if` and `else`
```go
package main

import "fmt"

func main() {
    score := 85

    if score >= 90 {
        fmt.Println("Grade: A")
    } else if score >= 80 {
        fmt.Println("Grade: B")
    } else {
        fmt.Println("Grade: C or lower")
    }
}
```

---

## 2. Looping (`for`)

Go is unique in that it only has one looping construct: the `for` loop. However, it can be used in several ways, mimicking `while` loops and infinite loops.

### A. Basic `for` Loop (C-style)
This is the most common form, with an initializer, a condition, and a post-statement.

```go
package main

import "fmt"

func main() {
    for i := 0; i < 5; i++ {
        fmt.Println("Iteration:", i)
    }
}
```

### B. `for` as a `while` Loop
You can omit the init and post-statements, making it behave like a `while` loop.

```go
package main

import "fmt"

func main() {
    sum := 1
    for sum < 10 { // Only a condition
        sum += sum
    }
    fmt.Println(sum) // Output: 16
}
```

### C. Infinite Loop
Omitting all parts of the `for` statement creates an infinite loop. You'll typically use `break` or `return` to exit such loops.

```go
package main

import "fmt"
import "time" // For time.Sleep

func main() {
    counter := 0
    for { // Infinite loop
        fmt.Println("Running...", counter)
        counter++
        if counter == 3 {
            break // Exit the loop
        }
        time.Sleep(time.Second) // Wait for 1 second
    }
    fmt.Println("Loop finished.")
}
```

### D. `for...range` Loop
This form is used to iterate over elements in arrays, slices, maps, strings, and channels. It returns two values: the index/key and the value.

```go
package main

import "fmt"

func main() {
    // Iterate over a slice
    numbers := []int{10, 20, 30}
    for index, value := range numbers {
        fmt.Printf("Index: %d, Value: %d\n", index, value)
    }

    // Iterate over a map
    colors := map[string]string{"red": "#FF0000", "blue": "#0000FF"}
    for key, value := range colors {
        fmt.Printf("Color: %s, Hex: %s\n", key, value)
    }

    // Iterate over a string (returns Unicode code points)
    greeting := "Hello, 世界"
    for index, runeValue := range greeting {
        fmt.Printf("Index: %d, Rune: %c (Unicode: %d)\n", index, runeValue, runeValue)
    }

    // If you only need the value, you can ignore the index using `_`
    for _, value := range numbers {
        fmt.Println("Value:", value)
    }
}
```

---

## 3. `switch` Statements

Go's `switch` statements are more flexible than in many other languages. They can be used with a simple expression or even without a condition.

### A. Basic `switch`
```go
package main

import "fmt"

func main() {
    day := "Monday"

    switch day {
    case "Monday":
        fmt.Println("Start of the week.")
    case "Friday":
        fmt.Println("Almost weekend!")
    default:
        fmt.Println("Mid-week or weekend day.")
    }
}
```
**Important**: Go's `switch` does *not* automatically `fallthrough` to the next `case`. It `break`s automatically after the first match. If you want fallthrough behavior, you must explicitly use the `fallthrough` keyword.

### B. `switch` without a Condition (mimics `if/else if`)
```go
package main

import "fmt"

func main() {
    t := 15 // Current temperature

    switch { // No condition, cases are boolean expressions
    case t < 0:
        fmt.Println("Freezing cold!")
    case t >= 0 && t < 10:
        fmt.Println("Cold.")
    case t >= 10 && t < 20:
        fmt.Println("Mild.")
    default:
        fmt.Println("Warm or hot.")
    }
}
```

### C. Multiple Values in a `case`
```go
package main

import "fmt"

func main() {
    char := 'a'

    switch char {
    case 'a', 'e', 'i', 'o', 'u':
        fmt.Println(string(char), "is a vowel.")
    default:
        fmt.Println(string(char), "is a consonant.")
    }
}
```

Control flow constructs are the backbone of any program, allowing you to build dynamic and responsive logic based on varying inputs and conditions. In the next guide, we will explore functions and error handling in Go.
