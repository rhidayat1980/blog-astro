---
title: "Interfaces in Go"
description: "Learn about interfaces, type assertions, and polymorphism in Go"
publishDate: 2024-12-13
tags: ["golang", "programming", "tutorial", "interfaces", "advanced"]
draft: false
---

## Interfaces in Go

Interfaces define behavior by declaring a set of methods. They provide abstraction and enable polymorphism in Go. Unlike other languages, interfaces in Go are implemented implicitly - if a type has all the methods that an interface specifies, it automatically implements that interface.

## Defining Interfaces

```go
// Simple interface
type Writer interface {
    Write([]byte) (int, error)
}

// Interface with multiple methods
type Shape interface {
    Area() float64
    Perimeter() float64
}
```

## Implementing Interfaces

```go
type Circle struct {
    Radius float64
}

// Implementing Shape interface
func (c Circle) Area() float64 {
    return math.Pi * c.Radius * c.Radius
}

func (c Circle) Perimeter() float64 {
    return 2 * math.Pi * c.Radius
}

// Rectangle also implements Shape
type Rectangle struct {
    Width, Height float64
}

func (r Rectangle) Area() float64 {
    return r.Width * r.Height
}

func (r Rectangle) Perimeter() float64 {
    return 2 * (r.Width + r.Height)
}
```

## Empty Interface

The empty interface `interface{}` or `any` (Go 1.18+) has no methods and is implemented by all types:

```go
func PrintAnything(v interface{}) {
    fmt.Printf("Type: %T, Value: %v\n", v, v)
}

// Usage
PrintAnything(42)        // int
PrintAnything("Hello")   // string
PrintAnything(true)      // bool
```

## Type Assertions

Type assertions provide access to an interface's underlying concrete type:

```go
func processValue(i interface{}) {
    // Method 1: Type assertion
    str, ok := i.(string)
    if ok {
        fmt.Printf("String value: %s\n", str)
    }

    // Method 2: Type switch
    switch v := i.(type) {
    case string:
        fmt.Printf("String: %s\n", v)
    case int:
        fmt.Printf("Integer: %d\n", v)
    case bool:
        fmt.Printf("Boolean: %v\n", v)
    default:
        fmt.Printf("Unknown type: %T\n", v)
    }
}
```

## Common Interfaces

### Stringer Interface

```go
type Stringer interface {
    String() string
}

type Person struct {
    Name string
    Age  int
}

func (p Person) String() string {
    return fmt.Sprintf("%s (%d years)", p.Name, p.Age)
}
```

### Error Interface

```go
type error interface {
    Error() string
}

type ValidationError struct {
    Field string
    Issue string
}

func (v ValidationError) Error() string {
    return fmt.Sprintf("validation failed on %s: %s", v.Field, v.Issue)
}
```

## Interface Composition

Interfaces can be composed of other interfaces:

```go
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Writer interface {
    Write(p []byte) (n int, err error)
}

// Composed interface
type ReadWriter interface {
    Reader
    Writer
}
```

## Interface Best Practices

1. Keep interfaces small
2. Accept interfaces, return structs
3. Use composition to build larger interfaces
4. Design interfaces for consumers, not implementers

```go
// Good: Small, focused interface
type Fetcher interface {
    Fetch(url string) ([]byte, error)
}

// Bad: Large, monolithic interface
type Service interface {
    Fetch(url string) ([]byte, error)
    Process(data []byte) error
    Save(data []byte) error
    Delete(id string) error
    // ... many more methods
}
```

## Practical Example

Here's a complete example demonstrating various interface concepts:

```go
package main

import (
    "fmt"
    "math"
)

// Define interfaces
type Shape interface {
    Area() float64
    Perimeter() float64
}

type Sizer interface {
    Size() string
}

// Combined interface
type ShapeInfo interface {
    Shape
    Sizer
}

// Implement shapes
type Circle struct {
    Radius float64
}

func (c Circle) Area() float64 {
    return math.Pi * c.Radius * c.Radius
}

func (c Circle) Perimeter() float64 {
    return 2 * math.Pi * c.Radius
}

func (c Circle) Size() string {
    area := c.Area()
    switch {
    case area < 50:
        return "small"
    case area < 100:
        return "medium"
    default:
        return "large"
    }
}

type Rectangle struct {
    Width, Height float64
}

func (r Rectangle) Area() float64 {
    return r.Width * r.Height
}

func (r Rectangle) Perimeter() float64 {
    return 2 * (r.Width + r.Height)
}

func (r Rectangle) Size() string {
    area := r.Area()
    switch {
    case area < 50:
        return "small"
    case area < 100:
        return "medium"
    default:
        return "large"
    }
}

// Function that works with interfaces
func PrintShapeInfo(s ShapeInfo) {
    fmt.Printf("Area: %.2f\n", s.Area())
    fmt.Printf("Perimeter: %.2f\n", s.Perimeter())
    fmt.Printf("Size: %s\n", s.Size())
}

// Generic shape processor
func ProcessShapes(shapes []ShapeInfo) {
    for i, shape := range shapes {
        fmt.Printf("\nShape %d:\n", i+1)
        PrintShapeInfo(shape)
        
        // Type assertion example
        if circle, ok := shape.(Circle); ok {
            fmt.Printf("This is a circle with radius: %.2f\n", circle.Radius)
        }
    }
}

func main() {
    // Create shapes
    circle := Circle{Radius: 5}
    rectangle := Rectangle{Width: 10, Height: 5}
    
    // Create slice of shapes
    shapes := []ShapeInfo{circle, rectangle}
    
    // Process all shapes
    ProcessShapes(shapes)
    
    // Demonstrate type switch
    for _, shape := range shapes {
        switch v := shape.(type) {
        case Circle:
            fmt.Printf("\nCircle with radius: %.2f\n", v.Radius)
        case Rectangle:
            fmt.Printf("\nRectangle with width: %.2f and height: %.2f\n",
                v.Width, v.Height)
        default:
            fmt.Printf("\nUnknown shape type: %T\n", v)
        }
    }
}
```

## Common Use Cases for Interfaces

1. **Dependency Injection**

```go
type DataStore interface {
    Save(data []byte) error
    Load(id string) ([]byte, error)
}

type Service struct {
    store DataStore
}
```

2. **Testing**

```go
type EmailSender interface {
    Send(to, subject, body string) error
}

// Mock implementation for testing
type MockEmailSender struct {
    sentEmails []string
}

func (m *MockEmailSender) Send(to, subject, body string) error {
    m.sentEmails = append(m.sentEmails, to)
    return nil
}
```

3. **Plugin Architecture**

```go
type Plugin interface {
    Name() string
    Execute() error
}
```

In the next post, we'll explore Goroutines and Concurrency in Go!
