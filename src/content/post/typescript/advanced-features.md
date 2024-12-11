---
title: "Advanced TypeScript Features"
description: "Deep dive into advanced TypeScript features, techniques, and patterns for building robust applications"
publishDate: "11 Dec 2024"
tags: ["typescript", "javascript", "programming", "web-development", "advanced", "series:typescript:12"]
draft: false
---

## Introduction

TypeScript offers a rich set of advanced features that enable developers to build type-safe, maintainable, and scalable applications. This guide explores these advanced features, providing practical examples and real-world use cases.

## Type System Features

TypeScript's type system includes powerful features that go beyond basic type checking, allowing for complex type manipulations and guarantees.

### 1. Conditional Types

Conditional types enable you to create types that depend on other types, similar to if statements in regular programming.

```typescript
// Basic conditional type
type IsString<T> = T extends string ? true : false;
type Result1 = IsString<string>;  // true
type Result2 = IsString<number>;  // false

// Distributive conditional types
type ToArray<T> = T extends any ? T[] : never;
type StrNumArr = ToArray<string | number>; // string[] | number[]

// Real-world example: API response type
type ApiResponse<T> = T extends void
    ? { success: true }
    : { success: true; data: T } | { success: false; error: string };

// Usage
interface User {
    id: number;
    name: string;
}

async function fetchUser(id: number): Promise<ApiResponse<User>> {
    try {
        const response = await fetch(`/api/users/${id}`);
        const user = await response.json();
        return { success: true, data: user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
```

### 2. Mapped Types with Key Remapping

Mapped types allow you to transform the properties of an existing type into a new type.

```typescript
// Advanced mapped type with key remapping
type Events<T> = {
    [K in keyof T as `${string & K}Changed`]: (newValue: T[K]) => void;
} & {
    [K in keyof T as `${string & K}Validated`]: (value: T[K]) => boolean;
};

interface FormData {
    username: string;
    email: string;
    age: number;
}

type FormEvents = Events<FormData>;
/* Result:
{
    usernameChanged: (newValue: string) => void;
    emailChanged: (newValue: string) => void;
    ageChanged: (newValue: number) => void;
    usernameValidated: (value: string) => boolean;
    emailValidated: (value: string) => boolean;
    ageValidated: (value: number) => boolean;
}
*/

// Practical example: Form validation
class Form implements FormEvents {
    private data: FormData = {
        username: '',
        email: '',
        age: 0
    };

    usernameChanged(newValue: string) {
        if (this.usernameValidated(newValue)) {
            this.data.username = newValue;
        }
    }

    usernameValidated(value: string) {
        return value.length >= 3;
    }

    emailChanged(newValue: string) {
        if (this.emailValidated(newValue)) {
            this.data.email = newValue;
        }
    }

    emailValidated(value: string) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    ageChanged(newValue: number) {
        if (this.ageValidated(newValue)) {
            this.data.age = newValue;
        }
    }

    ageValidated(value: number) {
        return value >= 18 && value <= 100;
    }
}
```

### 3. Template Literal Types

Template literal types combine literal types through template literal strings, enabling powerful string manipulation at the type level.

```typescript
// Advanced template literal types
type CSSProperties = 'margin' | 'padding' | 'border';
type CSSDirections = 'Top' | 'Right' | 'Bottom' | 'Left';
type CSSValues = string | number;

type CSSRule = {
    [P in CSSProperties]: CSSValues;
} & {
    [P in CSSProperties as `${P}${CSSDirections}`]: CSSValues;
};

// Usage
const styles: CSSRule = {
    margin: '10px',
    marginTop: '20px',
    marginRight: 15,
    padding: '5px',
    paddingBottom: '10px',
    border: '1px solid black',
    borderLeft: '2px dashed red'
};

// Event handling with template literals
type EventType = 'click' | 'focus' | 'blur' | 'input';
type HTMLElements = 'Button' | 'Input' | 'Form';
type EventHandler<T extends string> = `on${Capitalize<T>}`;
type ElementEvent = `${HTMLElements}${EventType}`;

type ComponentProps = {
    [E in ElementEvent as EventHandler<E>]?: (event: Event) => void;
};

// Usage
const component: ComponentProps = {
    onButtonClick: (e) => console.log('Button clicked'),
    onInputFocus: (e) => console.log('Input focused'),
    onFormSubmit: (e) => console.log('Form submitted')
};
```

## Advanced Type Manipulation

### 1. Type Recursion and Deep Modifications

```typescript
// Advanced recursive type transformations
type DeepReadonly<T> = {
    readonly [P in keyof T]: T[P] extends object
        ? T[P] extends Function
            ? T[P]
            : DeepReadonly<T[P]>
        : T[P];
};

type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object
        ? T[P] extends Function
            ? T[P]
            : DeepPartial<T[P]>
        : T[P];
};

type DeepRequired<T> = {
    [P in keyof T]-?: T[P] extends object
        ? T[P] extends Function
            ? T[P]
            : DeepRequired<T[P]>
        : T[P];
};

// Practical example: Configuration system
interface Config {
    api: {
        endpoint: string;
        timeout: number;
        retries: {
            count: number;
            delay: number;
        };
    };
    features: {
        darkMode: boolean;
        notifications: {
            email: boolean;
            push: boolean;
            frequency: {
                value: number;
                unit: 'minutes' | 'hours' | 'days';
            };
        };
    };
}

type ReadonlyConfig = DeepReadonly<Config>;
type PartialConfig = DeepPartial<Config>;

// Usage
function updateConfig(config: PartialConfig) {
    // Safe partial updates
}

const defaultConfig: ReadonlyConfig = {
    api: {
        endpoint: 'https://api.example.com',
        timeout: 5000,
        retries: {
            count: 3,
            delay: 1000
        }
    },
    features: {
        darkMode: false,
        notifications: {
            email: true,
            push: true,
            frequency: {
                value: 1,
                unit: 'hours'
            }
        }
    }
};
```

### 2. Advanced Type Inference

```typescript
// Complex type inference patterns
type UnwrapPromiseDeep<T> = T extends Promise<infer U>
    ? UnwrapPromiseDeep<U>
    : T extends Array<infer V>
        ? Array<UnwrapPromiseDeep<V>>
        : T extends object
            ? { [K in keyof T]: UnwrapPromiseDeep<T[K]> }
            : T;

// Practical example: API response handling
interface ApiEndpoints {
    user: Promise<{
        id: number;
        profile: Promise<{
            name: string;
            preferences: Promise<{
                theme: string;
                notifications: boolean;
            }>;
        }>;
    }>;
}

type UnwrappedApi = UnwrapPromiseDeep<ApiEndpoints>;
/* Result:
{
    user: {
        id: number;
        profile: {
            name: string;
            preferences: {
                theme: string;
                notifications: boolean;
            };
        };
    };
}
*/

// Function composition with inference
type Pipeline<T> = {
    then<U>(fn: (value: T) => U): Pipeline<U>;
    value(): T;
};

function createPipeline<T>(initial: T): Pipeline<T> {
    return {
        then: function<U>(fn: (value: T) => U): Pipeline<U> {
            return createPipeline(fn(initial));
        },
        value: () => initial
    };
}

// Usage
const result = createPipeline("hello")
    .then(str => str.toUpperCase())
    .then(str => str.length)
    .then(num => num * 2)
    .value(); // Type is number
```

### 3. Type-Safe Event System

```typescript
// Advanced event system with type safety
type EventMap = {
    userLoggedIn: { userId: string; timestamp: number };
    userLoggedOut: { userId: string; timestamp: number };
    error: { code: number; message: string };
    stateChanged: { 
        previous: Record<string, unknown>;
        current: Record<string, unknown>;
    };
};

class TypeSafeEventEmitter<Events extends Record<string, any>> {
    private listeners = new Map<
        keyof Events,
        Set<(data: Events[keyof Events]) => void>
    >();

    on<E extends keyof Events>(
        event: E,
        callback: (data: Events[E]) => void
    ): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }

        const callbacks = this.listeners.get(event)!;
        callbacks.add(callback);

        // Return unsubscribe function
        return () => {
            callbacks.delete(callback);
            if (callbacks.size === 0) {
                this.listeners.delete(event);
            }
        };
    }

    emit<E extends keyof Events>(event: E, data: Events[E]): void {
        this.listeners.get(event)?.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in ${String(event)} event handler:`, error);
            }
        });
    }

    once<E extends keyof Events>(
        event: E,
        callback: (data: Events[E]) => void
    ): () => void {
        const unsubscribe = this.on(event, (data) => {
            unsubscribe();
            callback(data);
        });
        return unsubscribe;
    }

    removeAllListeners<E extends keyof Events>(event?: E): void {
        if (event) {
            this.listeners.delete(event);
        } else {
            this.listeners.clear();
        }
    }
}

// Usage
const events = new TypeSafeEventEmitter<EventMap>();

const unsubscribe = events.on('userLoggedIn', ({ userId, timestamp }) => {
    console.log(`User ${userId} logged in at ${new Date(timestamp)}`);
});

events.emit('userLoggedIn', {
    userId: '123',
    timestamp: Date.now()
});

// Error: Type '"invalid"' is not assignable to parameter of type 'keyof EventMap'
// events.emit('invalid', {});
```

## Performance Optimizations

### 1. Type Caching and Computation

```typescript
// Type computation optimization
type ComputeDeep<T> = T extends Function
    ? T
    : T extends Array<infer U>
        ? Array<ComputeDeep<U>>
        : T extends object
            ? { [K in keyof T]: ComputeDeep<T[K]> }
            : T;

// Type caching for expensive operations
interface TypeCache<T> {
    readonly _brand: unique symbol;
    value: T;
}

function createTypeCache<T>(value: T): TypeCache<T> {
    return { _brand: Symbol() as any, value };
}

// Usage with heavy computations
type HeavyComputation<T> = ComputeDeep<DeepPartial<DeepReadonly<T>>>;

const cachedType = createTypeCache<HeavyComputation<Config>>({} as any);
type CachedResult = typeof cachedType.value;
```

### 2. Lazy Type Evaluation

```typescript
// Lazy type evaluation patterns
interface LazyType<T> {
    (): T;
    _type?: T;
}

function createLazyType<T>(factory: () => T): LazyType<T> {
    const lazy = () => {
        if (!lazy._type) {
            lazy._type = factory();
        }
        return lazy._type;
    };
    return lazy as LazyType<T>;
}

// Usage
const lazyConfig = createLazyType(() => ({
    // Complex configuration object
    api: {
        endpoint: 'https://api.example.com',
        timeout: 5000
    },
    features: {
        darkMode: true,
        notifications: true
    }
}));

type LazyConfig = ReturnType<typeof lazyConfig>;
```

## Advanced Configuration and Project Structure

### 1. Module Resolution and Path Mapping

```typescript
// tsconfig.json
{
    "compilerOptions": {
        "baseUrl": ".",
        "paths": {
            "@core/*": ["src/core/*"],
            "@features/*": ["src/features/*"],
            "@shared/*": ["src/shared/*"],
            "@utils/*": ["src/utils/*"]
        },
        "moduleResolution": "node16",
        "types": ["node", "jest"],
        "typeRoots": [
            "./node_modules/@types",
            "./src/types"
        ]
    }
}

// Usage in code
import { ApiClient } from '@core/api';
import { UserService } from '@features/user';
import { Logger } from '@utils/logger';
```

### 2. Project References and Build Optimization

```typescript
// Root tsconfig.json
{
    "references": [
        { "path": "./packages/shared" },
        { "path": "./packages/server" },
        { "path": "./packages/client" }
    ],
    "files": []
}

// Shared package tsconfig.json
{
    "compilerOptions": {
        "composite": true,
        "declaration": true,
        "outDir": "./dist",
        "rootDir": "./src"
    },
    "include": ["src/**/*"]
}
```

## Best Practices and Guidelines

1. **Type Safety**
   - Use strict mode (`"strict": true`)
   - Avoid type assertions (`as`)
   - Leverage type inference
   - Use branded types for type safety

2. **Code Organization**
   - Keep related types together
   - Use barrel files for exports
   - Maintain clear type hierarchies
   - Document complex type patterns

3. **Performance**
   - Cache complex type computations
   - Use type aliases for reusability
   - Consider build time impact
   - Optimize module resolution

4. **Error Handling**
   - Use discriminated unions for errors
   - Implement proper error boundaries
   - Maintain type safety in error handlers
   - Document error scenarios

5. **Testing**
   - Write tests for type definitions
   - Test edge cases
   - Verify type constraints
   - Use type assertion tests

## Common Pitfalls and Solutions

1. **Type System Limitations**
   - Understanding variance
   - Handling circular types
   - Managing type inference
   - Dealing with type widening

2. **Performance Issues**
   - Over-complex type definitions
   - Excessive type recursion
   - Large union types
   - Type inference bottlenecks

3. **Maintainability Challenges**
   - Type duplication
   - Poor type documentation
   - Complex type hierarchies
   - Unclear type boundaries

## Conclusion

Advanced TypeScript features provide powerful tools for building robust, type-safe applications. By understanding and properly implementing these features, you can:

- Create more maintainable and scalable code
- Catch errors at compile-time
- Improve developer experience
- Build better tooling and abstractions

Remember to balance type safety with code complexity, and always choose the simplest solution that meets your requirements.

## Series Navigation

- Previous: [TypeScript Decorators](/posts/typescript/decorators)
- Next: [TypeScript with Frameworks](/posts/typescript/typescript-with-frameworks)
