---
title: "TypeScript with Svelte: Best Practices and Patterns"
description: "Comprehensive guide to using TypeScript with Svelte, including components, stores, actions, and state management"
publishDate: "Dec 11 2024"
heroImage: "/typescript-svelte.png"
category: "TypeScript"
tags: ["typescript", "svelte", "frontend", "programming"]
---

# TypeScript with Svelte

## Table of Contents
1. [Components](#components)
2. [Props and Events](#props-and-events)
3. [Stores](#stores)
4. [Actions](#actions)
5. [Context](#context)
6. [Advanced Patterns](#advanced-patterns)

## Components

### Basic Components

```typescript
<!-- Counter.svelte -->
<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    export let initialCount = 0;
    export let step = 1;

    let count = initialCount;
    const dispatch = createEventDispatcher<{
        change: number;
        reset: void;
    }>();

    function increment() {
        count += step;
        dispatch('change', count);
    }

    function reset() {
        count = initialCount;
        dispatch('reset');
    }
</script>

<div>
    <button on:click={increment}>Count: {count}</button>
    <button on:click={reset}>Reset</button>
</div>
```

### Generic Components

```typescript
<!-- List.svelte -->
<script lang="ts">
    import type { SvelteComponent } from 'svelte';

    export let items: T[];
    export let component: typeof SvelteComponent;
    export let keyField: keyof T;

    type T = $$Generic;
</script>

{#each items as item (item[keyField])}
    <svelte:component 
        this={component} 
        {...item} 
        on:select
    />
{/each}

<!-- Usage -->
<script lang="ts">
    import List from './List.svelte';
    import UserCard from './UserCard.svelte';

    interface User {
        id: number;
        name: string;
    }

    let users: User[] = [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' }
    ];
</script>

<List
    items={users}
    component={UserCard}
    keyField="id"
    on:select={(e) => console.log(e.detail)}
/>
```

## Props and Events

### Typed Props

```typescript
<!-- Button.svelte -->
<script lang="ts">
    type Variant = 'primary' | 'secondary' | 'danger';
    type Size = 'small' | 'medium' | 'large';

    export let variant: Variant = 'primary';
    export let size: Size = 'medium';
    export let disabled = false;

    const sizeClasses: Record<Size, string> = {
        small: 'text-sm px-2 py-1',
        medium: 'text-base px-3 py-2',
        large: 'text-lg px-4 py-3'
    };
</script>

<button
    class="btn {variant} {sizeClasses[size]}"
    {disabled}
    on:click
>
    <slot />
</button>
```

### Event Handling

```typescript
<!-- Form.svelte -->
<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    interface FormData {
        email: string;
        password: string;
    }

    export let initialData: Partial<FormData> = {};

    const dispatch = createEventDispatcher<{
        submit: FormData;
        change: Partial<FormData>;
    }>();

    let formData: FormData = {
        email: initialData.email || '',
        password: initialData.password || ''
    };

    function handleSubmit(e: Event) {
        e.preventDefault();
        dispatch('submit', formData);
    }

    function handleInput(e: Event) {
        const target = e.target as HTMLInputElement;
        formData = { ...formData, [target.name]: target.value };
        dispatch('change', formData);
    }
</script>

<form on:submit={handleSubmit}>
    <input
        type="email"
        name="email"
        bind:value={formData.email}
        on:input={handleInput}
    />
    <input
        type="password"
        name="password"
        bind:value={formData.password}
        on:input={handleInput}
    />
    <button type="submit">Submit</button>
</form>
```

## Stores

### Custom Stores

```typescript
// stores/createUserStore.ts
import { writable } from 'svelte/store';

interface User {
    id: number;
    name: string;
}

interface UserState {
    users: User[];
    selectedUser: User | null;
    loading: boolean;
}

export function createUserStore() {
    const { subscribe, set, update } = writable<UserState>({
        users: [],
        selectedUser: null,
        loading: false
    });

    return {
        subscribe,
        setUsers: (users: User[]) => update(state => ({ ...state, users })),
        selectUser: (user: User) => update(state => ({ ...state, selectedUser: user })),
        setLoading: (loading: boolean) => update(state => ({ ...state, loading })),
        reset: () => set({ users: [], selectedUser: null, loading: false })
    };
}

// Usage
import { createUserStore } from './stores/createUserStore';

const userStore = createUserStore();

// Component
<script lang="ts">
    import { userStore } from './stores';

    $: selectedUser = $userStore.selectedUser;
    $: loading = $userStore.loading;

    function handleSelect(user: User) {
        userStore.selectUser(user);
    }
</script>
```

### Derived Stores

```typescript
// stores/createFilteredStore.ts
import { derived } from 'svelte/store';
import type { Readable } from 'svelte/store';

export function createFilteredStore<T>(
    store: Readable<T[]>,
    filterFn: (item: T) => boolean
) {
    return derived(store, $items => $items.filter(filterFn));
}

// Usage
const users = writable<User[]>([]);
const activeUsers = createFilteredStore(
    users,
    user => user.status === 'active'
);
```

## Actions

### Typed Actions

```typescript
// actions/clickOutside.ts
import type { Action } from 'svelte/action';

interface ClickOutsideParameters {
    enabled?: boolean;
    callback?: () => void;
}

export const clickOutside: Action<HTMLElement, ClickOutsideParameters> = (
    node,
    parameters = {}
) => {
    const { enabled = true, callback } = parameters;

    function handleClick(event: MouseEvent) {
        if (!enabled) return;
        if (!node.contains(event.target as Node)) {
            callback?.();
        }
    }

    document.addEventListener('click', handleClick);

    return {
        destroy() {
            document.removeEventListener('click', handleClick);
        },
        update(newParameters) {
            parameters = newParameters;
        }
    };
};

// Usage
<script lang="ts">
    import { clickOutside } from './actions';

    let showDropdown = false;
</script>

<div
    use:clickOutside={{
        enabled: showDropdown,
        callback: () => showDropdown = false
    }}
>
    <!-- Dropdown content -->
</div>
```

## Context

### Typed Context

```typescript
<!-- ThemeContext.svelte -->
<script lang="ts" context="module">
    import { getContext, setContext } from 'svelte';

    interface Theme {
        mode: 'light' | 'dark';
        primary: string;
        secondary: string;
    }

    interface ThemeContext {
        theme: Theme;
        toggleTheme: () => void;
    }

    const KEY = Symbol();

    export function getThemeContext() {
        return getContext<ThemeContext>(KEY);
    }

    export function setThemeContext(context: ThemeContext) {
        setContext(KEY, context);
    }
</script>

<script lang="ts">
    import { writable } from 'svelte/store';

    const theme = writable<Theme>({
        mode: 'light',
        primary: '#007bff',
        secondary: '#6c757d'
    });

    setThemeContext({
        theme,
        toggleTheme: () => {
            theme.update(t => ({
                ...t,
                mode: t.mode === 'light' ? 'dark' : 'light'
            }));
        }
    });
</script>

<slot />

<!-- Usage -->
<script lang="ts">
    import { getThemeContext } from './ThemeContext.svelte';

    const { theme, toggleTheme } = getThemeContext();
</script>
```

## Advanced Patterns

### Component Composition

```typescript
<!-- Modal.svelte -->
<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    export let open = false;
    export let title: string;

    const dispatch = createEventDispatcher<{
        close: void;
    }>();

    function handleClose() {
        dispatch('close');
    }
</script>

{#if open}
    <div class="modal">
        <header>
            <h2>{title}</h2>
            <button on:click={handleClose}>×</button>
        </header>
        <div class="content">
            <slot />
        </div>
        <footer>
            <slot name="footer" />
        </footer>
    </div>
{/if}

<!-- Usage -->
<script lang="ts">
    import Modal from './Modal.svelte';

    let showModal = false;
    let formData = {
        name: '',
        email: ''
    };

    function handleSubmit() {
        // Handle form submission
        showModal = false;
    }
</script>

<Modal
    bind:open={showModal}
    title="Edit Profile"
    on:close={() => showModal = false}
>
    <form on:submit|preventDefault={handleSubmit}>
        <input bind:value={formData.name} />
        <input bind:value={formData.email} />
    </form>
    <svelte:fragment slot="footer">
        <button on:click={handleSubmit}>Save</button>
    </svelte:fragment>
</Modal>
```

These patterns and practices help you:

1. Write type-safe Svelte components
2. Handle component props and events
3. Manage application state
4. Create reusable actions and stores
5. Build maintainable applications

Would you like me to:
1. Add more Svelte patterns?
2. Create posts about TypeScript architecture patterns?
3. Add more implementation details?
