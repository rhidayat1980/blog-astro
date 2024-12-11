---
title: "TypeScript: Types vs Interfaces - A Comparison Guide"
description: "A comprehensive guide on choosing between TypeScript types, interfaces, and classes, with practical examples and best practices for each use case"
publishDate: "Dec 11 2024"
heroImage: "/typescript-comparison.png"
category: "TypeScript"
tags: ["typescript", "types", "interfaces", "classes", "programming"]
---

# TypeScript: Types vs Interfaces vs Classes

One of the most common questions TypeScript developers face is when to use types, interfaces, or classes. This guide will help you make informed decisions by comparing these features and providing clear guidelines for their usage.

## Table of Contents
1. [Quick Comparison](#quick-comparison)
2. [Type Aliases](#type-aliases)
3. [Interfaces](#interfaces)
4. [Classes](#classes)
5. [When to Use Each](#when-to-use-each)
6. [Best Practices](#best-practices)
7. [Common Patterns](#common-patterns)

## Quick Comparison

Here's a quick overview of the key differences:

```typescript
// Type Alias
type Point = {
    x: number;
    y: number;
};

// Interface
interface Point {
    x: number;
    y: number;
}

// Class
class Point {
    constructor(
        public x: number,
        public y: number
    ) {}
}
```

### Key Differences

1. **Declaration Merging**
```typescript
// Interfaces can be merged
interface User {
    name: string;
}
interface User {
    age: number;
}
// Results in: interface User { name: string; age: number; }

// Types cannot be merged
type User = {
    name: string;
}
// Error: Duplicate identifier 'User'
type User = {
    age: number;
}
```

2. **Computed Properties**
```typescript
// Types can use computed properties
type Keys = "firstname" | "lastname";
type DuplicateString<K extends string> = {
    [P in K]: string;
}
type NameFields = DuplicateString<Keys>;
// { firstname: string; lastname: string; }

// Interfaces cannot use computed properties directly
```

3. **Union Types**
```typescript
// Types can be unions
type Status = "pending" | "approved" | "rejected";

// Interfaces cannot be unions
interface Status { /* Error */ }
```

4. **Implementation and Inheritance**
```typescript
// Classes can implement interfaces
interface Animal {
    name: string;
    makeSound(): void;
}

class Dog implements Animal {
    constructor(public name: string) {}
    makeSound() {
        console.log("Woof!");
    }
}

// Classes can extend other classes
class Shape {
    constructor(public color: string) {}
}

class Circle extends Shape {
    constructor(color: string, public radius: number) {
        super(color);
    }
}
```

## When to Use Each

### Use Types When:

1. **Creating Union Types**
```typescript
type Result<T> = {
    success: true;
    data: T;
} | {
    success: false;
    error: string;
};

function processResult<T>(result: Result<T>) {
    if (result.success) {
        // TypeScript knows result.data exists
        console.log(result.data);
    } else {
        // TypeScript knows result.error exists
        console.log(result.error);
    }
}
```

2. **Working with Tuples**
```typescript
type HttpResponse = [number, string, any];
type Coordinates = [number, number];

const response: HttpResponse = [200, "OK", { data: "..." }];
const point: Coordinates = [10, 20];
```

3. **Creating Complex Type Manipulations**
```typescript
type Nullable<T> = T | null;
type Readonly<T> = {
    readonly [P in keyof T]: T[P];
};
type Pick<T, K extends keyof T> = {
    [P in K]: T[P];
};
```

### Use Interfaces When:

1. **Defining Object Shapes**
```typescript
interface User {
    id: string;
    name: string;
    email: string;
}

interface UserService {
    getUser(id: string): Promise<User>;
    updateUser(user: User): Promise<void>;
}
```

2. **Working with Classes**
```typescript
interface Repository<T> {
    find(id: string): Promise<T>;
    save(item: T): Promise<void>;
    delete(id: string): Promise<boolean>;
}

class UserRepository implements Repository<User> {
    // Implementation
}
```

3. **Extending Other Interfaces**
```typescript
interface BaseEntity {
    id: string;
    createdAt: Date;
    updatedAt: Date;
}

interface User extends BaseEntity {
    name: string;
    email: string;
}
```

### Use Classes When:

1. **Creating Instances with State and Behavior**
```typescript
class Counter {
    private count: number = 0;

    increment(): void {
        this.count++;
    }

    getCount(): number {
        return this.count;
    }
}

const counter = new Counter();
counter.increment();
```

2. **Implementing Object-Oriented Patterns**
```typescript
class Logger {
    private static instance: Logger;
    private constructor() {}

    static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    log(message: string): void {
        console.log(message);
    }
}
```

3. **Managing Complex State with Encapsulation**
```typescript
class ShoppingCart {
    private items: Array<{
        id: string;
        quantity: number;
        price: number;
    }> = [];

    addItem(id: string, quantity: number, price: number): void {
        this.items.push({ id, quantity, price });
    }

    getTotal(): number {
        return this.items.reduce(
            (total, item) => total + item.quantity * item.price,
            0
        );
    }
}
```

## Best Practices

1. **Prefer Interfaces for Public APIs**
```typescript
// Good
interface ApiResponse<T> {
    data: T;
    status: number;
    message: string;
}

// Instead of
type ApiResponse<T> = {
    data: T;
    status: number;
    message: string;
};
```

2. **Use Types for Complex Type Operations**
```typescript
// Good
type NonNullableFields<T> = {
    [P in keyof T]: NonNullable<T[P]>;
};

// Instead of trying to achieve this with interfaces
```

3. **Use Classes for Stateful Objects**
```typescript
// Good
class UserManager {
    private users: Map<string, User> = new Map();

    addUser(user: User): void {
        this.users.set(user.id, user);
    }
}

// Instead of
interface UserManager {
    users: Map<string, User>;
    addUser(user: User): void;
}
```

## Common Patterns

### Combining Types and Interfaces

```typescript
// Define base shape with interface
interface BaseEntity {
    id: string;
    createdAt: Date;
}

// Create union type with interface
type EntityType = "user" | "product" | "order";

// Combine in a new interface
interface Entity extends BaseEntity {
    type: EntityType;
}
```

### Using Classes with Interfaces

```typescript
interface Observable<T> {
    subscribe(observer: (value: T) => void): void;
    unsubscribe(observer: (value: T) => void): void;
    notify(value: T): void;
}

class DataStream<T> implements Observable<T> {
    private observers: ((value: T) => void)[] = [];

    subscribe(observer: (value: T) => void): void {
        this.observers.push(observer);
    }

    unsubscribe(observer: (value: T) => void): void {
        this.observers = this.observers.filter(obs => obs !== observer);
    }

    notify(value: T): void {
        this.observers.forEach(observer => observer(value));
    }
}
```

## Conclusion

Choose based on your needs:

- **Types** for:
  - Union types
  - Tuple types
  - Complex type manipulations
  - Mapped types
  - Utility types

- **Interfaces** for:
  - Object shapes
  - API contracts
  - Class contracts
  - Extendable definitions
  - Declaration merging

- **Classes** for:
  - Object instances
  - Encapsulation
  - Inheritance
  - Object-oriented patterns
  - Stateful behavior

Remember:
- Interfaces are often preferred for public APIs due to their extensibility
- Types are great for complex type manipulations and unions
- Classes are best when you need instances with behavior and state
- You can combine these features to create more powerful and flexible code
