# 10 - Concurrency: Goroutines and Channels

Concurrency is one of Go's most powerful and distinctive features. Instead of using traditional threads and locks, which can be complex and error-prone, Go provides two simple yet powerful primitives for concurrent programming: **goroutines** and **channels**.

Go's philosophy on this topic is:
> *Do not communicate by sharing memory; instead, share memory by communicating.*

---

## 1. Goroutines

A goroutine is a lightweight thread of execution managed by the Go runtime. They are incredibly cheap to create (just a few kilobytes of stack space) and you can easily have thousands or even millions running simultaneously.

### Creating a Goroutine
To start a goroutine, simply use the `go` keyword before a function call. The function will then execute concurrently, in the "background", without blocking the main program flow.

```go
package main

import (
    "fmt"
    "time"
)

func say(s string) {
    for i := 0; i < 3; i++ {
        time.Sleep(100 * time.Millisecond)
        fmt.Println(s)
    }
}

func main() {
    // Start a new goroutine
    go say("world")

    // The main function continues its execution
    say("hello")

    // If we didn't wait, the program might exit before the 'world' goroutine finishes.
    // In a real program, we would use channels or a WaitGroup to synchronize.
    time.Sleep(500 * time.Millisecond)
}
```
In this example, "hello" and "world" will be printed interleaved, showing that they are running concurrently.

---

## 2. Channels

Channels are the pipes that connect concurrent goroutines. They are typed conduits through which you can send and receive values with the `<-` operator.

### Creating and Using Channels
```go
package main

import "fmt"

func main() {
    // Create a new channel of type string
    messages := make(chan string)

    // Start a goroutine that sends a message to the channel
    go func() {
        // Send the value "ping" into the channel
        messages <- "ping"
    }()

    // Receive the value from the channel
    // This is a blocking operation: it will wait until a value is available.
    msg := <-messages
    fmt.Println(msg) // Output: ping
}
```

### Unbuffered Channels (Blocking)
By default, channels are **unbuffered**, meaning they will only accept a send (`ch <- val`) if there is a corresponding receive (`<-ch`) ready to take the value. This provides a powerful way to synchronize goroutines.

### Buffered Channels
You can also create buffered channels, which will accept a limited number of values without a corresponding receiver.

```go
// Create a buffered channel with a capacity of 2
ch := make(chan int, 2)

// Send two values without blocking
ch <- 1
ch <- 2

// Sending a third value would block until a value is received.
// ch <- 3 // This would cause a deadlock in this example.

fmt.Println(<-ch) // Output: 1
fmt.Println(<-ch) // Output: 2
```

---

## 3. The `select` Statement

The `select` statement lets a goroutine wait on multiple channel operations. It's like a `switch` statement, but for channels.

-   A `select` blocks until one of its cases can run.
-   It chooses one at random if multiple are ready.

```go
package main

import "time"
import "fmt"

func main() {
    c1 := make(chan string)
    c2 := make(chan string)

    go func() {
        time.Sleep(1 * time.Second)
        c1 <- "one"
    }()
    go func() {
        time.Sleep(2 * time.Second)
        c2 <- "two"
    }()

    // Wait for a result from either c1 or c2
    for i := 0; i < 2; i++ {
        select {
        case msg1 := <-c1:
            fmt.Println("Received", msg1)
        case msg2 := <-c2:
            fmt.Println("Received", msg2)
        }
    }
}
```

### Timeouts with `select`
A common pattern is to implement timeouts using `select` with `time.After`.

```go
select {
case res := <-c1:
    fmt.Println(res)
case <-time.After(1 * time.Second):
    fmt.Println("timeout 1")
}
```

---

## 4. `sync.WaitGroup`

A `WaitGroup` is a simple but powerful way to wait for a collection of goroutines to finish executing.

1.  **`Add(n)`**: Increment the WaitGroup counter by `n`.
2.  **`Done()`**: Decrement the counter by one (usually called from a `defer` statement in the goroutine).
3.  **`Wait()`**: Block until the counter becomes zero.

```go
package main

import (
    "fmt"
    "sync"
    "time"
)

func worker(id int, wg *sync.WaitGroup) {
    // Decrement the counter when the goroutine completes
    defer wg.Done()

    fmt.Printf("Worker %d starting\n", id)
    time.Sleep(time.Second)
    fmt.Printf("Worker %d done\n", id)
}

func main() {
    var wg sync.WaitGroup

    for i := 1; i <= 3; i++ {
        wg.Add(1) // Increment the counter for each goroutine
        go worker(i, &wg)
    }

    // Block until all goroutines have called wg.Done()
    wg.Wait()
    fmt.Println("All workers finished.")
}
```

---

## 5. Closing Channels and `for range`

The sender can `close` a channel to indicate that no more values will be sent. The receiver can test whether a channel has been closed by assigning a second parameter to the receive expression.

```go
v, ok := <-ch // ok is false if ch is closed and empty.
```

You can also use a `for range` loop to receive values from a channel until it is closed.

```go
// In the sender goroutine
ch := make(chan int, 3)
ch <- 1
ch <- 2
ch <- 3
close(ch) // Close the channel

// In the receiver goroutine
for elem := range ch { // Loop will terminate when the channel is closed
    fmt.Println(elem)
}
```
Concurrency is a vast topic, but Goroutines, Channels, `select`, and `WaitGroup` are the fundamental tools you'll use to build high-performance, concurrent backend systems in Go.