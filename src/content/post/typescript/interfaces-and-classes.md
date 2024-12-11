---
title: "TypeScript Interfaces and Classes"
description: "Deep dive into TypeScript interfaces, classes, inheritance, and object-oriented programming concepts"
publishDate: "11 Dec 2024"
tags: ["typescript", "javascript", "programming", "web-development", "oop", "series:typescript:4"]
draft: false
---

## Interfaces

### 1. Basic Interface Declaration

```typescript
// Simple interface
interface User {
    id: number;
    name: string;
    email: string;
    age?: number; // Optional property
    readonly createdAt: Date; // Read-only property
}

// Implementation
const user: User = {
    id: 1,
    name: "John Doe",
    email: "john@example.com",
    createdAt: new Date()
};
```

### 2. Interface Extension

```typescript
// Base interface
interface Animal {
    name: string;
    age: number;
}

// Extended interface
interface Pet extends Animal {
    owner: string;
    breed?: string;
}

// Multiple interface extension
interface ServiceDog extends Pet {
    training: string[];
    certification: string;
}
```

### 3. Function Interfaces

```typescript
// Function interface
interface MathOperation {
    (x: number, y: number): number;
}

// Implementation
const add: MathOperation = (x, y) => x + y;
const subtract: MathOperation = (x, y) => x - y;

// Method interface
interface Calculator {
    add(x: number, y: number): number;
    subtract(x: number, y: number): number;
}
```

## Classes

### 1. Basic Class Declaration

```typescript
class Person {
    // Properties
    private name: string;
    protected age: number;
    readonly id: number;

    // Constructor
    constructor(name: string, age: number) {
        this.name = name;
        this.age = age;
        this.id = Math.random();
    }

    // Methods
    public getName(): string {
        return this.name;
    }

    public setName(name: string): void {
        this.name = name;
    }
}
```

### 2. Class Implementation of Interfaces

```typescript
interface Vehicle {
    start(): void;
    stop(): void;
    speed: number;
}

class Car implements Vehicle {
    speed: number = 0;

    start(): void {
        console.log("Car started");
    }

    stop(): void {
        console.log("Car stopped");
        this.speed = 0;
    }

    accelerate(increment: number): void {
        this.speed += increment;
    }
}
```

### 3. Class Inheritance

```typescript
// Base class
class Animal {
    protected name: string;

    constructor(name: string) {
        this.name = name;
    }

    makeSound(): void {
        console.log("Some sound");
    }
}

// Derived class
class Dog extends Animal {
    private breed: string;

    constructor(name: string, breed: string) {
        super(name);
        this.breed = breed;
    }

    makeSound(): void {
        console.log("Woof!");
    }

    getInfo(): string {
        return `${this.name} is a ${this.breed}`;
    }
}
```

## Advanced Class Features

### 1. Abstract Classes

```typescript
abstract class Shape {
    abstract getArea(): number;
    abstract getPerimeter(): number;

    // Common method
    describe(): string {
        return `Area: ${this.getArea()}, Perimeter: ${this.getPerimeter()}`;
    }
}

class Rectangle extends Shape {
    constructor(private width: number, private height: number) {
        super();
    }

    getArea(): number {
        return this.width * this.height;
    }

    getPerimeter(): number {
        return 2 * (this.width + this.height);
    }
}
```

### 2. Static Members

```typescript
class MathUtils {
    static PI: number = 3.14159;

    static square(x: number): number {
        return x * x;
    }

    static get random(): number {
        return Math.random();
    }
}

// Usage
console.log(MathUtils.PI);
console.log(MathUtils.square(5));
console.log(MathUtils.random);
```

### 3. Accessors

```typescript
class Employee {
    private _salary: number;

    constructor(private name: string, salary: number) {
        this._salary = salary;
    }

    // Getter
    get salary(): number {
        return this._salary;
    }

    // Setter
    set salary(value: number) {
        if (value < 0) {
            throw new Error("Salary cannot be negative");
        }
        this._salary = value;
    }
}
```

## Advanced Interface Features

### 1. Index Signatures

```typescript
interface StringMap {
    [key: string]: string;
}

interface NumberMap {
    [index: number]: string;
}

// Implementation
const stringMap: StringMap = {
    name: "John",
    email: "john@example.com"
};

const numberMap: NumberMap = ["first", "second", "third"];
```

### 2. Hybrid Types

```typescript
interface Counter {
    (start: number): string;
    interval: number;
    reset(): void;
}

function getCounter(): Counter {
    const counter = function(start: number) {
        return String(start);
    } as Counter;
    
    counter.interval = 123;
    counter.reset = function() {};
    
    return counter;
}
```

### 3. Declaration Merging

```typescript
interface Box {
    height: number;
    width: number;
}

interface Box {
    scale: number;
}

// Results in:
// interface Box {
//     height: number;
//     width: number;
//     scale: number;
// }

const box: Box = { height: 5, width: 6, scale: 10 };
```

## Design Patterns with Classes

### 1. Singleton Pattern

```typescript
class Singleton {
    private static instance: Singleton;
    private constructor() {}

    public static getInstance(): Singleton {
        if (!Singleton.instance) {
            Singleton.instance = new Singleton();
        }
        return Singleton.instance;
    }
}
```

### 2. Factory Pattern

```typescript
interface Product {
    name: string;
    price: number;
}

class ProductFactory {
    static createProduct(type: string): Product {
        switch (type) {
            case "book":
                return { name: "Book", price: 10 };
            case "electronics":
                return { name: "Electronics", price: 100 };
            default:
                throw new Error("Invalid product type");
        }
    }
}
```

## Best Practices

1. Use interfaces for object type definitions
2. Keep classes focused and single-responsibility
3. Prefer composition over inheritance
4. Use access modifiers appropriately
5. Implement interfaces for better type checking
6. Use abstract classes for common functionality
7. Document complex interfaces and classes

## Common Patterns

### 1. Builder Pattern

```typescript
class UserBuilder {
    private user: any = {};

    setName(name: string): UserBuilder {
        this.user.name = name;
        return this;
    }

    setAge(age: number): UserBuilder {
        this.user.age = age;
        return this;
    }

    build(): User {
        return this.user as User;
    }
}
```

### 2. Decorator Pattern

```typescript
interface Coffee {
    cost: number;
    description: string;
}

class SimpleCoffee implements Coffee {
    cost = 10;
    description = "Simple coffee";
}

class MilkDecorator implements Coffee {
    constructor(private coffee: Coffee) {}

    get cost(): number {
        return this.coffee.cost + 2;
    }

    get description(): string {
        return this.coffee.description + ", milk";
    }
}
```

## Conclusion

Understanding interfaces and classes in TypeScript is crucial for building well-structured, maintainable applications. These concepts provide the foundation for object-oriented programming in TypeScript.

## Series Navigation

- Previous: [TypeScript Functions and Methods](/posts/typescript/functions-and-methods)
- Next: [TypeScript Generics](/posts/typescript/generics)
