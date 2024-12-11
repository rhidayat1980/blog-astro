---
title: "TypeScript Decorators"
description: "Understanding TypeScript decorators, their types, and practical applications"
publishDate: "11 Dec 2024"
tags: ["typescript", "javascript", "programming", "web-development", "decorators", "series:typescript:7"]
draft: false
---

## Introduction to Decorators

Decorators are a powerful feature in TypeScript that allows you to modify or enhance classes and their members through a declarative syntax. They provide a clean way to wrap additional functionality around your code, similar to Python decorators or Java annotations. Decorators are widely used in modern TypeScript frameworks like Angular, NestJS, and TypeORM.

### What are Decorators?

A decorator is a special kind of declaration attached to a class, method, property, or parameter. Using the `@expression` syntax, where `expression` evaluates to a function, decorators can modify the behavior or metadata of the decorated element at runtime.

### Key Concepts:

- Decorators are experimental features in TypeScript
- They run once when the class is defined, not when instantiated
- Multiple decorators can be applied to a single declaration
- They can be used for metadata programming, validation, logging, etc.

## Enabling Decorators

To use decorators in your TypeScript project, you need to enable them in your `tsconfig.json`:

```typescript
// tsconfig.json
{
    "compilerOptions": {
        "target": "ES5",
        "experimentalDecorators": true,
        "emitDecoratorMetadata": true  // Optional, but recommended for reflection
    }
}
```

## Types of Decorators

### 1. Class Decorators

Class decorators are applied to the constructor of the class and can be used to observe, modify, or replace a class definition.

#### Basic Class Decorator:

```typescript
function sealed(constructor: Function) {
    Object.seal(constructor);
    Object.seal(constructor.prototype);
}

@sealed
class BankAccount {
    constructor(public balance: number) {}
    
    deposit(amount: number) {
        this.balance += amount;
    }
}
```

#### Decorator Factory with Parameters:

```typescript
function withID(prefix: string) {
    return function <T extends { new (...args: any[]): {} }>(
        constructor: T
    ) {
        return class extends constructor {
            id = `${prefix}_${Math.random().toString(36).substr(2, 9)}`;
        };
    };
}

@withID("user")
class User {
    constructor(public name: string) {}
}

const user = new User("John");
console.log(user.id); // Outputs: user_x8k9v2p3m
```

### 2. Method Decorators

Method decorators can intercept, modify, or replace method definitions. They're perfect for adding logging, validation, or timing functionality.

#### Enhanced Method Decorator Example:

```typescript
function measure() {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const start = performance.now();
            try {
                const result = await originalMethod.apply(this, args);
                const end = performance.now();
                console.log(`${propertyKey} took ${end - start}ms`);
                return result;
            } catch (error) {
                console.error(`Error in ${propertyKey}:`, error);
                throw error;
            }
        };

        return descriptor;
    };
}

class DataService {
    @measure()
    async fetchData(id: string) {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { id, data: "some data" };
    }
}
```

### 3. Property Decorators

Property decorators can be used to add validation, transformation, or metadata to class properties.

#### Advanced Property Decorator Example:

```typescript
function transform(transformFn: (value: any) => any) {
    return function(target: any, propertyKey: string) {
        let value: any;
        
        const getter = function() {
            return value;
        };
        
        const setter = function(newVal: any) {
            value = transformFn(newVal);
        };
        
        Object.defineProperty(target, propertyKey, {
            get: getter,
            set: setter,
            enumerable: true,
            configurable: true
        });
    };
}

class User {
    @transform((v: string) => v.toLowerCase())
    email: string;

    @transform((v: string) => v.trim())
    name: string;
}

const user = new User();
user.email = "JOHN@EXAMPLE.COM";
console.log(user.email); // outputs: john@example.com
```

### 4. Parameter Decorators

Parameter decorators are useful for validation and dependency injection scenarios.

#### Enhanced Parameter Decorator Example:

```typescript
function validate(validator: (value: any) => boolean, errorMessage: string) {
    return function(target: any, propertyKey: string, parameterIndex: number) {
        const originalMethod = target[propertyKey];
        
        target[propertyKey] = function(...args: any[]) {
            if (!validator(args[parameterIndex])) {
                throw new Error(`Parameter ${parameterIndex} failed validation: ${errorMessage}`);
            }
            return originalMethod.apply(this, args);
        };
    };
}

class UserService {
    createUser(
        @validate(v => v.length >= 3, "Username must be at least 3 characters")
        username: string,
        
        @validate(v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Invalid email format")
        email: string
    ) {
        // Implementation
        return { username, email };
    }
}
```

## Real-World Applications

### 1. Enhanced Memoization with TTL

```typescript
function memoize(ttlMs: number = 0) {
    return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;
        const cache = new Map<string, { value: any, timestamp: number }>();

        descriptor.value = function(...args: any[]) {
            const key = JSON.stringify(args);
            const now = Date.now();
            const cached = cache.get(key);

            if (cached && (!ttlMs || now - cached.timestamp < ttlMs)) {
                return cached.value;
            }
            
            const result = originalMethod.apply(this, args);
            cache.set(key, { value: result, timestamp: now });
            return result;
        };

        return descriptor;
    };
}

class DataProcessor {
    @memoize(60000) // Cache for 1 minute
    expensiveOperation(data: string): string {
        // Simulate expensive computation
        return data.split('').reverse().join('');
    }
}
```

### 2. Role-Based Access Control (RBAC)

```typescript
type Role = 'admin' | 'user' | 'guest';

function requireRoles(roles: Role[]) {
    return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = function(...args: any[]) {
            const user = getCurrentUser(); // Implement this based on your auth system
            
            if (!user) {
                throw new Error('User not authenticated');
            }

            if (!roles.some(role => user.roles.includes(role))) {
                throw new Error(`Required roles: ${roles.join(', ')}`);
            }
            
            return originalMethod.apply(this, args);
        };
    };
}

class AdminPanel {
    @requireRoles(['admin'])
    deleteUser(userId: string) {
        // Implementation
    }

    @requireRoles(['admin', 'user'])
    viewProfile(userId: string) {
        // Implementation
    }
}
```

### 3. API Route Decorator

```typescript
function route(path: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE') {
    return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        if (!target.routes) {
            target.routes = [];
        }

        target.routes.push({
            path,
            method,
            handler: descriptor.value
        });

        return descriptor;
    };
}

class UserController {
    @route('/users', 'GET')
    async getUsers() {
        // Implementation
    }

    @route('/users/:id', 'GET')
    async getUser(id: string) {
        // Implementation
    }

    @route('/users', 'POST')
    async createUser(userData: any) {
        // Implementation
    }
}
```

## Best Practices

1. **Keep Decorators Focused**
   - Each decorator should have a single responsibility
   - Break complex decorators into smaller, composable ones

2. **Use Decorator Factories**
   - Make decorators configurable through parameters
   - Provide meaningful default values

3. **Handle Errors Gracefully**
   - Implement proper error handling in decorators
   - Preserve the original stack trace when possible

4. **Documentation**
   - Document the purpose and behavior of each decorator
   - Include examples in the documentation
   - Specify any requirements or dependencies

5. **Performance Considerations**
   - Cache expensive operations
   - Be mindful of memory usage in property decorators
   - Consider the impact of multiple decorators

6. **Testing**
   - Write unit tests for decorator behavior
   - Test edge cases and error conditions
   - Verify decorator composition works as expected

7. **Type Safety**
   - Leverage TypeScript's type system
   - Use generic types where appropriate
   - Validate parameters at runtime

## Common Use Cases and Patterns

1. **Validation and Data Transformation**
   - Input validation
   - Data sanitization
   - Type conversion

2. **Logging and Monitoring**
   - Method execution logging
   - Performance monitoring
   - Error tracking

3. **Caching and Performance**
   - Response caching
   - Computation memoization
   - Lazy loading

4. **Security**
   - Authentication
   - Authorization
   - Rate limiting

5. **Cross-Cutting Concerns**
   - Transaction management
   - Error handling
   - Event dispatching

6. **Dependency Injection**
   - Service injection
   - Configuration injection
   - Plugin systems

7. **API and Route Management**
   - Route registration
   - Middleware application
   - Response transformation

## Advanced Patterns

### 1. Composable Decorators

```typescript
// Compose multiple decorators into one
function compose(...decorators: MethodDecorator[]): MethodDecorator {
    return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        return decorators.reduceRight((prev, curr) => {
            return curr(target, propertyKey, prev);
        }, descriptor);
    };
}

// Usage
class API {
    @compose(
        authenticate(['admin']),
        validate(schema),
        log(),
        measure()
    )
    async updateUser(userId: string, data: any) {
        // Implementation
    }
}
```

### 2. Reflection-based Decorators

```typescript
import 'reflect-metadata';

function injectable() {
    return function(target: any) {
        Reflect.defineMetadata('injectable', true, target);
    };
}

function inject(token: any) {
    return function(target: any, propertyKey: string | symbol, parameterIndex: number) {
        const existingParams = Reflect.getMetadata('design:paramtypes', target) || [];
        existingParams[parameterIndex] = token;
        Reflect.defineMetadata('design:paramtypes', existingParams, target);
    };
}
```

## Conclusion

Decorators are a powerful feature in TypeScript that enables clean, reusable, and maintainable code. When used properly, they can significantly improve code organization and reduce boilerplate. Understanding how to create and use decorators effectively is essential for modern TypeScript development, especially when working with frameworks that heavily utilize decorators.

Remember to:

- Use decorators judiciously and only when they provide clear value
- Keep them focused and composable
- Consider performance implications
- Write comprehensive tests
- Document their behavior clearly

## Series Navigation

- Previous: [TypeScript Advanced Types](/posts/typescript/advanced-types)
- Next: [TypeScript Modules and Namespaces](/posts/typescript/modules-and-namespaces)
