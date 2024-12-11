---
title: "Testing in TypeScript"
description: "Comprehensive guide to testing TypeScript applications using various testing frameworks and methodologies"
publishDate: "11 Dec 2024"
tags: ["typescript", "javascript", "testing", "jest", "mocha", "cypress", "series:typescript:10"]
draft: false
---

## Setting Up Testing Environment

### 1. Jest Configuration

```typescript
// jest.config.js
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest'
    },
    testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node']
};
```

### 2. TypeScript Configuration

```json
// tsconfig.json
{
    "compilerOptions": {
        "target": "es5",
        "module": "commonjs",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true,
        "types": ["jest", "node"]
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules"]
}
```

## Unit Testing

### 1. Basic Tests

```typescript
// calculator.ts
export class Calculator {
    add(a: number, b: number): number {
        return a + b;
    }

    subtract(a: number, b: number): number {
        return a - b;
    }
}

// calculator.test.ts
import { Calculator } from './calculator';

describe('Calculator', () => {
    let calculator: Calculator;

    beforeEach(() => {
        calculator = new Calculator();
    });

    test('adds two numbers correctly', () => {
        expect(calculator.add(2, 3)).toBe(5);
    });

    test('subtracts two numbers correctly', () => {
        expect(calculator.subtract(5, 3)).toBe(2);
    });
});
```

### 2. Testing Async Code

```typescript
// user-service.ts
export class UserService {
    async getUser(id: number): Promise<User> {
        const response = await fetch(`/api/users/${id}`);
        return response.json();
    }
}

// user-service.test.ts
describe('UserService', () => {
    let service: UserService;

    beforeEach(() => {
        service = new UserService();
    });

    test('fetches user by id', async () => {
        const mockUser = { id: 1, name: 'John' };
        global.fetch = jest.fn().mockResolvedValue({
            json: () => Promise.resolve(mockUser)
        });

        const user = await service.getUser(1);
        expect(user).toEqual(mockUser);
    });

    test('handles errors', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

        await expect(service.getUser(1)).rejects.toThrow('Network error');
    });
});
```

### 3. Mocking

```typescript
// database.ts
export class Database {
    async query(sql: string): Promise<any[]> {
        // Real database implementation
        return [];
    }
}

// user-repository.ts
export class UserRepository {
    constructor(private db: Database) {}

    async findById(id: number): Promise<User | null> {
        const results = await this.db.query(`SELECT * FROM users WHERE id = ${id}`);
        return results[0] || null;
    }
}

// user-repository.test.ts
jest.mock('./database');

describe('UserRepository', () => {
    let repository: UserRepository;
    let mockDatabase: jest.Mocked<Database>;

    beforeEach(() => {
        mockDatabase = new Database() as jest.Mocked<Database>;
        repository = new UserRepository(mockDatabase);
    });

    test('finds user by id', async () => {
        const mockUser = { id: 1, name: 'John' };
        mockDatabase.query.mockResolvedValue([mockUser]);

        const user = await repository.findById(1);
        expect(user).toEqual(mockUser);
    });
});
```

## Integration Testing

### 1. API Testing

```typescript
// api.test.ts
import request from 'supertest';
import { app } from './app';

describe('User API', () => {
    test('GET /api/users returns users', async () => {
        const response = await request(app)
            .get('/api/users')
            .expect('Content-Type', /json/)
            .expect(200);

        expect(response.body).toBeInstanceOf(Array);
    });

    test('POST /api/users creates new user', async () => {
        const newUser = { name: 'John', email: 'john@example.com' };

        const response = await request(app)
            .post('/api/users')
            .send(newUser)
            .expect('Content-Type', /json/)
            .expect(201);

        expect(response.body).toMatchObject(newUser);
    });
});
```

### 2. Database Integration

```typescript
// database-integration.test.ts
import { Database } from './database';
import { UserRepository } from './user-repository';

describe('UserRepository Integration', () => {
    let database: Database;
    let repository: UserRepository;

    beforeAll(async () => {
        database = await Database.connect({
            host: 'localhost',
            database: 'test_db'
        });
        repository = new UserRepository(database);
    });

    afterAll(async () => {
        await database.disconnect();
    });

    beforeEach(async () => {
        await database.query('TRUNCATE TABLE users');
    });

    test('creates and retrieves user', async () => {
        const user = await repository.create({
            name: 'John',
            email: 'john@example.com'
        });

        const retrieved = await repository.findById(user.id);
        expect(retrieved).toMatchObject(user);
    });
});
```

## End-to-End Testing with Cypress

### 1. Basic E2E Test

```typescript
// cypress/integration/login.spec.ts
describe('Login Page', () => {
    beforeEach(() => {
        cy.visit('/login');
    });

    it('should login successfully', () => {
        cy.get('[data-testid=email]').type('user@example.com');
        cy.get('[data-testid=password]').type('password123');
        cy.get('[data-testid=submit]').click();

        cy.url().should('include', '/dashboard');
        cy.get('[data-testid=welcome]').should('contain', 'Welcome');
    });

    it('should show error for invalid credentials', () => {
        cy.get('[data-testid=email]').type('invalid@example.com');
        cy.get('[data-testid=password]').type('wrongpassword');
        cy.get('[data-testid=submit]').click();

        cy.get('[data-testid=error]').should('be.visible');
    });
});
```

### 2. Custom Commands

```typescript
// cypress/support/commands.ts
declare namespace Cypress {
    interface Chainable {
        login(email: string, password: string): void;
    }
}

Cypress.Commands.add('login', (email: string, password: string) => {
    cy.get('[data-testid=email]').type(email);
    cy.get('[data-testid=password]').type(password);
    cy.get('[data-testid=submit]').click();
});

// Usage in test
describe('Protected Pages', () => {
    beforeEach(() => {
        cy.login('user@example.com', 'password123');
    });

    it('accesses protected page', () => {
        cy.visit('/protected');
        cy.get('[data-testid=content]').should('be.visible');
    });
});
```

## Component Testing

### 1. React Components

```typescript
// button.tsx
interface ButtonProps {
    label: string;
    onClick: () => void;
    disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({ label, onClick, disabled }) => (
    <button onClick={onClick} disabled={disabled}>
        {label}
    </button>
);

// button.test.tsx
import { render, fireEvent } from '@testing-library/react';

describe('Button', () => {
    test('renders with label', () => {
        const { getByText } = render(
            <Button label="Click me" onClick={() => {}} />
        );
        expect(getByText('Click me')).toBeInTheDocument();
    });

    test('handles click events', () => {
        const handleClick = jest.fn();
        const { getByText } = render(
            <Button label="Click me" onClick={handleClick} />
        );

        fireEvent.click(getByText('Click me'));
        expect(handleClick).toHaveBeenCalled();
    });

    test('can be disabled', () => {
        const { getByText } = render(
            <Button label="Click me" onClick={() => {}} disabled />
        );
        expect(getByText('Click me')).toBeDisabled();
    });
});
```

### 2. Vue Components

```typescript
// counter.vue
<template>
    <div>
        <span data-testid="count">{{ count }}</span>
        <button @click="increment">Increment</button>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';

export default defineComponent({
    name: 'Counter',
    setup() {
        const count = ref(0);
        const increment = () => count.value++;

        return { count, increment };
    }
});
</script>

// counter.test.ts
import { mount } from '@vue/test-utils';
import Counter from './Counter.vue';

describe('Counter', () => {
    test('renders initial count', () => {
        const wrapper = mount(Counter);
        expect(wrapper.find('[data-testid="count"]').text()).toBe('0');
    });

    test('increments count when button is clicked', async () => {
        const wrapper = mount(Counter);
        await wrapper.find('button').trigger('click');
        expect(wrapper.find('[data-testid="count"]').text()).toBe('1');
    });
});
```

## Testing Utilities and Helpers

### 1. Test Factories

```typescript
// factories.ts
import { faker } from '@faker-js/faker';

export const createUser = (overrides = {}) => ({
    id: faker.datatype.uuid(),
    name: faker.name.fullName(),
    email: faker.internet.email(),
    ...overrides
});

export const createProduct = (overrides = {}) => ({
    id: faker.datatype.uuid(),
    name: faker.commerce.productName(),
    price: faker.commerce.price(),
    ...overrides
});

// Usage in tests
describe('Shopping Cart', () => {
    test('calculates total correctly', () => {
        const products = [
            createProduct({ price: '10.00' }),
            createProduct({ price: '20.00' })
        ];
        const cart = new ShoppingCart(products);
        expect(cart.getTotal()).toBe(30.00);
    });
});
```

### 2. Custom Matchers

```typescript
// matchers.ts
expect.extend({
    toBeWithinRange(received: number, floor: number, ceiling: number) {
        const pass = received >= floor && received <= ceiling;
        if (pass) {
            return {
                message: () =>
                    `expected ${received} not to be within range ${floor} - ${ceiling}`,
                pass: true
            };
        } else {
            return {
                message: () =>
                    `expected ${received} to be within range ${floor} - ${ceiling}`,
                pass: false
            };
        }
    }
});

declare global {
    namespace jest {
        interface Matchers<R> {
            toBeWithinRange(floor: number, ceiling: number): R;
        }
    }
}

// Usage
test('numeric ranges', () => {
    expect(100).toBeWithinRange(90, 110);
});
```

## Best Practices

1. Write tests first (TDD)
2. Keep tests focused and isolated
3. Use meaningful test descriptions
4. Follow the Arrange-Act-Assert pattern
5. Don't test implementation details
6. Maintain test data separately
7. Use appropriate assertions
8. Clean up after tests

## Common Testing Patterns

### 1. Repository Pattern Testing

```typescript
interface Repository<T> {
    find(id: string): Promise<T>;
    create(item: T): Promise<T>;
    update(id: string, item: T): Promise<T>;
    delete(id: string): Promise<void>;
}

class InMemoryRepository<T> implements Repository<T> {
    private items: Map<string, T> = new Map();

    async find(id: string): Promise<T> {
        const item = this.items.get(id);
        if (!item) throw new Error('Not found');
        return item;
    }

    // Implement other methods...
}

// Testing
describe('InMemoryRepository', () => {
    let repository: InMemoryRepository<User>;

    beforeEach(() => {
        repository = new InMemoryRepository<User>();
    });

    test('creates and finds item', async () => {
        const user = await repository.create({ id: '1', name: 'John' });
        const found = await repository.find('1');
        expect(found).toEqual(user);
    });
});
```

### 2. Service Layer Testing

```typescript
class UserService {
    constructor(private repository: Repository<User>) {}

    async createUser(data: CreateUserDTO): Promise<User> {
        // Validate data
        // Hash password
        // Create user
        return this.repository.create(data);
    }
}

// Testing
describe('UserService', () => {
    let service: UserService;
    let mockRepository: jest.Mocked<Repository<User>>;

    beforeEach(() => {
        mockRepository = {
            create: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            delete: jest.fn()
        };
        service = new UserService(mockRepository);
    });

    test('creates user with hashed password', async () => {
        const userData = { name: 'John', password: 'secret' };
        await service.createUser(userData);
        expect(mockRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'John',
                password: expect.not.stringContaining('secret')
            })
        );
    });
});
```

## Conclusion

Testing TypeScript applications requires a good understanding of both testing principles and TypeScript's type system. Proper testing ensures code quality and helps catch bugs early in development.

## Series Navigation

- Previous: [TypeScript with React/Vue/Angular](/posts/typescript/typescript-with-frameworks)
- Next: [TypeScript Design Patterns](/posts/typescript/design-patterns)
