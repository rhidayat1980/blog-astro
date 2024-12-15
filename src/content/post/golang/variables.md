---
title: "Variables in Go"
description: "Learn about variables, types, and variable declaration in Go programming language"
publishDate: 2024-12-13
tags: ["golang", "programming", "tutorial", "variables"]
draft: false
---

## Variables in Go

Variables are used to store values in a program. Go is a statically typed language, which means each variable has a specific type that cannot be changed during runtime.

## Variable Declaration

There are several ways to declare variables in Go:

### 1. Using var keyword with explicit type

```go
var age int
var name string
var isValid bool
```

### 2. Using var keyword with initialization

```go
var age = 25        // type inferred as int
var name = "John"   // type inferred as string
var salary = 5000.0 // type inferred as float64
```

### 3. Short declaration using :=

```go
age := 25        // type inferred as int
name := "John"   // type inferred as string
salary := 5000.0 // type inferred as float64
```

## Basic Types in Go

Go has several basic types:

1. **Numeric Types**
   - Integers: `int`, `int8`, `int16`, `int32`, `int64`
   - Unsigned integers: `uint`, `uint8`, `uint16`, `uint32`, `uint64`
   - Floating point: `float32`, `float64`
   - Complex numbers: `complex64`, `complex128`

2. **String Type**
   - `string`

3. **Boolean Type**
   - `bool`

## Multiple Variable Declarations

You can declare multiple variables in a single line:

```go
var x, y int = 10, 20
name, age := "John", 25
```

## Zero Values

In Go, variables declared without an explicit initial value are given their zero value:

```go
var (
    intValue    int     // 0
    floatValue  float64 // 0.0
    boolValue   bool    // false
    stringValue string  // ""
)
```

## Constants

Constants are declared using the `const` keyword:

```go
const (
    Pi = 3.14159
    MaxValue = 100
    Greeting = "Hello"
)
```

## Type Conversion

Go requires explicit type conversion:

```go
var i int = 42
var f float64 = float64(i)
var u uint = uint(f)
```

## Best Practices

1. Use short declaration (`:=`) inside functions
2. Use `var` declarations for package-level variables
3. Choose meaningful variable names
4. Use constants for values that won't change
5. Group related variables using var blocks

## Exercise

Try writing a program that:

1. Declares variables of different types
2. Performs some basic operations
3. Prints the results

Example:

```go
package main

import "fmt"

func main() {
    // Variable declarations
    name := "Alice"
    age := 25
    height := 1.68
    
    // Print values
    fmt.Printf("Name: %s\n", name)
    fmt.Printf("Age: %d\n", age)
    fmt.Printf("Height: %.2f meters\n", height)
}
```

In the next post, we'll explore control structures in Go, including if statements, loops, and switches!
