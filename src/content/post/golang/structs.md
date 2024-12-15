---
title: "Structs in Go"
description: "Learn about structs, methods, and object-oriented programming concepts in Go"
publishDate: 2024-12-13
tags: ["golang", "programming", "tutorial", "structs"]
draft: false
---

## Structs in Go

Structs are user-defined types that group together zero or more fields of different types. They are the foundation of object-oriented programming in Go.

## Defining Structs

```go
// Basic struct
type Person struct {
    Name    string
    Age     int
    Address string
}

// Nested struct
type Employee struct {
    Person      // Embedded struct
    Company     string
    Department  string
    Salary      float64
}
```

## Creating Struct Instances

### Method 1: Dot Notation

```go
var p1 Person
p1.Name = "Alice"
p1.Age = 30
p1.Address = "123 Main St"
```

### Method 2: Struct Literal

```go
p2 := Person{
    Name:    "Bob",
    Age:     25,
    Address: "456 Oak Ave",
}
```

### Method 3: New Keyword

```go
p3 := new(Person)
p3.Name = "Carol"
```

## Struct Methods

Methods are functions associated with a struct type.

```go
// Value receiver
func (p Person) GetInfo() string {
    return fmt.Sprintf("%s is %d years old", p.Name, p.Age)
}

// Pointer receiver
func (p *Person) Birthday() {
    p.Age++
}
```

### Value vs Pointer Receivers

```go
type Rectangle struct {
    Width  float64
    Height float64
}

// Value receiver - doesn't modify the original
func (r Rectangle) Area() float64 {
    return r.Width * r.Height
}

// Pointer receiver - modifies the original
func (r *Rectangle) Scale(factor float64) {
    r.Width *= factor
    r.Height *= factor
}
```

## Struct Embedding

Go supports composition through embedding:

```go
type Address struct {
    Street  string
    City    string
    Country string
}

type Employee struct {
    Name    string
    Age     int
    Address // Embedded struct
}

// Usage
emp := Employee{
    Name: "Alice",
    Age:  30,
    Address: Address{
        Street:  "123 Work St",
        City:    "Tech City",
        Country: "Techland",
    },
}
```

## Tags

Struct tags provide metadata about struct fields:

```go
type User struct {
    Name     string `json:"name" validate:"required"`
    Email    string `json:"email" validate:"required,email"`
    Password string `json:"password" validate:"required,min=8"`
}
```

## Interfaces

Structs can implement interfaces implicitly:

```go
type Shape interface {
    Area() float64
    Perimeter() float64
}

type Rectangle struct {
    Width  float64
    Height float64
}

// Rectangle implements Shape interface
func (r Rectangle) Area() float64 {
    return r.Width * r.Height
}

func (r Rectangle) Perimeter() float64 {
    return 2 * (r.Width + r.Height)
}
```

## Constructor Functions

Go doesn't have constructors, but we can create constructor functions:

```go
type Config struct {
    Host     string
    Port     int
    Timeout  time.Duration
    MaxRetry int
}

func NewConfig(host string) *Config {
    return &Config{
        Host:     host,
        Port:     8080,        // Default value
        Timeout:  time.Second, // Default value
        MaxRetry: 3,          // Default value
    }
}
```

## Working with JSON

Structs are commonly used with JSON:

```go
type Book struct {
    Title     string   `json:"title"`
    Author    string   `json:"author"`
    Published int      `json:"published"`
    Tags      []string `json:"tags,omitempty"`
}

// Marshal (struct to JSON)
book := Book{
    Title:     "Go Programming",
    Author:    "John Doe",
    Published: 2023,
    Tags:      []string{"programming", "go"},
}
jsonData, err := json.Marshal(book)

// Unmarshal (JSON to struct)
var newBook Book
err = json.Unmarshal(jsonData, &newBook)
```

## Best Practices

1. Use meaningful names for structs and fields
2. Use pointer receivers when methods modify the struct
3. Use value receivers for read-only methods
4. Keep structs focused and cohesive
5. Use embedding for composition over inheritance
6. Document exported structs and their fields

## Practical Example

Here's a complete example demonstrating various struct concepts:

```go
package main

import (
    "encoding/json"
    "fmt"
    "time"
)

// Address represents a physical location
type Address struct {
    Street  string `json:"street"`
    City    string `json:"city"`
    Country string `json:"country"`
}

// Person represents basic information about a person
type Person struct {
    Name      string    `json:"name"`
    Age       int       `json:"age"`
    Address   Address   `json:"address"`
    CreatedAt time.Time `json:"created_at"`
}

// Constructor function for Person
func NewPerson(name string, age int) *Person {
    return &Person{
        Name:      name,
        Age:       age,
        CreatedAt: time.Now(),
    }
}

// Value receiver method
func (p Person) GetInfo() string {
    return fmt.Sprintf("%s is %d years old", p.Name, p.Age)
}

// Pointer receiver method
func (p *Person) Birthday() {
    p.Age++
}

// Method using embedded struct
func (p Person) GetAddress() string {
    return fmt.Sprintf("%s, %s, %s", 
        p.Address.Street, 
        p.Address.City, 
        p.Address.Country)
}

func main() {
    // Create a new person using constructor
    person := NewPerson("Alice", 30)
    
    // Set address
    person.Address = Address{
        Street:  "123 Main St",
        City:    "Tech City",
        Country: "Techland",
    }
    
    // Use methods
    fmt.Println(person.GetInfo())
    person.Birthday()
    fmt.Println("After birthday:", person.GetInfo())
    fmt.Println("Address:", person.GetAddress())
    
    // Convert to JSON
    jsonData, err := json.MarshalIndent(person, "", "  ")
    if err != nil {
        fmt.Println("Error marshaling JSON:", err)
        return
    }
    fmt.Println("\nJSON representation:")
    fmt.Println(string(jsonData))
    
    // Create from JSON
    jsonStr := `{
        "name": "Bob",
        "age": 25,
        "address": {
            "street": "456 Oak Ave",
            "city": "Dev City",
            "country": "Codeland"
        }
    }`
    
    var newPerson Person
    err = json.Unmarshal([]byte(jsonStr), &newPerson)
    if err != nil {
        fmt.Println("Error unmarshaling JSON:", err)
        return
    }
    
    fmt.Println("\nPerson created from JSON:")
    fmt.Println(newPerson.GetInfo())
    fmt.Println("Address:", newPerson.GetAddress())
}
```

This concludes our series on Go fundamentals! We've covered:

1. Introduction to Go
2. Variables
3. Control Structures
4. Functions
5. Arrays and Slices
6. Maps
7. Structs

Each post provides a solid foundation for understanding Go programming. Would you like me to create more posts about advanced Go topics?
