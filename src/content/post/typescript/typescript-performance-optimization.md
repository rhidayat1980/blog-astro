---
title: "TypeScript Performance Optimization"
description: "Comprehensive guide to optimizing TypeScript performance including memory management, type optimization, and runtime performance"
publishDate: "Dec 11 2024"
heroImage: "/typescript-performance.png"
category: "TypeScript"
tags: ["typescript", "performance", "optimization", "programming"]
---

# TypeScript Performance Optimization

## Table of Contents
1. [Type System Optimization](#type-system-optimization)
2. [Memory Management](#memory-management)
3. [Runtime Performance](#runtime-performance)
4. [Build Time Optimization](#build-time-optimization)
5. [Framework-Specific Optimizations](#framework-specific-optimizations)

## Type System Optimization

### Type Inference Optimization

```typescript
// ❌ Poor type inference
const items = [];  // Type: any[]
const data = {};   // Type: any

// ✅ Better type inference
const items: string[] = [];
const data: Record<string, unknown> = {};

// ✅ Best: Let TypeScript infer from initialization
const items = ['a', 'b', 'c'];  // Type: string[]
const data = {
    name: 'John',
    age: 30
};  // Type: { name: string; age: number; }
```

### Union Type Optimization

```typescript
// ❌ Expensive union type
type ExpensiveUnion = 
    | { type: 'a'; data: string }
    | { type: 'b'; data: number }
    | { type: 'c'; data: boolean }
    | { type: 'd'; data: object }
    // ... many more variants

// ✅ Optimized discriminated union
type ActionType = 'a' | 'b' | 'c' | 'd';

interface Action {
    type: ActionType;
    data: unknown;
}

// ✅ Type narrowing for better performance
function processAction(action: Action) {
    switch (action.type) {
        case 'a':
            return processStringData(action.data as string);
        case 'b':
            return processNumberData(action.data as number);
        // ...
    }
}
```

### Generic Constraints

```typescript
// ❌ Unconstrained generics
function processData<T>(data: T) {
    // TypeScript has to consider all possible types
    return data;
}

// ✅ Constrained generics
interface DataItem {
    id: string;
    value: unknown;
}

function processData<T extends DataItem>(data: T) {
    // TypeScript only needs to consider types that match DataItem
    return data.id;
}

// ✅ Multiple constraints for better type inference
function merge<
    T extends object,
    U extends Partial<T>
>(target: T, source: U): T & U {
    return { ...target, ...source };
}
```

## Memory Management

### Object Pooling

```typescript
class ObjectPool<T> {
    private pool: T[] = [];
    private factory: () => T;
    private reset: (item: T) => void;

    constructor(
        factory: () => T,
        reset: (item: T) => void,
        initialSize = 0
    ) {
        this.factory = factory;
        this.reset = reset;
        
        // Pre-populate pool
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.factory());
        }
    }

    acquire(): T {
        return this.pool.pop() || this.factory();
    }

    release(item: T): void {
        this.reset(item);
        this.pool.push(item);
    }
}

// Usage
interface Particle {
    x: number;
    y: number;
    velocity: number;
    active: boolean;
}

const particlePool = new ObjectPool<Particle>(
    // Factory
    () => ({ x: 0, y: 0, velocity: 0, active: false }),
    // Reset
    (particle) => {
        particle.x = 0;
        particle.y = 0;
        particle.velocity = 0;
        particle.active = false;
    },
    1000  // Initial pool size
);
```

### Memory-Efficient Data Structures

```typescript
class CircularBuffer<T> {
    private buffer: T[];
    private head = 0;
    private tail = 0;
    private size = 0;

    constructor(private capacity: number) {
        this.buffer = new Array(capacity);
    }

    push(item: T): void {
        this.buffer[this.tail] = item;
        this.tail = (this.tail + 1) % this.capacity;
        this.size = Math.min(this.size + 1, this.capacity);
        if (this.size === this.capacity) {
            this.head = (this.head + 1) % this.capacity;
        }
    }

    pop(): T | undefined {
        if (this.size === 0) return undefined;
        const item = this.buffer[this.head];
        this.head = (this.head + 1) % this.capacity;
        this.size--;
        return item;
    }
}

// Usage
const messageBuffer = new CircularBuffer<string>(100);
```

### WeakMap for Memory Management

```typescript
class Cache<K extends object, V> {
    private cache = new WeakMap<K, V>();
    private hits = 0;
    private misses = 0;

    get(key: K): V | undefined {
        const value = this.cache.get(key);
        if (value === undefined) {
            this.misses++;
        } else {
            this.hits++;
        }
        return value;
    }

    set(key: K, value: V): void {
        this.cache.set(key, value);
    }

    get stats() {
        const total = this.hits + this.misses;
        return {
            hits: this.hits,
            misses: this.misses,
            hitRate: total ? this.hits / total : 0
        };
    }
}

// Usage
const resourceCache = new Cache<object, string>();
```

## Runtime Performance

### Memoization

```typescript
function memoize<T extends object, R>(
    fn: (arg: T) => R,
    keyFn: (arg: T) => string = JSON.stringify
): (arg: T) => R {
    const cache = new Map<string, R>();

    return (arg: T): R => {
        const key = keyFn(arg);
        if (cache.has(key)) {
            return cache.get(key)!;
        }
        const result = fn(arg);
        cache.set(key, result);
        return result;
    };
}

// Usage
interface QueryParams {
    userId: string;
    filter: string;
}

const expensiveQuery = memoize(
    (params: QueryParams) => {
        // Expensive computation
        return `result for ${params.userId}`;
    },
    // Custom key function for better performance
    (params) => `${params.userId}:${params.filter}`
);
```

### Lazy Evaluation

```typescript
class LazyValue<T> {
    private value: T | undefined;
    private computed = false;

    constructor(private factory: () => T) {}

    get(): T {
        if (!this.computed) {
            this.value = this.factory();
            this.computed = true;
        }
        return this.value!;
    }

    invalidate(): void {
        this.computed = false;
        this.value = undefined;
    }
}

// Usage
const expensiveOperation = new LazyValue(() => {
    // Expensive computation
    return complexCalculation();
});
```

### Batch Processing

```typescript
class BatchProcessor<T> {
    private batch: T[] = [];
    private timer: NodeJS.Timeout | null = null;

    constructor(
        private process: (items: T[]) => Promise<void>,
        private options: {
            maxSize: number;
            maxWait: number;
        }
    ) {}

    add(item: T): void {
        this.batch.push(item);

        if (this.batch.length >= this.options.maxSize) {
            this.flush();
        } else if (!this.timer) {
            this.timer = setTimeout(() => this.flush(), this.options.maxWait);
        }
    }

    private async flush(): Promise<void> {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        if (this.batch.length === 0) return;

        const items = [...this.batch];
        this.batch = [];

        await this.process(items);
    }
}

// Usage
const batchLogger = new BatchProcessor<string>(
    async (messages) => {
        await logToServer(messages);
    },
    { maxSize: 100, maxWait: 1000 }
);
```

## Build Time Optimization

### Project References

```typescript
// tsconfig.base.json
{
    "compilerOptions": {
        "composite": true,
        "declaration": true,
        "declarationMap": true,
        "sourceMap": true
    }
}

// packages/core/tsconfig.json
{
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
        "outDir": "./dist",
        "rootDir": "./src"
    }
}

// packages/api/tsconfig.json
{
    "extends": "../../tsconfig.base.json",
    "references": [
        { "path": "../core" }
    ],
    "compilerOptions": {
        "outDir": "./dist",
        "rootDir": "./src"
    }
}
```

### Module Resolution

```typescript
// ❌ Expensive module resolution
import { something } from '../../../shared/utils';

// ✅ Path aliases for better performance
// tsconfig.json
{
    "compilerOptions": {
        "baseUrl": ".",
        "paths": {
            "@shared/*": ["src/shared/*"],
            "@utils/*": ["src/utils/*"]
        }
    }
}

// Usage
import { something } from '@shared/utils';
```

## Framework-Specific Optimizations

### React Optimization

```typescript
// ❌ Unnecessary rerenders
const Component = () => {
    const [data, setData] = useState<Data[]>([]);

    // Created on every render
    const processedData = data.map(item => ({
        ...item,
        processed: true
    }));

    // New function on every render
    const handleClick = () => {
        // Handle click
    };

    return (
        <div onClick={handleClick}>
            {processedData.map(item => (
                <Item key={item.id} data={item} />
            ))}
        </div>
    );
};

// ✅ Optimized component
const Component = () => {
    const [data, setData] = useState<Data[]>([]);

    // Memoized data processing
    const processedData = useMemo(
        () => data.map(item => ({
            ...item,
            processed: true
        })),
        [data]
    );

    // Memoized callback
    const handleClick = useCallback(() => {
        // Handle click
    }, []);

    return (
        <div onClick={handleClick}>
            {processedData.map(item => (
                <Item key={item.id} data={item} />
            ))}
        </div>
    );
};
```

### Vue Optimization

```typescript
// ❌ Expensive computations in template
<template>
    <div>
        {{ expensiveComputation() }}
        <item 
            v-for="item in items"
            :key="item.id"
            :processed-data="processItem(item)"
        />
    </div>
</template>

// ✅ Optimized component
<script setup lang="ts">
import { computed, ref } from 'vue';

const items = ref<Item[]>([]);

// Computed property for expensive computation
const computedValue = computed(() => {
    return expensiveComputation();
});

// Memoized item processing
const processedItems = computed(() => 
    items.value.map(processItem)
);
</script>

<template>
    <div>
        {{ computedValue }}
        <item 
            v-for="item in processedItems"
            :key="item.id"
            :data="item"
        />
    </div>
</template>
```

These optimization techniques help you:

1. Improve type system performance
2. Reduce memory usage
3. Enhance runtime performance
4. Speed up build times
5. Optimize framework-specific code

Would you like me to:
1. Add more optimization techniques?
2. Create posts about TypeScript testing strategies?
3. Add more implementation details?
