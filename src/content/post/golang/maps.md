---
title: "Maps in Go"
description: "Learn about maps, hash tables, and key-value data structures in Go"
publishDate: 2024-12-13
tags: ["golang", "programming", "tutorial", "maps"]
draft: false
---

## Maps in Go

Maps are Go's built-in hash table implementation that associate keys of one type with values of another type. They provide fast lookups and are highly efficient for storing key-value pairs.

## Map Declaration

There are several ways to declare a map:

### Using var Keyword

```go
var scores map[string]int
```

### Using make Function

```go
scores := make(map[string]int)
```

### With Initial Values

```go
scores := map[string]int{
    "Alice": 98,
    "Bob":   87,
    "Carol": 92,
}
```

## Basic Operations

### Adding/Updating Elements

```go
// Add new key-value pair
scores["David"] = 95

// Update existing value
scores["Alice"] = 100
```

### Accessing Elements

```go
score := scores["Alice"]
fmt.Println(score) // 100

// Using two-value assignment to check existence
score, exists := scores["Eve"]
if exists {
    fmt.Println("Score exists:", score)
} else {
    fmt.Println("Score doesn't exist")
}
```

### Deleting Elements

```go
delete(scores, "Bob")
```

### Length of Map

```go
length := len(scores)
```

## Iterating Over Maps

### Using Range

```go
for key, value := range scores {
    fmt.Printf("%s: %d\n", key, value)
}

// Iterate over keys only
for key := range scores {
    fmt.Println(key)
}

// Iterate over values only
for _, value := range scores {
    fmt.Println(value)
}
```

## Maps with Struct Values

```go
type Student struct {
    Name  string
    Age   int
    Grade string
}

students := map[int]Student{
    1: {"Alice", 20, "A"},
    2: {"Bob", 21, "B"},
}
```

## Maps as Sets

Maps can be used to implement sets by using empty structs as values:

```go
type void struct{}
var member void

set := make(map[string]void)
set["apple"] = member
set["banana"] = member

// Check membership
_, exists := set["apple"]
```

## Nested Maps

```go
// Map of maps
classScores := map[string]map[string]int{
    "Math": {
        "Alice": 95,
        "Bob":   87,
    },
    "Science": {
        "Alice": 92,
        "Bob":   88,
    },
}
```

## Common Patterns

### Safe Value Retrieval

```go
func getScore(scores map[string]int, name string) (int, bool) {
    score, exists := scores[name]
    return score, exists
}
```

### Map Clear

```go
// Method 1: Reassign
scores = make(map[string]int)

// Method 2: Delete all elements
for key := range scores {
    delete(scores, key)
}
```

### Copy Map

```go
func copyMap(original map[string]int) map[string]int {
    copy := make(map[string]int, len(original))
    for key, value := range original {
        copy[key] = value
    }
    return copy
}
```

## Best Practices

1. Initialize maps using make()
2. Check for existence before accessing values
3. Use meaningful key and value types
4. Consider map capacity for better performance
5. Remember that maps are not safe for concurrent use

## Common Mistakes to Avoid

1. Not checking for nil maps
2. Forgetting that maps are references
3. Using unhashable types as keys
4. Not handling the "zero value" case

## Practical Example

Here's a complete example demonstrating various map operations:

```go
package main

import (
    "fmt"
    "strings"
)

// Student represents a student's information
type Student struct {
    Age     int
    Grade   string
    Courses []string
}

func main() {
    // Create a map of students
    students := make(map[string]Student)
    
    // Add students
    students["Alice"] = Student{
        Age:     20,
        Grade:   "A",
        Courses: []string{"Math", "Physics", "Computer Science"},
    }
    
    students["Bob"] = Student{
        Age:     21,
        Grade:   "B",
        Courses: []string{"Biology", "Chemistry", "Physics"},
    }
    
    // Print all students
    fmt.Println("All Students:")
    for name, info := range students {
        fmt.Printf("%s (%d years old):\n", name, info.Age)
        fmt.Printf("  Grade: %s\n", info.Grade)
        fmt.Printf("  Courses: %s\n", strings.Join(info.Courses, ", "))
    }
    
    // Find students taking Physics
    fmt.Println("\nStudents taking Physics:")
    for name, info := range students {
        for _, course := range info.Courses {
            if course == "Physics" {
                fmt.Printf("- %s\n", name)
                break
            }
        }
    }
    
    // Demonstrate safe value retrieval
    if student, exists := students["Carol"]; exists {
        fmt.Printf("\nCarol's grade: %s\n", student.Grade)
    } else {
        fmt.Println("\nCarol is not a student")
    }
    
    // Using maps as sets
    courseSet := make(map[string]struct{})
    for _, student := range students {
        for _, course := range student.Courses {
            courseSet[course] = struct{}{}
        }
    }
    
    fmt.Println("\nUnique courses offered:")
    for course := range courseSet {
        fmt.Printf("- %s\n", course)
    }
    
    // Delete a student
    delete(students, "Bob")
    fmt.Printf("\nNumber of students after deletion: %d\n", len(students))
}
```

In the next post, we'll explore Structs in Go!
