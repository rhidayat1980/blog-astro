---
title: "TypeScript Advanced Types"
description: "Deep dive into advanced TypeScript types, type manipulation, and type system features"
publishDate: "11 Dec 2024"
tags: ["typescript", "javascript", "programming", "web-development", "advanced-types", "series:typescript:6"]
draft: false
---

## Introduction

TypeScript's type system offers powerful features that go beyond basic types. Advanced types allow you to create complex type definitions, ensure type safety, and build robust applications. This guide explores these advanced features and their practical applications.

## Union and Intersection Types

Union and intersection types are fundamental building blocks for creating complex type definitions in TypeScript.

### 1. Union Types

Union types allow a value to be one of several types. They're particularly useful when a function can handle multiple types of input or when a property can have different types.

```typescript
// Basic union type
type StringOrNumber = string | number;

// Union with literal types
type Status = "success" | "error" | "pending";
type HttpCode = 200 | 404 | 500;

// Function parameter union with type narrowing
function process(input: string | number) {
    if (typeof input === "string") {
        return input.toUpperCase();
    }
    return input.toFixed(2);
}

// Practical example: API response handling
type ApiResponse<T> = {
    status: Status;
    data: T | null;
    error?: string;
};

// Usage
interface User {
    id: number;
    name: string;
}

const response: ApiResponse<User> = {
    status: "success",
    data: { id: 1, name: "John" }
};
```

### 2. Intersection Types

Intersection types combine multiple types into one, creating a new type that has all properties of the combined types.

```typescript
// Basic intersection type
interface HasName {
    name: string;
}

interface HasAge {
    age: number;
}

type Person = HasName & HasAge;

// Practical example: Role-based permissions
interface BasicPermissions {
    read: boolean;
    write: boolean;
}

interface AdminPermissions {
    delete: boolean;
    manage: boolean;
}

type FullPermissions = BasicPermissions & AdminPermissions;

const adminUser: FullPermissions = {
    read: true,
    write: true,
    delete: true,
    manage: true
};
```

## Type Guards and Type Narrowing

Type guards and narrowing help TypeScript understand the type of a value within a certain scope.

### 1. Type Guards

Type guards are expressions that perform runtime checks to guarantee the type of a value in a certain scope.

```typescript
// Custom type guards
interface Car {
    type: "car";
    wheels: number;
    fuelType: string;
}

interface Boat {
    type: "boat";
    propellers: number;
    waterType: "fresh" | "salt";
}

interface Plane {
    type: "plane";
    engines: number;
    wingspan: number;
}

type Vehicle = Car | Boat | Plane;

// Type guard functions
function isCar(vehicle: Vehicle): vehicle is Car {
    return vehicle.type === "car";
}

function isBoat(vehicle: Vehicle): vehicle is Boat {
    return vehicle.type === "boat";
}

// Practical usage
function getVehicleInfo(vehicle: Vehicle): string {
    if (isCar(vehicle)) {
        return `Car with ${vehicle.wheels} wheels running on ${vehicle.fuelType}`;
    } else if (isBoat(vehicle)) {
        return `Boat with ${vehicle.propellers} propellers for ${vehicle.waterType} water`;
    } else {
        return `Plane with ${vehicle.engines} engines and ${vehicle.wingspan}m wingspan`;
    }
}
```

### 2. Type Narrowing

Type narrowing allows TypeScript to know more specific types based on conditions.

```typescript
// Discriminated unions with exhaustive checking
type Result<T> =
    | { status: "success"; data: T }
    | { status: "error"; error: string }
    | { status: "loading" };

function handleResult<T>(result: Result<T>): T | null {
    switch (result.status) {
        case "success":
            return result.data;
        case "error":
            console.error(result.error);
            return null;
        case "loading":
            console.log("Loading...");
            return null;
        default:
            // Exhaustive check: TypeScript will error if we miss any case
            const _exhaustiveCheck: never = result;
            return _exhaustiveCheck;
    }
}

// Advanced narrowing with predicates
function isNonNullable<T>(value: T): value is NonNullable<T> {
    return value !== null && value !== undefined;
}

// Usage
const values = [1, null, 2, undefined, 3].filter(isNonNullable);
// values is number[]
```

## Mapped Types

Mapped types allow you to create new types based on existing ones by transforming their properties.

### 1. Basic Mapped Types

```typescript
// Make all properties optional
type Partial<T> = {
    [P in keyof T]?: T[P];
};

// Make all properties readonly
type Readonly<T> = {
    readonly [P in keyof T]: T[P];
};

// Practical example: Form state management
interface UserForm {
    username: string;
    email: string;
    password: string;
}

type UserFormErrors = Record<keyof UserForm, string[]>;
type UserFormTouched = Record<keyof UserForm, boolean>;

const formState: {
    values: UserForm;
    errors: UserFormErrors;
    touched: UserFormTouched;
} = {
    values: { username: "", email: "", password: "" },
    errors: { username: [], email: [], password: [] },
    touched: { username: false, email: false, password: false }
};
```

### 2. Advanced Mapped Types

```typescript
// Conditional type mapping with filtering
type FilteredKeys<T, U> = {
    [P in keyof T as T[P] extends U ? P : never]: T[P];
};

// Example: Extract method properties
interface ApiClient {
    get: (url: string) => Promise<any>;
    post: (url: string, data: any) => Promise<any>;
    token: string;
    baseUrl: string;
}

type ApiMethods = FilteredKeys<ApiClient, Function>;
// Result: { get: ..., post: ... }

// Template literal with mapped types
type Getters<T> = {
    [P in keyof T as `get${Capitalize<string & P>}`]: () => T[P];
};

interface Person {
    name: string;
    age: number;
}

type PersonGetters = Getters<Person>;
// Result: { getName: () => string, getAge: () => number }
```

## Conditional Types

Conditional types select one of two possible types based on a condition.

### 1. Basic Conditional Types

```typescript
// Type distribution in conditional types
type ToArray<T> = T extends any ? T[] : never;

// Extracting return types
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

// Practical example: API response type
type ApiEndpoint<T extends string> = T extends `/${infer Path}`
    ? { path: Path; method: "GET" | "POST" }
    : never;

// Usage
type UserEndpoint = ApiEndpoint<"/users">;
// Result: { path: "users"; method: "GET" | "POST" }
```

### 2. Advanced Conditional Types

```typescript
// Complex type inference
type UnwrapPromise<T> = T extends Promise<infer U>
    ? U extends Promise<any>
        ? UnwrapPromise<U>
        : U
    : T;

// Usage
type NestedPromise = Promise<Promise<Promise<string>>>;
type Unwrapped = UnwrapPromise<NestedPromise>; // string

// Recursive conditional types
type DeepReadonly<T> = {
    readonly [P in keyof T]: T[P] extends object
        ? DeepReadonly<T[P]>
        : T[P];
};

// Example usage
interface Config {
    api: {
        endpoint: string;
        timeout: number;
    };
    features: {
        darkMode: boolean;
        notifications: {
            email: boolean;
            push: boolean;
        };
    };
}

type ReadonlyConfig = DeepReadonly<Config>;
```

## Template Literal Types

Template literal types combine literal types through template literal strings.

### 1. Basic Template Literals

```typescript
// CSS properties type
type CSSValue = number | string;
type CSSProperty = "margin" | "padding" | "border";
type CSSDirection = "top" | "right" | "bottom" | "left";

type CSSRule = `${CSSProperty}${Capitalize<CSSDirection>}` | CSSProperty;

// Usage
const styles: Record<CSSRule, CSSValue> = {
    margin: 10,
    marginTop: "1rem",
    padding: "20px",
    paddingLeft: 15
};
```

### 2. Advanced Template Literals

```typescript
// Event handling types
type EventType = "click" | "focus" | "blur" | "mouseover";
type Handler<T extends string> = `on${Capitalize<T>}`;
type EventHandler<T extends EventType> = Handler<T>;

interface ComponentProps {
    onClick?: () => void;
    onFocus?: () => void;
    onBlur?: () => void;
    onMouseover?: () => void;
}

// Route parameter extraction
type RouteParams<T extends string> = T extends `${string}:${infer Param}/${infer Rest}`
    ? Param | RouteParams<Rest>
    : T extends `${string}:${infer Param}`
        ? Param
        : never;

// Usage
type UserRouteParams = RouteParams<"/users/:id/posts/:postId">;
// Result: "id" | "postId"
```

## Index Types and Lookup Types

Index types and lookup types provide ways to work with the structure of objects and their property types.

### 1. Index Types

```typescript
// Advanced index type patterns
interface API {
    endpoints: {
        users: {
            get: (id: string) => Promise<User>;
            post: (data: NewUser) => Promise<User>;
        };
        posts: {
            get: (id: string) => Promise<Post>;
            delete: (id: string) => Promise<void>;
        };
    };
}

type EndpointMethods<T> = {
    [K in keyof T]: T[K] extends { [key: string]: any }
        ? EndpointMethods<T[K]>
        : T[K] extends Function
            ? K
            : never;
}[keyof T];

type ApiMethods = EndpointMethods<API["endpoints"]>;
```

### 2. Lookup Types

```typescript
// Type-safe object paths
type PathImpl<T, K extends keyof T> = K extends string
    ? T[K] extends Record<string, any>
        ? K | `${K}.${PathImpl<T[K], keyof T[K]>}`
        : K
    : never;

type Path<T> = PathImpl<T, keyof T>;

// Usage
interface User {
    name: string;
    address: {
        street: string;
        city: string;
        country: {
            code: string;
            name: string;
        };
    };
}

type UserPath = Path<User>;
// Result: "name" | "address" | "address.street" | "address.city" | "address.country" | "address.country.code" | "address.country.name"
```

## Utility Types

### 1. Built-in Utility Types

```typescript
// Advanced usage of utility types
interface User {
    id: number;
    name: string;
    email: string;
    password: string;
    preferences: {
        theme: "light" | "dark";
        notifications: boolean;
    };
}

// Combining utility types
type PublicUser = Omit<User, "password"> & {
    readonly id: number;
};

type UserUpdate = Partial<Omit<User, "id">>;

type UserPreferences = Pick<User, "preferences">;
```

### 2. Custom Utility Types

```typescript
// Deep partial with recursive types
type DeepPartial<T> = T extends object ? {
    [P in keyof T]?: DeepPartial<T[P]>;
} : T;

// Mutable with conditional types
type Mutable<T> = {
    -readonly [P in keyof T]: T[P] extends object
        ? Mutable<T[P]>
        : T[P];
};

// Type-safe path accessor
type PathValue<T, P extends Path<T>> = P extends `${infer Key}.${infer Rest}`
    ? Key extends keyof T
        ? Rest extends Path<T[Key]>
            ? PathValue<T[Key], Rest>
            : never
        : never
    : P extends keyof T
        ? T[P]
        : never;

// Usage
function getPath<T, P extends Path<T>>(obj: T, path: P): PathValue<T, P> {
    return path.split('.').reduce((acc: any, part) => acc?.[part], obj);
}
```

## Best Practices

1. **Type Safety First**
   - Use precise types over any
   - Leverage type inference when possible
   - Use type guards for runtime type checking

2. **Code Organization**
   - Keep type definitions close to where they're used
   - Use descriptive names for types
   - Document complex type manipulations

3. **Performance Considerations**
   - Avoid excessive use of complex conditional types
   - Use type aliases for frequently used types
   - Consider the impact on compilation time

4. **Maintainability**
   - Keep type definitions DRY
   - Use built-in utility types when available
   - Document complex type patterns

5. **Error Handling**
   - Use discriminated unions for error states
   - Implement exhaustive checking
   - Provide meaningful type errors

## Common Patterns and Use Cases

1. **Type-Safe API Clients**
```typescript
type ApiRoutes = {
    "/users": {
        GET: { response: User[]; query: { limit: number } };
        POST: { response: User; body: NewUser };
    };
    "/users/:id": {
        GET: { response: User; params: { id: string } };
        PUT: { response: User; body: UserUpdate; params: { id: string } };
    };
};

type ApiClient = {
    [P in keyof ApiRoutes]: {
        [M in keyof ApiRoutes[P]]: ApiRoutes[P][M] extends { response: any }
            ? (config: Omit<ApiRoutes[P][M], "response">) => Promise<ApiRoutes[P][M]["response"]>
            : never;
    };
};
```

2. **Form Validation**
```typescript
type ValidationRule<T> = {
    validate: (value: T) => boolean;
    message: string;
};

type FormValidation<T> = {
    [P in keyof T]: ValidationRule<T[P]>[];
};

// Usage
const userValidation: FormValidation<User> = {
    email: [
        {
            validate: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
            message: "Invalid email format"
        }
    ],
    password: [
        {
            validate: (password) => password.length >= 8,
            message: "Password must be at least 8 characters"
        }
    ]
};
```

3. **State Management**
```typescript
type Action<T extends string = string, P = any> = {
    type: T;
    payload?: P;
};

type ActionCreator<T extends string, P> = (payload: P) => Action<T, P>;

type Reducer<S, A extends Action> = (state: S, action: A) => S;

// Usage
interface CounterState {
    count: number;
}

type CounterAction = 
    | Action<"INCREMENT">
    | Action<"DECREMENT">
    | Action<"SET_COUNT", number>;

const counterReducer: Reducer<CounterState, CounterAction> = (state, action) => {
    switch (action.type) {
        case "INCREMENT":
            return { count: state.count + 1 };
        case "DECREMENT":
            return { count: state.count - 1 };
        case "SET_COUNT":
            return { count: action.payload };
        default:
            return state;
    }
};
```

## Conclusion

Advanced types in TypeScript provide powerful tools for creating type-safe and maintainable applications. By understanding and properly using these features, you can:

- Create more precise and self-documenting code
- Catch errors at compile-time rather than runtime
- Build reusable and type-safe components
- Improve code maintainability and readability

Remember to balance type safety with code complexity, and always choose the simplest type definition that meets your needs.

## Series Navigation

- Previous: [TypeScript Generics](/posts/typescript/generics)
- Next: [TypeScript Decorators](/posts/typescript/decorators)
