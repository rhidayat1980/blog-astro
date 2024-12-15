---
title: "Web Development with Go"
description: "Learn about building web applications, RESTful APIs, and web services using Go"
publishDate: 2024-12-13
tags: ["golang", "programming", "tutorial", "web-development", "advanced"]
draft: false
---

## Web Development with Go

Go provides excellent support for web development through its standard library and a rich ecosystem of third-party packages. In this guide, we'll explore building web applications and RESTful APIs using Go.

## Basic HTTP Server

### Simple Web Server

```go
package main

import (
    "fmt"
    "log"
    "net/http"
)

func handler(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, "Hello, %s!", r.URL.Path[1:])
}

func main() {
    http.HandleFunc("/", handler)
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

### Routing and Handlers

```go
func main() {
    // Basic routing
    http.HandleFunc("/", homeHandler)
    http.HandleFunc("/about", aboutHandler)
    http.HandleFunc("/api/users", usersHandler)
    
    // Start server
    log.Fatal(http.ListenAndServe(":8080", nil))
}

func homeHandler(w http.ResponseWriter, r *http.Request) {
    if r.URL.Path != "/" {
        http.NotFound(w, r)
        return
    }
    fmt.Fprintf(w, "Welcome to the home page!")
}

func aboutHandler(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, "About page")
}

func usersHandler(w http.ResponseWriter, r *http.Request) {
    switch r.Method {
    case "GET":
        // Handle GET request
    case "POST":
        // Handle POST request
    default:
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
    }
}
```

## RESTful API Development

### Basic REST API Structure

```go
package main

import (
    "encoding/json"
    "log"
    "net/http"
)

type User struct {
    ID   string `json:"id"`
    Name string `json:"name"`
    Age  int    `json:"age"`
}

func main() {
    // API routes
    http.HandleFunc("/api/users", handleUsers)
    http.HandleFunc("/api/users/", handleUser)
    
    log.Fatal(http.ListenAndServe(":8080", nil))
}

func handleUsers(w http.ResponseWriter, r *http.Request) {
    switch r.Method {
    case "GET":
        getUsers(w, r)
    case "POST":
        createUser(w, r)
    default:
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
    }
}

func getUsers(w http.ResponseWriter, r *http.Request) {
    users := []User{
        {ID: "1", Name: "John", Age: 30},
        {ID: "2", Name: "Jane", Age: 25},
    }
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(users)
}

func createUser(w http.ResponseWriter, r *http.Request) {
    var user User
    if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }
    
    // Save user...
    
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(user)
}
```

## Middleware

### Basic Middleware Pattern

```go
func loggingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        log.Printf("%s %s", r.Method, r.URL.Path)
        next.ServeHTTP(w, r)
    })
}

func authMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        token := r.Header.Get("Authorization")
        if token == "" {
            http.Error(w, "Unauthorized", http.StatusUnauthorized)
            return
        }
        next.ServeHTTP(w, r)
    })
}
```

## Using Templates

### HTML Templates

```go
package main

import (
    "html/template"
    "net/http"
)

type PageData struct {
    Title string
    Users []User
}

func renderTemplate(w http.ResponseWriter, tmpl string, data PageData) {
    t, err := template.ParseFiles("templates/" + tmpl + ".html")
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    t.Execute(w, data)
}

func homeHandler(w http.ResponseWriter, r *http.Request) {
    data := PageData{
        Title: "Welcome",
        Users: []User{
            {Name: "John", Age: 30},
            {Name: "Jane", Age: 25},
        },
    }
    renderTemplate(w, "home", data)
}
```

## Database Integration

### Using Database with Web API

```go
package main

import (
    "database/sql"
    "encoding/json"
    "log"
    "net/http"
    
    _ "github.com/lib/pq"
)

type App struct {
    DB *sql.DB
}

func (app *App) getUsersHandler(w http.ResponseWriter, r *http.Request) {
    rows, err := app.DB.Query("SELECT id, name, age FROM users")
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    defer rows.Close()
    
    var users []User
    for rows.Next() {
        var u User
        if err := rows.Scan(&u.ID, &u.Name, &u.Age); err != nil {
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return
        }
        users = append(users, u)
    }
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(users)
}
```

## Error Handling in Web Applications

```go
type ErrorResponse struct {
    Error string `json:"error"`
}

func respondWithError(w http.ResponseWriter, code int, message string) {
    respondWithJSON(w, code, ErrorResponse{Error: message})
}

func respondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
    response, err := json.Marshal(payload)
    if err != nil {
        log.Printf("Error marshaling JSON: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        return
    }
    
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(code)
    w.Write(response)
}
```

## Complete Web Application Example

Here's a complete example of a RESTful API with database integration, middleware, and error handling:

```go
package main

import (
    "database/sql"
    "encoding/json"
    "log"
    "net/http"
    "os"
    "time"
    
    "github.com/gorilla/mux"
    _ "github.com/lib/pq"
)

type App struct {
    Router *mux.Router
    DB     *sql.DB
}

type User struct {
    ID        string    `json:"id"`
    Name      string    `json:"name"`
    Email     string    `json:"email"`
    CreatedAt time.Time `json:"created_at"`
}

func (app *App) Initialize(dbHost, dbUser, dbPass, dbName string) {
    connectionString :=
        fmt.Sprintf("host=%s user=%s password=%s dbname=%s sslmode=disable",
            dbHost, dbUser, dbPass, dbName)
    
    var err error
    app.DB, err = sql.Open("postgres", connectionString)
    if err != nil {
        log.Fatal(err)
    }
    
    app.Router = mux.NewRouter()
    app.setupRoutes()
}

func (app *App) setupRoutes() {
    // Middleware
    app.Router.Use(loggingMiddleware)
    
    // Routes
    app.Router.HandleFunc("/api/users", app.getUsers).Methods("GET")
    app.Router.HandleFunc("/api/users", app.createUser).Methods("POST")
    app.Router.HandleFunc("/api/users/{id}", app.getUser).Methods("GET")
    app.Router.HandleFunc("/api/users/{id}", app.updateUser).Methods("PUT")
    app.Router.HandleFunc("/api/users/{id}", app.deleteUser).Methods("DELETE")
}

func (app *App) Run(addr string) {
    log.Fatal(http.ListenAndServe(addr, app.Router))
}

// Middleware
func loggingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        log.Printf("%s %s", r.Method, r.URL.Path)
        next.ServeHTTP(w, r)
    })
}

// Handlers
func (app *App) getUsers(w http.ResponseWriter, r *http.Request) {
    users, err := app.getAllUsers()
    if err != nil {
        respondWithError(w, http.StatusInternalServerError, err.Error())
        return
    }
    
    respondWithJSON(w, http.StatusOK, users)
}

func (app *App) createUser(w http.ResponseWriter, r *http.Request) {
    var user User
    decoder := json.NewDecoder(r.Body)
    if err := decoder.Decode(&user); err != nil {
        respondWithError(w, http.StatusBadRequest, "Invalid request payload")
        return
    }
    defer r.Body.Close()
    
    if err := app.insertUser(&user); err != nil {
        respondWithError(w, http.StatusInternalServerError, err.Error())
        return
    }
    
    respondWithJSON(w, http.StatusCreated, user)
}

func (app *App) getUser(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    user, err := app.getUserByID(vars["id"])
    if err != nil {
        respondWithError(w, http.StatusNotFound, "User not found")
        return
    }
    
    respondWithJSON(w, http.StatusOK, user)
}

// Database operations
func (app *App) getAllUsers() ([]User, error) {
    rows, err := app.DB.Query(
        "SELECT id, name, email, created_at FROM users")
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    var users []User
    for rows.Next() {
        var u User
        if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.CreatedAt); err != nil {
            return nil, err
        }
        users = append(users, u)
    }
    
    return users, nil
}

func (app *App) insertUser(u *User) error {
    u.CreatedAt = time.Now()
    
    err := app.DB.QueryRow(
        "INSERT INTO users(name, email, created_at) VALUES($1, $2, $3) RETURNING id",
        u.Name, u.Email, u.CreatedAt).Scan(&u.ID)
    
    if err != nil {
        return err
    }
    
    return nil
}

func (app *App) getUserByID(id string) (*User, error) {
    var u User
    err := app.DB.QueryRow(
        "SELECT id, name, email, created_at FROM users WHERE id=$1",
        id).Scan(&u.ID, &u.Name, &u.Email, &u.CreatedAt)
    
    if err != nil {
        return nil, err
    }
    
    return &u, nil
}

// Helper functions
func respondWithError(w http.ResponseWriter, code int, message string) {
    respondWithJSON(w, code, map[string]string{"error": message})
}

func respondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
    response, _ := json.Marshal(payload)
    
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(code)
    w.Write(response)
}

func main() {
    app := App{}
    app.Initialize(
        os.Getenv("DB_HOST"),
        os.Getenv("DB_USER"),
        os.Getenv("DB_PASSWORD"),
        os.Getenv("DB_NAME"),
    )
    
    app.Run(":8080")
}
```

This completes our comprehensive series on Go programming! We've covered:

1. Introduction to Go
2. Variables and Data Types
3. Control Structures
4. Functions
5. Arrays and Slices
6. Maps
7. Structs
8. Interfaces
9. Goroutines and Concurrency
10. Channels
11. Error Handling
12. Testing
13. Web Development

Each post provides detailed explanations, examples, and best practices to help you become proficient in Go programming. Would you like me to create more posts about specific topics or advanced concepts?
