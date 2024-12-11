---
title: "TypeScript Architecture Patterns"
description: "In-depth guide to TypeScript architecture patterns including Clean Architecture, DDD, CQRS, and Event Sourcing"
publishDate: "Dec 11 2024"
heroImage: "/typescript-architecture.png"
category: "TypeScript"
tags: ["typescript", "architecture", "patterns", "design"]
---

# TypeScript Architecture Patterns

## Table of Contents
1. [Clean Architecture](#clean-architecture)
2. [Domain-Driven Design](#domain-driven-design)
3. [CQRS Pattern](#cqrs-pattern)
4. [Event Sourcing](#event-sourcing)
5. [Hexagonal Architecture](#hexagonal-architecture)

## Clean Architecture

### Core Domain

```typescript
// domain/entities/User.ts
export class User {
    private constructor(
        private readonly id: string,
        private name: string,
        private email: string,
        private readonly createdAt: Date
    ) {}

    static create(name: string, email: string): User {
        return new User(
            crypto.randomUUID(),
            name,
            email,
            new Date()
        );
    }

    updateName(name: string): void {
        if (name.length < 2) {
            throw new Error('Name too short');
        }
        this.name = name;
    }

    get properties() {
        return {
            id: this.id,
            name: this.name,
            email: this.email,
            createdAt: this.createdAt
        };
    }
}

// domain/repositories/UserRepository.ts
export interface UserRepository {
    save(user: User): Promise<void>;
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
}
```

### Use Cases

```typescript
// application/useCases/CreateUser.ts
export interface CreateUserDTO {
    name: string;
    email: string;
}

export class CreateUserUseCase {
    constructor(private userRepository: UserRepository) {}

    async execute(dto: CreateUserDTO): Promise<void> {
        const existingUser = await this.userRepository.findByEmail(dto.email);
        if (existingUser) {
            throw new Error('User already exists');
        }

        const user = User.create(dto.name, dto.email);
        await this.userRepository.save(user);
    }
}

// application/useCases/UpdateUserName.ts
export interface UpdateUserNameDTO {
    userId: string;
    name: string;
}

export class UpdateUserNameUseCase {
    constructor(private userRepository: UserRepository) {}

    async execute(dto: UpdateUserNameDTO): Promise<void> {
        const user = await this.userRepository.findById(dto.userId);
        if (!user) {
            throw new Error('User not found');
        }

        user.updateName(dto.name);
        await this.userRepository.save(user);
    }
}
```

### Infrastructure

```typescript
// infrastructure/repositories/PostgresUserRepository.ts
export class PostgresUserRepository implements UserRepository {
    constructor(private db: Database) {}

    async save(user: User): Promise<void> {
        const { id, name, email, createdAt } = user.properties;
        await this.db.query(
            'INSERT INTO users (id, name, email, created_at) VALUES ($1, $2, $3, $4)',
            [id, name, email, createdAt]
        );
    }

    async findById(id: string): Promise<User | null> {
        const result = await this.db.query(
            'SELECT * FROM users WHERE id = $1',
            [id]
        );
        return result.rows[0] ? this.mapToUser(result.rows[0]) : null;
    }

    private mapToUser(row: any): User {
        return User.create(row.name, row.email);
    }
}
```

## Domain-Driven Design

### Aggregates

```typescript
// domain/aggregates/Order.ts
export class Order {
    private items: OrderItem[] = [];
    private status: OrderStatus = OrderStatus.Created;

    constructor(
        private readonly id: string,
        private readonly customerId: string
    ) {}

    addItem(product: Product, quantity: number): void {
        if (this.status !== OrderStatus.Created) {
            throw new Error('Cannot modify confirmed order');
        }

        const existingItem = this.items.find(item => 
            item.productId === product.id
        );

        if (existingItem) {
            existingItem.updateQuantity(quantity);
        } else {
            this.items.push(new OrderItem(product, quantity));
        }
    }

    confirm(): void {
        if (this.items.length === 0) {
            throw new Error('Cannot confirm empty order');
        }

        this.status = OrderStatus.Confirmed;
    }

    get total(): number {
        return this.items.reduce(
            (sum, item) => sum + item.total,
            0
        );
    }
}

// domain/valueObjects/OrderItem.ts
export class OrderItem {
    constructor(
        private readonly product: Product,
        private quantity: number
    ) {
        this.validateQuantity(quantity);
    }

    private validateQuantity(quantity: number): void {
        if (quantity <= 0) {
            throw new Error('Quantity must be positive');
        }
    }

    updateQuantity(quantity: number): void {
        this.validateQuantity(quantity);
        this.quantity = quantity;
    }

    get total(): number {
        return this.product.price * this.quantity;
    }

    get productId(): string {
        return this.product.id;
    }
}
```

### Domain Events

```typescript
// domain/events/DomainEvent.ts
export interface DomainEvent {
    occurredOn: Date;
}

// domain/events/OrderConfirmed.ts
export class OrderConfirmedEvent implements DomainEvent {
    public readonly occurredOn: Date;

    constructor(
        public readonly orderId: string,
        public readonly total: number
    ) {
        this.occurredOn = new Date();
    }
}

// domain/aggregates/Order.ts
export class Order {
    private events: DomainEvent[] = [];

    confirm(): void {
        if (this.items.length === 0) {
            throw new Error('Cannot confirm empty order');
        }

        this.status = OrderStatus.Confirmed;
        this.events.push(new OrderConfirmedEvent(this.id, this.total));
    }

    clearEvents(): DomainEvent[] {
        const events = [...this.events];
        this.events = [];
        return events;
    }
}
```

## CQRS Pattern

### Commands

```typescript
// application/commands/CreateOrder.ts
export interface CreateOrderCommand {
    customerId: string;
    items: Array<{
        productId: string;
        quantity: number;
    }>;
}

export class CreateOrderHandler {
    constructor(
        private orderRepository: OrderRepository,
        private productRepository: ProductRepository
    ) {}

    async handle(command: CreateOrderCommand): Promise<string> {
        const order = new Order(crypto.randomUUID(), command.customerId);

        for (const item of command.items) {
            const product = await this.productRepository.findById(item.productId);
            if (!product) {
                throw new Error(`Product ${item.productId} not found`);
            }
            order.addItem(product, item.quantity);
        }

        await this.orderRepository.save(order);
        return order.id;
    }
}
```

### Queries

```typescript
// application/queries/GetOrderSummary.ts
export interface OrderSummaryDTO {
    id: string;
    customerId: string;
    total: number;
    status: string;
    items: Array<{
        productId: string;
        productName: string;
        quantity: number;
        price: number;
    }>;
}

export class GetOrderSummaryHandler {
    constructor(private readonly db: Database) {}

    async handle(orderId: string): Promise<OrderSummaryDTO> {
        const result = await this.db.query(`
            SELECT 
                o.id,
                o.customer_id,
                o.status,
                oi.product_id,
                p.name as product_name,
                oi.quantity,
                p.price
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            WHERE o.id = $1
        `, [orderId]);

        if (result.rows.length === 0) {
            throw new Error('Order not found');
        }

        return this.mapToDTO(result.rows);
    }

    private mapToDTO(rows: any[]): OrderSummaryDTO {
        const firstRow = rows[0];
        return {
            id: firstRow.id,
            customerId: firstRow.customer_id,
            status: firstRow.status,
            total: this.calculateTotal(rows),
            items: rows.map(row => ({
                productId: row.product_id,
                productName: row.product_name,
                quantity: row.quantity,
                price: row.price
            }))
        };
    }

    private calculateTotal(rows: any[]): number {
        return rows.reduce(
            (sum, row) => sum + (row.quantity * row.price),
            0
        );
    }
}
```

## Event Sourcing

### Events

```typescript
// domain/events/OrderEvents.ts
export interface OrderCreatedEvent extends DomainEvent {
    orderId: string;
    customerId: string;
}

export interface OrderItemAddedEvent extends DomainEvent {
    orderId: string;
    productId: string;
    quantity: number;
    price: number;
}

export interface OrderConfirmedEvent extends DomainEvent {
    orderId: string;
    total: number;
}

// domain/aggregates/Order.ts
export class Order {
    private constructor(events: DomainEvent[] = []) {
        events.forEach(event => this.apply(event));
    }

    static create(id: string, customerId: string): Order {
        const order = new Order();
        order.raise(new OrderCreatedEvent(id, customerId));
        return order;
    }

    private apply(event: DomainEvent): void {
        if (event instanceof OrderCreatedEvent) {
            this.id = event.orderId;
            this.customerId = event.customerId;
        } else if (event instanceof OrderItemAddedEvent) {
            this.items.push({
                productId: event.productId,
                quantity: event.quantity,
                price: event.price
            });
        } else if (event instanceof OrderConfirmedEvent) {
            this.status = OrderStatus.Confirmed;
        }
    }

    private raise(event: DomainEvent): void {
        this.apply(event);
        this.events.push(event);
    }
}
```

### Event Store

```typescript
// infrastructure/eventStore/EventStore.ts
export interface EventStore {
    saveEvents(streamId: string, events: DomainEvent[]): Promise<void>;
    getEvents(streamId: string): Promise<DomainEvent[]>;
}

export class PostgresEventStore implements EventStore {
    constructor(private db: Database) {}

    async saveEvents(streamId: string, events: DomainEvent[]): Promise<void> {
        await this.db.transaction(async client => {
            for (const event of events) {
                await client.query(
                    'INSERT INTO events (stream_id, type, data, occurred_on) VALUES ($1, $2, $3, $4)',
                    [
                        streamId,
                        event.constructor.name,
                        JSON.stringify(event),
                        event.occurredOn
                    ]
                );
            }
        });
    }

    async getEvents(streamId: string): Promise<DomainEvent[]> {
        const result = await this.db.query(
            'SELECT * FROM events WHERE stream_id = $1 ORDER BY occurred_on',
            [streamId]
        );

        return result.rows.map(row => this.deserializeEvent(row));
    }

    private deserializeEvent(row: any): DomainEvent {
        const data = JSON.parse(row.data);
        const eventClass = this.getEventClass(row.type);
        return Object.assign(new eventClass(), data);
    }
}
```

## Hexagonal Architecture

### Ports

```typescript
// application/ports/UserRepository.ts
export interface UserRepository {
    save(user: User): Promise<void>;
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
}

// application/ports/EmailService.ts
export interface EmailService {
    sendWelcomeEmail(user: User): Promise<void>;
    sendPasswordReset(user: User, token: string): Promise<void>;
}
```

### Adapters

```typescript
// infrastructure/adapters/PostgresUserRepository.ts
export class PostgresUserRepository implements UserRepository {
    constructor(private db: Database) {}

    // Implementation
}

// infrastructure/adapters/SendGridEmailService.ts
export class SendGridEmailService implements EmailService {
    constructor(private client: SendGridClient) {}

    async sendWelcomeEmail(user: User): Promise<void> {
        await this.client.send({
            to: user.email,
            template: 'welcome',
            data: {
                name: user.name
            }
        });
    }
}
```

### Application Services

```typescript
// application/services/UserService.ts
export class UserService {
    constructor(
        private userRepository: UserRepository,
        private emailService: EmailService
    ) {}

    async createUser(dto: CreateUserDTO): Promise<void> {
        const user = User.create(dto.name, dto.email);
        await this.userRepository.save(user);
        await this.emailService.sendWelcomeEmail(user);
    }
}

// infrastructure/config/container.ts
const container = new Container();

container.bind<UserRepository>('UserRepository')
    .to(PostgresUserRepository);
container.bind<EmailService>('EmailService')
    .to(SendGridEmailService);
container.bind<UserService>('UserService')
    .to(UserService);
```

These architecture patterns help you:

1. Create maintainable and scalable applications
2. Separate concerns effectively
3. Make your code testable
4. Handle complex business logic
5. Build enterprise-grade applications

Would you like me to:
1. Add more architecture patterns?
2. Add more implementation details?
3. Create posts about other TypeScript topics?
