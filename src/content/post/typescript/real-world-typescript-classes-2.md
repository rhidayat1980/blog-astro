---
title: "More Real-World TypeScript Classes: Advanced Examples"
description: "Additional real-world TypeScript class examples including rate limiter, state machine, pub/sub system, and more with best practices and implementation patterns"
publishDate: "Dec 11 2024"
heroImage: "/typescript-real-world-2.png"
category: "TypeScript"
tags: ["typescript", "classes", "real-world", "programming"]
---

# More Real-World TypeScript Classes: Advanced Examples

This guide provides additional real-world examples of TypeScript classes commonly used in production applications. Each example includes complete implementation details and best practices.

## Table of Contents

1. [Rate Limiter](#rate-limiter)
2. [State Machine](#state-machine)
3. [Pub/Sub System](#pub-sub-system)
4. [Connection Pool](#connection-pool)
5. [Circuit Breaker](#circuit-breaker)
6. [Job Queue](#job-queue)

## Rate Limiter

A flexible rate limiter implementation with different strategies:

```typescript
interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
}

interface RateLimitInfo {
    remaining: number;
    reset: Date;
    total: number;
}

class TokenBucketRateLimiter {
    private tokens: Map<string, {
        count: number;
        lastRefill: number;
    }> = new Map();

    constructor(private config: RateLimitConfig) {}

    async isAllowed(key: string): Promise<RateLimitInfo> {
        this.refillTokens(key);
        const bucket = this.tokens.get(key)!;

        if (bucket.count > 0) {
            bucket.count--;
            return {
                remaining: bucket.count,
                reset: new Date(bucket.lastRefill + this.config.windowMs),
                total: this.config.maxRequests
            };
        }

        throw new Error('Rate limit exceeded');
    }

    private refillTokens(key: string): void {
        const now = Date.now();
        const bucket = this.tokens.get(key);

        if (!bucket) {
            this.tokens.set(key, {
                count: this.config.maxRequests - 1,
                lastRefill: now
            });
            return;
        }

        const timePassed = now - bucket.lastRefill;
        const tokensToAdd = Math.floor(
            (timePassed / this.config.windowMs) * this.config.maxRequests
        );

        if (tokensToAdd > 0) {
            bucket.count = Math.min(
                this.config.maxRequests,
                bucket.count + tokensToAdd
            );
            bucket.lastRefill = now;
        }
    }
}

// Sliding Window Rate Limiter
class SlidingWindowRateLimiter {
    private requests: Map<string, number[]> = new Map();

    constructor(private config: RateLimitConfig) {}

    async isAllowed(key: string): Promise<RateLimitInfo> {
        const now = Date.now();
        const windowStart = now - this.config.windowMs;

        // Get or initialize request timestamps for this key
        let timestamps = this.requests.get(key) || [];
        timestamps = timestamps.filter(time => time > windowStart);

        if (timestamps.length >= this.config.maxRequests) {
            const oldestRequest = timestamps[0];
            const reset = new Date(oldestRequest + this.config.windowMs);
            return {
                remaining: 0,
                reset,
                total: this.config.maxRequests
            };
        }

        timestamps.push(now);
        this.requests.set(key, timestamps);

        return {
            remaining: this.config.maxRequests - timestamps.length,
            reset: new Date(now + this.config.windowMs),
            total: this.config.maxRequests
        };
    }
}

// Usage example
const rateLimiter = new TokenBucketRateLimiter({
    windowMs: 60000, // 1 minute
    maxRequests: 100
});

async function handleRequest(userId: string) {
    try {
        const rateLimitInfo = await rateLimiter.isAllowed(userId);
        console.log(`Requests remaining: ${rateLimitInfo.remaining}`);
        // Process request
    } catch (error) {
        if (error.message === 'Rate limit exceeded') {
            // Handle rate limit exceeded
        }
        throw error;
    }
}
```

## State Machine

A type-safe state machine implementation:

```typescript
type StateTransition<S extends string, E extends string> = {
    from: S;
    to: S;
    event: E;
    guard?: () => boolean;
    action?: () => Promise<void>;
};

class StateMachine<S extends string, E extends string> {
    private currentState: S;
    private transitions: StateTransition<S, E>[] = [];
    private onTransitionCallbacks: ((from: S, to: S, event: E) => void)[] = [];

    constructor(initialState: S) {
        this.currentState = initialState;
    }

    addTransition(transition: StateTransition<S, E>): void {
        this.transitions.push(transition);
    }

    onTransition(callback: (from: S, to: S, event: E) => void): void {
        this.onTransitionCallbacks.push(callback);
    }

    async trigger(event: E): Promise<boolean> {
        const transition = this.transitions.find(
            t => t.from === this.currentState && t.event === event
        );

        if (!transition) {
            return false;
        }

        if (transition.guard && !transition.guard()) {
            return false;
        }

        const fromState = this.currentState;
        this.currentState = transition.to;

        if (transition.action) {
            await transition.action();
        }

        this.onTransitionCallbacks.forEach(callback =>
            callback(fromState, transition.to, event)
        );

        return true;
    }

    getCurrentState(): S {
        return this.currentState;
    }
}

// Example: Order Processing State Machine
type OrderState = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
type OrderEvent = 'process' | 'ship' | 'deliver' | 'cancel';

class OrderProcessor {
    private stateMachine: StateMachine<OrderState, OrderEvent>;
    private orderId: string;

    constructor(orderId: string) {
        this.orderId = orderId;
        this.stateMachine = new StateMachine<OrderState, OrderEvent>('pending');
        this.setupTransitions();
    }

    private setupTransitions(): void {
        // Add transitions
        this.stateMachine.addTransition({
            from: 'pending',
            to: 'processing',
            event: 'process',
            guard: () => this.checkInventory(),
            action: async () => await this.processOrder()
        });

        this.stateMachine.addTransition({
            from: 'processing',
            to: 'shipped',
            event: 'ship',
            action: async () => await this.shipOrder()
        });

        this.stateMachine.addTransition({
            from: 'shipped',
            to: 'delivered',
            event: 'deliver',
            action: async () => await this.deliverOrder()
        });

        // Add cancel transitions from multiple states
        ['pending', 'processing'].forEach(state => {
            this.stateMachine.addTransition({
                from: state as OrderState,
                to: 'cancelled',
                event: 'cancel',
                action: async () => await this.cancelOrder()
            });
        });

        // Add transition logging
        this.stateMachine.onTransition((from, to, event) => {
            console.log(`Order ${this.orderId}: ${from} -> ${to} (${event})`);
        });
    }

    private checkInventory(): boolean {
        // Implementation
        return true;
    }

    private async processOrder(): Promise<void> {
        // Implementation
    }

    private async shipOrder(): Promise<void> {
        // Implementation
    }

    private async deliverOrder(): Promise<void> {
        // Implementation
    }

    private async cancelOrder(): Promise<void> {
        // Implementation
    }

    async triggerEvent(event: OrderEvent): Promise<boolean> {
        return this.stateMachine.trigger(event);
    }

    getState(): OrderState {
        return this.stateMachine.getCurrentState();
    }
}
```

## Pub/Sub System

A type-safe publish/subscribe system:

```typescript
type EventMap = {
    'user:created': { id: string; email: string };
    'user:updated': { id: string; changes: Record<string, any> };
    'user:deleted': { id: string };
    'order:placed': { orderId: string; userId: string; amount: number };
    'order:shipped': { orderId: string; trackingNumber: string };
};

type EventCallback<T> = (data: T) => void | Promise<void>;

class EventBus {
    private handlers = new Map<
        keyof EventMap,
        Set<EventCallback<any>>
    >();

    subscribe<E extends keyof EventMap>(
        event: E,
        handler: EventCallback<EventMap[E]>
    ): () => void {
        const handlers = this.handlers.get(event) || new Set();
        handlers.add(handler);
        this.handlers.set(event, handlers);

        // Return unsubscribe function
        return () => {
            const handlers = this.handlers.get(event);
            if (handlers) {
                handlers.delete(handler);
                if (handlers.size === 0) {
                    this.handlers.delete(event);
                }
            }
        };
    }

    async publish<E extends keyof EventMap>(
        event: E,
        data: EventMap[E]
    ): Promise<void> {
        const handlers = this.handlers.get(event);
        if (!handlers) return;

        const promises = Array.from(handlers).map(handler =>
            Promise.resolve(handler(data))
        );

        await Promise.all(promises);
    }

    hasSubscribers(event: keyof EventMap): boolean {
        return this.handlers.has(event);
    }

    clearSubscribers(event?: keyof EventMap): void {
        if (event) {
            this.handlers.delete(event);
        } else {
            this.handlers.clear();
        }
    }
}

// Example usage
const eventBus = new EventBus();

// Subscribe to events
const unsubscribe = eventBus.subscribe('user:created', async (data) => {
    console.log(`New user created: ${data.email}`);
    // Send welcome email
    await sendWelcomeEmail(data.email);
});

eventBus.subscribe('order:placed', async (data) => {
    console.log(`New order placed: ${data.orderId}`);
    // Process order
    await processOrder(data.orderId);
});

// Publish events
await eventBus.publish('user:created', {
    id: '123',
    email: 'user@example.com'
});

await eventBus.publish('order:placed', {
    orderId: 'order123',
    userId: '123',
    amount: 99.99
});

// Cleanup
unsubscribe();
```

## Connection Pool

A generic connection pool implementation:

```typescript
interface PoolConfig {
    min: number;
    max: number;
    acquireTimeoutMs: number;
    idleTimeoutMs: number;
    createTimeoutMs: number;
}

interface PooledResource<T> {
    resource: T;
    lastUsed: number;
    created: number;
}

class ConnectionPool<T> {
    private resources: PooledResource<T>[] = [];
    private waiting: Array<{
        resolve: (resource: T) => void;
        reject: (error: Error) => void;
        timeout: NodeJS.Timeout;
    }> = [];

    constructor(
        private factory: {
            create: () => Promise<T>;
            destroy: (resource: T) => Promise<void>;
            validate: (resource: T) => Promise<boolean>;
        },
        private config: PoolConfig
    ) {
        this.initialize();
        this.startMaintenanceInterval();
    }

    private async initialize(): Promise<void> {
        for (let i = 0; i < this.config.min; i++) {
            await this.addResource();
        }
    }

    private async addResource(): Promise<void> {
        const resource = await this.createResource();
        this.resources.push({
            resource,
            lastUsed: Date.now(),
            created: Date.now()
        });
    }

    private async createResource(): Promise<T> {
        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(
                () => reject(new Error('Resource creation timeout')),
                this.config.createTimeoutMs
            )
        );

        return Promise.race([
            this.factory.create(),
            timeoutPromise
        ]);
    }

    async acquire(): Promise<T> {
        // Check for available resource
        const available = this.resources.find(r => !r.inUse);
        if (available) {
            available.inUse = true;
            available.lastUsed = Date.now();
            return available.resource;
        }

        // Create new resource if possible
        if (this.resources.length < this.config.max) {
            await this.addResource();
            return this.acquire();
        }

        // Wait for resource
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.waiting = this.waiting.filter(w => w.timeout !== timeout);
                reject(new Error('Acquire timeout'));
            }, this.config.acquireTimeoutMs);

            this.waiting.push({ resolve, reject, timeout });
        });
    }

    async release(resource: T): Promise<void> {
        const index = this.resources.findIndex(r => r.resource === resource);
        if (index === -1) {
            throw new Error('Resource not found in pool');
        }

        const pooledResource = this.resources[index];
        pooledResource.lastUsed = Date.now();
        pooledResource.inUse = false;

        // Check waiting queue
        if (this.waiting.length > 0) {
            const { resolve, timeout } = this.waiting.shift()!;
            clearTimeout(timeout);
            pooledResource.inUse = true;
            resolve(resource);
        }
    }

    private startMaintenanceInterval(): void {
        setInterval(async () => {
            await this.performMaintenance();
        }, Math.floor(this.config.idleTimeoutMs / 2));
    }

    private async performMaintenance(): Promise<void> {
        const now = Date.now();

        // Remove idle resources above minimum
        if (this.resources.length > this.config.min) {
            const idleResources = this.resources
                .filter(r => !r.inUse && now - r.lastUsed > this.config.idleTimeoutMs)
                .slice(0, this.resources.length - this.config.min);

            for (const resource of idleResources) {
                await this.factory.destroy(resource.resource);
                this.resources = this.resources.filter(r => r !== resource);
            }
        }

        // Validate and replace invalid resources
        for (const resource of this.resources) {
            if (!resource.inUse) {
                try {
                    const isValid = await this.factory.validate(resource.resource);
                    if (!isValid) {
                        await this.factory.destroy(resource.resource);
                        const newResource = await this.createResource();
                        resource.resource = newResource;
                        resource.created = now;
                    }
                } catch (error) {
                    console.error('Resource validation failed:', error);
                }
            }
        }
    }

    async shutdown(): Promise<void> {
        // Reject waiting requests
        this.waiting.forEach(({ reject, timeout }) => {
            clearTimeout(timeout);
            reject(new Error('Pool is shutting down'));
        });
        this.waiting = [];

        // Destroy all resources
        await Promise.all(
            this.resources.map(r => this.factory.destroy(r.resource))
        );
        this.resources = [];
    }
}

// Example usage with database connections
interface DbConnection {
    query: (sql: string, params?: any[]) => Promise<any>;
    close: () => Promise<void>;
}

const pool = new ConnectionPool<DbConnection>({
    create: async () => {
        // Create database connection
        return {
            query: async (sql, params) => {
                // Execute query
            },
            close: async () => {
                // Close connection
            }
        };
    },
    destroy: async (connection) => {
        await connection.close();
    },
    validate: async (connection) => {
        try {
            await connection.query('SELECT 1');
            return true;
        } catch {
            return false;
        }
    }
}, {
    min: 5,
    max: 20,
    acquireTimeoutMs: 5000,
    idleTimeoutMs: 30000,
    createTimeoutMs: 5000
});

// Using the pool
async function executeQuery(sql: string, params?: any[]): Promise<any> {
    const connection = await pool.acquire();
    try {
        return await connection.query(sql, params);
    } finally {
        await pool.release(connection);
    }
}
```

These examples demonstrate advanced TypeScript class implementations with:

- Strong typing and type safety
- Error handling and timeouts
- Resource management
- Event handling
- State management
- Performance optimization

Would you like me to:

1. Add more examples?
2. Add more implementation details to any example?
3. Add more use cases or variations?
