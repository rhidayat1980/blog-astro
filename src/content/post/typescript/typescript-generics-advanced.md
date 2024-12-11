---
title: "TypeScript Generics and Advanced Types"
description: "Deep dive into TypeScript generics, conditional types, mapped types, and utility types with practical examples"
publishDate: "Dec 11 2024"
heroImage: "/typescript-generics.png"
category: "TypeScript"
tags: ["typescript", "generics", "advanced-types", "programming"]
---

# TypeScript Generics and Advanced Types

## Table of Contents
1. [Advanced Generics](#advanced-generics)
2. [Conditional Types](#conditional-types)
3. [Mapped Types](#mapped-types)
4. [Template Literal Types](#template-literal-types)
5. [Utility Types](#utility-types)

## Advanced Generics

### Generic Constraints and Defaults

```typescript
// Generic constraints
interface HasLength {
    length: number;
}

function measureLength<T extends HasLength>(item: T): number {
    return item.length;
}

// Generic defaults
interface ApiResponse<T = any> {
    data: T;
    status: number;
    message: string;
}

// Generic factory
class GenericFactory<T> {
    create<K extends keyof T>(property: K, value: T[K]): T {
        return { [property]: value } as T;
    }
}
```

### Generic Type Inference

```typescript
// Infer return types
function wrap<T>(value: T): [T] {
    return [value];
}

// Infer complex types
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
type UnwrapArray<T> = T extends Array<infer U> ? U : T;

// Generic type guards
function isOfType<T>(value: unknown, property: keyof T): value is T {
    return value != null && property in value;
}
```

## Conditional Types

### Basic Conditional Types

```typescript
type IsString<T> = T extends string ? true : false;
type IsStringType = IsString<string>; // true
type IsNumberType = IsString<number>; // false

// Conditional type with unions
type NonNullable<T> = T extends null | undefined ? never : T;

// Distributive conditional types
type ToArray<T> = T extends any ? T[] : never;
type StringOrNumberArray = ToArray<string | number>; // string[] | number[]
```

### Advanced Conditional Types

```typescript
// Extract and Exclude
type Extract<T, U> = T extends U ? T : never;
type Exclude<T, U> = T extends U ? never : T;

// Type inference in conditional types
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : any;
type Parameters<T> = T extends (...args: infer P) => any ? P : never;

// Recursive conditional types
type DeepReadonly<T> = {
    readonly [P in keyof T]: T[P] extends object 
        ? DeepReadonly<T[P]> 
        : T[P];
};
```

## Mapped Types

### Basic Mapped Types

```typescript
// Make all properties optional
type Partial<T> = {
    [P in keyof T]?: T[P];
};

// Make all properties readonly
type Readonly<T> = {
    readonly [P in keyof T]: T[P];
};

// Make all properties nullable
type Nullable<T> = {
    [P in keyof T]: T[P] | null;
};
```

### Advanced Mapped Types

```typescript
// Mapped type with key remapping
type Getters<T> = {
    [P in keyof T as `get${Capitalize<string & P>}`]: () => T[P];
};

// Filtered mapped types
type PickByType<T, ValueType> = {
    [P in keyof T as T[P] extends ValueType ? P : never]: T[P];
};

// Deep mapped types
type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object 
        ? DeepPartial<T[P]> 
        : T[P];
};
```

## Template Literal Types

### Basic Template Literals

```typescript
type EventName = 'click' | 'focus' | 'blur';
type EventHandler = `on${Capitalize<EventName>}`; // 'onClick' | 'onFocus' | 'onBlur'

// Combining with other types
type PropName = 'first' | 'last';
type FullProp = `${PropName}Name`; // 'firstName' | 'lastName'
```

### Advanced Template Literals

```typescript
// Complex string manipulation
type CamelToSnake<S extends string> = S extends `${infer T}${infer U}`
    ? `${T extends Capitalize<T>
        ? '_${Lowercase<T>}'
        : T}${CamelToSnake<U>}`
    : S;

// URL pattern matching
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type Endpoint = '/users' | '/posts' | '/comments';
type ApiRoute = `${HttpMethod} ${Endpoint}`;
```

## Utility Types

### Built-in Utility Types

```typescript
// Pick and Omit
type User = {
    id: number;
    name: string;
    email: string;
    password: string;
};

type PublicUser = Omit<User, 'password'>;
type Credentials = Pick<User, 'email' | 'password'>;

// Record and Exclude
type PageInfo = {
    title: string;
    path: string;
};

type SiteMap = Record<string, PageInfo>;
```

### Custom Utility Types

```typescript
// DeepRequired - Make all properties required recursively
type DeepRequired<T> = {
    [P in keyof T]-?: T[P] extends object 
        ? DeepRequired<T[P]> 
        : T[P];
};

// Mutable - Remove readonly modifier
type Mutable<T> = {
    -readonly [P in keyof T]: T[P];
};

// FunctionProperties - Extract function properties
type FunctionProperties<T> = {
    [P in keyof T as T[P] extends Function ? P : never]: T[P];
};
```

### Practical Examples

```typescript
// API Response Handler
type ApiResponse<T> = {
    data: T;
    status: number;
    error?: string;
};

type ApiEndpoints = {
    '/users': User[];
    '/posts': Post[];
    '/comments': Comment[];
};

type ApiClient = {
    [P in keyof ApiEndpoints as `fetch${Capitalize<string & P>}`]: 
        () => Promise<ApiResponse<ApiEndpoints[P]>>;
};

// Form Validation
type ValidationRule<T> = {
    validate: (value: T) => boolean;
    message: string;
};

type FormValidation<T> = {
    [P in keyof T]: ValidationRule<T[P]>[];
};

// Event System
type EventMap = {
    click: MouseEvent;
    keypress: KeyboardEvent;
    focus: FocusEvent;
};

type EventHandlers = {
    [E in keyof EventMap as `on${Capitalize<string & E>}`]: 
        (event: EventMap[E]) => void;
};
```

These advanced TypeScript features enable you to write more type-safe and maintainable code. They're particularly useful when:

1. Building reusable components and libraries
2. Creating type-safe APIs
3. Implementing complex validation logic
4. Handling data transformations
5. Building event systems

Would you like me to:
1. Add more examples for any specific section?
2. Create additional posts about other TypeScript topics?
3. Add more practical use cases?
