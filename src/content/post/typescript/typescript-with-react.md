---
title: "TypeScript with React: Best Practices and Patterns"
description: "Comprehensive guide to using TypeScript with React, including component patterns, hooks, and state management"
publishDate: "Dec 11 2024"
heroImage: "/typescript-react.png"
category: "TypeScript"
tags: ["typescript", "react", "frontend", "programming"]
---

# TypeScript with React

## Table of Contents
1. [Component Types](#component-types)
2. [Props and State](#props-and-state)
3. [Hooks](#hooks)
4. [Events](#events)
5. [Context](#context)
6. [Higher-Order Components](#higher-order-components)
7. [State Management](#state-management)

## Component Types

### Function Components

```typescript
interface GreetingProps {
    name: string;
    age?: number;
    onGreet?: (name: string) => void;
}

const Greeting: React.FC<GreetingProps> = ({ name, age, onGreet }) => {
    return (
        <div onClick={() => onGreet?.(name)}>
            Hello, {name}! {age && `You are ${age} years old.`}
        </div>
    );
};

// With children prop
interface ContainerProps {
    children: React.ReactNode;
    className?: string;
}

const Container: React.FC<ContainerProps> = ({ children, className }) => {
    return <div className={className}>{children}</div>;
};
```

### Generic Components

```typescript
interface ListProps<T> {
    items: T[];
    renderItem: (item: T) => React.ReactNode;
}

function List<T>({ items, renderItem }: ListProps<T>) {
    return (
        <ul>
            {items.map((item, index) => (
                <li key={index}>{renderItem(item)}</li>
            ))}
        </ul>
    );
}

// Usage
interface User {
    id: number;
    name: string;
}

const UserList = () => {
    const users: User[] = [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' }
    ];

    return (
        <List<User>
            items={users}
            renderItem={user => <span>{user.name}</span>}
        />
    );
};
```

## Props and State

### Prop Types

```typescript
// Union types for props
type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface ButtonProps {
    variant: ButtonVariant;
    size?: 'small' | 'medium' | 'large';
    onClick?: () => void;
    disabled?: boolean;
    children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
    variant,
    size = 'medium',
    onClick,
    disabled,
    children
}) => {
    return (
        <button
            className={`btn btn-${variant} btn-${size}`}
            onClick={onClick}
            disabled={disabled}
        >
            {children}
        </button>
    );
};
```

### State Types

```typescript
interface User {
    id: string;
    name: string;
    email: string;
}

interface UserState {
    user: User | null;
    loading: boolean;
    error: Error | null;
}

const UserProfile: React.FC = () => {
    const [state, setState] = useState<UserState>({
        user: null,
        loading: false,
        error: null
    });

    const loadUser = async (id: string) => {
        setState(prev => ({ ...prev, loading: true }));
        try {
            const user = await fetchUser(id);
            setState({ user, loading: false, error: null });
        } catch (error) {
            setState({ user: null, loading: false, error: error as Error });
        }
    };

    // ...
};
```

## Hooks

### Custom Hooks

```typescript
interface UseCounterOptions {
    initial?: number;
    min?: number;
    max?: number;
}

function useCounter({ initial = 0, min = -Infinity, max = Infinity }: UseCounterOptions = {}) {
    const [count, setCount] = useState(initial);

    const increment = useCallback(() => {
        setCount(prev => Math.min(prev + 1, max));
    }, [max]);

    const decrement = useCallback(() => {
        setCount(prev => Math.max(prev - 1, min));
    }, [min]);

    return { count, increment, decrement };
}

// Usage
const Counter: React.FC = () => {
    const { count, increment, decrement } = useCounter({
        initial: 0,
        min: 0,
        max: 10
    });

    return (
        <div>
            <button onClick={decrement}>-</button>
            <span>{count}</span>
            <button onClick={increment}>+</button>
        </div>
    );
};
```

### Generic Hooks

```typescript
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
            console.error(error);
        }
    };

    return [storedValue, setValue] as const;
}

// Usage
interface Theme {
    mode: 'light' | 'dark';
    primary: string;
}

const ThemeToggle: React.FC = () => {
    const [theme, setTheme] = useLocalStorage<Theme>('theme', {
        mode: 'light',
        primary: '#007bff'
    });

    // ...
};
```

## Events

### Event Handlers

```typescript
interface FormData {
    email: string;
    password: string;
}

const LoginForm: React.FC = () => {
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data: FormData = {
            email: formData.get('email') as string,
            password: formData.get('password') as string
        };
        // ...
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        // ...
    };

    return (
        <form onSubmit={handleSubmit}>
            <input
                type="email"
                name="email"
                onChange={handleChange}
            />
            <input
                type="password"
                name="password"
                onChange={handleChange}
            />
            <button type="submit">Login</button>
        </form>
    );
};
```

## Context

### Typed Context

```typescript
interface ThemeContextType {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    const toggleTheme = useCallback(() => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
```

## Higher-Order Components

### HOC with TypeScript

```typescript
interface WithLoadingProps {
    loading: boolean;
}

function withLoading<P extends object>(
    WrappedComponent: React.ComponentType<P>
) {
    return function WithLoadingComponent(
        props: P & WithLoadingProps
    ) {
        const { loading, ...componentProps } = props;
        
        if (loading) {
            return <div>Loading...</div>;
        }
        
        return <WrappedComponent {...(componentProps as P)} />;
    };
}

// Usage
interface UserListProps {
    users: User[];
}

const UserList: React.FC<UserListProps> = ({ users }) => {
    return (
        <ul>
            {users.map(user => (
                <li key={user.id}>{user.name}</li>
            ))}
        </ul>
    );
};

const UserListWithLoading = withLoading(UserList);

// Usage
<UserListWithLoading loading={true} users={[]} />
```

## State Management

### Redux with TypeScript

```typescript
// Action Types
enum ActionType {
    ADD_TODO = 'ADD_TODO',
    TOGGLE_TODO = 'TOGGLE_TODO',
    REMOVE_TODO = 'REMOVE_TODO'
}

interface Todo {
    id: string;
    text: string;
    completed: boolean;
}

interface AddTodoAction {
    type: ActionType.ADD_TODO;
    payload: {
        text: string;
    };
}

interface ToggleTodoAction {
    type: ActionType.TOGGLE_TODO;
    payload: {
        id: string;
    };
}

type TodoAction = AddTodoAction | ToggleTodoAction;

// Reducer
interface TodoState {
    todos: Todo[];
    loading: boolean;
}

const todoReducer = (
    state: TodoState,
    action: TodoAction
): TodoState => {
    switch (action.type) {
        case ActionType.ADD_TODO:
            return {
                ...state,
                todos: [
                    ...state.todos,
                    {
                        id: Date.now().toString(),
                        text: action.payload.text,
                        completed: false
                    }
                ]
            };
        case ActionType.TOGGLE_TODO:
            return {
                ...state,
                todos: state.todos.map(todo =>
                    todo.id === action.payload.id
                        ? { ...todo, completed: !todo.completed }
                        : todo
                )
            };
        default:
            return state;
    }
};
```

These patterns and practices help you:

1. Write type-safe React components
2. Handle props and state effectively
3. Create reusable hooks and components
4. Manage application state
5. Catch errors at compile time

Would you like me to:
1. Add more React patterns?
2. Create posts for other frameworks (Vue, Angular)?
3. Add more implementation details?
