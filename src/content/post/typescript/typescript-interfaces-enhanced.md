---
title: "TypeScript Interfaces: A Complete Guide"
description: "Master TypeScript interfaces with this comprehensive guide covering interface declarations, optional properties, readonly properties, extending interfaces, and implementing interfaces in classes with real-world examples"
publishDate: "Dec 11 2024"
heroImage: "/typescript-interfaces.png"
category: "TypeScript"
tags: ["typescript", "interfaces", "programming", "web-development"]
---

# TypeScript Interfaces: A Complete Guide

Interfaces are one of TypeScript's most powerful features, allowing you to define contracts in your code and providing explicit names for type checking. This comprehensive guide covers everything you need to know about TypeScript interfaces with real-world examples.

## Table of Contents
1. [Basic Interface Declaration](#basic-interface-declaration)
2. [Optional and Readonly Properties](#optional-and-readonly-properties)
3. [Function Types](#function-types)
4. [Indexable Types](#indexable-types)
5. [Extending Interfaces](#extending-interfaces)
6. [Implementing Interfaces](#implementing-interfaces)
7. [Real-World Examples](#real-world-examples)
8. [Best Practices](#best-practices)

## Basic Interface Declaration

Let's start with a real-world example of a user management system:

```typescript
// Basic user interface
interface User {
    id: string;
    username: string;
    email: string;
    createdAt: Date;
    lastLogin?: Date;
}

// User service interface
interface UserService {
    findById(id: string): Promise<User>;
    create(user: Omit<User, 'id' | 'createdAt'>): Promise<User>;
    update(id: string, user: Partial<User>): Promise<User>;
    delete(id: string): Promise<boolean>;
}

// Implementation example
class UserServiceImpl implements UserService {
    private users: Map<string, User> = new Map();

    async findById(id: string): Promise<User> {
        const user = this.users.get(id);
        if (!user) throw new Error('User not found');
        return user;
    }

    async create(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
        const newUser: User = {
            ...userData,
            id: crypto.randomUUID(),
            createdAt: new Date()
        };
        this.users.set(newUser.id, newUser);
        return newUser;
    }

    async update(id: string, userData: Partial<User>): Promise<User> {
        const existingUser = await this.findById(id);
        const updatedUser = { ...existingUser, ...userData };
        this.users.set(id, updatedUser);
        return updatedUser;
    }

    async delete(id: string): Promise<boolean> {
        return this.users.delete(id);
    }
}
```

## Real-World API Interface Examples

### RESTful API Client Interface

```typescript
// API Response interfaces
interface ApiResponse<T> {
    data: T;
    metadata: {
        timestamp: number;
        status: number;
        message: string;
    };
}

interface PaginatedResponse<T> extends ApiResponse<T[]> {
    metadata: {
        timestamp: number;
        status: number;
        message: string;
        pagination: {
            currentPage: number;
            pageSize: number;
            totalPages: number;
            totalItems: number;
        };
    };
}

// API Client interface
interface ApiClient {
    get<T>(url: string, params?: Record<string, string>): Promise<ApiResponse<T>>;
    post<T, U>(url: string, data: T): Promise<ApiResponse<U>>;
    put<T, U>(url: string, data: T): Promise<ApiResponse<U>>;
    delete(url: string): Promise<ApiResponse<void>>;
}

// Implementation example
class HttpApiClient implements ApiClient {
    constructor(private baseUrl: string, private apiKey: string) {}

    private async request<T>(
        url: string,
        options: RequestInit
    ): Promise<ApiResponse<T>> {
        const response = await fetch(`${this.baseUrl}${url}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                ...options.headers,
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        return response.json();
    }

    async get<T>(url: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
        const queryString = params
            ? `?${new URLSearchParams(params).toString()}`
            : '';
        return this.request<T>(`${url}${queryString}`, { method: 'GET' });
    }

    async post<T, U>(url: string, data: T): Promise<ApiResponse<U>> {
        return this.request<U>(url, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async put<T, U>(url: string, data: T): Promise<ApiResponse<U>> {
        return this.request<U>(url, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async delete(url: string): Promise<ApiResponse<void>> {
        return this.request(url, { method: 'DELETE' });
    }
}
```

### E-commerce System Interfaces

```typescript
// Product management interfaces
interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    stock: number;
    images: string[];
}

interface CartItem {
    productId: string;
    quantity: number;
    price: number;
}

interface ShoppingCart {
    id: string;
    userId: string;
    items: CartItem[];
    subtotal: number;
    tax: number;
    total: number;
}

interface Order extends Omit<ShoppingCart, 'id'> {
    id: string;
    orderNumber: string;
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    shippingAddress: Address;
    billingAddress: Address;
    paymentDetails: PaymentDetails;
    createdAt: Date;
    updatedAt: Date;
}

interface Address {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
}

interface PaymentDetails {
    method: 'credit_card' | 'paypal' | 'bank_transfer';
    status: 'pending' | 'completed' | 'failed';
    transactionId?: string;
}

// E-commerce service interfaces
interface ProductService {
    findById(id: string): Promise<Product>;
    search(query: string, category?: string): Promise<Product[]>;
    updateStock(id: string, quantity: number): Promise<void>;
}

interface CartService {
    getCart(userId: string): Promise<ShoppingCart>;
    addItem(userId: string, productId: string, quantity: number): Promise<void>;
    removeItem(userId: string, productId: string): Promise<void>;
    updateQuantity(userId: string, productId: string, quantity: number): Promise<void>;
    checkout(userId: string): Promise<Order>;
}

// Implementation example of cart service
class CartServiceImpl implements CartService {
    constructor(
        private productService: ProductService,
        private cartRepository: Repository<ShoppingCart>,
        private orderRepository: Repository<Order>
    ) {}

    async getCart(userId: string): Promise<ShoppingCart> {
        let cart = await this.cartRepository.findOne({ userId });
        if (!cart) {
            cart = await this.createNewCart(userId);
        }
        return this.calculateTotals(cart);
    }

    async addItem(userId: string, productId: string, quantity: number): Promise<void> {
        const cart = await this.getCart(userId);
        const product = await this.productService.findById(productId);

        const existingItem = cart.items.find(item => item.productId === productId);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.items.push({
                productId,
                quantity,
                price: product.price
            });
        }

        await this.cartRepository.save(this.calculateTotals(cart));
    }

    private calculateTotals(cart: ShoppingCart): ShoppingCart {
        cart.subtotal = cart.items.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
        );
        cart.tax = cart.subtotal * 0.1; // 10% tax
        cart.total = cart.subtotal + cart.tax;
        return cart;
    }

    // ... other method implementations
}
```

### Event System Interfaces

```typescript
// Event system interfaces
interface Event {
    type: string;
    payload: unknown;
    timestamp: number;
}

interface EventHandler<T> {
    handle(event: Event & { payload: T }): Promise<void>;
}

interface EventBus {
    publish<T>(event: Omit<Event & { payload: T }, 'timestamp'>): Promise<void>;
    subscribe<T>(eventType: string, handler: EventHandler<T>): void;
    unsubscribe<T>(eventType: string, handler: EventHandler<T>): void;
}

// Implementation example
class EventBusImpl implements EventBus {
    private handlers: Map<string, EventHandler<unknown>[]> = new Map();

    async publish<T>(event: Omit<Event & { payload: T }, 'timestamp'>): Promise<void> {
        const handlers = this.handlers.get(event.type) || [];
        const fullEvent = {
            ...event,
            timestamp: Date.now()
        };

        await Promise.all(
            handlers.map(handler => handler.handle(fullEvent))
        );
    }

    subscribe<T>(eventType: string, handler: EventHandler<T>): void {
        const handlers = this.handlers.get(eventType) || [];
        handlers.push(handler as EventHandler<unknown>);
        this.handlers.set(eventType, handlers);
    }

    unsubscribe<T>(eventType: string, handler: EventHandler<T>): void {
        const handlers = this.handlers.get(eventType) || [];
        this.handlers.set(
            eventType,
            handlers.filter(h => h !== handler)
        );
    }
}

// Usage example
interface UserCreatedEvent {
    userId: string;
    email: string;
}

class EmailNotificationHandler implements EventHandler<UserCreatedEvent> {
    async handle(event: Event & { payload: UserCreatedEvent }): Promise<void> {
        const { userId, email } = event.payload;
        // Send welcome email
        console.log(`Sending welcome email to ${email}`);
    }
}

// Using the event system
const eventBus = new EventBusImpl();
const emailHandler = new EmailNotificationHandler();

eventBus.subscribe<UserCreatedEvent>('user.created', emailHandler);

// Publishing an event
await eventBus.publish<UserCreatedEvent>({
    type: 'user.created',
    payload: {
        userId: '123',
        email: 'user@example.com'
    }
});
```

## Best Practices

1. **Use Interface Segregation**
```typescript
// Good: Smaller, focused interfaces
interface Readable {
    read(): Buffer;
}

interface Writable {
    write(data: Buffer): void;
}

interface Closeable {
    close(): void;
}

class FileStream implements Readable, Writable, Closeable {
    read(): Buffer {
        // Implementation
        return Buffer.from([]);
    }

    write(data: Buffer): void {
        // Implementation
    }

    close(): void {
        // Implementation
    }
}

// Bad: Large, monolithic interface
interface FileOperations {
    read(): Buffer;
    write(data: Buffer): void;
    close(): void;
    // ... many more methods
}
```

2. **Use Generic Constraints**
```typescript
interface Repository<T extends { id: string }> {
    findById(id: string): Promise<T>;
    save(item: T): Promise<T>;
    delete(id: string): Promise<boolean>;
}

// Now this interface can only be used with types that have an id property
interface User {
    id: string;
    name: string;
}

class UserRepository implements Repository<User> {
    // Implementation
}
```

3. **Document Complex Interfaces**
```typescript
/**
 * Represents a configuration for the application.
 * @property apiKey - The API key for external service authentication
 * @property maxRetries - Maximum number of retry attempts for failed requests
 * @property timeout - Timeout in milliseconds for requests
 */
interface ApplicationConfig {
    apiKey: string;
    maxRetries: number;
    timeout: number;
    endpoints: {
        auth: string;
        api: string;
    };
}
```

4. **Use Declaration Merging Wisely**
```typescript
// Original interface
interface Config {
    name: string;
}

// Adding new properties through declaration merging
interface Config {
    version: string;
}

// The resulting interface has both properties
const config: Config = {
    name: "MyApp",
    version: "1.0.0"
};
```

## Conclusion

TypeScript interfaces are a powerful tool for defining contracts in your code. They provide:

- Clear type definitions for objects and functions
- Reusable type definitions across your codebase
- Support for optional and readonly properties
- Ability to describe complex object shapes and relationships
- Extension and implementation capabilities

Remember to:
- Keep interfaces focused and single-purpose
- Use interface segregation principle
- Document complex interfaces
- Use generics when appropriate
- Leverage declaration merging when needed

With these patterns and best practices, you can build more maintainable and type-safe TypeScript applications.
