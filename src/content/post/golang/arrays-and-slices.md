---
title: "Arrays and Slices in Go"
description: "Learn about arrays, slices, and how to work with sequences of data in Go"
publishDate: 2024-12-13
tags: ["golang", "programming", "tutorial", "arrays", "slices"]
draft: false
---

## Arrays and Slices in Go

Go provides two ways to work with sequences of data: arrays and slices. While arrays have a fixed size, slices are dynamic and more flexible.

## Arrays

An array is a fixed-size sequence of elements of the same type.

### Array Declaration

```go
// Method 1: Declare with size
var numbers [5]int

// Method 2: Declare with values
colors := [3]string{"red", "green", "blue"}

// Method 3: Let compiler count elements
sizes := [...]int{1, 2, 3, 4, 5}
```

### Accessing Array Elements

```go
numbers := [5]int{1, 2, 3, 4, 5}
fmt.Println(numbers[0]) // First element
fmt.Println(numbers[4]) // Last element
```

### Array Length

```go
numbers := [5]int{1, 2, 3, 4, 5}
length := len(numbers)
fmt.Println(length) // 5
```

### Iterating Over Arrays

```go
colors := [3]string{"red", "green", "blue"}

// Using traditional for loop
for i := 0; i < len(colors); i++ {
    fmt.Println(colors[i])
}

// Using range
for index, color := range colors {
    fmt.Printf("Index: %d, Color: %s\n", index, color)
}
```

## Slices

Slices are dynamic arrays that can grow and shrink. They're built on top of arrays.

### Slice Declaration

```go
// Method 1: Create empty slice
var numbers []int

// Method 2: Create with values
fruits := []string{"apple", "banana", "orange"}

// Method 3: Using make
scores := make([]int, 5)    // length 5, capacity 5
moreScores := make([]int, 5, 10) // length 5, capacity 10
```

### Slice Operations

#### Append Elements

```go
numbers := []int{1, 2, 3}
numbers = append(numbers, 4)
numbers = append(numbers, 5, 6, 7)
```

#### Slicing

```go
numbers := []int{1, 2, 3, 4, 5}
slice1 := numbers[1:3]   // [2, 3]
slice2 := numbers[:3]    // [1, 2, 3]
slice3 := numbers[2:]    // [3, 4, 5]
```

#### Copy Slices

```go
src := []int{1, 2, 3}
dst := make([]int, len(src))
copy(dst, src)
```

### Length and Capacity

```go
numbers := make([]int, 3, 5)
fmt.Println(len(numbers)) // 3
fmt.Println(cap(numbers)) // 5
```

## Common Operations

### Check if Slice is Empty

```go
if len(slice) == 0 {
    fmt.Println("Slice is empty")
}
```

### Remove Element

```go
// Remove element at index i
slice = append(slice[:i], slice[i+1:]...)
```

### Clear Slice

```go
slice = slice[:0]    // Clear by reslicing
slice = nil          // Clear by setting to nil
```

### Filter Slice

```go
// Filter even numbers
numbers := []int{1, 2, 3, 4, 5, 6}
var evenNumbers []int
for _, n := range numbers {
    if n%2 == 0 {
        evenNumbers = append(evenNumbers, n)
    }
}
```

## Multi-dimensional Arrays and Slices

### 2D Array

```go
var matrix [3][4]int

// Initialize 2D array
grid := [2][3]int{
    {1, 2, 3},
    {4, 5, 6},
}
```

### 2D Slice

```go
// Create 2D slice
matrix := make([][]int, 3)
for i := range matrix {
    matrix[i] = make([]int, 4)
}
```

## Best Practices

1. Use slices instead of arrays in most cases
2. Pre-allocate slices when you know the size
3. Use copy() instead of re-slicing when appropriate
4. Be careful with large slices to avoid memory leaks
5. Use clear variable names that indicate the type

## Practical Example

Here's a program that demonstrates various array and slice operations:

```go
package main

import (
    "fmt"
    "sort"
)

func main() {
    // Working with arrays
    var scores [5]int
    scores[0] = 100
    scores[1] = 90
    scores[2] = 80
    scores[3] = 70
    scores[4] = 60
    
    fmt.Println("Array scores:", scores)
    
    // Working with slices
    fruits := []string{"apple", "banana", "orange"}
    fmt.Println("Initial fruits:", fruits)
    
    // Append to slice
    fruits = append(fruits, "grape")
    fmt.Println("After append:", fruits)
    
    // Slice operations
    someFruits := fruits[1:3]
    fmt.Println("Sliced fruits:", someFruits)
    
    // Create slice with make
    numbers := make([]int, 0, 5)
    for i := 0; i < 5; i++ {
        numbers = append(numbers, i)
    }
    fmt.Println("Numbers:", numbers)
    
    // Sort slice
    unordered := []int{3, 1, 4, 1, 5, 9, 2, 6}
    sort.Ints(unordered)
    fmt.Println("Sorted numbers:", unordered)
    
    // Filter slice
    evenNums := make([]int, 0)
    for _, n := range numbers {
        if n%2 == 0 {
            evenNums = append(evenNums, n)
        }
    }
    fmt.Println("Even numbers:", evenNums)
    
    // 2D slice
    matrix := make([][]int, 3)
    for i := range matrix {
        matrix[i] = make([]int, 3)
        for j := range matrix[i] {
            matrix[i][j] = i * 3 + j
        }
    }
    fmt.Println("2D slice:")
    for _, row := range matrix {
        fmt.Println(row)
    }
}
```

In the next post, we'll explore Maps in Go!
