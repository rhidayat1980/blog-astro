---
title: "TypeScript with React, Vue, and Angular"
description: "Using TypeScript with popular frontend frameworks: React, Vue, and Angular"
publishDate: "11 Dec 2024"
tags: ["typescript", "javascript", "react", "vue", "angular", "frontend", "series:typescript:9"]
draft: false
---

## TypeScript with React

### 1. Component Types

```typescript
// Function Component
interface Props {
    name: string;
    age?: number;
}

const UserProfile: React.FC<Props> = ({ name, age = 0 }) => {
    return (
        <div>
            <h1>{name}</h1>
            <p>Age: {age}</p>
        </div>
    );
};

// Class Component
interface State {
    count: number;
}

class Counter extends React.Component<Props, State> {
    state: State = {
        count: 0
    };

    increment = () => {
        this.setState(prev => ({ count: prev.count + 1 }));
    };

    render() {
        return (
            <button onClick={this.increment}>
                Count: {this.state.count}
            </button>
        );
    }
}
```

### 2. Hooks with TypeScript

```typescript
// useState
const [count, setCount] = useState<number>(0);

// useRef
const inputRef = useRef<HTMLInputElement>(null);

// useEffect
useEffect(() => {
    const handler = (event: MouseEvent) => {
        console.log(event.clientX, event.clientY);
    };
    
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
}, []);

// Custom Hook
function useLocalStorage<T>(key: string, initialValue: T) {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            return initialValue;
        }
    });

    const setValue = (value: T | ((val: T) => T)) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.log(error);
        }
    };

    return [storedValue, setValue] as const;
}
```

### 3. Event Handling

```typescript
// Event Types
const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    console.log(event.currentTarget.value);
};

const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log(event.target.value);
};

const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Handle form submission
};

// Component with Events
const Form: React.FC = () => {
    return (
        <form onSubmit={handleSubmit}>
            <input type="text" onChange={handleChange} />
            <button onClick={handleClick}>Submit</button>
        </form>
    );
};
```

## TypeScript with Vue

### 1. Vue 3 Component with TypeScript

```typescript
// Using Composition API
import { defineComponent, ref, computed } from 'vue';

interface User {
    id: number;
    name: string;
}

export default defineComponent({
    name: 'UserList',
    props: {
        title: {
            type: String,
            required: true
        }
    },
    setup(props) {
        const users = ref<User[]>([]);
        const selectedUser = ref<User | null>(null);

        const userCount = computed(() => users.value.length);

        const addUser = (user: User) => {
            users.value.push(user);
        };

        return {
            users,
            selectedUser,
            userCount,
            addUser
        };
    }
});
```

### 2. Vue Class Components

```typescript
// Using vue-class-component
import { Vue, Component, Prop } from 'vue-property-decorator';

interface User {
    id: number;
    name: string;
}

@Component
export default class UserList extends Vue {
    @Prop({ required: true }) readonly title!: string;
    
    users: User[] = [];
    selectedUser: User | null = null;

    get userCount(): number {
        return this.users.length;
    }

    addUser(user: User): void {
        this.users.push(user);
    }
}
```

### 3. Vue 3 Composables

```typescript
// Custom composable
import { ref, onMounted, onUnmounted } from 'vue';

export function useMousePosition() {
    const x = ref(0);
    const y = ref(0);

    function update(event: MouseEvent) {
        x.value = event.pageX;
        y.value = event.pageY;
    }

    onMounted(() => {
        window.addEventListener('mousemove', update);
    });

    onUnmounted(() => {
        window.removeEventListener('mousemove', update);
    });

    return { x, y };
}

// Usage in component
import { defineComponent } from 'vue';
import { useMousePosition } from './composables';

export default defineComponent({
    setup() {
        const { x, y } = useMousePosition();
        return { x, y };
    }
});
```

## TypeScript with Angular

### 1. Component Definition

```typescript
// Component with TypeScript
import { Component, Input, Output, EventEmitter } from '@angular/core';

interface User {
    id: number;
    name: string;
}

@Component({
    selector: 'app-user-list',
    template: `
        <div *ngFor="let user of users">
            {{ user.name }}
            <button (click)="selectUser(user)">Select</button>
        </div>
    `
})
export class UserListComponent {
    @Input() users: User[] = [];
    @Output() userSelected = new EventEmitter<User>();

    selectUser(user: User): void {
        this.userSelected.emit(user);
    }
}
```

### 2. Services

```typescript
// Service with TypeScript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface User {
    id: number;
    name: string;
}

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private apiUrl = 'api/users';

    constructor(private http: HttpClient) {}

    getUsers(): Observable<User[]> {
        return this.http.get<User[]>(this.apiUrl);
    }

    getUserById(id: number): Observable<User> {
        return this.http.get<User>(`${this.apiUrl}/${id}`);
    }

    createUser(user: Omit<User, 'id'>): Observable<User> {
        return this.http.post<User>(this.apiUrl, user);
    }
}
```

### 3. Guards and Interceptors

```typescript
// Route Guard
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({
    providedIn: 'root'
})
export class AuthGuard implements CanActivate {
    constructor(
        private authService: AuthService,
        private router: Router
    ) {}

    canActivate(): boolean {
        if (this.authService.isAuthenticated()) {
            return true;
        }

        this.router.navigate(['/login']);
        return false;
    }
}

// HTTP Interceptor
import { Injectable } from '@angular/core';
import {
    HttpInterceptor,
    HttpRequest,
    HttpHandler,
    HttpEvent
} from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    intercept(
        request: HttpRequest<any>,
        next: HttpHandler
    ): Observable<HttpEvent<any>> {
        const token = localStorage.getItem('token');

        if (token) {
            request = request.clone({
                setHeaders: {
                    Authorization: `Bearer ${token}`
                }
            });
        }

        return next.handle(request);
    }
}
```

## Common Patterns Across Frameworks

### 1. Type Definitions

```typescript
// Shared interfaces
interface User {
    id: number;
    name: string;
    email: string;
}

interface ApiResponse<T> {
    data: T;
    status: number;
    message: string;
}

// Type guards
function isUser(obj: any): obj is User {
    return 'id' in obj && 'name' in obj && 'email' in obj;
}
```

### 2. API Services

```typescript
// Generic API service
class ApiService<T> {
    constructor(private baseUrl: string) {}

    async get(id: number): Promise<T> {
        const response = await fetch(`${this.baseUrl}/${id}`);
        return response.json();
    }

    async create(data: Omit<T, 'id'>): Promise<T> {
        const response = await fetch(this.baseUrl, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        return response.json();
    }
}
```

### 3. Form Handling

```typescript
// Form interfaces
interface LoginForm {
    email: string;
    password: string;
}

interface RegisterForm extends LoginForm {
    name: string;
    confirmPassword: string;
}

// Form validation
function validateForm<T>(form: T, rules: ValidationRules<T>): ValidationErrors {
    // Implementation
}
```

## Best Practices

### 1. Type Safety

```typescript
// Use strict type checking
{
    "compilerOptions": {
        "strict": true,
        "noImplicitAny": true,
        "strictNullChecks": true
    }
}

// Use type inference when possible
// Bad
const numbers: number[] = [1, 2, 3];

// Good
const numbers = [1, 2, 3];
```

### 2. Component Props

```typescript
// Use interfaces for props
interface ButtonProps {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    variant?: 'primary' | 'secondary';
}

// Use required vs optional props appropriately
interface TableProps<T> {
    data: T[];              // Required
    columns: Column[];      // Required
    onRowClick?: (row: T) => void;  // Optional
}
```

### 3. State Management

```typescript
// Type-safe state management
interface State {
    user: User | null;
    loading: boolean;
    error: string | null;
}

// Actions
type Action =
    | { type: 'SET_USER'; payload: User }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_ERROR'; payload: string };
```

## Testing with TypeScript

### 1. Unit Testing

```typescript
// Jest with TypeScript
describe('UserService', () => {
    it('should fetch user by id', async () => {
        const user: User = { id: 1, name: 'John' };
        const service = new UserService();
        
        jest.spyOn(service, 'getUser').mockResolvedValue(user);
        
        const result = await service.getUser(1);
        expect(result).toEqual(user);
    });
});
```

### 2. Component Testing

```typescript
// React Testing Library
import { render, fireEvent } from '@testing-library/react';

test('button click handler', () => {
    const handleClick = jest.fn();
    const { getByText } = render(
        <Button onClick={handleClick}>Click me</Button>
    );
    
    fireEvent.click(getByText('Click me'));
    expect(handleClick).toHaveBeenCalled();
});
```

## Conclusion

TypeScript provides excellent support for modern frontend frameworks, enabling type-safe development and better developer experience. Each framework has its own TypeScript integration patterns, but the core principles remain consistent.

## Series Navigation

- Previous: [TypeScript Modules and Namespaces](/posts/typescript/modules-and-namespaces)
- Next: [Testing in TypeScript](/posts/typescript/testing)
