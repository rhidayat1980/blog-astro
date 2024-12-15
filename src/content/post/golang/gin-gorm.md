---
title: "Building a RESTful API with Gin and GORM"
description: "Learn how to build a complete RESTful API using Gin framework with GORM for database operations"
publishDate: 2024-12-13
heroImage: "/golang-gin.png"
category: "Golang"
tags: ["golang", "programming", "tutorial", "gin", "gorm", "database", "advanced"]
draft: false
---

## Building a RESTful API with Gin and GORM

This guide demonstrates how to build a complete RESTful API using the Gin framework with GORM for database operations. We'll create a book management system with proper structure and best practices.

## Project Setup

First, let's set up our project structure:

```bash
bookstore/
├── config/
│   └── database.go
├── controllers/
│   └── book.go
├── models/
│   └── book.go
├── repositories/
│   └── book.go
├── routes/
│   └── routes.go
├── main.go
└── go.mod
```

### Dependencies

```go
// go.mod
module bookstore

go 1.21

require (
    github.com/gin-gonic/gin v1.9.1
    gorm.io/gorm v1.25.5
    gorm.io/driver/postgres v1.5.4
)
```

## Implementation

### 1. Database Configuration

```go
// config/database.go
package config

import (
    "fmt"
    "log"
    "os"

    "gorm.io/driver/postgres"
    "gorm.io/gorm"
    "gorm.io/gorm/logger"
)

func SetupDatabase() *gorm.DB {
    dsn := fmt.Sprintf(
        "host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
        os.Getenv("DB_HOST"),
        os.Getenv("DB_USER"),
        os.Getenv("DB_PASSWORD"),
        os.Getenv("DB_NAME"),
        os.Getenv("DB_PORT"),
    )

    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
        Logger: logger.Default.LogMode(logger.Info),
    })
    if err != nil {
        log.Fatal("Failed to connect to database:", err)
    }

    // Set connection pool settings
    sqlDB, err := db.DB()
    if err != nil {
        log.Fatal("Failed to get database instance:", err)
    }

    sqlDB.SetMaxIdleConns(10)
    sqlDB.SetMaxOpenConns(100)

    return db
}
```

### 2. Models

```go
// models/book.go
package models

import (
    "time"
    "gorm.io/gorm"
)

type Book struct {
    ID          uint           `gorm:"primaryKey" json:"id"`
    Title       string         `gorm:"size:255;not null" json:"title" binding:"required"`
    Author      string         `gorm:"size:255;not null" json:"author" binding:"required"`
    ISBN        string         `gorm:"size:13;unique;not null" json:"isbn" binding:"required,len=13"`
    Price       float64        `gorm:"not null" json:"price" binding:"required,gt=0"`
    Quantity    int            `gorm:"not null" json:"quantity" binding:"required,gte=0"`
    Description string         `gorm:"type:text" json:"description"`
    CreatedAt   time.Time      `json:"created_at"`
    UpdatedAt   time.Time      `json:"updated_at"`
    DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

type BookFilter struct {
    Title    string  `form:"title"`
    Author   string  `form:"author"`
    MinPrice float64 `form:"min_price"`
    MaxPrice float64 `form:"max_price"`
    InStock  *bool   `form:"in_stock"`
}
```

### 3. Repository Layer

```go
// repositories/book.go
package repositories

import (
    "bookstore/models"
    "gorm.io/gorm"
)

type BookRepository struct {
    db *gorm.DB
}

func NewBookRepository(db *gorm.DB) *BookRepository {
    return &BookRepository{db: db}
}

func (r *BookRepository) Create(book *models.Book) error {
    return r.db.Create(book).Error
}

func (r *BookRepository) FindAll(filter models.BookFilter) ([]models.Book, error) {
    var books []models.Book
    query := r.db.Model(&models.Book{})

    if filter.Title != "" {
        query = query.Where("title ILIKE ?", "%"+filter.Title+"%")
    }
    if filter.Author != "" {
        query = query.Where("author ILIKE ?", "%"+filter.Author+"%")
    }
    if filter.MinPrice > 0 {
        query = query.Where("price >= ?", filter.MinPrice)
    }
    if filter.MaxPrice > 0 {
        query = query.Where("price <= ?", filter.MaxPrice)
    }
    if filter.InStock != nil {
        if *filter.InStock {
            query = query.Where("quantity > 0")
        } else {
            query = query.Where("quantity = 0")
        }
    }

    err := query.Find(&books).Error
    return books, err
}

func (r *BookRepository) FindByID(id uint) (*models.Book, error) {
    var book models.Book
    err := r.db.First(&book, id).Error
    if err != nil {
        return nil, err
    }
    return &book, nil
}

func (r *BookRepository) Update(book *models.Book) error {
    return r.db.Save(book).Error
}

func (r *BookRepository) Delete(id uint) error {
    return r.db.Delete(&models.Book{}, id).Error
}

func (r *BookRepository) ExistsByISBN(isbn string) (bool, error) {
    var count int64
    err := r.db.Model(&models.Book{}).Where("isbn = ?", isbn).Count(&count).Error
    return count > 0, err
}
```

### 4. Controllers

```go
// controllers/book.go
package controllers

import (
    "net/http"
    "strconv"

    "github.com/gin-gonic/gin"
    "bookstore/models"
    "bookstore/repositories"
)

type BookController struct {
    repo *repositories.BookRepository
}

func NewBookController(repo *repositories.BookRepository) *BookController {
    return &BookController{repo: repo}
}

// @Summary Create a new book
// @Description Create a new book with the provided details
// @Tags books
// @Accept json
// @Produce json
// @Param book body models.Book true "Book object"
// @Success 201 {object} models.Book
// @Failure 400 {object} ErrorResponse
// @Router /books [post]
func (c *BookController) Create(ctx *gin.Context) {
    var book models.Book
    if err := ctx.ShouldBindJSON(&book); err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // Check if ISBN already exists
    exists, err := c.repo.ExistsByISBN(book.ISBN)
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check ISBN"})
        return
    }
    if exists {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "ISBN already exists"})
        return
    }

    if err := c.repo.Create(&book); err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create book"})
        return
    }

    ctx.JSON(http.StatusCreated, book)
}

// @Summary Get all books
// @Description Get all books with optional filtering
// @Tags books
// @Accept json
// @Produce json
// @Param title query string false "Filter by title"
// @Param author query string false "Filter by author"
// @Param min_price query number false "Minimum price"
// @Param max_price query number false "Maximum price"
// @Param in_stock query boolean false "Filter by stock availability"
// @Success 200 {array} models.Book
// @Router /books [get]
func (c *BookController) GetAll(ctx *gin.Context) {
    var filter models.BookFilter
    if err := ctx.ShouldBindQuery(&filter); err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    books, err := c.repo.FindAll(filter)
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch books"})
        return
    }

    ctx.JSON(http.StatusOK, books)
}

// @Summary Get book by ID
// @Description Get a book by its ID
// @Tags books
// @Accept json
// @Produce json
// @Param id path int true "Book ID"
// @Success 200 {object} models.Book
// @Failure 404 {object} ErrorResponse
// @Router /books/{id} [get]
func (c *BookController) GetByID(ctx *gin.Context) {
    id, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid book ID"})
        return
    }

    book, err := c.repo.FindByID(uint(id))
    if err != nil {
        ctx.JSON(http.StatusNotFound, gin.H{"error": "Book not found"})
        return
    }

    ctx.JSON(http.StatusOK, book)
}

// @Summary Update book
// @Description Update an existing book
// @Tags books
// @Accept json
// @Produce json
// @Param id path int true "Book ID"
// @Param book body models.Book true "Book object"
// @Success 200 {object} models.Book
// @Failure 404 {object} ErrorResponse
// @Router /books/{id} [put]
func (c *BookController) Update(ctx *gin.Context) {
    id, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid book ID"})
        return
    }

    existingBook, err := c.repo.FindByID(uint(id))
    if err != nil {
        ctx.JSON(http.StatusNotFound, gin.H{"error": "Book not found"})
        return
    }

    var updatedBook models.Book
    if err := ctx.ShouldBindJSON(&updatedBook); err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    updatedBook.ID = existingBook.ID
    if err := c.repo.Update(&updatedBook); err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update book"})
        return
    }

    ctx.JSON(http.StatusOK, updatedBook)
}

// @Summary Delete book
// @Description Delete a book by ID
// @Tags books
// @Accept json
// @Produce json
// @Param id path int true "Book ID"
// @Success 204
// @Failure 404 {object} ErrorResponse
// @Router /books/{id} [delete]
func (c *BookController) Delete(ctx *gin.Context) {
    id, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid book ID"})
        return
    }

    if err := c.repo.Delete(uint(id)); err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete book"})
        return
    }

    ctx.Status(http.StatusNoContent)
}
```

### 5. Routes

```go
// routes/routes.go
package routes

import (
    "github.com/gin-gonic/gin"
    "bookstore/controllers"
)

func SetupRoutes(r *gin.Engine, bookController *controllers.BookController) {
    api := r.Group("/api/v1")
    {
        books := api.Group("/books")
        {
            books.POST("", bookController.Create)
            books.GET("", bookController.GetAll)
            books.GET("/:id", bookController.GetByID)
            books.PUT("/:id", bookController.Update)
            books.DELETE("/:id", bookController.Delete)
        }
    }
}
```

### 6. Main Application

```go
// main.go
package main

import (
    "log"
    "os"

    "github.com/gin-gonic/gin"
    "github.com/joho/godotenv"
    "bookstore/config"
    "bookstore/controllers"
    "bookstore/models"
    "bookstore/repositories"
    "bookstore/routes"
)

func main() {
    // Load environment variables
    if err := godotenv.Load(); err != nil {
        log.Fatal("Error loading .env file")
    }

    // Setup database
    db := config.SetupDatabase()

    // Auto migrate models
    if err := db.AutoMigrate(&models.Book{}); err != nil {
        log.Fatal("Failed to migrate database:", err)
    }

    // Initialize repository and controller
    bookRepo := repositories.NewBookRepository(db)
    bookController := controllers.NewBookController(bookRepo)

    // Setup Gin
    r := gin.Default()

    // Middleware
    r.Use(gin.Logger())
    r.Use(gin.Recovery())

    // Setup routes
    routes.SetupRoutes(r, bookController)

    // Start server
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    if err := r.Run(":" + port); err != nil {
        log.Fatal("Failed to start server:", err)
    }
}
```

## GORM Best Practices with Gin

### 1. Database Transactions

```go
// Example of using transactions in repository
func (r *BookRepository) CreateWithTransaction(book *models.Book) error {
    return r.db.Transaction(func(tx *gorm.DB) error {
        if err := tx.Create(book).Error; err != nil {
            return err
        }

        // Perform other operations within the same transaction
        if err := tx.Model(&models.Inventory{}).
            Where("book_id = ?", book.ID).
            Update("quantity", book.Quantity).Error; err != nil {
            return err
        }

        return nil
    })
}
```

### 2. Preloading Relationships

```go
// Example of preloading related data
func (r *BookRepository) FindWithReviews(id uint) (*models.Book, error) {
    var book models.Book
    err := r.db.Preload("Reviews").First(&book, id).Error
    return &book, err
}
```

### 3. Soft Deletes

GORM automatically handles soft deletes for models with `DeletedAt` field:

```go
// Soft delete is already implemented in the model
type Book struct {
    // ...
    DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// To include soft deleted records in queries
db.Unscoped().Where("id = ?", id).Find(&books)
```

### 4. Custom Hooks

```go
// models/book.go
func (b *Book) BeforeCreate(tx *gorm.DB) error {
    // Validate ISBN format
    if !isValidISBN(b.ISBN) {
        return errors.New("invalid ISBN format")
    }
    return nil
}

func (b *Book) BeforeUpdate(tx *gorm.DB) error {
    // Custom validation before update
    if b.Price < 0 {
        return errors.New("price cannot be negative")
    }
    return nil
}
```

### 5. Query Optimization

```go
// Example of optimized queries
func (r *BookRepository) FindAllOptimized(filter models.BookFilter) ([]models.Book, error) {
    var books []models.Book
    query := r.db.Model(&models.Book{}).
        Select("id, title, author, price"). // Select only needed fields
        Where("deleted_at IS NULL")

    if filter.Title != "" {
        query = query.Where("title ILIKE ?", "%"+filter.Title+"%")
    }

    // Use index for price range queries
    if filter.MinPrice > 0 && filter.MaxPrice > 0 {
        query = query.Where("price BETWEEN ? AND ?", filter.MinPrice, filter.MaxPrice)
    }

    // Add pagination
    query = query.Limit(20).Offset(0)

    err := query.Find(&books).Error
    return books, err
}
```

## Testing

Here's an example of how to test our repository and controllers:

```go
// repositories/book_test.go
package repositories

import (
    "testing"
    "gorm.io/driver/sqlite"
    "gorm.io/gorm"
    "bookstore/models"
)

func setupTestDB(t *testing.T) *gorm.DB {
    db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
    if err != nil {
        t.Fatalf("Failed to connect to test database: %v", err)
    }

    err = db.AutoMigrate(&models.Book{})
    if err != nil {
        t.Fatalf("Failed to migrate test database: %v", err)
    }

    return db
}

func TestBookRepository_Create(t *testing.T) {
    db := setupTestDB(t)
    repo := NewBookRepository(db)

    book := &models.Book{
        Title:    "Test Book",
        Author:   "Test Author",
        ISBN:     "1234567890123",
        Price:    29.99,
        Quantity: 10,
    }

    err := repo.Create(book)
    if err != nil {
        t.Errorf("Failed to create book: %v", err)
    }

    if book.ID == 0 {
        t.Error("Book ID should not be zero after creation")
    }
}
```

## Docker Configuration

### Dockerfile

```dockerfile
# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy go mod and sum files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

# Final stage
FROM alpine:latest

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/main .
COPY --from=builder /app/.env .

# Install necessary runtime dependencies
RUN apk --no-cache add ca-certificates tzdata

# Set environment variables
ENV GIN_MODE=release

# Expose port
EXPOSE 8080

# Run the application
CMD ["./main"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - DB_HOST=postgres
      - DB_USER=postgres
      - DB_PASSWORD=postgres
      - DB_NAME=bookstore
      - DB_PORT=5432
      - PORT=8080
    depends_on:
      - postgres
    networks:
      - app-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=bookstore
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    networks:
      - app-network
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - app-network
    restart: unless-stopped
    depends_on:
      - prometheus

volumes:
  postgres_data:
  prometheus_data:
  grafana_data:

networks:
  app-network:
    driver: bridge
```

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'bookstore'
    static_configs:
      - targets: ['app:8080']
```

### Development Environment

For local development, you can use a simpler docker-compose configuration:

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=bookstore
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Usage Instructions

#### Development Setup

1.  Start only the database:

    ```bash

docker-compose -f docker-compose.dev.yml up -d
```

2.  Run the application locally:

    ```bash
go run main.go
```

#### Production Setup

1.  Build and start all services:

    ```bash

docker-compose up -d --build
```

2.  View logs:

    ```bash
docker-compose logs -f app
```

3.  Stop all services:

    ```bash

docker-compose down
```

#### Accessing Services

*   API: <http://localhost:8080>
*   Prometheus: <http://localhost:9090>
*   Grafana: <http://localhost:3000>

#### Environment Variables

Create a `.env` file in the project root:

```env
DB_HOST=postgres
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=bookstore
DB_PORT=5432
PORT=8080
```

This Docker configuration provides a complete development and production environment with monitoring capabilities using Prometheus and Grafana. The multi-stage Dockerfile ensures small image sizes and secure deployments.
