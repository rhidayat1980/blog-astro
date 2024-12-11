---
title: "TypeScript Type Guards and Type Narrowing"
description: "Deep dive into TypeScript type guards, type narrowing, and type predicates with practical examples"
publishDate: "Dec 11 2024"
heroImage: "/typescript-type-guards.png"
category: "TypeScript"
tags: ["typescript", "type-guards", "type-narrowing", "programming"]
---

## TypeScript Type Guards and Type Narrowing

## Table of Contents

1. [Type Guards](#type-guards)
2. [Type Predicates](#type-predicates)
3. [Discriminated Unions](#discriminated-unions)
4. [Type Narrowing](#type-narrowing)
5. [Advanced Techniques](#advanced-techniques)

## Type Guards

### Basic Type Guards

```typescript
function processValue(value: string | number) {
    if (typeof value === "string") {
        // TypeScript knows value is a string here
        console.log(value.toUpperCase());
    } else {
        // TypeScript knows value is a number here
        console.log(value.toFixed(2));
    }
}

function processArray(arr: string[] | number[]) {
    if (Array.isArray(arr)) {
        if (arr.length > 0 && typeof arr[0] === "string") {
            // TypeScript knows arr is string[] here
            return arr.map(str => str.toUpperCase());
        }
    }
}
```

### instanceof Type Guards

```typescript
class ApiError extends Error {
    constructor(public statusCode: number, message: string) {
        super(message);
    }
}

class ValidationError extends Error {
    constructor(public field: string, message: string) {
        super(message);
    }
}

function handleError(error: Error) {
    if (error instanceof ApiError) {
        // TypeScript knows error is ApiError here
        console.log(`API Error ${error.statusCode}: ${error.message}`);
    } else if (error instanceof ValidationError) {
        // TypeScript knows error is ValidationError here
        console.log(`Validation Error in ${error.field}: ${error.message}`);
    }
}
```

## Type Predicates

### Custom Type Guards

```typescript
interface User {
    id: string;
    name: string;
    email: string;
}

interface Admin extends User {
    role: 'admin';
    permissions: string[];
}

function isAdmin(user: User): user is Admin {
    return 'role' in user && user.role === 'admin';
}

function handleUser(user: User) {
    if (isAdmin(user)) {
        // TypeScript knows user is Admin here
        console.log(`Admin ${user.name} has permissions: ${user.permissions.join(', ')}`);
    } else {
        // TypeScript knows user is just User here
        console.log(`User ${user.name}`);
    }
}
```

### Complex Type Predicates

```typescript
interface ApiResponse<T> {
    data?: T;
    error?: {
        message: string;
        code: number;
    };
}

function isSuccessResponse<T>(response: ApiResponse<T>): response is Required<Pick<ApiResponse<T>, 'data'>> {
    return response.data !== undefined && response.error === undefined;
}

function handleResponse<T>(response: ApiResponse<T>) {
    if (isSuccessResponse(response)) {
        // TypeScript knows response.data exists here
        console.log('Success:', response.data);
    } else {
        // TypeScript knows response.error might exist here
        console.log('Error:', response.error?.message);
    }
}
```

## Discriminated Unions

### Basic Discriminated Unions

```typescript
type Shape = 
    | { kind: 'circle'; radius: number }
    | { kind: 'rectangle'; width: number; height: number }
    | { kind: 'triangle'; base: number; height: number };

function calculateArea(shape: Shape): number {
    switch (shape.kind) {
        case 'circle':
            return Math.PI * shape.radius ** 2;
        case 'rectangle':
            return shape.width * shape.height;
        case 'triangle':
            return (shape.base * shape.height) / 2;
    }
}
```

### Advanced Discriminated Unions

```typescript
type Result<T, E = Error> = 
    | { kind: 'success'; value: T }
    | { kind: 'failure'; error: E };

type AsyncOperation<T> =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'success'; data: T }
    | { status: 'error'; error: Error };

function handleAsyncOperation<T>(operation: AsyncOperation<T>) {
    switch (operation.status) {
        case 'idle':
            console.log('Operation not started');
            break;
        case 'loading':
            console.log('Operation in progress');
            break;
        case 'success':
            console.log('Success:', operation.data);
            break;
        case 'error':
            console.log('Error:', operation.error.message);
            break;
    }
}
```

## Type Narrowing

### Control Flow Analysis

```typescript
function processValue(value: string | number | null | undefined) {
    if (value == null) {
        // Handles both null and undefined
        return;
    }

    // TypeScript knows value is string | number here
    if (typeof value === "string") {
        // TypeScript knows value is string here
        console.log(value.toUpperCase());
    } else {
        // TypeScript knows value is number here
        console.log(value.toFixed(2));
    }
}
```

### Assertion Functions

```typescript
function assertIsString(value: unknown): asserts value is string {
    if (typeof value !== "string") {
        throw new Error("Value must be a string");
    }
}

function assertIsArray<T>(value: unknown): asserts value is T[] {
    if (!Array.isArray(value)) {
        throw new Error("Value must be an array");
    }
}

function processValue(value: unknown) {
    assertIsString(value);
    // TypeScript knows value is string here
    console.log(value.toUpperCase());
}
```

## Advanced Techniques

### Exhaustiveness Checking

```typescript
type State = 
    | { type: 'idle' }
    | { type: 'loading' }
    | { type: 'success'; data: string }
    | { type: 'error'; error: Error };

function assertNever(x: never): never {
    throw new Error('Unexpected object: ' + x);
}

function handleState(state: State) {
    switch (state.type) {
        case 'idle':
            return 'Idle';
        case 'loading':
            return 'Loading...';
        case 'success':
            return `Success: ${state.data}`;
        case 'error':
            return `Error: ${state.error.message}`;
        default:
            // TypeScript will error if we forget to handle a case
            return assertNever(state);
    }
}
```

### Generic Type Guards

```typescript
function isOfType<T>(value: unknown, property: keyof T): value is T {
    if (value === null || value === undefined) {
        return false;
    }
    return property in (value as T);
}

interface User {
    id: string;
    name: string;
}

function processUser(value: unknown) {
    if (isOfType<User>(value, 'id')) {
        // TypeScript knows value has id property
        console.log(value.id);
    }
}
```

These type guards and narrowing techniques help you:

1. Write more type-safe code
2. Handle edge cases effectively
3. Improve code maintainability
4. Catch errors at compile time
5. Create better developer experience

Would you like me to:

1. Add more examples?
2. Cover more advanced topics?
3. Create additional posts?
