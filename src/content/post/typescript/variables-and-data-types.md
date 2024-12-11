---
title: "TypeScript Variables and Data Types"
description: "Deep dive into TypeScript variables, data types, and type system features"
publishDate: "11 Dec 2024"
tags: ["typescript", "javascript", "programming", "web-development", "series:typescript:2"]
draft: false
---

## Understanding TypeScript's Type System

TypeScript's type system is a powerful feature that brings static typing to JavaScript. It provides several key benefits:

1. **Compile-time Type Checking**: Catches type-related errors before your code runs
2. **Enhanced IDE Support**: Better autocomplete, refactoring, and error detection
3. **Self-Documenting Code**: Types serve as inline documentation
4. **Safer Refactoring**: The compiler helps ensure type safety when making changes

The type system is both optional and gradual, meaning you can:
- Mix typed and untyped code
- Control type checking strictness with compiler options
- Let TypeScript infer types automatically when possible

## Variable Declarations

### 1. Variable Declaration Keywords

TypeScript supports three ways to declare variables, each with its own scope and mutability rules:

```typescript
// let - block-scoped, mutable
let counter: number = 0;
counter = 1; // OK - value can be changed

// const - block-scoped, immutable reference
const PI: number = 3.14159;
// PI = 3.14; // Error - cannot reassign const

// var - function-scoped (not recommended)
var legacy: string = "old style";
```

Best Practices:

- Use `const` by default for immutable values
- Use `let` when you need to reassign values
- Avoid `var` as it can lead to scope-related bugs
- Consider enabling `strictNullChecks` for better type safety

### 2. Type Annotations

Type annotations in TypeScript provide a way to explicitly specify the type of a variable. While often optional due to type inference, they're useful for:

- Documentation
- Ensuring specific types when inference isn't sufficient
- Preventing accidental type changes

```typescript
// Basic type annotations
let name: string = "John";
let age: number = 25;
let isStudent: boolean = true;
let notSure: any = 4; // avoid 'any' when possible

// Union types - variable can hold multiple types
let id: string | number = "abc123";
id = 123; // Also valid

// Type aliases - create custom type names
type ID = string | number;
type Point = { x: number; y: number };

let userId: ID = "user123";
let coordinates: Point = { x: 10, y: 20 };

// Type inference - TypeScript can infer types
let inferredString = "Hello"; // type: string
let inferredNumber = 42;      // type: number
```

Common Pitfalls and Solutions:
1. **Avoiding `any`**

```typescript
// Bad
let data: any = fetchData();

// Good
interface ApiResponse {
    id: number;
    name: string;
}
let data: ApiResponse = fetchData();
```

2. **Null and Undefined**

```typescript
// With strictNullChecks
let name: string | null = null;
name = "John"; // OK
name = undefined; // Error

// Optional properties
interface User {
    name: string;
    email?: string; // Optional
}
```

## Complex Data Types

### 1. Arrays

Arrays in TypeScript can be typed in two ways, with additional features for type safety:

```typescript
// Array type annotations
let numbers: number[] = [1, 2, 3, 4, 5];
let strings: Array<string> = ["a", "b", "c"]; // Generic array type

// Mixed type arrays with explicit typing
let mixed: (string | number)[] = [1, "two", 3, "four"];

// Readonly arrays - prevents mutations
const readonlyNumbers: ReadonlyArray<number> = [1, 2, 3];
// readonlyNumbers[0] = 4; // Error
// readonlyNumbers.push(4); // Error

// Array with specific length (tuple)
let pair: [string, number] = ["hello", 42];

// Array methods with type safety
numbers.push(6); // OK
// numbers.push("7"); // Error: Argument of type 'string' not assignable

// Type inference with arrays
let inferredArray = [1, 2, 3]; // Type: number[]
let mixedInferred = [1, "two"]; // Type: (string | number)[]
```

Best Practices:

- Use `ReadonlyArray` for arrays that shouldn't be modified
- Consider using tuples when array length and types are fixed
- Leverage type inference when the intent is clear
- Use union types for mixed-type arrays

## Enums

### 4. Computed and Constant Members

Enum members can have computed values or be constants. Understanding the difference is crucial for optimization:

```typescript
// Constant enum members
enum FileAccess {
    // constant members
    None = 0,
    Read = 1 << 0,      // 1
    Write = 1 << 1,     // 2
    ReadWrite = Read | Write,  // 3

    // computed member
    HighestValue = getValue()
}

function getValue() {
    return 1000;
}
```

### 5. Const Enums

Const enums are completely removed during compilation and inlined at use sites, providing better performance:

```typescript
const enum Directions {
    Up = "UP",
    Down = "DOWN",
    Left = "LEFT",
    Right = "RIGHT"
}

// Usage
let direction = Directions.Up;
// Compiles to: let direction = "UP"
```

### 6. Best Practices for Enums

1. **Choose the Right Enum Type**

```typescript
// Use numeric enums for flags
enum Permissions {
    None = 0,
    Read = 1 << 0,
    Write = 1 << 1,
    Execute = 1 << 2
}

// Use string enums for clear debugging
enum LogLevel {
    Error = "ERROR",
    Warn = "WARN",
    Info = "INFO",
    Debug = "DEBUG"
}
```

2. **Use Const Enums for Performance**

```typescript
// Better performance, values inlined
const enum HttpStatus {
    OK = 200,
    NotFound = 404,
    Error = 500
}

// Regular enum - generates more code
enum Colors {
    Red = "#FF0000",
    Green = "#00FF00",
    Blue = "#0000FF"
}
```

3. **Document Enum Usage**

```typescript
/**
 * Represents the possible states of a task
 * @enum {string}
 */
enum TaskStatus {
    /** Task is waiting to be started */
    Pending = "PENDING",
    /** Task is currently in progress */
    InProgress = "IN_PROGRESS",
    /** Task has been completed */
    Completed = "COMPLETED",
    /** Task was cancelled before completion */
    Cancelled = "CANCELLED"
}
```

## Type Assertions

Type assertions provide a way to tell the TypeScript compiler "trust me, I know what I'm doing." They're useful when you have more information about a type than TypeScript can know.

```typescript
// Using angle-bracket syntax
let someValue: any = "this is a string";
let strLength: number = (<string>someValue).length;

// Using 'as' syntax (preferred, especially in JSX)
let otherValue: any = "hello";
let len: number = (otherValue as string).length;

// Assertions with custom types
interface User {
    name: string;
    age: number;
}

let userObj: any = { name: "John", age: 30 };
let user = userObj as User;
```

Best Practices:

- Use assertions sparingly
- Prefer type declarations over assertions
- Use the `as` syntax for consistency
- Consider using type guards instead when possible

## Type Guards

Type guards are expressions that perform runtime checks to guarantee the type of a value in a scope. They're essential for working with union types safely:

```typescript
// typeof type guard
function processValue(value: string | number) {
    if (typeof value === "string") {
        // TypeScript knows value is a string here
        return value.toUpperCase();
    }
    // TypeScript knows value is a number here
    return value.toFixed(2);
}

// instanceof type guard
class Animal {
    move() { /* ... */ }
}
class Dog extends Animal {
    bark() { /* ... */ }
}

function handleAnimal(animal: Animal) {
    if (animal instanceof Dog) {
        // TypeScript knows animal is Dog here
        animal.bark();
    }
}

// Custom type guard
interface Bird {
    fly(): void;
    layEggs(): void;
}

interface Fish {
    swim(): void;
    layEggs(): void;
}

function isFish(pet: Fish | Bird): pet is Fish {
    return (pet as Fish).swim !== undefined;
}
```

## Best Practices

1. Use specific types instead of `any`
2. Leverage type inference when possible
3. Use union types for flexibility
4. Prefer interfaces for object types
5. Use const assertions for immutable values

## Common Patterns

### 1. Optional Properties

```typescript
interface Config {
    name: string;
    port?: number;    // Optional property
    timeout?: number; // Optional property
}
```

### 2. Readonly Properties

```typescript
interface Point {
    readonly x: number;
    readonly y: number;
}

const point: Point = { x: 10, y: 20 };
// point.x = 30; // Error: Cannot assign to 'x' because it is a read-only property
```

## Conclusion

Understanding TypeScript's variable declarations and data types is fundamental to writing type-safe code. These concepts form the foundation for more advanced TypeScript features and patterns.

## Series Navigation

- Previous: [Introduction to TypeScript](/posts/typescript/introduction-to-typescript)
- Next: [TypeScript Functions and Methods](/posts/typescript/functions-and-methods)
