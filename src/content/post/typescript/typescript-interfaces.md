---
title: "TypeScript Interfaces: A Complete Guide"
description: "Master TypeScript interfaces with this comprehensive guide covering interface declarations, optional properties, readonly properties, extending interfaces, and implementing interfaces in classes"
publishDate: "Dec 11 2024"
heroImage: "/typescript-interfaces.png"
category: "TypeScript"
tags: ["typescript", "interfaces", "programming", "web-development"]
---

## TypeScript Interfaces: A Complete Guide

Interfaces are one of TypeScript's most powerful features, allowing you to define contracts in your code and providing explicit names for type checking. This comprehensive guide covers everything you need to know about TypeScript interfaces.

## Table of Contents

- [TypeScript Interfaces: A Complete Guide](#typescript-interfaces-a-complete-guide)
- [Table of Contents](#table-of-contents)
- [Basic Interface Declaration](#basic-interface-declaration)
- [Optional and Readonly Properties](#optional-and-readonly-properties)
- [Function Types](#function-types)
- [Indexable Types](#indexable-types)
- [Extending Interfaces](#extending-interfaces)
- [Implementing Interfaces](#implementing-interfaces)
- [Advanced Interface Patterns](#advanced-interface-patterns)
  - [Hybrid Types](#hybrid-types)
  - [Generic Interfaces](#generic-interfaces)
- [Best Practices](#best-practices)
- [Conclusion](#conclusion)

## Basic Interface Declaration

Interfaces define the shape that values must conform to:

```typescript
interface User {
    name: string;
    age: number;
    email: string;
}

// Using the interface
const user: User = {
    name: "John Doe",
    age: 30,
    email: "john@example.com"
};
```

## Optional and Readonly Properties

Interfaces can have optional and readonly properties:

```typescript
interface Configuration {
    readonly apiKey: string;        // Can't be modified after creation
    endpoint: string;               // Required
    timeout?: number;              // Optional
    retryCount?: number;          // Optional
}

const config: Configuration = {
    apiKey: "abc123",
    endpoint: "https://api.example.com"
    // timeout and retryCount are optional
};

// Error: Cannot assign to 'apiKey' because it is a read-only property
// config.apiKey = "xyz789";
```

## Function Types

Interfaces can describe function types:

```typescript
interface SearchFunction {
    (source: string, subString: string): boolean;
}

const search: SearchFunction = function(src: string, sub: string): boolean {
    return src.search(sub) > -1;
};

// With arrow function
const searchArrow: SearchFunction = (src, sub) => src.search(sub) > -1;
```

## Indexable Types

Interfaces can describe array-like or dictionary-like objects:

```typescript
// Array-like interface
interface StringArray {
    [index: number]: string;
}

let myArray: StringArray = ["Bob", "Fred"];

// Dictionary-like interface
interface StringDictionary {
    [key: string]: string;
}

let myDict: StringDictionary = {
    name: "John",
    role: "Developer"
};

// Mixed type index signature
interface NumberOrStringDictionary {
    [index: string]: number | string;
    length: number;    // ok, length is a number
    name: string;      // ok, name is a string
}
```

## Extending Interfaces

Interfaces can extend other interfaces:

```typescript
interface Animal {
    name: string;
}

interface Bear extends Animal {
    honey: boolean;
}

const bear: Bear = {
    name: "Winnie",
    honey: true
};

// Extending multiple interfaces
interface Shape {
    color: string;
}

interface PenStroke {
    penWidth: number;
}

interface Square extends Shape, PenStroke {
    sideLength: number;
}

const square: Square = {
    color: "blue",
    penWidth: 2,
    sideLength: 10
};
```

## Implementing Interfaces

Classes can implement interfaces:

```typescript
interface Vehicle {
    start(): void;
    stop(): void;
    speed: number;
}

class Car implements Vehicle {
    speed: number = 0;

    start() {
        console.log("Car started");
    }

    stop() {
        console.log("Car stopped");
        this.speed = 0;
    }

    accelerate(increment: number) {
        this.speed += increment;
    }
}
```

## Advanced Interface Patterns

### Hybrid Types

Interfaces can describe objects that act as both functions and objects:

```typescript
interface Counter {
    (start: number): string;
    interval: number;
    reset(): void;
}

function getCounter(): Counter {
    let counter = function(start: number) { return start.toString(); } as Counter;
    counter.interval = 123;
    counter.reset = function() { console.log("reset"); };
    return counter;
}
```

### Generic Interfaces

Interfaces can be generic:

```typescript
interface Repository<T> {
    get(id: string): Promise<T>;
    save(item: T): Promise<void>;
    delete(id: string): Promise<boolean>;
}

// Implementation for User type
interface User {
    id: string;
    name: string;
}

class UserRepository implements Repository<User> {
    async get(id: string): Promise<User> {
        // Implementation
        return { id, name: "John" };
    }

    async save(user: User): Promise<void> {
        // Implementation
    }

    async delete(id: string): Promise<boolean> {
        // Implementation
        return true;
    }
}
```

## Best Practices

1. **Name Interfaces Clearly**

```typescript
// Good
interface UserProfile {
    // ...
}

// Less ideal
interface Data {
    // ...
}
```

2. **Use Interface for Object Shapes**

```typescript
// Good
interface Point {
    x: number;
    y: number;
}

// Instead of
type Point = {
    x: number;
    y: number;
};
```

3. **Prefer Composition Over Inheritance**

```typescript
// Good
interface HasName {
    name: string;
}

interface HasAge {
    age: number;
}

interface Person extends HasName, HasAge {
    email: string;
}

// Instead of one large interface
interface Person {
    name: string;
    age: number;
    email: string;
    // ... many more properties
}
```

4. **Use Readonly When Appropriate**

```typescript
interface Config {
    readonly apiKey: string;
    readonly endpoint: string;
}
```

5. **Document Complex Interfaces**

```typescript
/**
 * Represents a user in the system
 * @property id - Unique identifier
 * @property name - User's full name
 * @property roles - Array of role identifiers
 */
interface User {
    id: string;
    name: string;
    roles: string[];
}
```

## Conclusion

TypeScript interfaces are a powerful tool for defining contracts in your code. They provide:

- Clear type definitions for objects
- Reusable type definitions across your codebase
- Support for optional and readonly properties
- Ability to describe function types and indexable types
- Extension and implementation capabilities
- Generic type support

Understanding and effectively using interfaces will help you write more maintainable and type-safe TypeScript code. Remember to:

- Use clear and descriptive interface names
- Keep interfaces focused and single-purpose
- Leverage interface extension for code reuse
- Document complex interfaces
- Use readonly and optional properties appropriately
