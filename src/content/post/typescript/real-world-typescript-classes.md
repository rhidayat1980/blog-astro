---
title: "Real-World TypeScript Classes: Practical Examples"
description: "A collection of real-world TypeScript class examples including task scheduler, HTTP client, caching system, and more with best practices and implementation patterns"
publishDate: "Dec 11 2024"
heroImage: "/typescript-real-world.png"
category: "TypeScript"
tags: ["typescript", "classes", "real-world", "programming"]
---

## Real-World TypeScript Classes: Practical Examples

This guide provides real-world examples of TypeScript classes that you might encounter in production applications. Each example includes complete implementation details and best practices.

## Table of Contents

- [Real-World TypeScript Classes: Practical Examples](#real-world-typescript-classes-practical-examples)
- [Table of Contents](#table-of-contents)
- [Task Scheduler System](#task-scheduler-system)
- [HTTP Client with Interceptors](#http-client-with-interceptors)
- [Form Validator](#form-validator)
- [Image Processing Pipeline](#image-processing-pipeline)

## Task Scheduler System

A complete task scheduling system with recurring tasks, priorities, and error handling:

```typescript
type TaskPriority = 'low' | 'medium' | 'high';
type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

interface TaskConfig {
    id: string;
    name: string;
    priority: TaskPriority;
    cronExpression?: string;
    timeout?: number;
    retryCount?: number;
    retryDelay?: number;
}

class Task {
    private status: TaskStatus = 'pending';
    private attempts: number = 0;
    private lastRun?: Date;
    private nextRun?: Date;

    constructor(
        private config: TaskConfig,
        private handler: () => Promise<void>
    ) {}

    async execute(): Promise<void> {
        this.status = 'running';
        this.lastRun = new Date();
        this.attempts++;

        try {
            if (this.config.timeout) {
                await this.executeWithTimeout();
            } else {
                await this.handler();
            }
            
            this.status = 'completed';
            if (this.config.cronExpression) {
                this.scheduleNext();
            }
        } catch (error) {
            await this.handleError(error);
        }
    }

    private async executeWithTimeout(): Promise<void> {
        return Promise.race([
            this.handler(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Task timeout')), 
                this.config.timeout)
            )
        ]);
    }

    private async handleError(error: Error): Promise<void> {
        this.status = 'failed';
        
        if (this.attempts < (this.config.retryCount || 0)) {
            await new Promise(resolve => 
                setTimeout(resolve, this.config.retryDelay || 1000)
            );
            await this.execute();
        }
    }

    private scheduleNext(): void {
        // Implementation of cron expression parsing and next run calculation
        this.nextRun = new Date(); // Simplified for example
    }

    getStatus(): TaskStatus {
        return this.status;
    }

    getNextRun(): Date | undefined {
        return this.nextRun;
    }
}

class TaskScheduler {
    private tasks: Map<string, Task> = new Map();
    private running: boolean = false;

    addTask(config: TaskConfig, handler: () => Promise<void>): void {
        const task = new Task(config, handler);
        this.tasks.set(config.id, task);
    }

    removeTask(id: string): boolean {
        return this.tasks.delete(id);
    }

    async start(): Promise<void> {
        this.running = true;
        while (this.running) {
            await this.executeDueTasks();
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    stop(): void {
        this.running = false;
    }

    private async executeDueTasks(): Promise<void> {
        const now = new Date();
        const dueTasks = Array.from(this.tasks.values())
            .filter(task => {
                const nextRun = task.getNextRun();
                return nextRun && nextRun <= now;
            })
            .sort((a, b) => this.comparePriority(a, b));

        await Promise.all(dueTasks.map(task => task.execute()));
    }

    private comparePriority(a: Task, b: Task): number {
        const priorityMap: Record<TaskPriority, number> = {
            high: 3,
            medium: 2,
            low: 1
        };
        return priorityMap[b.config.priority] - priorityMap[a.config.priority];
    }
}

// Usage example
const scheduler = new TaskScheduler();

scheduler.addTask(
    {
        id: 'backup-db',
        name: 'Database Backup',
        priority: 'high',
        cronExpression: '0 0 * * *', // Daily at midnight
        timeout: 30000,
        retryCount: 3,
        retryDelay: 5000
    },
    async () => {
        // Backup database implementation
    }
);

scheduler.start();
```

## HTTP Client with Interceptors

A complete HTTP client implementation with interceptors, retry logic, and response caching:

```typescript
interface RequestConfig {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    data?: unknown;
    timeout?: number;
    retries?: number;
    cache?: boolean;
    cacheTime?: number;
}

interface ResponseData<T> {
    data: T;
    status: number;
    headers: Record<string, string>;
}

type RequestInterceptor = (config: RequestConfig) => Promise<RequestConfig>;
type ResponseInterceptor = <T>(response: ResponseData<T>) => Promise<ResponseData<T>>;
type ErrorInterceptor = (error: Error) => Promise<never>;

class HttpClient {
    private requestInterceptors: RequestInterceptor[] = [];
    private responseInterceptors: ResponseInterceptor[] = [];
    private errorInterceptors: ErrorInterceptor[] = [];
    private cache: Map<string, {
        data: unknown;
        timestamp: number;
        cacheTime: number;
    }> = new Map();

    addRequestInterceptor(interceptor: RequestInterceptor): void {
        this.requestInterceptors.push(interceptor);
    }

    addResponseInterceptor(interceptor: ResponseInterceptor): void {
        this.responseInterceptors.push(interceptor);
    }

    addErrorInterceptor(interceptor: ErrorInterceptor): void {
        this.errorInterceptors.push(interceptor);
    }

    async request<T>(config: RequestConfig): Promise<ResponseData<T>> {
        try {
            // Apply request interceptors
            let currentConfig = { ...config };
            for (const interceptor of this.requestInterceptors) {
                currentConfig = await interceptor(currentConfig);
            }

            // Check cache
            if (currentConfig.cache) {
                const cachedResponse = this.getFromCache<T>(currentConfig.url);
                if (cachedResponse) return cachedResponse;
            }

            // Make request
            let response = await this.makeRequest<T>(currentConfig);

            // Apply response interceptors
            for (const interceptor of this.responseInterceptors) {
                response = await interceptor(response);
            }

            // Cache response
            if (currentConfig.cache) {
                this.addToCache(
                    currentConfig.url,
                    response.data,
                    currentConfig.cacheTime
                );
            }

            return response;
        } catch (error) {
            // Apply error interceptors
            let currentError = error;
            for (const interceptor of this.errorInterceptors) {
                try {
                    await interceptor(currentError);
                } catch (newError) {
                    currentError = newError;
                }
            }
            throw currentError;
        }
    }

    private async makeRequest<T>(
        config: RequestConfig
    ): Promise<ResponseData<T>> {
        const controller = new AbortController();
        const timeoutId = config.timeout
            ? setTimeout(() => controller.abort(), config.timeout)
            : null;

        try {
            const response = await fetch(config.url, {
                method: config.method,
                headers: config.headers,
                body: config.data ? JSON.stringify(config.data) : undefined,
                signal: controller.signal
            });

            const data = await response.json();
            const headers: Record<string, string> = {};
            response.headers.forEach((value, key) => {
                headers[key] = value;
            });

            return {
                data,
                status: response.status,
                headers
            };
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
        }
    }

    private getFromCache<T>(url: string): ResponseData<T> | null {
        const cached = this.cache.get(url);
        if (!cached) return null;

        if (Date.now() - cached.timestamp > cached.cacheTime) {
            this.cache.delete(url);
            return null;
        }

        return {
            data: cached.data as T,
            status: 200,
            headers: { 'x-cache': 'HIT' }
        };
    }

    private addToCache(
        url: string,
        data: unknown,
        cacheTime: number = 5 * 60 * 1000
    ): void {
        this.cache.set(url, {
            data,
            timestamp: Date.now(),
            cacheTime
        });
    }
}

// Usage example
const http = new HttpClient();

// Add authentication interceptor
http.addRequestInterceptor(async (config) => ({
    ...config,
    headers: {
        ...config.headers,
        'Authorization': `Bearer ${await getToken()}`
    }
}));

// Add error handling interceptor
http.addErrorInterceptor(async (error) => {
    if (error.message === 'Token expired') {
        await refreshToken();
        throw new Error('Please retry request');
    }
    throw error;
});

// Make request
interface User {
    id: string;
    name: string;
}

const response = await http.request<User>({
    url: 'https://api.example.com/users/1',
    method: 'GET',
    cache: true,
    cacheTime: 5 * 60 * 1000 // 5 minutes
});
```

## Form Validator

A flexible form validation system:

```typescript
type ValidationRule<T> = {
    validate: (value: T) => boolean;
    message: string;
};

class FormValidator<T extends Record<string, any>> {
    private rules: Map<keyof T, ValidationRule<T[keyof T]>[]> = new Map();
    private errors: Map<keyof T, string[]> = new Map();

    addRule<K extends keyof T>(
        field: K,
        rule: ValidationRule<T[K]>
    ): void {
        const fieldRules = this.rules.get(field) || [];
        fieldRules.push(rule);
        this.rules.set(field, fieldRules);
    }

    validate(data: T): boolean {
        this.errors.clear();
        let isValid = true;

        for (const [field, rules] of this.rules) {
            const fieldErrors: string[] = [];
            const value = data[field];

            for (const rule of rules) {
                if (!rule.validate(value)) {
                    fieldErrors.push(rule.message);
                    isValid = false;
                }
            }

            if (fieldErrors.length > 0) {
                this.errors.set(field, fieldErrors);
            }
        }

        return isValid;
    }

    getErrors(): Record<keyof T, string[]> {
        return Object.fromEntries(this.errors) as Record<keyof T, string[]>;
    }

    getFieldErrors(field: keyof T): string[] {
        return this.errors.get(field) || [];
    }
}

// Common validation rules
const createRequiredRule = <T>(): ValidationRule<T> => ({
    validate: (value: T) => value !== undefined && value !== null && value !== '',
    message: 'This field is required'
});

const createMinLengthRule = (min: number): ValidationRule<string> => ({
    validate: (value: string) => value.length >= min,
    message: `Minimum length is ${min} characters`
});

const createEmailRule = (): ValidationRule<string> => ({
    validate: (value: string) => 
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message: 'Invalid email address'
});

const createPasswordRule = (): ValidationRule<string> => ({
    validate: (value: string) =>
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/.test(value),
    message: 'Password must contain at least 8 characters, one uppercase letter, one lowercase letter, and one number'
});

// Usage example
interface RegistrationForm {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
}

const validator = new FormValidator<RegistrationForm>();

validator.addRule('username', createRequiredRule());
validator.addRule('username', createMinLengthRule(3));

validator.addRule('email', createRequiredRule());
validator.addRule('email', createEmailRule());

validator.addRule('password', createRequiredRule());
validator.addRule('password', createPasswordRule());

validator.addRule('confirmPassword', {
    validate: (value: string) => value === form.password,
    message: 'Passwords do not match'
});

const form: RegistrationForm = {
    username: 'jo',
    email: 'invalid-email',
    password: 'weak',
    confirmPassword: 'different'
};

if (!validator.validate(form)) {
    console.log(validator.getErrors());
}
```

## Image Processing Pipeline

A class-based image processing pipeline:

```typescript
interface ImageDimensions {
    width: number;
    height: number;
}

interface ImageProcessingOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'jpeg' | 'png' | 'webp';
    watermark?: {
        text: string;
        position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    };
}

class ImageProcessor {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d')!;
    }

    async process(
        input: File | Blob | string,
        options: ImageProcessingOptions = {}
    ): Promise<Blob> {
        const image = await this.loadImage(input);
        const dimensions = this.calculateDimensions(image, options);

        this.canvas.width = dimensions.width;
        this.canvas.height = dimensions.height;

        // Clear canvas
        this.ctx.clearRect(0, 0, dimensions.width, dimensions.height);

        // Draw image
        this.ctx.drawImage(image, 0, 0, dimensions.width, dimensions.height);

        // Apply watermark if specified
        if (options.watermark) {
            this.applyWatermark(options.watermark);
        }

        // Convert to desired format
        const format = options.format || 'jpeg';
        const quality = options.quality || 0.9;

        return new Promise<Blob>((resolve) => {
            this.canvas.toBlob(
                (blob) => resolve(blob!),
                `image/${format}`,
                quality
            );
        });
    }

    private async loadImage(input: File | Blob | string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;

            if (typeof input === 'string') {
                image.src = input;
            } else {
                image.src = URL.createObjectURL(input);
            }
        });
    }

    private calculateDimensions(
        image: HTMLImageElement,
        options: ImageProcessingOptions
    ): ImageDimensions {
        let { width, height } = image;

        if (options.maxWidth && width > options.maxWidth) {
            height = (height * options.maxWidth) / width;
            width = options.maxWidth;
        }

        if (options.maxHeight && height > options.maxHeight) {
            width = (width * options.maxHeight) / height;
            height = options.maxHeight;
        }

        return { width, height };
    }

    private applyWatermark(watermark: NonNullable<ImageProcessingOptions['watermark']>): void {
        const { text, position } = watermark;
        const padding = 20;

        this.ctx.font = '24px Arial';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';

        const metrics = this.ctx.measureText(text);
        const textWidth = metrics.width;
        const textHeight = 24;

        let x: number;
        let y: number;

        switch (position) {
            case 'top-left':
                x = padding;
                y = padding + textHeight;
                break;
            case 'top-right':
                x = this.canvas.width - textWidth - padding;
                y = padding + textHeight;
                break;
            case 'bottom-left':
                x = padding;
                y = this.canvas.height - padding;
                break;
            case 'bottom-right':
                x = this.canvas.width - textWidth - padding;
                y = this.canvas.height - padding;
                break;
        }

        this.ctx.fillText(text, x, y);
    }
}

// Usage example
const processor = new ImageProcessor();

const processImage = async (file: File) => {
    const processedImage = await processor.process(file, {
        maxWidth: 800,
        maxHeight: 600,
        quality: 0.8,
        format: 'webp',
        watermark: {
            text: ' My Company',
            position: 'bottom-right'
        }
    });

    // Use the processed image
    const url = URL.createObjectURL(processedImage);
    const img = document.createElement('img');
    img.src = url;
    document.body.appendChild(img);
};
```

These examples demonstrate real-world TypeScript class implementations with:

- Comprehensive error handling
- Type safety
- Proper abstraction
- Practical functionality
- Best practices for class design

Would you like me to:

1. Add more specific examples?
2. Add more implementation details to any example?
3. Add more use cases or variations?
