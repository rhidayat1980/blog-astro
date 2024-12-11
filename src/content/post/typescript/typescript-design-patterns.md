---
title: "TypeScript Design Patterns"
description: "Comprehensive guide to implementing common design patterns in TypeScript with real-world examples"
publishDate: "Dec 11 2024"
heroImage: "/typescript-patterns.png"
category: "TypeScript"
tags: ["typescript", "design-patterns", "programming", "architecture"]
---

## TypeScript Design Patterns

## Table of Contents

1. [Creational Patterns](#creational-patterns)
2. [Structural Patterns](#structural-patterns)
3. [Behavioral Patterns](#behavioral-patterns)
4. [Architectural Patterns](#architectural-patterns)

## Creational Patterns

### Singleton Pattern

```typescript
class DatabaseConnection {
    private static instance: DatabaseConnection;
    private constructor(private uri: string) {}

    static getInstance(uri: string): DatabaseConnection {
        if (!DatabaseConnection.instance) {
            DatabaseConnection.instance = new DatabaseConnection(uri);
        }
        return DatabaseConnection.instance;
    }

    connect(): void {
        console.log(`Connecting to database: ${this.uri}`);
    }
}
```

### Factory Pattern

```typescript
interface Logger {
    log(message: string): void;
}

class ConsoleLogger implements Logger {
    log(message: string): void {
        console.log(`[Console]: ${message}`);
    }
}

class FileLogger implements Logger {
    log(message: string): void {
        console.log(`[File]: ${message}`);
    }
}

class LoggerFactory {
    static createLogger(type: 'console' | 'file'): Logger {
        switch (type) {
            case 'console':
                return new ConsoleLogger();
            case 'file':
                return new FileLogger();
            default:
                throw new Error('Invalid logger type');
        }
    }
}
```

### Abstract Factory Pattern

```typescript
interface Button {
    render(): void;
    onClick(): void;
}

interface Input {
    render(): void;
    onInput(): void;
}

interface UIFactory {
    createButton(): Button;
    createInput(): Input;
}

class MaterialButton implements Button {
    render(): void {
        console.log('Rendering Material button');
    }
    onClick(): void {
        console.log('Material button clicked');
    }
}

class MaterialInput implements Input {
    render(): void {
        console.log('Rendering Material input');
    }
    onInput(): void {
        console.log('Material input changed');
    }
}

class MaterialUIFactory implements UIFactory {
    createButton(): Button {
        return new MaterialButton();
    }
    createInput(): Input {
        return new MaterialInput();
    }
}
```

## Structural Patterns

### Adapter Pattern

```typescript
interface ModernAPI {
    request(data: object): Promise<object>;
}

class LegacyAPI {
    makeRequest(xml: string): Promise<string> {
        return Promise.resolve(`Legacy response for ${xml}`);
    }
}

class LegacyAPIAdapter implements ModernAPI {
    constructor(private legacyAPI: LegacyAPI) {}

    async request(data: object): Promise<object> {
        const xml = this.convertToXML(data);
        const response = await this.legacyAPI.makeRequest(xml);
        return this.convertToJSON(response);
    }

    private convertToXML(data: object): string {
        return `<request>${JSON.stringify(data)}</request>`;
    }

    private convertToJSON(xml: string): object {
        return { data: xml };
    }
}
```

### Decorator Pattern

```typescript
interface Component {
    operation(): string;
}

class ConcreteComponent implements Component {
    operation(): string {
        return 'ConcreteComponent';
    }
}

class Decorator implements Component {
    constructor(protected component: Component) {}

    operation(): string {
        return this.component.operation();
    }
}

class LoggingDecorator extends Decorator {
    operation(): string {
        console.log('Logging operation');
        return super.operation();
    }
}

class ValidationDecorator extends Decorator {
    operation(): string {
        if (this.validate()) {
            return super.operation();
        }
        throw new Error('Validation failed');
    }

    private validate(): boolean {
        return true;
    }
}
```

## Behavioral Patterns

### Observer Pattern

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

class DataStore extends Subject {
    private data: any;

    setData(data: any): void {
        this.data = data;
        this.notify(data);
    }
}

class DataDisplay implements Observer {
    update(data: any): void {
        console.log(`Display updated with: ${data}`);
    }
}
```

### Strategy Pattern

```typescript
interface SortStrategy {
    sort(data: number[]): number[];
}

class QuickSort implements SortStrategy {
    sort(data: number[]): number[] {
        return [...data].sort((a, b) => a - b);
    }
}

class MergeSort implements SortStrategy {
    sort(data: number[]): number[] {
        return [...data].sort((a, b) => a - b);
    }
}

class Sorter {
    constructor(private strategy: SortStrategy) {}

    setStrategy(strategy: SortStrategy): void {
        this.strategy = strategy;
    }

    sort(data: number[]): number[] {
        return this.strategy.sort(data);
    }
}
```

## Architectural Patterns

### Repository Pattern

```typescript
interface Repository<T> {
    findAll(): Promise<T[]>;
    findById(id: string): Promise<T | null>;
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
    private users: User[] = [];

    async findAll(): Promise<User[]> {
        return this.users;
    }

    async findById(id: string): Promise<User | null> {
        return this.users.find(user => user.id === id) || null;
    }

    async create(user: User): Promise<User> {
        this.users.push(user);
        return user;
    }

    async update(id: string, user: User): Promise<User> {
        const index = this.users.findIndex(u => u.id === id);
        if (index === -1) throw new Error('User not found');
        this.users[index] = user;
        return user;
    }

    async delete(id: string): Promise<void> {
        const index = this.users.findIndex(u => u.id === id);
        if (index !== -1) {
            this.users.splice(index, 1);
        }
    }
}
```

### Unit of Work Pattern

```typescript
interface UnitOfWork {
    complete(): Promise<void>;
    rollback(): Promise<void>;
}

class DatabaseUnitOfWork implements UnitOfWork {
    private operations: (() => Promise<void>)[] = [];

    addOperation(operation: () => Promise<void>): void {
        this.operations.push(operation);
    }

    async complete(): Promise<void> {
        for (const operation of this.operations) {
            await operation();
        }
        this.operations = [];
    }

    async rollback(): Promise<void> {
        this.operations = [];
    }
}

class UserService {
    constructor(
        private repository: UserRepository,
        private unitOfWork: DatabaseUnitOfWork
    ) {}

    async createUser(user: User): Promise<void> {
        this.unitOfWork.addOperation(async () => {
            await this.repository.create(user);
        });
        await this.unitOfWork.complete();
    }
}
```

These design patterns help in creating maintainable and scalable TypeScript applications. Each pattern addresses specific design challenges:

1. **Creational Patterns**: Handle object creation mechanisms
2. **Structural Patterns**: Deal with object composition
3. **Behavioral Patterns**: Focus on communication between objects
4. **Architectural Patterns**: Address application-wide design concerns

Would you like me to:

1. Add more pattern examples?
2. Add more implementation details?
3. Create additional posts about other TypeScript topics?
