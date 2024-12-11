---
title: "TypeScript Design Patterns"
description: "Implementing common design patterns in TypeScript with practical examples"
publishDate: "11 Dec 2024"
tags: ["typescript", "javascript", "design-patterns", "programming", "architecture", "series:typescript:11"]
draft: false
---

## Creational Patterns

### 1. Singleton Pattern

```typescript
class Database {
    private static instance: Database;
    private constructor() {}

    static getInstance(): Database {
        if (!Database.instance) {
            Database.instance = new Database();
        }
        return Database.instance;
    }

    query(sql: string): Promise<any> {
        // Database query implementation
        return Promise.resolve([]);
    }
}

// Usage
const db1 = Database.getInstance();
const db2 = Database.getInstance();
console.log(db1 === db2); // true
```

### 2. Factory Pattern

```typescript
interface Animal {
    makeSound(): string;
}

class Dog implements Animal {
    makeSound(): string {
        return "Woof!";
    }
}

class Cat implements Animal {
    makeSound(): string {
        return "Meow!";
    }
}

class AnimalFactory {
    createAnimal(type: "dog" | "cat"): Animal {
        switch (type) {
            case "dog":
                return new Dog();
            case "cat":
                return new Cat();
            default:
                throw new Error("Invalid animal type");
        }
    }
}

// Usage
const factory = new AnimalFactory();
const dog = factory.createAnimal("dog");
console.log(dog.makeSound()); // "Woof!"
```

### 3. Builder Pattern

```typescript
class User {
    constructor(
        public name: string,
        public age: number,
        public email?: string,
        public phone?: string
    ) {}
}

class UserBuilder {
    private name!: string;
    private age!: number;
    private email?: string;
    private phone?: string;

    setName(name: string): this {
        this.name = name;
        return this;
    }

    setAge(age: number): this {
        this.age = age;
        return this;
    }

    setEmail(email: string): this {
        this.email = email;
        return this;
    }

    setPhone(phone: string): this {
        this.phone = phone;
        return this;
    }

    build(): User {
        if (!this.name || !this.age) {
            throw new Error("Name and age are required");
        }
        return new User(this.name, this.age, this.email, this.phone);
    }
}

// Usage
const user = new UserBuilder()
    .setName("John")
    .setAge(30)
    .setEmail("john@example.com")
    .build();
```

## Structural Patterns

### 1. Adapter Pattern

```typescript
// Old interface
interface OldPrinter {
    print(text: string): void;
}

// New interface
interface ModernPrinter {
    printDocument(content: string): void;
}

// Old implementation
class LegacyPrinter implements OldPrinter {
    print(text: string): void {
        console.log(`Printing: ${text}`);
    }
}

// Adapter
class PrinterAdapter implements ModernPrinter {
    constructor(private oldPrinter: OldPrinter) {}

    printDocument(content: string): void {
        this.oldPrinter.print(content);
    }
}

// Usage
const legacyPrinter = new LegacyPrinter();
const modernPrinter = new PrinterAdapter(legacyPrinter);
modernPrinter.printDocument("Hello World");
```

### 2. Decorator Pattern

```typescript
interface Coffee {
    cost(): number;
    description(): string;
}

class SimpleCoffee implements Coffee {
    cost(): number {
        return 10;
    }

    description(): string {
        return "Simple coffee";
    }
}

abstract class CoffeeDecorator implements Coffee {
    constructor(protected coffee: Coffee) {}

    cost(): number {
        return this.coffee.cost();
    }

    description(): string {
        return this.coffee.description();
    }
}

class MilkDecorator extends CoffeeDecorator {
    cost(): number {
        return this.coffee.cost() + 2;
    }

    description(): string {
        return `${this.coffee.description()}, milk`;
    }
}

class SugarDecorator extends CoffeeDecorator {
    cost(): number {
        return this.coffee.cost() + 1;
    }

    description(): string {
        return `${this.coffee.description()}, sugar`;
    }
}

// Usage
let coffee: Coffee = new SimpleCoffee();
coffee = new MilkDecorator(coffee);
coffee = new SugarDecorator(coffee);

console.log(coffee.description()); // "Simple coffee, milk, sugar"
console.log(coffee.cost()); // 13
```

### 3. Proxy Pattern

```typescript
interface Image {
    display(): void;
}

class RealImage implements Image {
    constructor(private filename: string) {
        this.loadFromDisk();
    }

    private loadFromDisk(): void {
        console.log(`Loading ${this.filename}`);
    }

    display(): void {
        console.log(`Displaying ${this.filename}`);
    }
}

class ProxyImage implements Image {
    private realImage: RealImage | null = null;

    constructor(private filename: string) {}

    display(): void {
        if (this.realImage === null) {
            this.realImage = new RealImage(this.filename);
        }
        this.realImage.display();
    }
}

// Usage
const image = new ProxyImage("photo.jpg");
// Image is loaded only when display() is called
image.display();
```

## Behavioral Patterns

### 1. Observer Pattern

```typescript
interface Observer {
    update(data: any): void;
}

class Subject {
    private observers: Observer[] = [];

    attach(observer: Observer): void {
        this.observers.push(observer);
    }

    detach(observer: Observer): void {
        const index = this.observers.indexOf(observer);
        if (index !== -1) {
            this.observers.splice(index, 1);
        }
    }

    notify(data: any): void {
        this.observers.forEach(observer => observer.update(data));
    }
}

class NewsAgency extends Subject {
    publishNews(news: string): void {
        this.notify(news);
    }
}

class NewsChannel implements Observer {
    constructor(private name: string) {}

    update(news: string): void {
        console.log(`${this.name} received news: ${news}`);
    }
}

// Usage
const newsAgency = new NewsAgency();
const channel1 = new NewsChannel("Channel 1");
const channel2 = new NewsChannel("Channel 2");

newsAgency.attach(channel1);
newsAgency.attach(channel2);
newsAgency.publishNews("Breaking news!");
```

### 2. Strategy Pattern

```typescript
interface PaymentStrategy {
    pay(amount: number): void;
}

class CreditCardPayment implements PaymentStrategy {
    constructor(private cardNumber: string) {}

    pay(amount: number): void {
        console.log(`Paid ${amount} using credit card ${this.cardNumber}`);
    }
}

class PayPalPayment implements PaymentStrategy {
    constructor(private email: string) {}

    pay(amount: number): void {
        console.log(`Paid ${amount} using PayPal account ${this.email}`);
    }
}

class ShoppingCart {
    constructor(private paymentStrategy: PaymentStrategy) {}

    setPaymentStrategy(strategy: PaymentStrategy): void {
        this.paymentStrategy = strategy;
    }

    checkout(amount: number): void {
        this.paymentStrategy.pay(amount);
    }
}

// Usage
const cart = new ShoppingCart(new CreditCardPayment("1234-5678"));
cart.checkout(100);

cart.setPaymentStrategy(new PayPalPayment("user@example.com"));
cart.checkout(50);
```

### 3. Chain of Responsibility Pattern

```typescript
abstract class Handler {
    protected next: Handler | null = null;

    setNext(handler: Handler): Handler {
        this.next = handler;
        return handler;
    }

    abstract handle(request: string): string | null;
}

class AuthenticationHandler extends Handler {
    handle(request: string): string | null {
        if (request === "authenticate") {
            return "Authenticated";
        }
        return this.next?.handle(request) ?? null;
    }
}

class AuthorizationHandler extends Handler {
    handle(request: string): string | null {
        if (request === "authorize") {
            return "Authorized";
        }
        return this.next?.handle(request) ?? null;
    }
}

class ValidationHandler extends Handler {
    handle(request: string): string | null {
        if (request === "validate") {
            return "Validated";
        }
        return this.next?.handle(request) ?? null;
    }
}

// Usage
const auth = new AuthenticationHandler();
const authz = new AuthorizationHandler();
const validation = new ValidationHandler();

auth.setNext(authz).setNext(validation);

console.log(auth.handle("authenticate")); // "Authenticated"
console.log(auth.handle("authorize")); // "Authorized"
console.log(auth.handle("validate")); // "Validated"
```

## Architectural Patterns

### 1. Repository Pattern

```typescript
interface Repository<T> {
    find(id: string): Promise<T | null>;
    findAll(): Promise<T[]>;
    create(item: T): Promise<T>;
    update(id: string, item: T): Promise<T>;
    delete(id: string): Promise<void>;
}

interface User {
    id: string;
    name: string;
    email: string;
}

class UserRepository implements Repository<User> {
    private users: Map<string, User> = new Map();

    async find(id: string): Promise<User | null> {
        return this.users.get(id) ?? null;
    }

    async findAll(): Promise<User[]> {
        return Array.from(this.users.values());
    }

    async create(user: User): Promise<User> {
        this.users.set(user.id, user);
        return user;
    }

    async update(id: string, user: User): Promise<User> {
        this.users.set(id, user);
        return user;
    }

    async delete(id: string): Promise<void> {
        this.users.delete(id);
    }
}
```

### 2. Service Pattern

```typescript
interface UserService {
    createUser(data: CreateUserDTO): Promise<User>;
    authenticateUser(credentials: Credentials): Promise<string>;
    updateProfile(userId: string, data: UpdateProfileDTO): Promise<User>;
}

class UserServiceImpl implements UserService {
    constructor(
        private userRepository: Repository<User>,
        private authService: AuthService
    ) {}

    async createUser(data: CreateUserDTO): Promise<User> {
        const hashedPassword = await this.authService.hashPassword(data.password);
        const user = await this.userRepository.create({
            ...data,
            password: hashedPassword
        });
        return user;
    }

    // Implement other methods...
}
```

### 3. Unit of Work Pattern

```typescript
class UnitOfWork {
    private transactions: (() => Promise<void>)[] = [];

    addTransaction(transaction: () => Promise<void>): void {
        this.transactions.push(transaction);
    }

    async commit(): Promise<void> {
        try {
            for (const transaction of this.transactions) {
                await transaction();
            }
            this.transactions = [];
        } catch (error) {
            await this.rollback();
            throw error;
        }
    }

    private async rollback(): Promise<void> {
        // Implement rollback logic
    }
}

// Usage
const unitOfWork = new UnitOfWork();
unitOfWork.addTransaction(async () => {
    await userRepository.create(user);
});
unitOfWork.addTransaction(async () => {
    await orderRepository.create(order);
});
await unitOfWork.commit();
```

## Best Practices

1. Follow SOLID principles
2. Keep patterns simple and focused
3. Use composition over inheritance
4. Document pattern usage
5. Consider testability
6. Avoid over-engineering
7. Use patterns that solve real problems

## Common Anti-patterns to Avoid

1. God Objects
2. Tight Coupling
3. Premature Optimization
4. Golden Hammer
5. Spaghetti Code
6. Circular Dependencies
7. Reinventing the Wheel

## Conclusion

Design patterns in TypeScript provide proven solutions to common software design problems. Understanding and properly implementing these patterns can lead to more maintainable and scalable applications.

## Series Navigation

- Previous: [Testing in TypeScript](/posts/typescript/testing)
- Next: [Advanced TypeScript Features](/posts/typescript/advanced-features)
