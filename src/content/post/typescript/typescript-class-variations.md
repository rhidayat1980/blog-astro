---
title: "TypeScript Class Variations and Use Cases"
description: "Explore different variations and use cases of TypeScript classes including retry strategies, caching strategies, middleware patterns, and more with practical examples"
publishDate: "Dec 11 2024"
heroImage: "/typescript-variations.png"
category: "TypeScript"
tags: ["typescript", "classes", "patterns", "programming"]
---

# TypeScript Class Variations and Use Cases

This guide explores different variations and use cases of TypeScript classes, showing how to adapt common patterns for different scenarios.

## Table of Contents

1. [Retry Strategies](#retry-strategies)
2. [Caching Strategies](#caching-strategies)
3. [Middleware Pattern Variations](#middleware-pattern-variations)
4. [Builder Pattern Variations](#builder-pattern-variations)
5. [Observer Pattern Variations](#observer-pattern-variations)

## Retry Strategies

Different retry strategy implementations for handling failures:

```typescript
// Base retry strategy
abstract class RetryStrategy {
    constructor(protected maxAttempts: number = 3) {}

    abstract calculateDelay(attempt: number): number;

    async execute<T>(
        operation: () => Promise<T>,
        shouldRetry: (error: Error) => boolean = () => true
    ): Promise<T> {
        let lastError: Error;
        
        for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                
                if (!shouldRetry(error) || attempt === this.maxAttempts) {
                    throw error;
                }

                const delay = this.calculateDelay(attempt);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        throw lastError!;
    }
}

// Constant delay strategy
class ConstantDelayStrategy extends RetryStrategy {
    constructor(
        private delayMs: number,
        maxAttempts: number = 3
    ) {
        super(maxAttempts);
    }

    calculateDelay(attempt: number): number {
        return this.delayMs;
    }
}

// Exponential backoff strategy
class ExponentialBackoffStrategy extends RetryStrategy {
    constructor(
        private initialDelayMs: number,
        private maxDelayMs: number,
        maxAttempts: number = 3
    ) {
        super(maxAttempts);
    }

    calculateDelay(attempt: number): number {
        const delay = this.initialDelayMs * Math.pow(2, attempt - 1);
        return Math.min(delay, this.maxDelayMs);
    }
}

// Linear backoff strategy
class LinearBackoffStrategy extends RetryStrategy {
    constructor(
        private initialDelayMs: number,
        private increment: number,
        maxAttempts: number = 3
    ) {
        super(maxAttempts);
    }

    calculateDelay(attempt: number): number {
        return this.initialDelayMs + (this.increment * (attempt - 1));
    }
}

// Fibonacci backoff strategy
class FibonacciBackoffStrategy extends RetryStrategy {
    constructor(
        private baseDelayMs: number,
        maxAttempts: number = 3
    ) {
        super(maxAttempts);
    }

    calculateDelay(attempt: number): number {
        return this.baseDelayMs * this.fibonacci(attempt);
    }

    private fibonacci(n: number): number {
        if (n <= 1) return n;
        let prev = 0, curr = 1;
        for (let i = 2; i <= n; i++) {
            [prev, curr] = [curr, prev + curr];
        }
        return curr;
    }
}

// Jitter backoff strategy
class JitterBackoffStrategy extends RetryStrategy {
    constructor(
        private baseDelayMs: number,
        private maxJitterMs: number,
        maxAttempts: number = 3
    ) {
        super(maxAttempts);
    }

    calculateDelay(attempt: number): number {
        const baseDelay = this.baseDelayMs * Math.pow(2, attempt - 1);
        const jitter = Math.random() * this.maxJitterMs;
        return baseDelay + jitter;
    }
}

// Usage examples
async function demonstrateRetryStrategies() {
    const failingOperation = async () => {
        throw new Error('Operation failed');
    };

    const strategies = [
        new ConstantDelayStrategy(1000),
        new ExponentialBackoffStrategy(1000, 10000),
        new LinearBackoffStrategy(1000, 500),
        new FibonacciBackoffStrategy(1000),
        new JitterBackoffStrategy(1000, 500)
    ];

    for (const strategy of strategies) {
        try {
            await strategy.execute(failingOperation);
        } catch (error) {
            console.log(`${strategy.constructor.name} failed after retries`);
        }
    }
}
```

## Caching Strategies

Different caching strategy implementations:

```typescript
interface CacheEntry<T> {
    value: T;
    expiresAt?: number;
}

abstract class CacheStrategy<T> {
    protected cache = new Map<string, CacheEntry<T>>();

    abstract set(key: string, value: T): void;
    abstract get(key: string): T | undefined;
    abstract has(key: string): boolean;
    abstract delete(key: string): boolean;
    abstract clear(): void;
}

// Time-based expiration strategy
class TTLCacheStrategy<T> extends CacheStrategy<T> {
    constructor(private ttlMs: number) {
        super();
    }

    set(key: string, value: T): void {
        this.cache.set(key, {
            value,
            expiresAt: Date.now() + this.ttlMs
        });
    }

    get(key: string): T | undefined {
        const entry = this.cache.get(key);
        if (!entry) return undefined;

        if (entry.expiresAt && entry.expiresAt < Date.now()) {
            this.cache.delete(key);
            return undefined;
        }

        return entry.value;
    }

    has(key: string): boolean {
        return this.get(key) !== undefined;
    }

    delete(key: string): boolean {
        return this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
    }
}

// LRU (Least Recently Used) strategy
class LRUCacheStrategy<T> extends CacheStrategy<T> {
    private readonly maxSize: number;
    private readonly usage: string[] = [];

    constructor(maxSize: number) {
        super();
        this.maxSize = maxSize;
    }

    set(key: string, value: T): void {
        if (this.cache.has(key)) {
            this.updateUsage(key);
        } else {
            if (this.cache.size >= this.maxSize) {
                const lruKey = this.usage.shift()!;
                this.cache.delete(lruKey);
            }
            this.usage.push(key);
        }
        this.cache.set(key, { value });
    }

    get(key: string): T | undefined {
        const entry = this.cache.get(key);
        if (entry) {
            this.updateUsage(key);
            return entry.value;
        }
        return undefined;
    }

    private updateUsage(key: string): void {
        const index = this.usage.indexOf(key);
        if (index > -1) {
            this.usage.splice(index, 1);
            this.usage.push(key);
        }
    }

    has(key: string): boolean {
        return this.cache.has(key);
    }

    delete(key: string): boolean {
        const index = this.usage.indexOf(key);
        if (index > -1) {
            this.usage.splice(index, 1);
        }
        return this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
        this.usage.length = 0;
    }
}

// Write-through cache strategy
class WriteThroughCacheStrategy<T> extends CacheStrategy<T> {
    constructor(
        private storage: {
            read: (key: string) => Promise<T | undefined>;
            write: (key: string, value: T) => Promise<void>;
            delete: (key: string) => Promise<boolean>;
        }
    ) {
        super();
    }

    async set(key: string, value: T): Promise<void> {
        await this.storage.write(key, value);
        this.cache.set(key, { value });
    }

    async get(key: string): Promise<T | undefined> {
        const cached = this.cache.get(key);
        if (cached) return cached.value;

        const value = await this.storage.read(key);
        if (value !== undefined) {
            this.cache.set(key, { value });
        }
        return value;
    }

    has(key: string): boolean {
        return this.cache.has(key);
    }

    async delete(key: string): Promise<boolean> {
        const result = await this.storage.delete(key);
        if (result) {
            this.cache.delete(key);
        }
        return result;
    }

    clear(): void {
        this.cache.clear();
    }
}

// Two-level cache strategy
class TwoLevelCacheStrategy<T> extends CacheStrategy<T> {
    constructor(
        private l1Cache: CacheStrategy<T>,
        private l2Cache: CacheStrategy<T>
    ) {
        super();
    }

    set(key: string, value: T): void {
        this.l1Cache.set(key, value);
        this.l2Cache.set(key, value);
    }

    get(key: string): T | undefined {
        let value = this.l1Cache.get(key);
        if (value === undefined) {
            value = this.l2Cache.get(key);
            if (value !== undefined) {
                this.l1Cache.set(key, value);
            }
        }
        return value;
    }

    has(key: string): boolean {
        return this.l1Cache.has(key) || this.l2Cache.has(key);
    }

    delete(key: string): boolean {
        const l1Result = this.l1Cache.delete(key);
        const l2Result = this.l2Cache.delete(key);
        return l1Result || l2Result;
    }

    clear(): void {
        this.l1Cache.clear();
        this.l2Cache.clear();
    }
}
```

## Middleware Pattern Variations

Different implementations of the middleware pattern:

```typescript
// Basic middleware
interface Middleware<T> {
    execute(data: T, next: () => Promise<void>): Promise<void>;
}

class MiddlewareChain<T> {
    private middlewares: Middleware<T>[] = [];

    use(middleware: Middleware<T>): this {
        this.middlewares.push(middleware);
        return this;
    }

    async execute(data: T): Promise<void> {
        let index = 0;

        const next = async (): Promise<void> => {
            if (index < this.middlewares.length) {
                const middleware = this.middlewares[index++];
                await middleware.execute(data, next);
            }
        };

        await next();
    }
}

// Bidirectional middleware
interface BidirectionalMiddleware<T> {
    before(data: T): Promise<void>;
    after(data: T): Promise<void>;
}

class BidirectionalMiddlewareChain<T> {
    private middlewares: BidirectionalMiddleware<T>[] = [];

    use(middleware: BidirectionalMiddleware<T>): this {
        this.middlewares.push(middleware);
        return this;
    }

    async execute(data: T): Promise<void> {
        // Execute before handlers in order
        for (const middleware of this.middlewares) {
            await middleware.before(data);
        }

        // Execute after handlers in reverse order
        for (const middleware of this.middlewares.reverse()) {
            await middleware.after(data);
        }
    }
}

// Branching middleware
interface BranchingMiddleware<T> {
    execute(
        data: T,
        next: () => Promise<void>,
        branch: (path: string) => Promise<void>
    ): Promise<void>;
}

class BranchingMiddlewareChain<T> {
    private middlewares: Map<string, BranchingMiddleware<T>[]> = new Map();

    use(path: string, middleware: BranchingMiddleware<T>): this {
        const middlewares = this.middlewares.get(path) || [];
        middlewares.push(middleware);
        this.middlewares.set(path, middlewares);
        return this;
    }

    async execute(path: string, data: T): Promise<void> {
        const middlewares = this.middlewares.get(path) || [];
        let index = 0;

        const next = async (): Promise<void> => {
            if (index < middlewares.length) {
                const middleware = middlewares[index++];
                await middleware.execute(data, next, (newPath) => 
                    this.execute(newPath, data)
                );
            }
        };

        await next();
    }
}

// Pipeline middleware
interface PipelineStage<TIn, TOut> {
    execute(data: TIn): Promise<TOut>;
}

class Pipeline<T> {
    private stages: PipelineStage<any, any>[] = [];

    addStage<U>(stage: PipelineStage<T, U>): Pipeline<U> {
        this.stages.push(stage);
        return this as any;
    }

    async execute(initialData: T): Promise<any> {
        return this.stages.reduce(
            async (promise, stage) => stage.execute(await promise),
            Promise.resolve(initialData)
        );
    }
}
```

## Builder Pattern Variations

Different implementations of the builder pattern:

```typescript
// Fluent builder
class RequestBuilder {
    private request: {
        url?: string;
        method?: string;
        headers?: Record<string, string>;
        body?: unknown;
        timeout?: number;
        retries?: number;
    } = {};

    setUrl(url: string): this {
        this.request.url = url;
        return this;
    }

    setMethod(method: string): this {
        this.request.method = method;
        return this;
    }

    setHeader(key: string, value: string): this {
        this.request.headers = this.request.headers || {};
        this.request.headers[key] = value;
        return this;
    }

    setBody(body: unknown): this {
        this.request.body = body;
        return this;
    }

    setTimeout(timeout: number): this {
        this.request.timeout = timeout;
        return this;
    }

    setRetries(retries: number): this {
        this.request.retries = retries;
        return this;
    }

    build(): Request {
        if (!this.request.url) {
            throw new Error('URL is required');
        }
        return new Request(this.request);
    }
}

// Step builder
interface UserBuilder {
    setName(name: string): UserNameBuilder;
}

interface UserNameBuilder {
    setAge(age: number): UserAgeBuilder;
}

interface UserAgeBuilder {
    setEmail(email: string): UserEmailBuilder;
    build(): User;
}

interface UserEmailBuilder {
    build(): User;
}

class UserBuilderImpl implements UserBuilder, UserNameBuilder, UserAgeBuilder, UserEmailBuilder {
    private user: Partial<User> = {};

    setName(name: string): UserNameBuilder {
        this.user.name = name;
        return this;
    }

    setAge(age: number): UserAgeBuilder {
        this.user.age = age;
        return this;
    }

    setEmail(email: string): UserEmailBuilder {
        this.user.email = email;
        return this;
    }

    build(): User {
        return this.user as User;
    }

    static create(): UserBuilder {
        return new UserBuilderImpl();
    }
}

// Composite builder
interface Component {
    render(): string;
}

class CompositeBuilder {
    private components: Component[] = [];

    addHeading(text: string): this {
        this.components.push({
            render: () => `<h1>${text}</h1>`
        });
        return this;
    }

    addParagraph(text: string): this {
        this.components.push({
            render: () => `<p>${text}</p>`
        });
        return this;
    }

    addList(items: string[]): this {
        this.components.push({
            render: () => `
                <ul>
                    ${items.map(item => `<li>${item}</li>`).join('')}
                </ul>
            `
        });
        return this;
    }

    build(): string {
        return this.components.map(component => 
            component.render()
        ).join('\n');
    }
}
```

These variations demonstrate different ways to implement common patterns, each suited for specific use cases:

- **Retry Strategies**: Different approaches to handling retries
- **Caching Strategies**: Various caching implementations for different needs
- **Middleware Patterns**: Different ways to chain and execute middleware
- **Builder Patterns**: Different approaches to building complex objects

Would you like me to:

1. Add more pattern variations?
2. Add more implementation details to any variation?
3. Add more use cases for existing patterns?
