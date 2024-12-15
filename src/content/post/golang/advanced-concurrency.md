---
title: "Advanced Concurrency Patterns in Go"
description: "Learn advanced concurrency patterns, synchronization techniques, and real-world examples in Go"
publishDate: 2024-12-13
tags: ["golang", "programming", "tutorial", "concurrency", "advanced"]
draft: false
---

## Advanced Concurrency Patterns in Go

This guide explores advanced concurrency patterns and real-world examples in Go. We'll cover common patterns and their practical applications.

## Pipeline Pattern

Pipelines allow you to process data through a series of stages:

```go
package main

import (
    "fmt"
    "math"
)

// Stage 1: Generate numbers
func generateNumbers(done <-chan struct{}) <-chan int {
    numbers := make(chan int)
    go func() {
        defer close(numbers)
        for i := 2; i <= 20; i++ {
            select {
            case <-done:
                return
            case numbers <- i:
            }
        }
    }()
    return numbers
}

// Stage 2: Filter prime numbers
func filterPrimes(done <-chan struct{}, input <-chan int) <-chan int {
    primes := make(chan int)
    go func() {
        defer close(primes)
        for num := range input {
            if isPrime(num) {
                select {
                case <-done:
                    return
                case primes <- num:
                }
            }
        }
    }()
    return primes
}

// Stage 3: Square numbers
func square(done <-chan struct{}, input <-chan int) <-chan int {
    squared := make(chan int)
    go func() {
        defer close(squared)
        for num := range input {
            select {
            case <-done:
                return
            case squared <- num * num:
            }
        }
    }()
    return squared
}

// Helper function to check if a number is prime
func isPrime(n int) bool {
    if n <= 1 {
        return false
    }
    for i := 2; i <= int(math.Sqrt(float64(n))); i++ {
        if n%i == 0 {
            return false
        }
    }
    return true
}

func main() {
    // Create done channel for cleanup
    done := make(chan struct{})
    defer close(done)

    // Set up pipeline
    numbers := generateNumbers(done)
    primes := filterPrimes(done, numbers)
    squared := square(done, primes)

    // Print results
    fmt.Println("Squares of prime numbers between 2 and 20:")
    for num := range squared {
        fmt.Printf("%d ", num)
    }
    fmt.Println()
}
```

## Worker Pool with Rate Limiting

This example demonstrates a worker pool that processes tasks with rate limiting:

```go
package main

import (
    "fmt"
    "log"
    "math/rand"
    "sync"
    "time"
)

// Task represents work to be done
type Task struct {
    ID       int
    Duration time.Duration
}

// Result represents the output of processing a task
type Result struct {
    TaskID    int
    WorkerID  int
    StartTime time.Time
    Duration  time.Duration
}

// Worker pool with rate limiting
func worker(
    id int,
    tasks <-chan Task,
    results chan<- Result,
    rateLimiter <-chan time.Time,
    wg *sync.WaitGroup,
) {
    defer wg.Done()

    for task := range tasks {
        // Wait for rate limiter
        <-rateLimiter

        // Process task
        startTime := time.Now()
        log.Printf("Worker %d starting task %d\n", id, task.ID)
        
        // Simulate work
        time.Sleep(task.Duration)
        
        // Send result
        results <- Result{
            TaskID:    task.ID,
            WorkerID:  id,
            StartTime: startTime,
            Duration:  task.Duration,
        }
        
        log.Printf("Worker %d completed task %d\n", id, task.ID)
    }
}

func main() {
    // Configuration
    const (
        numWorkers     = 3
        numTasks       = 10
        rateLimit      = 2 // tasks per second
        maxTaskLength  = 2 * time.Second
    )

    // Create channels
    tasks := make(chan Task, numTasks)
    results := make(chan Result, numTasks)
    rateLimiter := time.Tick(time.Second / time.Duration(rateLimit))

    // Start workers
    var wg sync.WaitGroup
    for i := 1; i <= numWorkers; i++ {
        wg.Add(1)
        go worker(i, tasks, results, rateLimiter, &wg)
    }

    // Send tasks
    go func() {
        for i := 1; i <= numTasks; i++ {
            tasks <- Task{
                ID:       i,
                Duration: time.Duration(rand.Intn(1000)) * time.Millisecond,
            }
        }
        close(tasks)
    }()

    // Wait for workers in a separate goroutine
    go func() {
        wg.Wait()
        close(results)
    }()

    // Collect and print results
    var completedTasks []Result
    for result := range results {
        completedTasks = append(completedTasks, result)
    }

    // Print summary
    fmt.Printf("\nTask Completion Summary:\n")
    fmt.Printf("%-8s %-8s %-20s %-15s\n", "Task ID", "Worker", "Start Time", "Duration")
    fmt.Println(strings.Repeat("-", 60))

    for _, r := range completedTasks {
        fmt.Printf("%-8d %-8d %-20s %-15s\n",
            r.TaskID,
            r.WorkerID,
            r.StartTime.Format("15:04:05.000"),
            r.Duration)
    }
}
```

## Context-Based Cancellation

This example shows how to use context for graceful cancellation:

```go
package main

import (
    "context"
    "fmt"
    "log"
    "sync"
    "time"
)

// Represents a service that performs long-running operations
type Service struct {
    tasks    chan int
    results  chan string
    cancel   context.CancelFunc
    wg       sync.WaitGroup
    shutdown chan struct{}
}

// NewService creates a new service instance
func NewService() *Service {
    return &Service{
        tasks:    make(chan int, 10),
        results:  make(chan string, 10),
        shutdown: make(chan struct{}),
    }
}

// Start initializes the service with the specified number of workers
func (s *Service) Start(numWorkers int) {
    ctx, cancel := context.WithCancel(context.Background())
    s.cancel = cancel

    for i := 1; i <= numWorkers; i++ {
        s.wg.Add(1)
        go s.worker(ctx, i)
    }

    // Monitor results
    go s.monitorResults()
}

// Worker processes tasks
func (s *Service) worker(ctx context.Context, id int) {
    defer s.wg.Done()

    for {
        select {
        case <-ctx.Done():
            log.Printf("Worker %d shutting down\n", id)
            return
        case task, ok := <-s.tasks:
            if !ok {
                return
            }
            // Process task
            result := s.processTask(ctx, id, task)
            if result != "" {
                s.results <- result
            }
        }
    }
}

// ProcessTask simulates task processing
func (s *Service) processTask(ctx context.Context, workerID, taskID int) string {
    log.Printf("Worker %d processing task %d\n", workerID, taskID)

    // Simulate work with potential cancellation
    select {
    case <-ctx.Done():
        log.Printf("Task %d cancelled\n", taskID)
        return ""
    case <-time.After(time.Duration(taskID) * 500 * time.Millisecond):
        return fmt.Sprintf("Task %d completed by worker %d", taskID, workerID)
    }
}

// Monitor and handle results
func (s *Service) monitorResults() {
    for result := range s.results {
        log.Println(result)
    }
    close(s.shutdown)
}

// SubmitTask adds a new task to the service
func (s *Service) SubmitTask(task int) {
    s.tasks <- task
}

// Shutdown gracefully stops the service
func (s *Service) Shutdown() {
    log.Println("Initiating shutdown...")
    
    // Cancel all ongoing operations
    s.cancel()
    
    // Close tasks channel
    close(s.tasks)
    
    // Wait for all workers to finish
    s.wg.Wait()
    
    // Close results channel
    close(s.results)
    
    // Wait for monitor to finish
    <-s.shutdown
    
    log.Println("Shutdown complete")
}

func main() {
    // Create and start service
    service := NewService()
    service.Start(3)

    // Submit some tasks
    for i := 1; i <= 5; i++ {
        service.SubmitTask(i)
    }

    // Run for a while
    time.Sleep(2 * time.Second)

    // Shutdown service
    service.Shutdown()
}
```

## Fan-Out Fan-In with Error Handling

This example demonstrates the fan-out fan-in pattern with proper error handling:

```go
package main

import (
    "context"
    "fmt"
    "math/rand"
    "sync"
    "time"
)

// Result represents the outcome of processing
type Result struct {
    Value int
    Err   error
}

// Generator produces numbers with potential errors
func generator(ctx context.Context) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for i := 1; i <= 100; i++ {
            select {
            case <-ctx.Done():
                return
            case out <- i:
            }
        }
    }()
    return out
}

// Processor handles the actual work
func processor(ctx context.Context, id int, input <-chan int) <-chan Result {
    out := make(chan Result)
    go func() {
        defer close(out)
        for num := range input {
            // Simulate work and possible errors
            result := Result{Value: num}
            
            // Simulate processing time
            time.Sleep(time.Duration(rand.Intn(100)) * time.Millisecond)
            
            // Simulate occasional errors
            if rand.Float32() < 0.1 { // 10% chance of error
                result.Err = fmt.Errorf("processor %d: error processing %d", id, num)
            } else {
                result.Value *= 2 // Double the number
            }
            
            select {
            case <-ctx.Done():
                return
            case out <- result:
            }
        }
    }()
    return out
}

// Merge combines multiple channels into one
func merge(ctx context.Context, cs ...<-chan Result) <-chan Result {
    var wg sync.WaitGroup
    out := make(chan Result)
    
    // Start an output goroutine for each input channel
    output := func(c <-chan Result) {
        defer wg.Done()
        for r := range c {
            select {
            case <-ctx.Done():
                return
            case out <- r:
            }
        }
    }
    
    wg.Add(len(cs))
    for _, c := range cs {
        go output(c)
    }
    
    // Start a goroutine to close out once all output goroutines are done
    go func() {
        wg.Wait()
        close(out)
    }()
    
    return out
}

func main() {
    // Create context with cancellation
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()
    
    // Create input channel
    input := generator(ctx)
    
    // Fan out to multiple processors
    numProcessors := 3
    processors := make([]<-chan Result, numProcessors)
    for i := 0; i < numProcessors; i++ {
        processors[i] = processor(ctx, i+1, input)
    }
    
    // Fan in the results
    results := merge(ctx, processors...)
    
    // Process results
    var (
        processed int
        errors    []error
    )
    
    // Collect and handle results
    for result := range results {
        if result.Err != nil {
            errors = append(errors, result.Err)
            continue
        }
        processed++
    }
    
    // Print summary
    fmt.Printf("\nProcessing Summary:\n")
    fmt.Printf("Successfully processed: %d numbers\n", processed)
    fmt.Printf("Encountered %d errors:\n", len(errors))
    for _, err := range errors {
        fmt.Printf("- %v\n", err)
    }
}
```

These examples demonstrate advanced concurrency patterns with proper error handling, cancellation, and resource management. Each example is fully functional and can be used as a starting point for real-world applications.

In the next post, we'll explore Microservices with Go!
