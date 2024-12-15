---
title: "Functions in Go"
description: "Learn about functions, methods, and function types in Go programming language"
publishDate: 2024-12-13
tags: ["golang", "programming", "tutorial", "functions"]
draft: false
---

## Functions in Go

Functions are the building blocks of any Go program. They help organize code into manageable pieces and promote code reuse.

## Function Declaration

The basic syntax for declaring a function in Go is:

```go
func functionName(parameter1 type1, parameter2 type2) returnType {
    // function body
    return value
}
```

### Simple Function Example

```go
func add(x int, y int) int {
    return x + y
}
```

### Multiple Parameters of Same Type

```go
func add(x, y int) int {
    return x + y
}
```

## Multiple Return Values

Go functions can return multiple values:

```go
func divide(x, y float64) (float64, error) {
    if y == 0 {
        return 0, errors.New("cannot divide by zero")
    }
    return x / y, nil
}
```

### Named Return Values

```go
func rectangle(width, height float64) (area, perimeter float64) {
    area = width * height
    perimeter = 2 * (width + height)
    return // naked return
}
```

## Variadic Functions

Functions that accept a variable number of arguments:

```go
func sum(numbers ...int) int {
    total := 0
    for _, num := range numbers {
        total += num
    }
    return total
}

// Usage
sum(1, 2)        // 3
sum(1, 2, 3, 4)  // 10
```

## Anonymous Functions

Functions that are declared without a name:

```go
func main() {
    // Anonymous function
    square := func(x int) int {
        return x * x
    }
    
    fmt.Println(square(5)) // 25
}
```

## Closures

Functions that reference variables from outside their body:

```go
func counter() func() int {
    count := 0
    return func() int {
        count++
        return count
    }
}

// Usage
c := counter()
fmt.Println(c()) // 1
fmt.Println(c()) // 2
```

## Defer Statement

Defers the execution of a function until the surrounding function returns:

```go
func readFile(filename string) {
    file, err := os.Open(filename)
    if err != nil {
        return
    }
    defer file.Close() // Will be called when readFile returns
    
    // Rest of the function
}
```

## Methods

Functions associated with a type:

```go
type Rectangle struct {
    width, height float64
}

func (r Rectangle) Area() float64 {
    return r.width * r.height
}

// Usage
rect := Rectangle{width: 10, height: 5}
fmt.Println(rect.Area()) // 50
```

## Function Types

Functions can be used as types:

```go
type Operation func(x, y int) int

func calculate(op Operation, x, y int) int {
    return op(x, y)
}

// Usage
add := func(x, y int) int { return x + y }
multiply := func(x, y int) int { return x * y }

fmt.Println(calculate(add, 5, 3))      // 8
fmt.Println(calculate(multiply, 5, 3))  // 15
```

## Error Handling

Functions often return an error as the last return value:

```go
func divide(x, y float64) (float64, error) {
    if y == 0 {
        return 0, errors.New("division by zero")
    }
    return x / y, nil
}

// Usage
result, err := divide(10, 2)
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println("Result:", result)
```

## Best Practices

1. Keep functions small and focused
2. Use meaningful function names
3. Return errors as the last return value
4. Use named return values for clarity
5. Document exported functions
6. Use defer for cleanup operations

## Practical Example

Here's a complete example that demonstrates various function concepts:

```go
package main

import (
    "fmt"
    "errors"
)

// Custom type for mathematical operations
type MathFunc func(x, y float64) float64

// Function that returns multiple values
func divide(x, y float64) (result float64, err error) {
    if y == 0 {
        return 0, errors.New("division by zero")
    }
    result = x / y
    return // naked return
}

// Variadic function
func average(numbers ...float64) float64 {
    total := 0.0
    for _, num := range numbers {
        total += num
    }
    return total / float64(len(numbers))
}

// Method on a custom type
type Calculator struct {
    brand string
}

func (c Calculator) add(x, y float64) float64 {
    return x + y
}

func main() {
    // Basic function usage
    result, err := divide(10, 2)
    if err != nil {
        fmt.Println("Error:", err)
        return
    }
    fmt.Println("10 ÷ 2 =", result)
    
    // Variadic function
    avg := average(1, 2, 3, 4, 5)
    fmt.Println("Average:", avg)
    
    // Method
    calc := Calculator{brand: "GoCalc"}
    sum := calc.add(5, 3)
    fmt.Println("5 + 3 =", sum)
    
    // Anonymous function
    square := func(x float64) float64 {
        return x * x
    }
    fmt.Println("5² =", square(5))
}
```

In the next post, we'll explore Arrays and Slices in Go!
