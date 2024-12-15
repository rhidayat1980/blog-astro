---
title: "Channels in Go"
description: "Learn about channels, communication between goroutines, and channel patterns in Go"
publishDate: 2024-12-13
tags: ["golang", "programming", "tutorial", "channels", "concurrency", "advanced"]
draft: false
---

## Channels in Go

Channels are the primary mechanism for communication between goroutines in Go. They provide a way to pass values between goroutines with synchronization built in.

## Channel Basics

### Creating Channels

```go
// Unbuffered channel
ch := make(chan int)

// Buffered channel with capacity 5
bufferedCh := make(chan string, 5)
```

### Sending and Receiving

```go
// Send value to channel
ch <- 42

// Receive value from channel
value := <-ch

// Receive with assignment and check if channel is closed
value, ok := <-ch
if !ok {
    fmt.Println("Channel is closed")
}
```

## Channel Types

### Unbuffered Channels

Synchronous communication - sender blocks until receiver is ready:

```go
func main() {
    ch := make(chan int)
    
    go func() {
        fmt.Println("Sending...")
        ch <- 42 // Blocks until someone receives
        fmt.Println("Sent!")
    }()
    
    time.Sleep(time.Second) // Simulate work
    fmt.Println("Receiving...")
    value := <-ch
    fmt.Printf("Received: %d\n", value)
}
```

### Buffered Channels

Asynchronous communication up to buffer capacity:

```go
func main() {
    ch := make(chan int, 2)
    
    // These won't block because buffer isn't full
    ch <- 1
    ch <- 2
    
    fmt.Println(<-ch) // 1
    fmt.Println(<-ch) // 2
}
```

### Channel Direction

```go
// Send-only channel
func send(ch chan<- int) {
    for i := 0; i < 5; i++ {
        ch <- i
    }
    close(ch)
}

// Receive-only channel
func receive(ch <-chan int) {
    for value := range ch {
        fmt.Println(value)
    }
}

func main() {
    ch := make(chan int)
    go send(ch)
    receive(ch)
}
```

## Channel Operations

### Closing Channels

```go
func main() {
    ch := make(chan int)
    
    go func() {
        for i := 0; i < 5; i++ {
            ch <- i
        }
        close(ch) // Signal that no more values will be sent
    }()
    
    // Range over channel until it's closed
    for value := range ch {
        fmt.Println(value)
    }
}
```

### Select Statement

Handle multiple channel operations:

```go
func main() {
    ch1 := make(chan string)
    ch2 := make(chan string)
    done := make(chan bool)
    
    go func() {
        for {
            select {
            case ch1 <- "Every 500ms":
                time.Sleep(500 * time.Millisecond)
            case ch2 <- "Every second":
                time.Sleep(time.Second)
            case <-done:
                return
            }
        }
    }()
    
    go func() {
        for {
            select {
            case msg1 := <-ch1:
                fmt.Println(msg1)
            case msg2 := <-ch2:
                fmt.Println(msg2)
            case <-time.After(2 * time.Second):
                done <- true
                return
            }
        }
    }()
    
    <-done
}
```

## Channel Patterns

### Pipeline Pattern

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

func main() {
    // Set up pipeline
    numbers := generator(1, 2, 3, 4)
    squares := square(numbers)
    
    // Consume the output
    for result := range squares {
        fmt.Println(result)
    }
}
```

### Fan-out, Fan-in Pattern

```go
func fanOut(ch <-chan int, n int) []<-chan int {
    outputs := make([]<-chan int, n)
    for i := 0; i < n; i++ {
        outputs[i] = square(ch)
    }
    return outputs
}

func fanIn(channels ...<-chan int) <-chan int {
    var wg sync.WaitGroup
    multiplexed := make(chan int)
    
    wg.Add(len(channels))
    for _, ch := range channels {
        go func(ch <-chan int) {
            for value := range ch {
                multiplexed <- value
            }
            wg.Done()
        }(ch)
    }
    
    go func() {
        wg.Wait()
        close(multiplexed)
    }()
    
    return multiplexed
}
```

### Timeout Pattern

```go
func doWork(done <-chan bool) <-chan int {
    results := make(chan int)
    go func() {
        defer close(results)
        
        for i := 0; i < 5; i++ {
            select {
            case <-done:
                return
            case results <- i:
                time.Sleep(time.Second)
            }
        }
    }()
    return results
}

func main() {
    done := make(chan bool)
    results := doWork(done)
    
    for {
        select {
        case result, ok := <-results:
            if !ok {
                return
            }
            fmt.Println(result)
        case <-time.After(500 * time.Millisecond):
            fmt.Println("Timeout!")
            close(done)
            return
        }
    }
}
```

## Best Practices

1. Use channels for communication, not synchronization
2. Document channel ownership
3. Close channels only from the sender side
4. Handle "done" channels for cancellation
5. Use buffered channels when appropriate
6. Always handle channel closure

## Practical Example

Here's a complete example demonstrating various channel concepts:

```go
package main

import (
    "fmt"
    "math/rand"
    "sync"
    "time"
)

// Job represents work to be done
type Job struct {
    ID       int
    Duration time.Duration
}

// Result represents the output of a job
type Result struct {
    JobID  int
    Value  int
    Worker int
}

// Worker processes jobs
func worker(id int, jobs <-chan Job, results chan<- Result, done <-chan bool) {
    for {
        select {
        case job, ok := <-jobs:
            if !ok {
                return
            }
            // Simulate work
            time.Sleep(job.Duration)
            results <- Result{
                JobID:  job.ID,
                Value:  rand.Intn(100),
                Worker: id,
            }
        case <-done:
            return
        }
    }
}

// Generator creates jobs
func generator(done <-chan bool) <-chan Job {
    jobs := make(chan Job)
    go func() {
        defer close(jobs)
        for i := 1; ; i++ {
            select {
            case <-done:
                return
            case jobs <- Job{
                ID:       i,
                Duration: time.Duration(rand.Intn(1000)) * time.Millisecond,
            }:
            }
        }
    }()
    return jobs
}

func main() {
    // Set up channels
    const numWorkers = 3
    done := make(chan bool)
    jobs := generator(done)
    results := make(chan Result, numWorkers)
    
    // Start workers
    var wg sync.WaitGroup
    for i := 1; i <= numWorkers; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            worker(id, jobs, results, done)
        }(i)
    }
    
    // Collect results for 5 seconds
    go func() {
        time.Sleep(5 * time.Second)
        close(done)
    }()
    
    // Process results
    go func() {
        wg.Wait()
        close(results)
    }()
    
    // Print results as they arrive
    for result := range results {
        fmt.Printf("Job %d completed by worker %d with value %d\n",
            result.JobID, result.Worker, result.Value)
    }
    
    fmt.Println("All done!")
}
```

In the next post, we'll explore Error Handling in Go!
