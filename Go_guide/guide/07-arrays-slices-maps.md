# 07 - Arrays, Slices, and Maps

Go provides powerful built-in data structures for managing collections of data. The three most common collection types are arrays, slices, and maps. Understanding their differences and how to use them effectively is crucial for any Go developer.

---

## 1. Arrays

An array is a numbered sequence of elements of a specific, fixed length.

-   **Fixed Size**: The length of an array is part of its type. `[5]int` and `[10]int` are distinct, incompatible types.
-   **Value Type**: When you assign or pass an array to a function, you are copying the entire array.

### Declaration and Initialization
```go
package main

import "fmt"

func main() {
    // Declare an array of 5 integers. It is initialized with zero values (0 for int).
    var a [5]int
    fmt.Println("Array a:", a) // Output: Array a: [0 0 0 0 0]

    // Set a value at an index
    a[4] = 100
    fmt.Println("Set a[4]:", a) // Output: Set a[4]: [0 0 0 0 100]

    // Declare and initialize with a literal
    b := [5]int{1, 2, 3, 4, 5}
    fmt.Println("Array b:", b) // Output: Array b: [1 2 3 4 5]

    // Let the compiler infer the length
    c := [...]int{10, 20, 30}
    fmt.Println("Array c:", c)       // Output: Array c: [10 20 30]
    fmt.Println("Length of c:", len(c)) // Output: Length of c: 3
}
```
**In practice, arrays are rarely used directly in Go.** You will almost always use **slices** instead because of their flexibility.

---

## 2. Slices

A slice is a flexible, dynamic-size view into the elements of an array. They are far more common and powerful than arrays.

-   **Dynamic Size**: The length of a slice can change.
-   **Reference Type**: A slice doesn't store any data itself; it just describes a section of an underlying array. When you pass a slice to a function, you are passing a reference, so changes made inside the function can affect the original slice.

### Creating Slices
```go
package main

import "fmt"

func main() {
    // From a literal (creates an underlying array automatically)
    s1 := []string{"a", "b", "c"}
    fmt.Println("Slice s1:", s1)

    // By "slicing" an existing array or slice
    primes := [6]int{2, 3, 5, 7, 11, 13}
    var s2 []int = primes[1:4] // Includes elements from index 1 up to (but not including) 4
    fmt.Println("Slice s2:", s2)  // Output: Slice s2: [3 5 7]

    // Using the make() function
    // make([]T, length, capacity)
    s3 := make([]int, 5)     // length 5, capacity 5
    fmt.Println("Slice s3:", s3) // Output: Slice s3: [0 0 0 0 0]
    
    s4 := make([]int, 0, 5)  // length 0, capacity 5
    fmt.Println("Slice s4:", s4) // Output: Slice s4: []
}
```

### Length and Capacity
-   **Length (`len()`)**: The number of elements in the slice.
-   **Capacity (`cap()`)**: The number of elements in the underlying array, counting from the first element in the slice.

### The `append()` Function
The `append` function is used to add elements to a slice. It returns a new slice containing the original elements plus the new ones.

```go
s := []int{}
s = append(s, 1)      // s is now [1]
s = append(s, 2, 3)   // s is now [1 2 3]
s = append(s, []int{4, 5}...) // Append another slice
fmt.Println("Appended:", s) // Output: Appended: [1 2 3 4 5]
```
**Important**: If the underlying array has enough capacity, `append` will simply add the new elements. If the capacity is exceeded, `append` will allocate a new, larger array and copy the existing elements over.

### The `for...range` Loop with Slices
```go
numbers := []int{10, 20, 30}
for index, value := range numbers {
    fmt.Printf("Index: %d, Value: %d\n", index, value)
}
```

---

## 3. Maps

A map is an unordered collection of key-value pairs. It's Go's implementation of a hash table.

### Creating Maps
```go
package main

import "fmt"

func main() {
    // Using make()
    m1 := make(map[string]int)

    // Using a literal
    m2 := map[string]string{
        "name": "Go Gopher",
        "lang": "Go",
    }

    fmt.Println("Map m1:", m1) // Output: Map m1: map[]
    fmt.Println("Map m2:", m2) // Output: Map m2: map[lang:Go name:Go Gopher]
}
```

### Map Operations
```go
package main

import "fmt"

func main() {
    m := make(map[string]int)

    // Add or update elements
    m["one"] = 1
    m["two"] = 2
    fmt.Println("Map:", m) // Output: Map: map[one:1 two:2]

    // Get an element
    value1 := m["one"]
    fmt.Println("Value:", value1) // Output: Value: 1

    // Delete an element
    delete(m, "two")
    fmt.Println("Map after delete:", m) // Output: Map after delete: map[one:1]

    // Check for existence ("comma ok" idiom)
    // If "two" is not in the map, 'ok' will be false.
    // 'value2' will be the zero value for the type (0 for int).
    value2, ok := m["two"]
    if ok {
        fmt.Println("Key 'two' exists with value:", value2)
    } else {
        fmt.Println("Key 'two' does not exist.")
    }
}
```

### Iterating Over Maps
```go
colors := map[string]string{"red": "#FF0000", "blue": "#0000FF"}
for key, value := range colors {
    fmt.Printf("Color: %s, Hex: %s\n", key, value)
}
```

Slices and maps are the workhorse data structures in Go, providing the flexibility needed for most backend development tasks.
