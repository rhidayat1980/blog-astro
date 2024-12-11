---
title: "TypeScript Testing and Best Practices"
description: "Comprehensive guide to testing TypeScript applications with Jest, including best practices, patterns, and real-world examples"
publishDate: "Dec 11 2024"
heroImage: "/typescript-testing.png"
category: "TypeScript"
tags: ["typescript", "testing", "jest", "best-practices"]
---

# TypeScript Testing and Best Practices

## Table of Contents
1. [Unit Testing](#unit-testing)
2. [Integration Testing](#integration-testing)
3. [Mocking](#mocking)
4. [Test Patterns](#test-patterns)
5. [Best Practices](#best-practices)

## Unit Testing

### Basic Unit Tests

```typescript
// calculator.ts
export class Calculator {
    add(a: number, b: number): number {
        return a + b;
    }

    subtract(a: number, b: number): number {
        return a - b;
    }

    multiply(a: number, b: number): number {
        return a * b;
    }

    divide(a: number, b: number): number {
        if (b === 0) throw new Error('Division by zero');
        return a / b;
    }
}

// calculator.test.ts
import { Calculator } from './calculator';

describe('Calculator', () => {
    let calculator: Calculator;

    beforeEach(() => {
        calculator = new Calculator();
    });

    describe('add', () => {
        it('should add two numbers correctly', () => {
            expect(calculator.add(2, 3)).toBe(5);
        });

        it('should handle negative numbers', () => {
            expect(calculator.add(-2, 3)).toBe(1);
        });
    });

    describe('divide', () => {
        it('should divide two numbers correctly', () => {
            expect(calculator.divide(6, 2)).toBe(3);
        });

        it('should throw error when dividing by zero', () => {
            expect(() => calculator.divide(6, 0)).toThrow('Division by zero');
        });
    });
});
```

### Testing Async Code

```typescript
// userService.ts
export interface User {
    id: string;
    name: string;
}

export class UserService {
    async getUser(id: string): Promise<User> {
        const response = await fetch(`/api/users/${id}`);
        if (!response.ok) {
            throw new Error('User not found');
        }
        return response.json();
    }

    async createUser(user: Omit<User, 'id'>): Promise<User> {
        const response = await fetch('/api/users', {
            method: 'POST',
            body: JSON.stringify(user),
        });
        return response.json();
    }
}

// userService.test.ts
import { UserService } from './userService';

describe('UserService', () => {
    let userService: UserService;

    beforeEach(() => {
        userService = new UserService();
        global.fetch = jest.fn();
    });

    describe('getUser', () => {
        it('should return user when found', async () => {
            const mockUser = { id: '1', name: 'John' };
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockUser,
            });

            const user = await userService.getUser('1');
            expect(user).toEqual(mockUser);
        });

        it('should throw error when user not found', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
            });

            await expect(userService.getUser('1')).rejects.toThrow('User not found');
        });
    });
});
```

## Integration Testing

### API Integration Tests

```typescript
// api.test.ts
import { app } from './app';
import request from 'supertest';
import { db } from './db';

describe('API Integration Tests', () => {
    beforeAll(async () => {
        await db.migrate.latest();
    });

    afterAll(async () => {
        await db.destroy();
    });

    beforeEach(async () => {
        await db('users').truncate();
    });

    describe('POST /api/users', () => {
        it('should create a new user', async () => {
            const response = await request(app)
                .post('/api/users')
                .send({ name: 'John', email: 'john@example.com' });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('id');
            expect(response.body.name).toBe('John');
        });

        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/users')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('errors');
        });
    });
});
```

## Mocking

### Jest Mocks

```typescript
// emailService.ts
export class EmailService {
    async sendEmail(to: string, subject: string, body: string): Promise<void> {
        // Implementation
    }
}

// notificationService.ts
export class NotificationService {
    constructor(private emailService: EmailService) {}

    async notifyUser(userId: string, message: string): Promise<void> {
        const user = await this.getUser(userId);
        await this.emailService.sendEmail(
            user.email,
            'Notification',
            message
        );
    }

    private async getUser(id: string): Promise<any> {
        // Implementation
    }
}

// notificationService.test.ts
import { NotificationService } from './notificationService';
import { EmailService } from './emailService';

jest.mock('./emailService');

describe('NotificationService', () => {
    let notificationService: NotificationService;
    let emailService: jest.Mocked<EmailService>;

    beforeEach(() => {
        emailService = new EmailService() as jest.Mocked<EmailService>;
        notificationService = new NotificationService(emailService);
    });

    it('should send email notification', async () => {
        const mockUser = { email: 'test@example.com' };
        jest.spyOn(notificationService as any, 'getUser')
            .mockResolvedValue(mockUser);

        await notificationService.notifyUser('1', 'Hello');

        expect(emailService.sendEmail).toHaveBeenCalledWith(
            mockUser.email,
            'Notification',
            'Hello'
        );
    });
});
```

## Test Patterns

### Factory Pattern for Test Data

```typescript
// testFactories.ts
export class UserFactory {
    static create(overrides: Partial<User> = {}): User {
        return {
            id: Math.random().toString(),
            name: 'John Doe',
            email: 'john@example.com',
            ...overrides,
        };
    }

    static createMany(count: number, overrides: Partial<User> = {}): User[] {
        return Array.from({ length: count }, () => this.create(overrides));
    }
}

// user.test.ts
import { UserFactory } from './testFactories';

describe('User Tests', () => {
    it('should process user data', () => {
        const users = UserFactory.createMany(3);
        const result = processUsers(users);
        expect(result).toHaveLength(3);
    });
});
```

### Snapshot Testing

```typescript
// component.test.tsx
import { render } from '@testing-library/react';
import { UserProfile } from './UserProfile';

describe('UserProfile', () => {
    it('should match snapshot', () => {
        const user = UserFactory.create();
        const { container } = render(<UserProfile user={user} />);
        expect(container).toMatchSnapshot();
    });
});
```

## Best Practices

### Testing Hooks

```typescript
// useCounter.test.ts
import { renderHook, act } from '@testing-library/react-hooks';
import { useCounter } from './useCounter';

describe('useCounter', () => {
    it('should increment counter', () => {
        const { result } = renderHook(() => useCounter());

        act(() => {
            result.current.increment();
        });

        expect(result.current.count).toBe(1);
    });

    it('should decrement counter', () => {
        const { result } = renderHook(() => useCounter(10));

        act(() => {
            result.current.decrement();
        });

        expect(result.current.count).toBe(9);
    });
});
```

### Testing Error Boundaries

```typescript
// errorBoundary.test.tsx
import { render } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

describe('ErrorBoundary', () => {
    beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('should catch errors and display fallback', () => {
        const ThrowError = () => {
            throw new Error('Test error');
        };

        const { getByText } = render(
            <ErrorBoundary fallback={<div>Error occurred</div>}>
                <ThrowError />
            </ErrorBoundary>
        );

        expect(getByText('Error occurred')).toBeInTheDocument();
    });
});
```

### Testing Custom Hooks with Context

```typescript
// useAuth.test.ts
import { renderHook } from '@testing-library/react-hooks';
import { AuthProvider } from './AuthContext';
import { useAuth } from './useAuth';

describe('useAuth', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
    );

    it('should provide authentication state', () => {
        const { result } = renderHook(() => useAuth(), { wrapper });

        expect(result.current.isAuthenticated).toBe(false);
    });

    it('should login user', async () => {
        const { result } = renderHook(() => useAuth(), { wrapper });

        await act(async () => {
            await result.current.login('user', 'pass');
        });

        expect(result.current.isAuthenticated).toBe(true);
    });
});
```

These testing patterns and practices help ensure:

1. Code reliability and maintainability
2. Proper error handling
3. Consistent behavior across components
4. Easy debugging and refactoring
5. Confidence in code changes

Would you like me to:
1. Add more testing examples?
2. Add more best practices?
3. Create additional posts about other TypeScript topics?
