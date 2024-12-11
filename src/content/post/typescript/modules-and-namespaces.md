---
title: "TypeScript Modules and Namespaces"
description: "Understanding TypeScript modules, namespaces, and code organization patterns"
publishDate: "11 Dec 2024"
tags: ["typescript", "javascript", "programming", "web-development", "modules", "namespaces", "series:typescript:8"]
draft: false
---

## Understanding TypeScript Modules and Namespaces

TypeScript provides two ways to organize and structure your code:

1. **Modules (ES Modules)**: Modern, file-based code organization that aligns with ECMAScript standards
2. **Namespaces**: Traditional TypeScript-specific way to organize code (formerly called "internal modules")

Key benefits of using modules and namespaces:
- Better code organization and maintainability
- Encapsulation and scope management
- Dependency management
- Code reusability
- Type safety across module boundaries

## ES Modules in TypeScript

ES Modules are the standard way to organize code in modern TypeScript applications.

### 1. Basic Export/Import

There are several ways to export and import code in TypeScript:

```typescript
// math.ts
// Named exports
export const add = (a: number, b: number): number => a + b;
export const subtract = (a: number, b: number): number => a - b;

export interface MathOperation {
    (a: number, b: number): number;
}

// Type-only exports
export type NumericOperation = (x: number) => number;

// main.ts
// Named imports
import { add, subtract, type MathOperation } from './math';
// Type-only imports
import type { NumericOperation } from './math';

// Usage
const sum: MathOperation = add;
console.log(sum(1, 2)); // 3
```

Best Practices:
- Use named exports for better refactoring support
- Use type-only imports/exports when possible
- Keep exports focused and cohesive

### 2. Default Exports

While default exports are supported, they're generally discouraged in TypeScript:

```typescript
// user.ts
// Default export
export default class User {
    constructor(
        public id: string,
        public name: string,
        private email: string
    ) {}

    getInfo(): string {
        return `${this.name} (${this.email})`;
    }
}

// main.ts
// Default import
import User from './user';
// Named import of default export
import { default as UserClass } from './user';

// Usage
const user = new User('1', 'John', 'john@example.com');
```

Best Practices:
- Prefer named exports over default exports
- Use default exports only for main module entries
- Always name default imports meaningfully

### 3. Re-exports and Aggregating Modules

Re-exports are useful for creating public APIs and organizing code:

```typescript
// models/index.ts
// Re-export individual exports
export { User } from './user';
export { Product } from './product';
// Re-export everything
export * from './utils';
// Re-export with renaming
export { User as UserModel } from './user';

// Selective re-exports
export { 
    type User,
    createUser,
    validateUser
} from './user';

// main.ts
import { User, Product, UserModel } from './models';
```

Best Practices:
- Use barrel files (index.ts) to simplify imports
- Keep re-exports organized and documented
- Consider using path aliases for cleaner imports

## Module Resolution

TypeScript supports different module resolution strategies to find and load modules.

### 1. Classic Resolution

Classic resolution follows a simple algorithm but is less flexible:

```typescript
// tsconfig.json
{
    "compilerOptions": {
        "moduleResolution": "classic",
        "baseUrl": "src",
        "paths": {
            "*": ["*", "generated/*"]
        }
    }
}

// Resolution order:
// 1. /root/src/moduleA.ts
// 2. /root/src/moduleA.d.ts
// 3. /root/src/generated/moduleA.ts
// 4. /root/src/generated/moduleA.d.ts
```

### 2. Node Resolution

Node resolution follows Node.js module resolution rules:

```typescript
// tsconfig.json
{
    "compilerOptions": {
        "moduleResolution": "node",
        "baseUrl": "src",
        "paths": {
            "@/*": ["*"],
            "@components/*": ["components/*"]
        }
    }
}

// Example directory structure
src/
├── components/
│   ├── Button.ts
│   └── Input.ts
├── utils/
│   └── format.ts
└── main.ts

// main.ts
import { Button } from '@components/Button';
import { formatDate } from '@/utils/format';
```

## Path Aliases

Path aliases help create cleaner and more maintainable import paths:

```typescript
// tsconfig.json
{
    "compilerOptions": {
        "baseUrl": ".",
        "paths": {
            "@/*": ["src/*"],
            "@components/*": ["src/components/*"],
            "@utils/*": ["src/utils/*"],
            "@types/*": ["src/types/*"]
        }
    }
}

// Usage with type safety
import { Button } from '@components/Button';
import { formatDate } from '@utils/date';
import type { User } from '@types/models';

// Instead of relative paths
// import { Button } from '../../../components/Button';
```

Best Practices:
- Use consistent alias patterns
- Document alias conventions
- Consider using module boundaries

## Namespaces

While modules are preferred, namespaces are still useful in specific scenarios.

### 1. Basic Namespace

Namespaces provide logical grouping and prevent naming collisions:

```typescript
namespace Validation {
    // Internal types
    export interface StringValidator {
        isValid(s: string): boolean;
    }

    // Internal constants
    const defaultMinLength = 3;

    // Exported class
    export class LettersOnlyValidator implements StringValidator {
        constructor(private minLength: number = defaultMinLength) {}

        isValid(s: string): boolean {
            return s.length >= this.minLength && /^[A-Za-z]+$/.test(s);
        }
    }

    // Exported function
    export function createValidator(): StringValidator {
        return new LettersOnlyValidator();
    }
}

// Usage
const validator = new Validation.LettersOnlyValidator(4);
console.log(validator.isValid("Hello")); // true
```

### 2. Nested Namespaces

Namespaces can be nested for better organization:

```typescript
namespace App {
    // Utility namespace
    export namespace Utils {
        export function log(msg: string, level: 'info' | 'error' = 'info') {
            console.log(`[${level.toUpperCase()}] ${msg}`);
        }

        export function formatDate(date: Date): string {
            return date.toISOString();
        }
    }

    // Models namespace
    export namespace Models {
        export interface User {
            id: number;
            name: string;
            email: string;
        }

        export interface Product {
            id: number;
            name: string;
            price: number;
        }
    }

    // Services namespace
    export namespace Services {
        export class UserService {
            getUser(id: number): Models.User {
                // Implementation
                return { id, name: "John", email: "john@example.com" };
            }
        }
    }
}

// Usage
App.Utils.log("Application started");
const userService = new App.Services.UserService();
const user: App.Models.User = userService.getUser(1);
```

### 3. Multi-file Namespaces

Namespaces can span multiple files using reference tags:

```typescript
// validation/types.ts
namespace Validation {
    export interface StringValidator {
        isValid(s: string): boolean;
    }

    export interface NumberValidator {
        isValid(n: number): boolean;
    }
}

// validation/string-validator.ts
/// <reference path="./types.ts" />
namespace Validation {
    export class LettersValidator implements StringValidator {
        isValid(s: string): boolean {
            return /^[A-Za-z]+$/.test(s);
        }
    }
}

// validation/number-validator.ts
/// <reference path="./types.ts" />
namespace Validation {
    export class RangeValidator implements NumberValidator {
        constructor(private min: number, private max: number) {}

        isValid(n: number): boolean {
            return n >= this.min && n <= this.max;
        }
    }
}
```

## Module Organization Patterns

### 1. Feature-based Organization

Organize code by features for better maintainability:

```typescript
// src/features/user/
├── types.ts         // Type definitions
├── constants.ts     // Constants and enums
├── api.ts          // API calls
├── hooks.ts        // React hooks
├── utils.ts        // Utility functions
├── components/     // UI components
│   ├── UserProfile.tsx
│   ├── UserSettings.tsx
│   └── index.ts
├── context.ts      // Feature-specific context
└── index.ts        // Public API

// types.ts
export interface User {
    id: string;
    name: string;
    email: string;
}

// api.ts
export async function fetchUser(id: string): Promise<User> {
    // Implementation
}

// index.ts
export * from './types';
export * from './api';
export * from './components';
```

### 2. Barrel Pattern

Use barrel files to simplify imports:

```typescript
// src/components/index.ts
// Export all components
export * from './Button';
export * from './Input';
export * from './Select';
export * from './Form';

// Re-export with renaming
export { default as CustomButton } from './Button';

// Usage
import { 
    Button, 
    Input, 
    Select, 
    CustomButton 
} from '@/components';
```

### 3. Domain-driven Organization

Organize code by business domains:

```typescript
// src/domains/
├── auth/           // Authentication domain
│   ├── types.ts
│   ├── api.ts
│   ├── hooks.ts
│   └── components/
├── products/       // Product management domain
│   ├── types.ts
│   ├── api.ts
│   └── components/
└── orders/         // Order management domain
    ├── types.ts
    ├── api.ts
    └── components/

// Example usage
import { loginUser } from '@/domains/auth/api';
import { ProductList } from '@/domains/products/components';
import type { Order } from '@/domains/orders/types';
```

## Dynamic Imports

### 1. Basic Dynamic Import

Use dynamic imports for code splitting and lazy loading:

```typescript
// Dynamic module loading
async function loadMathModule() {
    try {
        const module = await import('./math');
        return module.add(1, 2);
    } catch (error) {
        console.error('Failed to load math module:', error);
        return 0;
    }
}

// With type safety
type MathModule = {
    add(a: number, b: number): number;
    subtract(a: number, b: number): number;
};

async function loadTypedModule(): Promise<MathModule> {
    return import('./math');
}
```

### 2. Conditional Loading

Load modules based on conditions:

```typescript
// Feature flags
type FeatureModule = {
    init(): void;
    cleanup(): void;
};

async function loadFeature(feature: string): Promise<FeatureModule> {
    switch (feature) {
        case 'admin':
            const adminModule = await import('./features/admin');
            return new adminModule.AdminFeature();
        case 'user':
            const userModule = await import('./features/user');
            return new userModule.UserFeature();
        default:
            throw new Error(`Unknown feature: ${feature}`);
    }
}

// Usage with error handling
try {
    const feature = await loadFeature('admin');
    feature.init();
} catch (error) {
    console.error('Failed to load feature:', error);
}
```

## Module Augmentation

### 1. Extending Modules

Add new functionality to existing modules:

```typescript
// original.ts
export interface User {
    id: number;
    name: string;
}

// augmentation.ts
import { User } from './original';

// Add new properties to User
declare module './original' {
    interface User {
        email: string;
        avatar?: string;
    }
}

// Add new functions
declare module './original' {
    export function createUser(name: string): User;
    export function validateUser(user: User): boolean;
}
```

### 2. Global Augmentation

Extend global types and objects:

```typescript
// global.d.ts
declare global {
    // Add methods to built-in types
    interface String {
        toTitleCase(): string;
        truncate(length: number): string;
    }

    // Add global variables
    interface Window {
        config: {
            apiUrl: string;
            debug: boolean;
        };
    }
}

// Implementation
String.prototype.toTitleCase = function() {
    return this.replace(/\w\S*/g, txt => 
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
};

String.prototype.truncate = function(length: number) {
    return this.length > length 
        ? this.slice(0, length) + '...'
        : String(this);
};
```

## Working with Third-party Modules

### 1. Type Definitions

Handle type definitions for third-party modules:

```typescript
// Installing type definitions
// npm install --save-dev @types/lodash

// Usage with type safety
import { debounce, throttle } from 'lodash';

const debouncedFn = debounce((text: string) => {
    console.log(text);
}, 300);

// Create custom type definitions
declare module 'untyped-module' {
    export interface Options {
        timeout?: number;
        retries?: number;
    }

    export function initialize(options?: Options): void;
    export function cleanup(): Promise<void>;
}
```

### 2. Module Declaration

Create declarations for modules without types:

```typescript
// declarations.d.ts
declare module '*.json' {
    const value: any;
    export default value;
}

declare module '*.svg' {
    const content: string;
    export default content;
}

// Custom module declarations
declare module 'config' {
    interface Config {
        apiUrl: string;
        debug: boolean;
    }

    export function load(): Promise<Config>;
    export function get<T>(key: string): T;
}
```

## Testing Modules

### 1. Mocking Modules

Test modules with proper mocking:

```typescript
// user.test.ts
jest.mock('./api');

import { api } from './api';
import { UserService } from './user';

describe('UserService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should fetch user data', async () => {
        // Arrange
        const mockUser = { id: '1', name: 'John' };
        (api.get as jest.Mock).mockResolvedValue(mockUser);

        // Act
        const service = new UserService(api);
        const user = await service.getUser('1');

        // Assert
        expect(api.get).toHaveBeenCalledWith('/users/1');
        expect(user).toEqual(mockUser);
    });

    it('should handle errors', async () => {
        // Arrange
        const error = new Error('Network error');
        (api.get as jest.Mock).mockRejectedValue(error);

        // Act & Assert
        const service = new UserService(api);
        await expect(service.getUser('1')).rejects.toThrow(error);
    });
});
```

### 2. Testing Dynamic Imports

Test code that uses dynamic imports:

```typescript
// feature.test.ts
describe('Feature loading', () => {
    it('should load feature module', async () => {
        // Arrange
        const mockModule = {
            someFunction: jest.fn()
        };
        jest.mock('./feature', () => mockModule);

        // Act
        const module = await import('./feature');

        // Assert
        expect(module.someFunction).toBeDefined();
        expect(module).toBe(mockModule);
    });

    it('should handle loading errors', async () => {
        // Arrange
        const error = new Error('Module not found');
        jest.mock('./feature', () => {
            throw error;
        });

        // Act & Assert
        await expect(import('./feature')).rejects.toThrow(error);
    });
});
```

## Best Practices

1. **Module Organization**
   - Keep modules small and focused
   - Use consistent naming conventions
   - Organize by feature or domain
   - Implement clear module boundaries

2. **Import/Export Patterns**
   - Prefer named exports
   - Use type-only imports when possible
   - Avoid default exports
   - Keep barrel files clean and organized

3. **Path Management**
   - Use path aliases for cleaner imports
   - Maintain consistent directory structure
   - Document module organization
   - Consider using module boundaries

4. **Type Safety**
   - Properly type all exports
   - Use strict mode
   - Leverage type-only imports
   - Document public APIs

5. **Testing**
   - Mock external dependencies
   - Test module boundaries
   - Verify type safety
   - Test error conditions

## Conclusion

Understanding TypeScript modules and namespaces is crucial for building maintainable applications. By following these patterns and best practices, you can create well-organized, type-safe, and maintainable code bases. Remember to:

- Use ES Modules for modern applications
- Leverage namespaces when appropriate
- Implement proper module organization
- Follow type safety best practices
- Write comprehensive tests

## Series Navigation

- Previous: [TypeScript Decorators](/posts/typescript/decorators)
- Next: [TypeScript with React/Vue/Angular](/posts/typescript/typescript-with-frameworks)
