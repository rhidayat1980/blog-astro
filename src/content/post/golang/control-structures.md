---
title: "Control Structures in Go"
description: "Learn about if statements, loops, and switch cases in Go programming language"
publishDate: 2024-12-13
tags: ["golang", "programming", "tutorial", "control-structures"]
draft: false
---

## Control Structures in Go

Control structures direct the flow of program execution. Go provides several control structures that are clean and easy to use.

## If Statements

### Basic If Statement

```go
if x > 0 {
    fmt.Println("x is positive")
}
```

### If-Else Statement

```go
if x > 0 {
    fmt.Println("x is positive")
} else {
    fmt.Println("x is non-positive")
}
```

### If with a Short Statement

```go
if value := getValue(); value < 10 {
    fmt.Println("Value is less than 10")
} else {
    fmt.Println("Value is 10 or greater")
}
```

## For Loops

Go has only one looping construct: the `for` loop. However, it's very flexible.

### Basic For Loop

```go
for i := 0; i < 5; i++ {
    fmt.Println(i)
}
```

### While-Style For Loop

```go
n := 0
for n < 5 {
    fmt.Println(n)
    n++
}
```

### Infinite Loop

```go
for {
    fmt.Println("This will run forever")
    // Use break to exit
}
```

### For-Range Loop

```go
numbers := []int{1, 2, 3, 4, 5}
for index, value := range numbers {
    fmt.Printf("Index: %d, Value: %d\n", index, value)
}
```

## Switch Statements

### Basic Switch

```go
switch day {
case "Monday":
    fmt.Println("Start of work week")
case "Friday":
    fmt.Println("End of work week")
default:
    fmt.Println("Regular day")
}
```

### Switch with Multiple Cases

```go
switch day {
case "Monday", "Tuesday", "Wednesday", "Thursday", "Friday":
    fmt.Println("Weekday")
case "Saturday", "Sunday":
    fmt.Println("Weekend")
}
```

### Switch without Expression

```go
switch {
case hour < 12:
    fmt.Println("Good morning")
case hour < 17:
    fmt.Println("Good afternoon")
default:
    fmt.Println("Good evening")
}
```

## Break and Continue

### Break Statement

- Exits the innermost loop or switch statement

```go
for i := 0; i < 10; i++ {
    if i == 5 {
        break
    }
    fmt.Println(i)
}
```

### Continue Statement

- Skips to the next iteration of the loop

```go
for i := 0; i < 5; i++ {
    if i == 2 {
        continue
    }
    fmt.Println(i)
}
```

## Practical Example

Here's a program that combines various control structures:

```go
package main

import "fmt"

func main() {
    // Array of scores
    scores := []int{85, 93, 77, 65, 99, 55}
    
    for i, score := range scores {
        fmt.Printf("Processing score %d: ", score)
        
        if score < 60 {
            fmt.Println("Failed")
            continue
        }
        
        switch {
        case score >= 90:
            fmt.Println("Grade A")
        case score >= 80:
            fmt.Println("Grade B")
        case score >= 70:
            fmt.Println("Grade C")
        default:
            fmt.Println("Grade D")
        }
        
        if i == len(scores)-1 {
            fmt.Println("Finished processing all scores")
            break
        }
    }
}
```

## Best Practices

1. Keep conditions simple and readable
2. Use early returns when possible
3. Prefer for-range when iterating over collections
4. Use switch statements instead of long if-else chains
5. Always use braces, even for single-line blocks

In the next post, we'll explore Functions in Go, including how to define them, return values, and function types!
