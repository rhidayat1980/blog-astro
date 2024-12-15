---
title: "Building Web Applications with Echo"
description: "Learn how to build high-performance web applications using the Echo framework in Go"
publishDate: 2024-12-13
tags: ["golang", "programming", "tutorial", "web-frameworks", "echo", "advanced"]
draft: false
---

## Building Web Applications with Echo

This guide demonstrates how to build high-performance web applications using the Echo framework in Go. We'll create a complete REST API with best practices and production-ready features.

## What is Echo?

Echo is a high-performance, extensible, minimalist Go web framework. It's focused on being minimalist while providing robust features for building web applications and APIs.

## Example Project: Task Management API

We'll build a task management API with the following features:

1. CRUD operations for tasks
2. User authentication
3. Request validation
4. Custom middleware
5. File upload/download
6. Error handling
7. OpenAPI/Swagger documentation

### Project Structure

```bash
task-api/
├── handlers/
│   └── task.go
├── middleware/
│   └── auth.go
├── models/
│   └── task.go
├── docs/
│   └── swagger.yaml
├── main.go
└── go.mod
```

### 1. Models

```go
// models/task.go
package models

import "time"

type Task struct {
    ID          uint      `json:"id"`
    Title       string    `json:"title" validate:"required,min=3"`
    Description string    `json:"description"`
    Status      string    `json:"status" validate:"required,oneof=pending in_progress completed"`
    DueDate     time.Time `json:"due_date" validate:"required,gtefield=time.Now"`
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
    UserID      uint      `json:"user_id"`
}

type TaskFilter struct {
    Status string `query:"status"`
    Search string `query:"search"`
}

// Custom error response
type ErrorResponse struct {
    Message string `json:"message"`
    Code    int    `json:"code"`
}
```

### 2. Middleware

```go
// middleware/auth.go
package middleware

import (
    "strings"
    
    "github.com/labstack/echo/v4"
)

func AuthMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
    return func(c echo.Context) error {
        authHeader := c.Request().Header.Get("Authorization")
        if authHeader == "" {
            return echo.NewHTTPError(401, "Authorization header required")
        }
        
        // Simple token validation (in production, use proper JWT validation)
        token := strings.TrimPrefix(authHeader, "Bearer ")
        if token == "" {
            return echo.NewHTTPError(401, "Invalid token format")
        }
        
        // Set user ID (in production, extract from JWT)
        c.Set("user_id", uint(1))
        return next(c)
    }
}

// Custom validator
type CustomValidator struct {
    validator *validator.Validate
}

func (cv *CustomValidator) Validate(i interface{}) error {
    if err := cv.validator.Struct(i); err != nil {
        return echo.NewHTTPError(400, err.Error())
    }
    return nil
}
```

### 3. Handlers

```go
// handlers/task.go
package handlers

import (
    "net/http"
    "strconv"
    "time"
    
    "github.com/labstack/echo/v4"
    "task-api/models"
)

type TaskHandler struct {
    tasks []models.Task // In production, use a database
}

func NewTaskHandler() *TaskHandler {
    return &TaskHandler{
        tasks: make([]models.Task, 0),
    }
}

// @Summary Create a new task
// @Description Create a new task with the provided details
// @Tags tasks
// @Accept json
// @Produce json
// @Param task body models.Task true "Task object"
// @Success 201 {object} models.Task
// @Failure 400 {object} models.ErrorResponse
// @Router /tasks [post]
func (h *TaskHandler) CreateTask(c echo.Context) error {
    var task models.Task
    if err := c.Bind(&task); err != nil {
        return echo.NewHTTPError(http.StatusBadRequest, err.Error())
    }
    
    if err := c.Validate(&task); err != nil {
        return err
    }
    
    // Set metadata
    task.ID = uint(len(h.tasks) + 1)
    task.CreatedAt = time.Now()
    task.UpdatedAt = time.Now()
    task.UserID = c.Get("user_id").(uint)
    
    h.tasks = append(h.tasks, task)
    
    return c.JSON(http.StatusCreated, task)
}

// @Summary Get all tasks
// @Description Get all tasks with optional filtering
// @Tags tasks
// @Accept json
// @Produce json
// @Param status query string false "Filter by status"
// @Param search query string false "Search in title"
// @Success 200 {array} models.Task
// @Router /tasks [get]
func (h *TaskHandler) ListTasks(c echo.Context) error {
    var filter models.TaskFilter
    if err := c.Bind(&filter); err != nil {
        return echo.NewHTTPError(http.StatusBadRequest, err.Error())
    }
    
    userID := c.Get("user_id").(uint)
    var filteredTasks []models.Task
    
    for _, task := range h.tasks {
        if task.UserID != userID {
            continue
        }
        
        if filter.Status != "" && task.Status != filter.Status {
            continue
        }
        
        if filter.Search != "" && !strings.Contains(
            strings.ToLower(task.Title),
            strings.ToLower(filter.Search),
        ) {
            continue
        }
        
        filteredTasks = append(filteredTasks, task)
    }
    
    return c.JSON(http.StatusOK, filteredTasks)
}

// @Summary Get task by ID
// @Description Get a task by its ID
// @Tags tasks
// @Accept json
// @Produce json
// @Param id path int true "Task ID"
// @Success 200 {object} models.Task
// @Failure 404 {object} models.ErrorResponse
// @Router /tasks/{id} [get]
func (h *TaskHandler) GetTask(c echo.Context) error {
    id, err := strconv.ParseUint(c.Param("id"), 10, 32)
    if err != nil {
        return echo.NewHTTPError(http.StatusBadRequest, "Invalid task ID")
    }
    
    userID := c.Get("user_id").(uint)
    
    for _, task := range h.tasks {
        if task.ID == uint(id) && task.UserID == userID {
            return c.JSON(http.StatusOK, task)
        }
    }
    
    return echo.NewHTTPError(http.StatusNotFound, "Task not found")
}

// @Summary Update task
// @Description Update an existing task
// @Tags tasks
// @Accept json
// @Produce json
// @Param id path int true "Task ID"
// @Param task body models.Task true "Task object"
// @Success 200 {object} models.Task
// @Failure 404 {object} models.ErrorResponse
// @Router /tasks/{id} [put]
func (h *TaskHandler) UpdateTask(c echo.Context) error {
    id, err := strconv.ParseUint(c.Param("id"), 10, 32)
    if err != nil {
        return echo.NewHTTPError(http.StatusBadRequest, "Invalid task ID")
    }
    
    var updatedTask models.Task
    if err := c.Bind(&updatedTask); err != nil {
        return echo.NewHTTPError(http.StatusBadRequest, err.Error())
    }
    
    if err := c.Validate(&updatedTask); err != nil {
        return err
    }
    
    userID := c.Get("user_id").(uint)
    
    for i, task := range h.tasks {
        if task.ID == uint(id) && task.UserID == userID {
            updatedTask.ID = task.ID
            updatedTask.CreatedAt = task.CreatedAt
            updatedTask.UpdatedAt = time.Now()
            updatedTask.UserID = userID
            
            h.tasks[i] = updatedTask
            return c.JSON(http.StatusOK, updatedTask)
        }
    }
    
    return echo.NewHTTPError(http.StatusNotFound, "Task not found")
}

// @Summary Delete task
// @Description Delete a task by ID
// @Tags tasks
// @Accept json
// @Produce json
// @Param id path int true "Task ID"
// @Success 204
// @Failure 404 {object} models.ErrorResponse
// @Router /tasks/{id} [delete]
func (h *TaskHandler) DeleteTask(c echo.Context) error {
    id, err := strconv.ParseUint(c.Param("id"), 10, 32)
    if err != nil {
        return echo.NewHTTPError(http.StatusBadRequest, "Invalid task ID")
    }
    
    userID := c.Get("user_id").(uint)
    
    for i, task := range h.tasks {
        if task.ID == uint(id) && task.UserID == userID {
            h.tasks = append(h.tasks[:i], h.tasks[i+1:]...)
            return c.NoContent(http.StatusNoContent)
        }
    }
    
    return echo.NewHTTPError(http.StatusNotFound, "Task not found")
}

// @Summary Upload task attachment
// @Description Upload a file attachment for a task
// @Tags tasks
// @Accept multipart/form-data
// @Produce json
// @Param id path int true "Task ID"
// @Param file formData file true "File to upload"
// @Success 200 {object} map[string]string
// @Failure 400 {object} models.ErrorResponse
// @Router /tasks/{id}/attachment [post]
func (h *TaskHandler) UploadAttachment(c echo.Context) error {
    id, err := strconv.ParseUint(c.Param("id"), 10, 32)
    if err != nil {
        return echo.NewHTTPError(http.StatusBadRequest, "Invalid task ID")
    }
    
    file, err := c.FormFile("file")
    if err != nil {
        return echo.NewHTTPError(http.StatusBadRequest, "No file uploaded")
    }
    
    // Save file (in production, use proper storage service)
    filename := fmt.Sprintf("task_%d_%s", id, file.Filename)
    src, err := file.Open()
    if err != nil {
        return err
    }
    defer src.Close()
    
    dst, err := os.Create(filename)
    if err != nil {
        return err
    }
    defer dst.Close()
    
    if _, err = io.Copy(dst, src); err != nil {
        return err
    }
    
    return c.JSON(http.StatusOK, map[string]string{
        "message":  "File uploaded successfully",
        "filename": filename,
    })
}
```

### 4. Main Application

```go
// main.go
package main

import (
    "context"
    "log"
    "os"
    "os/signal"
    "time"
    
    "github.com/labstack/echo/v4"
    "github.com/labstack/echo/v4/middleware"
    "github.com/go-playground/validator/v10"
    echoSwagger "github.com/swaggo/echo-swagger"
    _ "task-api/docs"
    "task-api/handlers"
    customMiddleware "task-api/middleware"
)

func main() {
    // Create Echo instance
    e := echo.New()
    
    // Set custom validator
    e.Validator = &customMiddleware.CustomValidator{
        Validator: validator.New(),
    }
    
    // Middleware
    e.Use(middleware.Logger())
    e.Use(middleware.Recover())
    e.Use(middleware.CORS())
    
    // Swagger documentation
    e.GET("/swagger/*", echoSwagger.WrapHandler)
    
    // Create handler
    taskHandler := handlers.NewTaskHandler()
    
    // Public routes
    e.GET("/health", func(c echo.Context) error {
        return c.JSON(200, map[string]string{"status": "healthy"})
    })
    
    // Protected routes
    api := e.Group("/api", customMiddleware.AuthMiddleware)
    {
        // Task routes
        tasks := api.Group("/tasks")
        tasks.POST("", taskHandler.CreateTask)
        tasks.GET("", taskHandler.ListTasks)
        tasks.GET("/:id", taskHandler.GetTask)
        tasks.PUT("/:id", taskHandler.UpdateTask)
        tasks.DELETE("/:id", taskHandler.DeleteTask)
        tasks.POST("/:id/attachment", taskHandler.UploadAttachment)
    }
    
    // Start server with graceful shutdown
    go func() {
        if err := e.Start(":8080"); err != nil {
            e.Logger.Info("Shutting down the server")
        }
    }()
    
    // Wait for interrupt signal to gracefully shutdown the server
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, os.Interrupt)
    <-quit
    
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()
    
    if err := e.Shutdown(ctx); err != nil {
        e.Logger.Fatal(err)
    }
}
```

## Echo Features and Best Practices

### 1. Middleware
- Use middleware for cross-cutting concerns
- Chain middleware appropriately
- Keep middleware focused and reusable

```go
// Custom logging middleware
func LoggingMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
    return func(c echo.Context) error {
        start := time.Now()
        
        err := next(c)
        
        // Log request details
        duration := time.Since(start)
        log.Printf(
            "%s %s %d %s",
            c.Request().Method,
            c.Request().URL.Path,
            c.Response().Status,
            duration,
        )
        
        return err
    }
}
```

### 2. Request Validation
- Use validator tags for validation
- Create custom validators
- Implement custom error handling

```go
// Custom validator rule
if v, ok := binding.Validator.Engine().(*validator.Validate); ok {
    v.RegisterValidation("customrule", func(fl validator.FieldLevel) bool {
        // Custom validation logic
        return true
    })
}
```

### 3. Error Handling
- Use echo.HTTPError for consistent error responses
- Implement custom error handlers
- Use proper HTTP status codes

```go
// Custom error handler
e.HTTPErrorHandler = func(err error, c echo.Context) {
    code := http.StatusInternalServerError
    message := "Internal Server Error"
    
    if he, ok := err.(*echo.HTTPError); ok {
        code = he.Code
        message = he.Message.(string)
    }
    
    c.JSON(code, models.ErrorResponse{
        Code:    code,
        Message: message,
    })
}
```

### 4. Route Groups
- Organize routes logically
- Use versioning
- Apply middleware to groups

```go
v1 := e.Group("/api/v1")
v1.Use(customMiddleware.Auth)
{
    tasks := v1.Group("/tasks")
    tasks.GET("", handler.ListTasks)
    tasks.POST("", handler.CreateTask)
}
```

### 5. Response Formatting
- Use consistent response format
- Include metadata when needed
- Handle pagination properly

```go
type Response struct {
    Data    interface{} `json:"data"`
    Message string      `json:"message,omitempty"`
    Meta    *Meta       `json:"meta,omitempty"`
}

type Meta struct {
    Total    int `json:"total"`
    Page     int `json:"page"`
    PageSize int `json:"page_size"`
}
```

## Production Considerations

1. **Configuration**
```go
type Config struct {
    Port     string `env:"PORT" envDefault:"8080"`
    LogLevel string `env:"LOG_LEVEL" envDefault:"info"`
}
```

2. **Logging**
```go
e.Use(middleware.LoggerWithConfig(middleware.LoggerConfig{
    Format: "${time_rfc3339} ${remote_ip} ${method} ${uri} ${status} ${latency_human}\n",
}))
```

3. **Security Headers**
```go
e.Use(middleware.SecureWithConfig(middleware.SecureConfig{
    XSSProtection:         "1; mode=block",
    ContentTypeNosniff:    "nosniff",
    XFrameOptions:         "SAMEORIGIN",
    HSTSMaxAge:           3600,
    ContentSecurityPolicy: "default-src 'self'",
}))
```

4. **Rate Limiting**
```go
e.Use(middleware.RateLimiter(middleware.NewRateLimiterMemoryStore(20)))
```

5. **Graceful Shutdown**
```go
// Already implemented in main.go
```

This guide demonstrates how to build a production-ready web application using Echo, following best practices for structure, error handling, validation, and security. Echo's minimalist approach makes it easy to understand while providing all the necessary features for building robust web applications.
