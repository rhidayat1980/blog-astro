---
title: "Goroutines and Concurrency in Go"
description: "Learn about goroutines, concurrent programming, and parallelism in Go"
publishDate: 2024-12-13
tags: ["golang", "programming", "tutorial", "goroutines", "concurrency", "advanced"]
draft: false
---

## Goroutines in Go

Goroutines are lightweight threads of execution in Go. They allow you to run functions concurrently with other functions. Goroutines are managed by the Go runtime and are much cheaper than operating system threads.

## Creating Goroutines

To start a goroutine, simply use the `go` keyword before a function call:

```go
func printNumbers() {
    for i := 1; i <= 5; i++ {
        time.Sleep(100 * time.Millisecond)
        fmt.Printf("%d ", i)
    }
}

func main() {
    // Start a goroutine
    go printNumbers()
    
    // Run in main goroutine
    for i := 'a'; i <= 'e'; i++ {
        time.Sleep(100 * time.Millisecond)
        fmt.Printf("%c ", i)
    }
    
    // Wait to see the output
    time.Sleep(time.Second)
}
```

## WaitGroups

WaitGroups are used to wait for a collection of goroutines to finish:

```go
func worker(id int, wg *sync.WaitGroup) {
    defer wg.Done() // Mark this goroutine as done when finished
    
    fmt.Printf("Worker %d starting\n", id)
    time.Sleep(time.Second)
    fmt.Printf("Worker %d done\n", id)
}

func main() {
    var wg sync.WaitGroup
    
    for i := 1; i <= 5; i++ {
        wg.Add(1) // Add a goroutine to wait for
        go worker(i, &wg)
    }
    
    wg.Wait() // Wait for all goroutines to finish
    fmt.Println("All workers completed")
}
```

## Mutex for Shared Resource Access

When multiple goroutines need to access shared resources, use a mutex to prevent race conditions:

```go
type Counter struct {
    mu    sync.Mutex
    value int
}

func (c *Counter) Increment() {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.value++
}

func (c *Counter) Value() int {
    c.mu.Lock()
    defer c.mu.Unlock()
    return c.value
}
```

## Race Conditions

Race conditions occur when multiple goroutines access shared data concurrently. Here's an example:

```go
// BAD: Race condition
func main() {
    counter := 0
    for i := 0; i < 1000; i++ {
        go func() {
            counter++ // Race condition!
        }()
    }
}

// GOOD: Using mutex
func main() {
    var mu sync.Mutex
    counter := 0
    for i := 0; i < 1000; i++ {
        go func() {
            mu.Lock()
            counter++
            mu.Unlock()
        }()
    }
}
```

## Detecting Race Conditions

Go provides a race detector. Run your program with the `-race` flag:

```bash
go run -race main.go
```

## Channels

Channels are the primary mechanism for communication between goroutines:

```go
func main() {
    // Create a channel
    ch := make(chan int)
    
    // Send data in a goroutine
    go func() {
        ch <- 42 // Send value to channel
    }()
    
    value := <-ch // Receive from channel
    fmt.Println(value)
}
```

### Buffered Channels

```go
// Create a buffered channel with capacity 3
ch := make(chan int, 3)

// These won't block
ch <- 1
ch <- 2
ch <- 3

// This would block (buffer full)
// ch <- 4
```

### Channel Direction

```go
// Send-only channel
func send(ch chan<- int) {
    ch <- 42
}

// Receive-only channel
func receive(ch <-chan int) {
    value := <-ch
    fmt.Println(value)
}
```

### Select Statement

Select allows you to wait on multiple channel operations:

```go
func main() {
    ch1 := make(chan string)
    ch2 := make(chan string)
    
    go func() {
        time.Sleep(time.Second)
        ch1 <- "one"
    }()
    
    go func() {
        time.Sleep(2 * time.Second)
        ch2 <- "two"
    }()
    
    for i := 0; i < 2; i++ {
        select {
        case msg1 := <-ch1:
            fmt.Println("Received", msg1)
        case msg2 := <-ch2:
            fmt.Println("Received", msg2)
        case <-time.After(3 * time.Second):
            fmt.Println("Timeout")
        }
    }
}
```

## Common Concurrency Patterns

### Worker Pool

```go
func worker(id int, jobs <-chan int, results chan<- int) {
    for j := range jobs {
        fmt.Printf("worker %d processing job %d\n", id, j)
        time.Sleep(time.Second)
        results <- j * 2
    }
}

func main() {
    jobs := make(chan int, 100)
    results := make(chan int, 100)
    
    // Start workers
    for w := 1; w <= 3; w++ {
        go worker(w, jobs, results)
    }
    
    // Send jobs
    for j := 1; j <= 9; j++ {
        jobs <- j
    }
    close(jobs)
    
    // Collect results
    for a := 1; a <= 9; a++ {
        <-results
    }
}
```

### Fan-out, Fan-in

```go
func generator(nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        for _, n := range nums {
            out <- n
        }
        close(out)
    }()
    return out
}

func square(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        for n := range in {
            out <- n * n
        }
        close(out)
    }()
    return out
}

func merge(cs ...<-chan int) <-chan int {
    var wg sync.WaitGroup
    out := make(chan int)
    
    output := func(c <-chan int) {
        for n := range c {
            out <- n
        }
        wg.Done()
    }
    
    wg.Add(len(cs))
    for _, c := range cs {
        go output(c)
    }
    
    go func() {
        wg.Wait()
        close(out)
    }()
    
    return out
}

func main() {
    in := generator(2, 3, 4, 5, 6)
    
    // Fan out to multiple goroutines
    c1 := square(in)
    c2 := square(in)
    
    // Fan in the results
    for result := range merge(c1, c2) {
        fmt.Println(result)
    }
}
```

## Best Practices

1. Don't create goroutines in libraries
2. When creating a goroutine, know how it will end
3. Check for race conditions
4. Use buffered channels when appropriate
5. Always handle channel closure
6. Use select for timeouts
7. Keep critical sections small

## Practical Example

Here's a complete example demonstrating various concurrency concepts:

```go
package main

import (
    "fmt"
    "sync"
    "time"
)

// Task represents a job to be done
type Task struct {
    ID       int
    Duration time.Duration
}

// Result represents the output of a task
type Result struct {
    TaskID int
    Output string
}

// Worker pool implementation
func worker(id int, tasks <-chan Task, results chan<- Result, wg *sync.WaitGroup) {
    defer wg.Done()
    
    for task := range tasks {
        fmt.Printf("Worker %d starting task %d\n", id, task.ID)
        time.Sleep(task.Duration) // Simulate work
        
        results <- Result{
            TaskID: task.ID,
            Output: fmt.Sprintf("Task %d completed by worker %d", task.ID, id),
        }
    }
}

func main() {
    // Create channels for tasks and results
    tasks := make(chan Task, 10)
    results := make(chan Result, 10)
    
    // Create a wait group for workers
    var wg sync.WaitGroup
    
    // Start workers
    numWorkers := 3
    for i := 1; i <= numWorkers; i++ {
        wg.Add(1)
        go worker(i, tasks, results, &wg)
    }
    
    // Send tasks
    go func() {
        for i := 1; i <= 5; i++ {
            tasks <- Task{
                ID:       i,
                Duration: time.Duration(i) * 100 * time.Millisecond,
            }
        }
        close(tasks) // Close tasks channel when done sending
    }()
    
    // Wait for workers in a separate goroutine
    go func() {
        wg.Wait()
        close(results) // Close results channel when all workers are done
    }()
    
    // Collect results
    for result := range results {
        fmt.Printf("Got result: %s\n", result.Output)
    }
    
    fmt.Println("All tasks completed")
}
```

In the next post, we'll explore Channels in more detail!
