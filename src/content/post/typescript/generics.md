---
title: "TypeScript Generics"
description: "Comprehensive guide to TypeScript generics, constraints, and generic patterns"
publishDate: "11 Dec 2024"
tags: ["typescript", "javascript", "programming", "web-development", "generics", "series:typescript:5"]
draft: false
---

## Understanding Generics

Generics allow you to write flexible, reusable code that works with multiple types while maintaining type safety.

## Basic Generic Syntax

### 1. Generic Functions

```typescript
// Simple generic function
function identity<T>(arg: T): T {
    return arg;
}

// Usage
const numberResult = identity<number>(42);
const stringResult = identity("Hello");  // Type inference

// Multiple type parameters
function pair<T, U>(first: T, second: U): [T, U] {
    return [first, second];
}
```

### 2. Generic Interfaces

```typescript
// Generic interface
interface Box<T> {
    value: T;
    getValue(): T;
}

// Implementation
class NumberBox implements Box<number> {
    constructor(public value: number) {}
    
    getValue(): number {
        return this.value;
    }
}
```

## Generic Constraints

### 1. Basic Constraints

```typescript
// Constraint using extends
interface Lengthwise {
    length: number;
}

function logLength<T extends Lengthwise>(arg: T): number {
    return arg.length;
}

// Usage
logLength("Hello");     // Works with string
logLength([1, 2, 3]);  // Works with array
logLength({ length: 5, value: 10 });  // Works with object
```

### 2. Multiple Constraints

```typescript
interface HasName {
    name: string;
}

interface HasAge {
    age: number;
}

function printNameAndAge<T extends HasName & HasAge>(obj: T): void {
    console.log(`${obj.name} is ${obj.age} years old`);
}
```

## Generic Classes

### 1. Basic Generic Class

```typescript
class Container<T> {
    private item: T;

    constructor(item: T) {
        this.item = item;
    }

    getItem(): T {
        return this.item;
    }

    setItem(item: T): void {
        this.item = item;
    }
}

// Usage
const numberContainer = new Container<number>(123);
const stringContainer = new Container("Hello");
```

### 2. Generic Class with Constraints

```typescript
class DataStorage<T extends string | number | boolean> {
    private data: T[] = [];

    addItem(item: T) {
        this.data.push(item);
    }

    removeItem(item: T) {
        const index = this.data.indexOf(item);
        if (index !== -1) {
            this.data.splice(index, 1);
        }
    }

    getItems(): T[] {
        return [...this.data];
    }
}
```

## Advanced Generic Patterns

### 1. Generic Type Aliases

```typescript
// Generic type alias
type Pair<T, U> = {
    first: T;
    second: U;
};

// Generic function type
type Operation<T> = (a: T, b: T) => T;

// Usage
const numberPair: Pair<number, string> = {
    first: 42,
    second: "Hello"
};

const add: Operation<number> = (a, b) => a + b;
```

### 2. Generic Mapped Types

```typescript
// Make all properties optional
type Partial<T> = {
    [P in keyof T]?: T[P];
};

// Make all properties readonly
type Readonly<T> = {
    readonly [P in keyof T]: T[P];
};

// Make all properties nullable
type Nullable<T> = {
    [P in keyof T]: T[P] | null;
};
```

## Generic Utility Types

### 1. Built-in Utility Types

```typescript
// Record type
type PageInfo = Record<string, string>;

// Pick type
interface User {
    id: number;
    name: string;
    email: string;
}

type UserBasicInfo = Pick<User, "name" | "email">;

// Omit type
type UserWithoutId = Omit<User, "id">;
```

### 2. Custom Utility Types

```typescript
// DeepPartial type
type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object
        ? DeepPartial<T[P]>
        : T[P];
};

// NonNullable properties
type NonNullableProps<T> = {
    [P in keyof T]: NonNullable<T[P]>;
};
```

## Generic Conditional Types

### 1. Basic Conditional Types

```typescript
type TypeName<T> =
    T extends string ? "string" :
    T extends number ? "number" :
    T extends boolean ? "boolean" :
    T extends undefined ? "undefined" :
    T extends Function ? "function" :
    "object";

// Usage
type T0 = TypeName<string>;  // "string"
type T1 = TypeName<number>;  // "number"
```

### 2. Infer Keyword

```typescript
type ReturnType<T extends (...args: any) => any> =
    T extends (...args: any) => infer R ? R : any;

type ArrayElementType<T> =
    T extends (infer U)[] ? U : never;

// Usage
type Func = () => number;
type FuncReturn = ReturnType<Func>;  // number

type NumberArray = number[];
type Element = ArrayElementType<NumberArray>;  // number
```

## Generic Patterns in Practice

### 1. Factory Pattern

```typescript
interface Product {
    name: string;
    price: number;
}

class GenericFactory<T extends Product> {
    create(name: string, price: number): T {
        return { name, price } as T;
    }
}

// Usage
interface Book extends Product {
    author: string;
}

const bookFactory = new GenericFactory<Book>();
```

### 2. Repository Pattern

```typescript
interface Repository<T> {
    find(id: number): Promise<T>;
    findAll(): Promise<T[]>;
    create(item: T): Promise<T>;
    update(id: number, item: T): Promise<T>;
    delete(id: number): Promise<void>;
}

class GenericRepository<T> implements Repository<T> {
    constructor(private items: T[] = []) {}

    async find(id: number): Promise<T> {
        return this.items[id];
    }

    async findAll(): Promise<T[]> {
        return [...this.items];
    }

    async create(item: T): Promise<T> {
        this.items.push(item);
        return item;
    }

    async update(id: number, item: T): Promise<T> {
        this.items[id] = item;
        return item;
    }

    async delete(id: number): Promise<void> {
        this.items.splice(id, 1);
    }
}
```

## Best Practices

1. Use meaningful type parameter names
2. Apply constraints when necessary
3. Avoid over-generalization
4. Use type inference when possible
5. Document generic parameters
6. Consider performance implications
7. Test with different type arguments

## Common Pitfalls

1. Over-constraining generics
2. Not constraining enough
3. Using any instead of proper generics
4. Forgetting type inference capabilities
5. Not considering edge cases

## Conclusion

Generics are a powerful feature in TypeScript that enable you to write flexible, reusable, and type-safe code. Understanding and properly implementing generics is crucial for building robust TypeScript applications.

## Series Navigation

- Previous: [TypeScript Interfaces and Classes](/posts/typescript/interfaces-and-classes)
- Next: [TypeScript Advanced Types](/posts/typescript/advanced-types)
