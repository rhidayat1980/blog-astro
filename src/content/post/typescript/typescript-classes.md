---
title: "TypeScript Classes: The Complete Guide"
description: "A comprehensive guide to TypeScript classes covering inheritance, access modifiers, abstract classes, decorators, and best practices with practical examples"
publishDate: "Dec 11 2024"
heroImage: "/typescript-classes.png"
category: "TypeScript"
tags: ["typescript", "classes", "oop", "programming"]
---

# TypeScript Classes: The Complete Guide

TypeScript classes provide a powerful way to define blueprints for objects, combining the familiar class-based object-oriented programming with TypeScript's strong type system. This guide covers everything you need to know about TypeScript classes.

## Table of Contents
1. [Class Basics](#class-basics)
2. [Constructor and Properties](#constructor-and-properties)
3. [Access Modifiers](#access-modifiers)
4. [Inheritance](#inheritance)
5. [Abstract Classes](#abstract-classes)
6. [Interfaces and Classes](#interfaces-and-classes)
7. [Static Members](#static-members)
8. [Advanced Class Patterns](#advanced-class-patterns)
9. [Best Practices](#best-practices)

## Class Basics

A basic TypeScript class definition:

```typescript
class Person {
    // Properties
    name: string;
    age: number;

    // Constructor
    constructor(name: string, age: number) {
        this.name = name;
        this.age = age;
    }

    // Method
    greet(): string {
        return `Hello, my name is ${this.name}`;
    }
}

// Creating an instance
const person = new Person("John", 30);
console.log(person.greet()); // "Hello, my name is John"
```

## Constructor and Properties

TypeScript provides a concise way to define class properties in the constructor:

```typescript
class User {
    // Parameter properties
    constructor(
        public username: string,
        private password: string,
        readonly id: string
    ) {}

    // Methods can access these properties directly
    validatePassword(input: string): boolean {
        return this.password === input;
    }
}

const user = new User("john_doe", "secret123", "user123");
console.log(user.username); // "john_doe"
// console.log(user.password); // Error: 'password' is private
console.log(user.id); // "user123"
// user.id = "newId"; // Error: Cannot assign to 'id' because it is a read-only property
```

## Access Modifiers

TypeScript supports three access modifiers:

```typescript
class BankAccount {
    public accountHolder: string;      // Accessible from anywhere
    private balance: number;           // Only accessible within the class
    protected accountNumber: string;   // Accessible within class and subclasses

    constructor(holder: string, initialBalance: number) {
        this.accountHolder = holder;
        this.balance = initialBalance;
        this.accountNumber = Math.random().toString(36).slice(2);
    }

    public getBalance(): number {
        return this.balance;
    }

    private validateTransaction(amount: number): boolean {
        return this.balance >= amount;
    }

    protected generateStatement(): string {
        return `Balance: ${this.balance}`;
    }
}

class SavingsAccount extends BankAccount {
    getAccountDetails(): string {
        // Can access protected member
        return `Account Number: ${this.accountNumber}`;
        // Cannot access private member
        // this.balance; // Error
    }
}
```

## Inheritance

Classes can inherit from other classes:

```typescript
class Animal {
    constructor(protected name: string) {}

    move(distance: number = 0): void {
        console.log(`${this.name} moved ${distance}m.`);
    }
}

class Dog extends Animal {
    constructor(name: string, private breed: string) {
        super(name);
    }

    bark(): void {
        console.log("Woof! Woof!");
    }

    // Override base class method
    move(distance: number = 5): void {
        console.log("Running...");
        super.move(distance);
    }
}

const dog = new Dog("Rex", "German Shepherd");
dog.move(); // "Running..." then "Rex moved 5m."
dog.bark(); // "Woof! Woof!"
```

## Abstract Classes

Abstract classes provide a way to define common behavior that can be shared across subclasses:

```typescript
abstract class Shape {
    constructor(protected color: string) {}

    abstract calculateArea(): number;

    abstract calculatePerimeter(): number;

    getColor(): string {
        return this.color;
    }
}

class Circle extends Shape {
    constructor(color: string, private radius: number) {
        super(color);
    }

    calculateArea(): number {
        return Math.PI * this.radius ** 2;
    }

    calculatePerimeter(): number {
        return 2 * Math.PI * this.radius;
    }
}

class Rectangle extends Shape {
    constructor(
        color: string,
        private width: number,
        private height: number
    ) {
        super(color);
    }

    calculateArea(): number {
        return this.width * this.height;
    }

    calculatePerimeter(): number {
        return 2 * (this.width + this.height);
    }
}

// const shape = new Shape("red"); // Error: Cannot create an instance of an abstract class
const circle = new Circle("blue", 5);
const rectangle = new Rectangle("green", 4, 6);
```

## Interfaces and Classes

Classes can implement multiple interfaces:

```typescript
interface Printable {
    print(): void;
}

interface Loggable {
    log(message: string): void;
}

class Document implements Printable, Loggable {
    constructor(private content: string) {}

    print(): void {
        console.log(`Printing: ${this.content}`);
    }

    log(message: string): void {
        console.log(`Log: ${message}`);
    }
}
```

## Static Members

Static members belong to the class itself rather than instances:

```typescript
class MathUtils {
    static PI: number = 3.14159;

    static add(x: number, y: number): number {
        return x + y;
    }

    static {
        // Static initialization block
        console.log("MathUtils initialized");
    }
}

console.log(MathUtils.PI);      // 3.14159
console.log(MathUtils.add(5, 3)); // 8
```

## Advanced Class Patterns

### Singleton Pattern

```typescript
class Singleton {
    private static instance: Singleton;
    private constructor() {}

    static getInstance(): Singleton {
        if (!Singleton.instance) {
            Singleton.instance = new Singleton();
        }
        return Singleton.instance;
    }
}
```

### Factory Pattern

```typescript
abstract class Vehicle {
    abstract getType(): string;
}

class Car extends Vehicle {
    getType(): string {
        return "Car";
    }
}

class Bike extends Vehicle {
    getType(): string {
        return "Bike";
    }
}

class VehicleFactory {
    static createVehicle(type: string): Vehicle {
        switch (type) {
            case "car":
                return new Car();
            case "bike":
                return new Bike();
            default:
                throw new Error("Invalid vehicle type");
        }
    }
}
```

## Best Practices

1. **Use Parameter Properties for Simple Classes**
```typescript
// Good
class User {
    constructor(
        public name: string,
        private age: number
    ) {}
}

// Instead of
class User {
    public name: string;
    private age: number;

    constructor(name: string, age: number) {
        this.name = name;
        this.age = age;
    }
}
```

2. **Prefer Composition Over Inheritance**
```typescript
// Good
class EmailSender {
    send(email: string, content: string) {
        // Send email implementation
    }
}

class UserService {
    private emailSender: EmailSender;

    constructor(emailSender: EmailSender) {
        this.emailSender = emailSender;
    }
}

// Instead of
class UserService extends EmailSender {
    // ...
}
```

3. **Use Access Modifiers Appropriately**
```typescript
class BankAccount {
    private balance: number;  // Encapsulate internal state
    public deposit(amount: number): void {
        this.balance += amount;
    }
}
```

4. **Implement Interfaces for Better Type Safety**
```typescript
interface Repository<T> {
    save(item: T): Promise<void>;
    find(id: string): Promise<T>;
}

class UserRepository implements Repository<User> {
    // Implementation must match interface
}
```

5. **Document Complex Classes**
```typescript
/**
 * Represents a bank account with basic operations
 * @class BankAccount
 * @property {string} accountNumber - Unique account identifier
 * @property {number} balance - Current balance
 */
class BankAccount {
    // Implementation
}
```

## Conclusion

TypeScript classes provide a robust foundation for object-oriented programming with the benefits of static typing. They offer:

- Clear structure for object-oriented code
- Strong encapsulation through access modifiers
- Support for inheritance and polymorphism
- Abstract classes for sharing common behavior
- Interface implementation for type safety
- Static members for utility functions

Remember to:

- Use appropriate access modifiers
- Leverage TypeScript's type system
- Follow SOLID principles
- Prefer composition over inheritance
- Document complex classes
- Use parameter properties for simple classes

With these features and best practices, you can build maintainable and type-safe object-oriented applications in TypeScript.
