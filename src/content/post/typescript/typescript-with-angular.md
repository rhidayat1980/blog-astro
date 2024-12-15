---
title: "TypeScript with Angular: Best Practices and Patterns"
description: "Comprehensive guide to using TypeScript with Angular, including components, services, dependency injection, and state management"
publishDate: "Dec 11 2024"
heroImage: "/typescript-angular.png"
category: "TypeScript"
tags: ["typescript", "angular", "frontend", "programming"]
---

# TypeScript with Angular

## Table of Contents

1. [Components](#components)
2. [Services](#services)
3. [Dependency Injection](#dependency-injection)
4. [Guards and Interceptors](#guards-and-interceptors)
5. [State Management](#state-management)
6. [Advanced Patterns](#advanced-patterns)

## Components

### Smart Components

```typescript
// user-list.component.ts
import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { UserService } from './user.service';

interface User {
    id: number;
    name: string;
    email: string;
}

@Component({
    selector: 'app-user-list',
    template: `
        <div *ngIf="users$ | async as users">
            <app-user-card
                *ngFor="let user of users"
                [user]="user"
                (select)="onSelect($event)"
            ></app-user-card>
        </div>
    `
})
export class UserListComponent implements OnInit {
    users$: Observable<User[]>;

    constructor(private userService: UserService) {
        this.users$ = this.userService.getUsers();
    }

    onSelect(user: User): void {
        this.userService.selectUser(user);
    }
}
```

### Presentation Components

```typescript
// user-card.component.ts
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

interface User {
    id: number;
    name: string;
    email: string;
}

@Component({
    selector: 'app-user-card',
    template: `
        <div class="card" (click)="select.emit(user)">
            <h3>{{ user.name }}</h3>
            <p>{{ user.email }}</p>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserCardComponent {
    @Input() user!: User;
    @Output() select = new EventEmitter<User>();
}
```

## Services

### HTTP Service

```typescript
// api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

interface ApiResponse<T> {
    data: T;
    meta: {
        total: number;
        page: number;
    };
}

@Injectable({
    providedIn: 'root'
})
export class ApiService {
    constructor(private http: HttpClient) {}

    get<T>(url: string, params?: Record<string, string>): Observable<T> {
        const httpParams = new HttpParams({ fromObject: params || {} });

        return this.http.get<ApiResponse<T>>(url, { params: httpParams }).pipe(
            map(response => response.data),
            catchError(error => throwError(() => error))
        );
    }

    post<T>(url: string, body: any): Observable<T> {
        return this.http.post<ApiResponse<T>>(url, body).pipe(
            map(response => response.data),
            catchError(error => throwError(() => error))
        );
    }
}
```

### State Service

```typescript
// user.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface User {
    id: number;
    name: string;
}

interface UserState {
    users: User[];
    selectedUser: User | null;
    loading: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private state = new BehaviorSubject<UserState>({
        users: [],
        selectedUser: null,
        loading: false
    });

    users$ = this.state.pipe(map(state => state.users));
    selectedUser$ = this.state.pipe(map(state => state.selectedUser));
    loading$ = this.state.pipe(map(state => state.loading));

    setUsers(users: User[]): void {
        this.state.next({
            ...this.state.value,
            users
        });
    }

    selectUser(user: User): void {
        this.state.next({
            ...this.state.value,
            selectedUser: user
        });
    }

    setLoading(loading: boolean): void {
        this.state.next({
            ...this.state.value,
            loading
        });
    }
}
```

## Dependency Injection

### Token-based Injection

```typescript
// config.token.ts
import { InjectionToken } from '@angular/core';

export interface AppConfig {
    apiUrl: string;
    theme: 'light' | 'dark';
}

export const APP_CONFIG = new InjectionToken<AppConfig>('app.config');

// app.module.ts
import { NgModule } from '@angular/core';
import { APP_CONFIG } from './config.token';

@NgModule({
    providers: [
        {
            provide: APP_CONFIG,
            useValue: {
                apiUrl: 'https://api.example.com',
                theme: 'light'
            }
        }
    ]
})
export class AppModule {}

// some.service.ts
import { Injectable, Inject } from '@angular/core';
import { APP_CONFIG, AppConfig } from './config.token';

@Injectable({
    providedIn: 'root'
})
export class SomeService {
    constructor(@Inject(APP_CONFIG) private config: AppConfig) {}
}
```

### Factory Providers

```typescript
// cache.service.ts
import { Injectable, InjectionToken } from '@angular/core';

export interface CacheConfig {
    ttl: number;
    maxSize: number;
}

export const CACHE_CONFIG = new InjectionToken<CacheConfig>('cache.config');

@Injectable()
export class CacheService {
    constructor(@Inject(CACHE_CONFIG) private config: CacheConfig) {}
}

// Factory function
export function cacheServiceFactory(config: CacheConfig) {
    return new CacheService(config);
}

// Module
@NgModule({
    providers: [
        {
            provide: CacheService,
            useFactory: cacheServiceFactory,
            deps: [CACHE_CONFIG]
        }
    ]
})
export class CacheModule {}
```

## Guards and Interceptors

### Type-safe Route Guards

```typescript
// auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { map } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class AuthGuard implements CanActivate {
    constructor(private authService: AuthService) {}

    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Observable<boolean | UrlTree> {
        return this.authService.isAuthenticated$.pipe(
            map(isAuthenticated => {
                if (!isAuthenticated) {
                    // Redirect to login
                    return this.router.createUrlTree(['/login']);
                }
                return true;
            })
        );
    }
}
```

### HTTP Interceptors

```typescript
// auth.interceptor.ts
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    constructor(private authService: AuthService) {}

    intercept(
        request: HttpRequest<unknown>,
        next: HttpHandler
    ): Observable<HttpEvent<unknown>> {
        const token = this.authService.getToken();

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

## State Management

### NgRx Store

```typescript
// user.actions.ts
import { createAction, props } from '@ngrx/store';

export const loadUsers = createAction('[User] Load Users');
export const loadUsersSuccess = createAction(
    '[User] Load Users Success',
    props<{ users: User[] }>()
);
export const loadUsersFailure = createAction(
    '[User] Load Users Failure',
    props<{ error: any }>()
);

// user.reducer.ts
import { createReducer, on } from '@ngrx/store';
import * as UserActions from './user.actions';

export interface UserState {
    users: User[];
    loading: boolean;
    error: any;
}

export const initialState: UserState = {
    users: [],
    loading: false,
    error: null
};

export const userReducer = createReducer(
    initialState,
    on(UserActions.loadUsers, state => ({
        ...state,
        loading: true
    })),
    on(UserActions.loadUsersSuccess, (state, { users }) => ({
        ...state,
        loading: false,
        users
    })),
    on(UserActions.loadUsersFailure, (state, { error }) => ({
        ...state,
        loading: false,
        error
    }))
);

// user.effects.ts
import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, mergeMap, catchError } from 'rxjs/operators';
import * as UserActions from './user.actions';

@Injectable()
export class UserEffects {
    loadUsers$ = createEffect(() =>
        this.actions$.pipe(
            ofType(UserActions.loadUsers),
            mergeMap(() =>
                this.userService.getUsers().pipe(
                    map(users => UserActions.loadUsersSuccess({ users })),
                    catchError(error => of(UserActions.loadUsersFailure({ error })))
                )
            )
        )
    );

    constructor(
        private actions$: Actions,
        private userService: UserService
    ) {}
}
```

## Advanced Patterns

### Generic Components

```typescript
// list.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
    selector: 'app-list',
    template: `
        <ul>
            <li *ngFor="let item of items">
                <ng-container
                    *ngTemplateOutlet="itemTemplate; context: { $implicit: item }"
                ></ng-container>
            </li>
        </ul>
    `
})
export class ListComponent<T> {
    @Input() items!: T[];
    @Input() itemTemplate!: TemplateRef<{ $implicit: T }>;
    @Output() select = new EventEmitter<T>();
}

// Usage
@Component({
    template: `
        <app-list
            [items]="users"
            [itemTemplate]="userTemplate"
            (select)="onSelect($event)"
        >
            <ng-template #userTemplate let-user>
                {{ user.name }}
            </ng-template>
        </app-list>
    `
})
export class UserListComponent {
    users: User[] = [];
    onSelect(user: User): void {}
}
```

These patterns and practices help you:

1. Write type-safe Angular applications
2. Implement proper dependency injection
3. Handle state management effectively
4. Create reusable components
5. Implement proper security measures

Would you like me to:
1. Add more Angular patterns?
2. Create the Svelte post?
3. Add more implementation details?
