---
title: "Error Handling in Go"
description: "Learn about error handling patterns, custom errors, and best practices in Go"
publishDate: 2024-12-13
tags: ["golang", "programming", "tutorial", "error-handling", "advanced"]
draft: false
---

## Error Handling in Go

Go takes a unique approach to error handling by using explicit error values instead of exceptions. This leads to more straightforward error handling and better error management.

## The Error Interface

The built-in `error` interface is simple:

```go
type error interface {
    Error() string
}
```

## Basic Error Handling

### Returning Errors

```go
func divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, errors.New("division by zero")
    }
    return a / b, nil
}

// Usage
result, err := divide(10, 0)
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println("Result:", result)
```

### Creating Errors

```go
// Using errors.New
err1 := errors.New("something went wrong")

// Using fmt.Errorf
name := "John"
err2 := fmt.Errorf("user %s not found", name)
```

## Custom Error Types

### Simple Custom Error

```go
type ValidationError struct {
    Field string
    Value interface{}
    Issue string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation failed for %s: %v - %s",
        e.Field, e.Value, e.Issue)
}

// Usage
func validateAge(age int) error {
    if age < 0 {
        return &ValidationError{
            Field: "age",
            Value: age,
            Issue: "must be positive",
        }
    }
    return nil
}
```

### Error Types with Additional Information

```go
type QueryError struct {
    Query   string
    Err     error
    Timeout time.Duration
}

func (e *QueryError) Error() string {
    return fmt.Sprintf("query '%s' failed after %v: %v",
        e.Query, e.Timeout, e.Err)
}

// Implement Unwrap for error wrapping
func (e *QueryError) Unwrap() error {
    return e.Err
}
```

## Error Wrapping

Go 1.13 introduced error wrapping:

```go
// Wrapping errors
func processFile(path string) error {
    file, err := os.Open(path)
    if err != nil {
        return fmt.Errorf("failed to open %s: %w", path, err)
    }
    defer file.Close()
    
    // Process file...
    return nil
}

// Unwrapping and checking errors
func main() {
    err := processFile("config.json")
    if err != nil {
        // Check if it's a specific error type
        if os.IsNotExist(errors.Unwrap(err)) {
            fmt.Println("File doesn't exist")
            return
        }
        fmt.Println("Error:", err)
        return
    }
}
```

## Error Handling Patterns

### Sentinel Errors

Predefined errors that signal specific conditions:

```go
var (
    ErrNotFound = errors.New("not found")
    ErrTimeout  = errors.New("operation timed out")
)

func findUser(id string) error {
    return ErrNotFound
}

// Usage
if err := findUser("123"); err == ErrNotFound {
    // Handle not found case
}
```

### Error Types

Using custom error types for more information:

```go
type NotFoundError struct {
    Resource string
    ID       string
}

func (e *NotFoundError) Error() string {
    return fmt.Sprintf("%s with ID %s not found", e.Resource, e.ID)
}

func findUser(id string) error {
    return &NotFoundError{
        Resource: "user",
        ID:       id,
    }
}

// Usage
if err := findUser("123"); err != nil {
    if nfErr, ok := err.(*NotFoundError); ok {
        fmt.Printf("%s not found\n", nfErr.Resource)
    }
}
```

### Error Wrapping with Multiple Values

```go
type MultiError struct {
    Errors []error
}

func (m *MultiError) Error() string {
    var errStrings []string
    for _, err := range m.Errors {
        errStrings = append(errStrings, err.Error())
    }
    return strings.Join(errStrings, "; ")
}

func validateUser(user User) error {
    var errors []error
    
    if user.Age < 0 {
        errors = append(errors, fmt.Errorf("age must be positive"))
    }
    
    if user.Name == "" {
        errors = append(errors, fmt.Errorf("name is required"))
    }
    
    if len(errors) > 0 {
        return &MultiError{Errors: errors}
    }
    
    return nil
}
```

## Best Practices

1. **Handle Errors Explicitly**

```go
result, err := someFunction()
if err != nil {
    // Handle error appropriately
    log.Printf("error: %v", err)
    return err
}
```

2. **Don't Ignore Errors**

```go
// BAD
_ = someFunction()

// GOOD
if err := someFunction(); err != nil {
    log.Printf("error: %v", err)
}
```

3. **Add Context to Errors**

```go
func processData(filename string) error {
    data, err := readFile(filename)
    if err != nil {
        return fmt.Errorf("processing %s: %w", filename, err)
    }
    return nil
}
```

4. **Use Type Assertions Carefully**

```go
var ErrTimeout = errors.New("timeout")

func handleError(err error) {
    switch {
    case errors.Is(err, ErrTimeout):
        // Handle timeout
    case errors.As(err, &NetworkError{}):
        // Handle network error
    default:
        // Handle unknown error
    }
}
```

## Practical Example

Here's a complete example demonstrating various error handling concepts:

```go
package main

import (
    "errors"
    "fmt"
    "log"
    "time"
)

// Custom error types
type ValidationError struct {
    Field string
    Issue string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation failed: %s - %s", e.Field, e.Issue)
}

type TimeoutError struct {
    Operation string
    Duration  time.Duration
}

func (e *TimeoutError) Error() string {
    return fmt.Sprintf("operation %s timed out after %v", e.Operation, e.Duration)
}

// Sentinel errors
var (
    ErrNotFound = errors.New("resource not found")
    ErrInvalid  = errors.New("invalid input")
)

// User represents a user in the system
type User struct {
    ID    string
    Name  string
    Email string
    Age   int
}

// ValidateUser validates user data
func ValidateUser(user User) error {
    var errors []error
    
    if user.Name == "" {
        errors = append(errors, &ValidationError{
            Field: "name",
            Issue: "cannot be empty",
        })
    }
    
    if user.Age < 0 {
        errors = append(errors, &ValidationError{
            Field: "age",
            Issue: "must be positive",
        })
    }
    
    if len(errors) > 0 {
        return fmt.Errorf("validation failed: %w", errors[0])
    }
    
    return nil
}

// FindUser simulates finding a user
func FindUser(id string) (*User, error) {
    // Simulate timeout
    if id == "timeout" {
        return nil, &TimeoutError{
            Operation: "FindUser",
            Duration:  time.Second * 5,
        }
    }
    
    // Simulate not found
    if id == "notfound" {
        return nil, fmt.Errorf("finding user: %w", ErrNotFound)
    }
    
    // Simulate success
    return &User{
        ID:    id,
        Name:  "John Doe",
        Email: "john@example.com",
        Age:   30,
    }, nil
}

func main() {
    // Test various error scenarios
    testCases := []struct {
        name string
        id   string
    }{
        {"Valid User", "123"},
        {"Not Found", "notfound"},
        {"Timeout", "timeout"},
    }
    
    for _, tc := range testCases {
        fmt.Printf("\nTesting: %s\n", tc.name)
        
        user, err := FindUser(tc.id)
        if err != nil {
            // Check for specific error types
            switch {
            case errors.Is(err, ErrNotFound):
                log.Printf("User not found: %v", err)
            case errors.As(err, &TimeoutError{}):
                log.Printf("Timeout error: %v", err)
            default:
                log.Printf("Unexpected error: %v", err)
            }
            continue
        }
        
        // Validate user
        if err := ValidateUser(*user); err != nil {
            var validationErr *ValidationError
            if errors.As(err, &validationErr) {
                log.Printf("Validation error: %v", validationErr)
            } else {
                log.Printf("Other error: %v", err)
            }
            continue
        }
        
        fmt.Printf("Successfully found and validated user: %+v\n", user)
    }
}
```

In the next post, we'll explore Testing in Go!
