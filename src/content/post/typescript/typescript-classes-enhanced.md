---
title: "TypeScript Classes: The Complete Guide"
description: "A comprehensive guide to TypeScript classes covering inheritance, access modifiers, abstract classes, decorators, and best practices with real-world examples"
publishDate: "Dec 11 2024"
heroImage: "/typescript-classes.png"
category: "TypeScript"
tags: ["typescript", "classes", "oop", "programming"]
---

# TypeScript Classes: The Complete Guide

TypeScript classes provide a powerful way to define blueprints for objects, combining class-based object-oriented programming with TypeScript's strong type system. This guide covers everything you need to know about TypeScript classes with real-world examples.

## Table of Contents

- [TypeScript Classes: The Complete Guide](#typescript-classes-the-complete-guide)
  - [Table of Contents](#table-of-contents)
  - [Class Basics](#class-basics)
  - [Real-World Database Connection Example](#real-world-database-connection-example)
  - [State Management System Example](#state-management-system-example)
  - [File System Manager Example](#file-system-manager-example)
  - [Design Patterns with Classes](#design-patterns-with-classes)
    - [Observer Pattern](#observer-pattern)
    - [Factory Pattern](#factory-pattern)
  - [Best Practices](#best-practices)
  - [Conclusion](#conclusion)

## Class Basics

Let's start with a real-world example of a logging system:

```typescript
class Logger {
    private static instance: Logger;
    private logEntries: Array<{
        timestamp: Date;
        level: 'info' | 'warn' | 'error';
        message: string;
        metadata?: Record<string, unknown>;
    }> = [];

    private constructor() {}

    static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    log(
        level: 'info' | 'warn' | 'error',
        message: string,
        metadata?: Record<string, unknown>
    ): void {
        this.logEntries.push({
            timestamp: new Date(),
            level,
            message,
            metadata
        });

        const formattedMessage = `[${level.toUpperCase()}] ${message}`;
        switch (level) {
            case 'info':
                console.log(formattedMessage);
                break;
            case 'warn':
                console.warn(formattedMessage);
                break;
            case 'error':
                console.error(formattedMessage);
                break;
        }
    }

    getRecentLogs(count: number = 10): typeof this.logEntries {
        return this.logEntries.slice(-count);
    }

    clearLogs(): void {
        this.logEntries = [];
    }
}

// Usage
const logger = Logger.getInstance();
logger.log('info', 'Application started');
logger.log('error', 'Failed to connect to database', { 
    dbHost: 'localhost:5432',
    errorCode: 'CONN_REFUSED'
});
```

## Real-World Database Connection Example

```typescript
interface ConnectionConfig {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    ssl?: boolean;
}

interface QueryResult<T> {
    rows: T[];
    rowCount: number;
    executionTime: number;
}

class DatabaseConnection {
    private static instance: DatabaseConnection;
    private config: ConnectionConfig;
    private connectionPool: any; // In real implementation, this would be a proper pool type

    private constructor(config: ConnectionConfig) {
        this.config = config;
        this.initializePool();
    }

    static getInstance(config: ConnectionConfig): DatabaseConnection {
        if (!DatabaseConnection.instance) {
            DatabaseConnection.instance = new DatabaseConnection(config);
        }
        return DatabaseConnection.instance;
    }

    private async initializePool(): Promise<void> {
        // Implementation of pool initialization
        this.connectionPool = {
            // Pool configuration
        };
    }

    async query<T>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
        const startTime = Date.now();
        try {
            // Simulated query execution
            const result = await this.executeQuery(sql, params);
            return {
                rows: result,
                rowCount: result.length,
                executionTime: Date.now() - startTime
            };
        } catch (error) {
            throw new Error(`Query failed: ${error.message}`);
        }
    }

    private async executeQuery(sql: string, params?: unknown[]): Promise<any[]> {
        // Implementation of query execution
        return [];
    }

    async transaction<T>(
        callback: (transaction: DatabaseConnection) => Promise<T>
    ): Promise<T> {
        try {
            await this.query('BEGIN');
            const result = await callback(this);
            await this.query('COMMIT');
            return result;
        } catch (error) {
            await this.query('ROLLBACK');
            throw error;
        }
    }

    async close(): Promise<void> {
        // Implementation of connection closing
    }
}
```

## State Management System Example

```typescript
type Listener<T> = (state: T) => void;

class Store<T> {
    private state: T;
    private listeners: Set<Listener<T>> = new Set();

    constructor(initialState: T) {
        this.state = initialState;
    }

    getState(): T {
        return this.state;
    }

    setState(newState: Partial<T>): void {
        this.state = { ...this.state, ...newState };
        this.notify();
    }

    subscribe(listener: Listener<T>): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify(): void {
        this.listeners.forEach(listener => listener(this.state));
    }
}

// Application state example
interface AppState {
    user: {
        id: string;
        name: string;
        isAuthenticated: boolean;
    } | null;
    theme: 'light' | 'dark';
    notifications: Array<{
        id: string;
        message: string;
        type: 'info' | 'success' | 'error';
    }>;
}

class AppStore extends Store<AppState> {
    constructor() {
        super({
            user: null,
            theme: 'light',
            notifications: []
        });
    }

    login(user: AppState['user']): void {
        this.setState({ user: { ...user, isAuthenticated: true } });
    }

    logout(): void {
        this.setState({ user: null });
    }

    toggleTheme(): void {
        this.setState({
            theme: this.getState().theme === 'light' ? 'dark' : 'light'
        });
    }

    addNotification(message: string, type: 'info' | 'success' | 'error'): void {
        const notifications = [...this.getState().notifications];
        notifications.push({
            id: crypto.randomUUID(),
            message,
            type
        });
        this.setState({ notifications });
    }

    removeNotification(id: string): void {
        const notifications = this.getState().notifications.filter(
            n => n.id !== id
        );
        this.setState({ notifications });
    }
}
```

## File System Manager Example

```typescript
interface FileMetadata {
    name: string;
    size: number;
    type: string;
    lastModified: Date;
}

abstract class FileSystemItem {
    constructor(
        protected name: string,
        protected parent: Directory | null
    ) {}

    abstract getSize(): number;
    abstract getType(): string;

    getPath(): string {
        const parentPath = this.parent ? this.parent.getPath() : '';
        return `${parentPath}/${this.name}`;
    }

    getMetadata(): FileMetadata {
        return {
            name: this.name,
            size: this.getSize(),
            type: this.getType(),
            lastModified: new Date()
        };
    }
}

class File extends FileSystemItem {
    constructor(
        name: string,
        parent: Directory | null,
        private content: string
    ) {
        super(name, parent);
    }

    getSize(): number {
        return this.content.length;
    }

    getType(): string {
        return 'file';
    }

    getContent(): string {
        return this.content;
    }

    setContent(content: string): void {
        this.content = content;
    }
}

class Directory extends FileSystemItem {
    private items: Map<string, FileSystemItem> = new Map();

    getSize(): number {
        let totalSize = 0;
        for (const item of this.items.values()) {
            totalSize += item.getSize();
        }
        return totalSize;
    }

    getType(): string {
        return 'directory';
    }

    addItem(item: FileSystemItem): void {
        this.items.set(item.getMetadata().name, item);
    }

    removeItem(name: string): boolean {
        return this.items.delete(name);
    }

    getItem(name: string): FileSystemItem | undefined {
        return this.items.get(name);
    }

    list(): FileMetadata[] {
        return Array.from(this.items.values()).map(item => item.getMetadata());
    }
}

// Usage example
class FileSystem {
    private root: Directory;

    constructor() {
        this.root = new Directory('root', null);
    }

    createFile(path: string, content: string): File {
        const { parent, name } = this.resolvePath(path);
        const file = new File(name, parent, content);
        parent.addItem(file);
        return file;
    }

    createDirectory(path: string): Directory {
        const { parent, name } = this.resolvePath(path);
        const directory = new Directory(name, parent);
        parent.addItem(directory);
        return directory;
    }

    private resolvePath(path: string): { parent: Directory; name: string } {
        const parts = path.split('/').filter(Boolean);
        const name = parts.pop()!;
        let current = this.root;

        for (const part of parts) {
            const next = current.getItem(part);
            if (!next || next.getType() !== 'directory') {
                throw new Error(`Invalid path: ${path}`);
            }
            current = next as Directory;
        }

        return { parent: current, name };
    }
}
```

## Design Patterns with Classes

### Observer Pattern

```typescript
interface Observer<T> {
    update(data: T): void;
}

class Subject<T> {
    private observers: Set<Observer<T>> = new Set();

    addObserver(observer: Observer<T>): void {
        this.observers.add(observer);
    }

    removeObserver(observer: Observer<T>): void {
        this.observers.delete(observer);
    }

    notify(data: T): void {
        this.observers.forEach(observer => observer.update(data));
    }
}

// Example: Price monitoring system
interface PriceUpdate {
    symbol: string;
    price: number;
    timestamp: Date;
}

class PriceMonitor extends Subject<PriceUpdate> {
    private prices: Map<string, number> = new Map();

    updatePrice(symbol: string, price: number): void {
        this.prices.set(symbol, price);
        this.notify({
            symbol,
            price,
            timestamp: new Date()
        });
    }
}

class PriceAlert implements Observer<PriceUpdate> {
    constructor(
        private symbol: string,
        private threshold: number,
        private onAlert: (price: number) => void
    ) {}

    update(data: PriceUpdate): void {
        if (data.symbol === this.symbol && data.price > this.threshold) {
            this.onAlert(data.price);
        }
    }
}
```

### Factory Pattern

```typescript
abstract class Payment {
    constructor(protected amount: number) {}
    abstract process(): Promise<boolean>;
}

class CreditCardPayment extends Payment {
    constructor(
        amount: number,
        private cardNumber: string,
        private cvv: string
    ) {
        super(amount);
    }

    async process(): Promise<boolean> {
        // Implementation of credit card processing
        return true;
    }
}

class PayPalPayment extends Payment {
    constructor(
        amount: number,
        private email: string
    ) {
        super(amount);
    }

    async process(): Promise<boolean> {
        // Implementation of PayPal processing
        return true;
    }
}

class BankTransferPayment extends Payment {
    constructor(
        amount: number,
        private accountNumber: string,
        private routingNumber: string
    ) {
        super(amount);
    }

    async process(): Promise<boolean> {
        // Implementation of bank transfer processing
        return true;
    }
}

class PaymentFactory {
    static createPayment(
        type: 'credit-card',
        amount: number,
        cardNumber: string,
        cvv: string
    ): Payment;
    static createPayment(
        type: 'paypal',
        amount: number,
        email: string
    ): Payment;
    static createPayment(
        type: 'bank-transfer',
        amount: number,
        accountNumber: string,
        routingNumber: string
    ): Payment;
    static createPayment(
        type: string,
        amount: number,
        ...args: string[]
    ): Payment {
        switch (type) {
            case 'credit-card':
                return new CreditCardPayment(amount, args[0], args[1]);
            case 'paypal':
                return new PayPalPayment(amount, args[0]);
            case 'bank-transfer':
                return new BankTransferPayment(amount, args[0], args[1]);
            default:
                throw new Error(`Unsupported payment type: ${type}`);
        }
    }
}
```

## Best Practices

1. **Use Access Modifiers Appropriately**

```typescript
class BankAccount {
    // Private fields for encapsulation
    private balance: number;
    private transactions: Array<{
        type: 'deposit' | 'withdrawal';
        amount: number;
        date: Date;
    }> = [];

    // Public methods for interface
    constructor(initialBalance: number = 0) {
        this.balance = initialBalance;
    }

    public deposit(amount: number): void {
        if (amount <= 0) {
            throw new Error('Deposit amount must be positive');
        }

        this.balance += amount;
        this.recordTransaction('deposit', amount);
    }

    public withdraw(amount: number): void {
        if (amount <= 0) {
            throw new Error('Withdrawal amount must be positive');
        }
        if (amount > this.balance) {
            throw new Error('Insufficient funds');
        }

        this.balance -= amount;
        this.recordTransaction('withdrawal', amount);
    }

    public getBalance(): number {
        return this.balance;
    }

    // Protected method for inheritance
    protected recordTransaction(
        type: 'deposit' | 'withdrawal',
        amount: number
    ): void {
        this.transactions.push({
            type,
            amount,
            date: new Date()
        });
    }
}
```

2. **Implement the Single Responsibility Principle**

```typescript
// Good: Each class has a single responsibility
class UserValidator {
    validateUsername(username: string): boolean {
        return username.length >= 3;
    }

    validateEmail(email: string): boolean {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
}

class UserRepository {
    async save(user: User): Promise<void> {
        // Database operations
    }

    async findById(id: string): Promise<User> {
        // Database operations
        return {} as User;
    }
}

class UserService {
    constructor(
        private validator: UserValidator,
        private repository: UserRepository
    ) {}

    async createUser(userData: User): Promise<User> {
        if (!this.validator.validateUsername(userData.username)) {
            throw new Error('Invalid username');
        }
        if (!this.validator.validateEmail(userData.email)) {
            throw new Error('Invalid email');
        }

        return this.repository.save(userData);
    }
}
```

3. **Use Generics for Reusable Components**

```typescript
class Cache<T> {
    private cache: Map<string, {
        value: T;
        timestamp: number;
        ttl: number;
    }> = new Map();

    set(key: string, value: T, ttlMs: number): void {
        this.cache.set(key, {
            value,
            timestamp: Date.now(),
            ttl: ttlMs
        });
    }

    get(key: string): T | null {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() - item.timestamp > item.ttl) {
            this.cache.delete(key);
            return null;
        }

        return item.value;
    }

    clear(): void {
        this.cache.clear();
    }
}

// Usage
const userCache = new Cache<User>();
const configCache = new Cache<ApplicationConfig>();
```

## Conclusion

TypeScript classes provide a robust foundation for object-oriented programming with the benefits of static typing. They offer:

- Strong encapsulation through access modifiers
- Support for inheritance and polymorphism
- Abstract classes for sharing common behavior
- Powerful design patterns implementation
- Type-safe instance creation and method calls

Remember to:

- Use appropriate access modifiers
- Follow SOLID principles
- Keep classes focused and single-purpose
- Leverage TypeScript's type system
- Document complex class hierarchies
- Use dependency injection when appropriate

With these patterns and best practices, you can build maintainable and type-safe object-oriented applications in TypeScript.
