---
title: "TypeScript Functions and Methods"
description: "Comprehensive guide to functions, methods, and function types in TypeScript"
publishDate: "11 Dec 2024"
tags: ["typescript", "javascript", "programming", "web-development", "series:typescript:3"]
draft: false
---

## Understanding TypeScript Functions

TypeScript enhances JavaScript functions with static typing, providing several key benefits:

1. **Type Safety**: Catch errors at compile-time rather than runtime
2. **Better IDE Support**: Get intelligent code completion and refactoring
3. **Self-Documenting Code**: Types serve as inline documentation
4. **Enhanced Maintainability**: Makes code easier to understand and modify

## Function Declarations

### 1. Basic Function Types

TypeScript provides multiple ways to declare functions, each with its own use cases:

```typescript
// Named function with type annotations
function add(x: number, y: number): number {
    return x + y;
}

// Function expression with type inference
const subtract = function(x: number, y: number): number {
    return x - y;
};

// Arrow function with implicit return
const multiply = (x: number, y: number): number => x * y;

// Function type definition for reusability
type MathFunction = (x: number, y: number) => number;
const divide: MathFunction = (x, y) => x / y;

// Function with type guard
function isString(value: unknown): value is string {
    return typeof value === "string";
}
```

Best Practices:

- Always specify parameter and return types for public functions
- Use type inference for simple internal functions
- Consider using arrow functions for callbacks and short operations
- Create type definitions for reusable function signatures

### 2. Optional and Default Parameters

TypeScript provides flexible parameter handling:

```typescript
// Optional parameter with '?'
function greet(name: string, greeting?: string): string {
    // Type-safe check for optional parameter
    return greeting ? `${greeting}, ${name}!` : `Hello, ${name}!`;
}

// Default parameter with type annotation
function countdown(start: number = 10): void {
    console.log(start);
}

// Rest parameters with type safety
function sum(...numbers: number[]): number {
    return numbers.reduce((total, n) => total + n, 0);
}

// Combining optional and default parameters
function createUser(
    name: string,
    age?: number,
    role: string = "user"
): { name: string; age?: number; role: string } {
    return { name, age, role };
}
```

Common Pitfalls:

1. **Optional vs Default Parameters**

```typescript
// Optional parameter
function log(message?: string) {
    console.log(message); // message might be undefined
}

// Default parameter
function log2(message: string = "default") {
    console.log(message); // message will never be undefined
}
```

2. **Rest Parameter Position**

```typescript
// Correct: rest parameter at the end
function concat(separator: string, ...parts: string[]): string {
    return parts.join(separator);
}

// Error: rest parameter must be last
// function invalid(...parts: string[], separator: string) {}
```

## Function Overloading

Function overloading in TypeScript allows you to define multiple function signatures for different parameter types and return values.

### 1. Function Overload Signatures

```typescript
// Overload signatures
function process(x: number): number;
function process(x: string): string;
function process(x: boolean): boolean;
// Implementation signature must be compatible with all overloads
function process(x: number | string | boolean): number | string | boolean {
    if (typeof x === "number") {
        return x * 2;
    } else if (typeof x === "string") {
        return x.toUpperCase();
    } else {
        return !x;
    }
}

// Usage with type safety
const num = process(42);        // type: number
const str = process("hello");   // type: string
const bool = process(true);     // type: boolean
```

Best Practices:

- Order overloads from most specific to least specific
- Keep the implementation signature private if possible
- Use union types when the implementation is simple
- Consider using generics instead of overloads for similar logic

### 2. Method Overloading

```typescript
class Calculator {
    // Method overloads with specific return types
    add(x: number, y: number): number;
    add(x: string, y: string): string;
    add(x: any, y: any): any {
        if (typeof x === "number" && typeof y === "number") {
            return x + y;
        }
        return String(x) + String(y);
    }

    // Method overloads with generics
    static create(): Calculator;
    static create<T>(defaultValue: T): Calculator & { value: T };
    static create<T>(defaultValue?: T) {
        const calc = new Calculator();
        return defaultValue ? Object.assign(calc, { value: defaultValue }) : calc;
    }
}
```

## Generic Functions

Generics enable you to write flexible, reusable functions that work with multiple types while maintaining type safety.

### 1. Basic Generic Functions

```typescript
// Generic function with single type parameter
function identity<T>(arg: T): T {
    return arg;
}

// Generic function with constraints
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
    return obj[key];
}

// Generic arrow function with multiple type parameters
const pair = <T, U>(first: T, second: U): [T, U] => [first, second];

// Generic function with default type parameter
function createArray<T = string>(): T[] {
    return [];
}

// Generic function with constraints and defaults
function merge<T extends object = object, U extends object = object>(
    obj1: T,
    obj2: U
): T & U {
    return { ...obj1, ...obj2 };
}
```

Best Practices:

- Use descriptive type parameter names (T for type, K for key, etc.)
- Add constraints to prevent runtime errors
- Provide default type parameters when appropriate
- Consider using generics instead of overloads for similar logic

### 2. Generic Function Types

```typescript
// Generic function type with constraint
type Mapper<T, U> = (items: T[]) => U[];

// Generic function interface
interface Parser<T> {
    (input: string): T;
    format?: (data: T) => string;
}

// Implementation examples
const numberArrayMapper: Mapper<string, number> = 
    (items) => items.map(Number);

const jsonParser: Parser<object> = (input) => JSON.parse(input);
jsonParser.format = (data) => JSON.stringify(data, null, 2);
```

## Class Methods

### 1. Instance Methods

```typescript
class Person {
    private name: string;
    private age: number;

    constructor(name: string, age: number) {
        this.name = name;
        this.age = age;
    }

    // Public instance method with documentation
    /**
     * Returns a greeting with the person's name
     * @returns A formatted greeting string
     */
    greet(): string {
        return `Hello, I'm ${this.name}`;
    }

    // Method with parameter validation
    changeName(newName: string): void {
        if (newName.trim().length === 0) {
            throw new Error("Name cannot be empty");
        }
        this.name = newName;
    }

    // Getter method
    get ageInMonths(): number {
        return this.age * 12;
    }
}
```

### 2. Static Methods

```typescript
class MathUtils {
    // Static utility method
    static square(x: number): number {
        return x * x;
    }

    // Static factory method
    static fromArray(numbers: number[]): MathUtils {
        return new MathUtils();
    }

    // Static method with type guard
    static isPositive(x: number): boolean {
        return x > 0;
    }

    // Private static helper method
    private static validate(x: number): void {
        if (isNaN(x)) {
            throw new Error("Invalid number");
        }
    }
}
```

## Advanced Function Patterns

### 1. Higher-Order Functions

Higher-order functions are functions that take other functions as parameters or return functions as results.

```typescript
// Function that returns a function (closure)
function multiply(factor: number): (x: number) => number {
    return (x: number) => x * factor;
}

// Function that takes a function as parameter
function applyOperation<T, U>(
    items: T[],
    operation: (item: T) => U
): U[] {
    return items.map(operation);
}

// Currying example
const curry = <T, U, V>(fn: (x: T, y: U) => V) =>
    (x: T) => (y: U): V => fn(x, y);

// Usage examples
const double = multiply(2);
console.log(double(5)); // 10

const numbers = [1, 2, 3];
const doubled = applyOperation(numbers, double);

const curriedAdd = curry((x: number, y: number) => x + y);
const add5 = curriedAdd(5);
console.log(add5(3)); // 8
```

### 2. Method Decorators

```typescript
// Parameter decorator
function validate(target: any, propertyKey: string, parameterIndex: number) {
    const validateParams: number[] = Reflect.getOwnMetadata(
        "validate",
        target,
        propertyKey
    ) || [];
    validateParams.push(parameterIndex);
    Reflect.defineMetadata("validate", validateParams, target, propertyKey);
}

// Method decorator
function log(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function(...args: any[]) {
        console.log(`Calling ${propertyKey} with:`, args);
        const result = originalMethod.apply(this, args);
        console.log(`Result:`, result);
        return result;
    };

    return descriptor;
}

class Calculator {
    @log
    @validateParams
    add(@validate x: number, @validate y: number): number {
        return x + y;
    }
}
```

## Function Composition

### 1. Basic Composition

Function composition is a powerful technique for building complex operations from simple functions:

```typescript
// Type-safe function composition
const compose = <T>(...fns: Array<(arg: T) => T>) => 
    (value: T): T => fns.reduceRight((acc, fn) => fn(acc), value);

// Utility functions
const addOne = (x: number): number => x + 1;
const double = (x: number): number => x * 2;
const square = (x: number): number => x * x;

// Type-safe composed function
const calculate = compose<number>(square, double, addOne);
console.log(calculate(3)); // ((3 + 1) * 2)² = 64

// Generic composition
const composeGeneric = <A, B, C>(
    f: (x: B) => C,
    g: (x: A) => B
) => (x: A): C => f(g(x));
```

### 2. Pipeline Pattern

The pipeline pattern provides a more readable way to compose functions:

```typescript
// Type-safe pipeline operator
const pipe = <T>(...fns: Array<(arg: T) => T>) => 
    (value: T): T => fns.reduce((acc, fn) => fn(acc), value);

// Example with complex data transformation
interface User {
    name: string;
    age: number;
    email?: string;
}

// Type-safe transformation functions
const formatName = (user: User): User => ({
    ...user,
    name: user.name.toUpperCase()
});

const validateAge = (user: User): User => {
    if (user.age < 0) throw new Error("Invalid age");
    return user;
};

const addEmailDomain = (user: User): User => ({
    ...user,
    email: user.email || `${user.name.toLowerCase()}@example.com`
});

// Compose transformations
const processUser = pipe(formatName, validateAge, addEmailDomain);

// Usage
const user: User = { name: "john", age: 25 };
const processed = processUser(user);
```

## Error Handling

### 1. Function Error Types

TypeScript enables type-safe error handling:

```typescript
// Result type for error handling
type Result<T, E = Error> = {
    success: true;
    data: T;
} | {
    success: false;
    error: E;
};

// Function with custom error handling
function divide(x: number, y: number): Result<number> {
    if (y === 0) {
        return {
            success: false,
            error: new Error("Division by zero")
        };
    }
    return {
        success: true,
        data: x / y
    };
}

// Type guard for Result type
function isSuccess<T, E>(result: Result<T, E>): result is { success: true; data: T } {
    return result.success;
}

// Usage with type narrowing
const result = divide(10, 2);
if (isSuccess(result)) {
    console.log(result.data); // Type is number
} else {
    console.error(result.error); // Type is Error
}
```

### 2. Async Error Handling

```typescript
// Generic async result type
type AsyncResult<T> = Promise<Result<T>>;

// Async function with type-safe error handling
async function fetchData<T>(url: string): AsyncResult<T> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return {
            success: true,
            data
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error : new Error(String(error))
        };
    }
}

// Usage with async/await
async function processUserData() {
    const result = await fetchData<User>("/api/user");
    if (isSuccess(result)) {
        const user = result.data; // Type is User
        return processUser(user);
    } else {
        // Handle error
        console.error(result.error);
        return null;
    }
}
```

## Best Practices

1. **Type Safety**
   - Always specify return types for public functions
   - Use type inference for simple internal functions
   - Avoid using `any` type unless absolutely necessary

2. **Function Design**
   - Keep functions small and focused
   - Use meaningful parameter and function names
   - Consider using object parameters for functions with many arguments

3. **Error Handling**
   - Use Result types for predictable errors
   - Implement proper async error handling
   - Add type guards for better type narrowing

4. **Documentation**
   - Use JSDoc comments for complex functions
   - Document parameters and return types
   - Include examples for non-obvious usage

5. **Performance**
   - Use const assertions where appropriate
   - Consider memoization for expensive operations
   - Optimize function composition for large data sets

6. **Testing**
   - Write unit tests for all public functions
   - Test edge cases and error conditions
   - Use TypeScript's type system to prevent bugs

## Conclusion

Understanding TypeScript functions and methods is crucial for writing maintainable and type-safe code. These concepts provide the foundation for building complex applications with TypeScript. By following the best practices and patterns outlined in this guide, you can write more reliable and maintainable code.

## Series Navigation

- Previous: [TypeScript Variables and Data Types](/posts/typescript/variables-and-data-types)
- Next: [TypeScript Interfaces and Classes](/posts/typescript/interfaces-and-classes)
