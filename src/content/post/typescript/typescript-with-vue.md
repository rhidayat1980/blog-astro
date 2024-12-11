---
title: "TypeScript with Vue: Best Practices and Patterns"
description: "Comprehensive guide to using TypeScript with Vue 3, including Composition API, components, and state management"
publishDate: "Dec 11 2024"
heroImage: "/typescript-vue.png"
category: "TypeScript"
tags: ["typescript", "vue", "frontend", "programming"]
---

# TypeScript with Vue 3

## Table of Contents
1. [Component Types](#component-types)
2. [Composition API](#composition-api)
3. [Props and Events](#props-and-events)
4. [Refs and Reactive](#refs-and-reactive)
5. [Composables](#composables)
6. [State Management](#state-management)
7. [Advanced Patterns](#advanced-patterns)

## Component Types

### Script Setup Components

```typescript
<script setup lang="ts">
import { ref, computed } from 'vue';

interface User {
    id: number;
    name: string;
    email: string;
}

const user = ref<User>({
    id: 1,
    name: 'John Doe',
    email: 'john@example.com'
});

const upperName = computed(() => user.value.name.toUpperCase());
</script>

<template>
    <div>
        <h1>{{ upperName }}</h1>
        <p>{{ user.email }}</p>
    </div>
</template>
```

### Class Components

```typescript
<script lang="ts">
import { Options, Vue } from 'vue-class-component';
import { Prop } from 'vue-property-decorator';

interface User {
    id: number;
    name: string;
}

@Options({
    name: 'UserProfile'
})
export default class UserProfile extends Vue {
    @Prop({ required: true }) user!: User;
    
    get upperName(): string {
        return this.user.name.toUpperCase();
    }
    
    mounted() {
        console.log('Component mounted');
    }
}
</script>
```

## Composition API

### Typed Composables

```typescript
<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface UseCounter {
    count: Ref<number>;
    increment: () => void;
    decrement: () => void;
}

function useCounter(initial = 0): UseCounter {
    const count = ref(initial);

    const increment = () => {
        count.value++;
    };

    const decrement = () => {
        count.value--;
    };

    return {
        count,
        increment,
        decrement
    };
}

const { count, increment, decrement } = useCounter(10);
</script>

<template>
    <div>
        <button @click="decrement">-</button>
        <span>{{ count }}</span>
        <button @click="increment">+</button>
    </div>
</template>
```

### Async Composables

```typescript
<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface User {
    id: number;
    name: string;
}

interface UseUsers {
    users: Ref<User[]>;
    loading: Ref<boolean>;
    error: Ref<Error | null>;
    fetchUsers: () => Promise<void>;
}

function useUsers(): UseUsers {
    const users = ref<User[]>([]);
    const loading = ref(false);
    const error = ref<Error | null>(null);

    const fetchUsers = async () => {
        loading.value = true;
        error.value = null;
        
        try {
            const response = await fetch('/api/users');
            users.value = await response.json();
        } catch (e) {
            error.value = e as Error;
        } finally {
            loading.value = false;
        }
    };

    onMounted(fetchUsers);

    return {
        users,
        loading,
        error,
        fetchUsers
    };
}

const { users, loading, error } = useUsers();
</script>
```

## Props and Events

### Typed Props

```typescript
<script setup lang="ts">
interface ButtonProps {
    variant?: 'primary' | 'secondary' | 'danger';
    size?: 'small' | 'medium' | 'large';
    disabled?: boolean;
}

const props = withDefaults(defineProps<ButtonProps>(), {
    variant: 'primary',
    size: 'medium',
    disabled: false
});

const emit = defineEmits<{
    (e: 'click', value: MouseEvent): void;
    (e: 'focus', value: FocusEvent): void;
}>();

const handleClick = (event: MouseEvent) => {
    emit('click', event);
};
</script>

<template>
    <button
        :class="[`btn-${variant}`, `btn-${size}`]"
        :disabled="disabled"
        @click="handleClick"
    >
        <slot></slot>
    </button>
</template>
```

### Generic Components

```typescript
<script setup lang="ts">
interface ListProps<T> {
    items: T[];
    keyField: keyof T;
}

const props = defineProps<ListProps<any>>();

const emit = defineEmits<{
    (e: 'select', value: any): void;
}>();
</script>

<template>
    <ul>
        <li v-for="item in items" :key="item[keyField]" @click="emit('select', item)">
            <slot name="item" :item="item">
                {{ item }}
            </slot>
        </li>
    </ul>
</template>
```

## Refs and Reactive

### Typed Refs

```typescript
<script setup lang="ts">
import { ref, computed } from 'vue';

interface User {
    id: number;
    name: string;
    email: string;
}

const user = ref<User>({
    id: 1,
    name: 'John',
    email: 'john@example.com'
});

const nameLength = computed(() => user.value.name.length);

// Template refs
const inputRef = ref<HTMLInputElement | null>(null);

onMounted(() => {
    inputRef.value?.focus();
});
</script>

<template>
    <div>
        <input ref="inputRef" v-model="user.name" />
        <p>Name length: {{ nameLength }}</p>
    </div>
</template>
```

### Reactive State

```typescript
<script setup lang="ts">
import { reactive, computed } from 'vue';

interface State {
    user: {
        name: string;
        email: string;
    };
    preferences: {
        theme: 'light' | 'dark';
        notifications: boolean;
    };
}

const state = reactive<State>({
    user: {
        name: '',
        email: ''
    },
    preferences: {
        theme: 'light',
        notifications: true
    }
});

const isValid = computed(() => {
    return state.user.name.length > 0 && state.user.email.includes('@');
});
</script>
```

## Composables

### Form Handling

```typescript
<script setup lang="ts">
interface FormData {
    email: string;
    password: string;
}

interface UseForm<T> {
    data: T;
    errors: Partial<Record<keyof T, string>>;
    touched: Partial<Record<keyof T, boolean>>;
    handleSubmit: (e: Event) => Promise<void>;
    handleInput: (field: keyof T) => (e: Event) => void;
}

function useForm<T extends object>(
    initial: T,
    validate: (data: T) => Partial<Record<keyof T, string>>
): UseForm<T> {
    const data = reactive({ ...initial }) as T;
    const errors = reactive<Partial<Record<keyof T, string>>>({});
    const touched = reactive<Partial<Record<keyof T, boolean>>>({});

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        const validationErrors = validate(data);
        Object.assign(errors, validationErrors);
        
        if (Object.keys(validationErrors).length === 0) {
            // Submit form
        }
    };

    const handleInput = (field: keyof T) => (e: Event) => {
        const target = e.target as HTMLInputElement;
        data[field] = target.value as T[keyof T];
        touched[field] = true;
    };

    return {
        data,
        errors,
        touched,
        handleSubmit,
        handleInput
    };
}

// Usage
const { data, errors, handleSubmit, handleInput } = useForm<FormData>(
    {
        email: '',
        password: ''
    },
    (data) => {
        const errors: Partial<Record<keyof FormData, string>> = {};
        
        if (!data.email) {
            errors.email = 'Email is required';
        }
        
        if (!data.password) {
            errors.password = 'Password is required';
        }
        
        return errors;
    }
);
</script>
```

## State Management

### Pinia Store

```typescript
// store/user.ts
import { defineStore } from 'pinia';

interface User {
    id: number;
    name: string;
}

interface UserState {
    currentUser: User | null;
    users: User[];
    loading: boolean;
}

export const useUserStore = defineStore('user', {
    state: (): UserState => ({
        currentUser: null,
        users: [],
        loading: false
    }),
    
    getters: {
        isLoggedIn: (state) => state.currentUser !== null,
        userById: (state) => {
            return (id: number) => state.users.find(u => u.id === id);
        }
    },
    
    actions: {
        async fetchUsers() {
            this.loading = true;
            try {
                const response = await fetch('/api/users');
                this.users = await response.json();
            } finally {
                this.loading = false;
            }
        },
        
        setCurrentUser(user: User) {
            this.currentUser = user;
        }
    }
});

// Component usage
<script setup lang="ts">
import { useUserStore } from '@/store/user';

const userStore = useUserStore();

onMounted(async () => {
    await userStore.fetchUsers();
});
</script>
```

These patterns and practices help you:

1. Write type-safe Vue components
2. Create reusable composables
3. Handle component props and events
4. Manage application state
5. Create maintainable code

Would you like me to:
1. Add more Vue patterns?
2. Create posts for other frameworks?
3. Add more implementation details?
