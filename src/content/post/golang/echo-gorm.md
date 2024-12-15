---
title: "Building a RESTful API with Echo and GORM"
description: "Learn how to build a complete RESTful API using Echo framework with GORM for database operations"
publishDate: 2024-12-13
heroImage: "/golang-echo.png"
category: "Golang"
tags: ["golang", "programming", "tutorial", "echo", "gorm", "database", "advanced"]
draft: false
---

## Building a RESTful API with Echo and GORM

This guide demonstrates how to build a complete RESTful API using the Echo framework with GORM for database operations. We'll create a product management system with proper structure and best practices.

## Project Setup

First, let's set up our project structure:

```bash
productstore/
├── config/
│   └── database.go
├── handlers/
│   └── product.go
├── models/
│   └── product.go
├── repositories/
│   └── product.go
├── routes/
│   └── routes.go
├── main.go
└── go.mod
```

### Dependencies

```go
// go.mod
module productstore

go 1.21

require (
    github.com/labstack/echo/v4 v4.11.3
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
// models/product.go
package models

import (
    "time"
    "gorm.io/gorm"
)

type Product struct {
    ID          uint           `gorm:"primaryKey" json:"id"`
    Name        string         `gorm:"size:255;not null" json:"name" validate:"required"`
    SKU         string         `gorm:"size:50;unique;not null" json:"sku" validate:"required"`
    Price       float64        `gorm:"not null" json:"price" validate:"required,gt=0"`
    Stock       int            `gorm:"not null" json:"stock" validate:"required,gte=0"`
    Category    string         `gorm:"size:100;not null" json:"category" validate:"required"`
    Description string         `gorm:"type:text" json:"description"`
    CreatedAt   time.Time      `json:"created_at"`
    UpdatedAt   time.Time      `json:"updated_at"`
    DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

type ProductFilter struct {
    Name       string  `query:"name"`
    Category   string  `query:"category"`
    MinPrice   float64 `query:"min_price"`
    MaxPrice   float64 `query:"max_price"`
    InStock    *bool   `query:"in_stock"`
}
```

### 3. Repository Layer

```go
// repositories/product.go
package repositories

import (
    "productstore/models"
    "gorm.io/gorm"
)

type ProductRepository struct {
    db *gorm.DB
}

func NewProductRepository(db *gorm.DB) *ProductRepository {
    return &ProductRepository{db: db}
}

func (r *ProductRepository) Create(product *models.Product) error {
    return r.db.Create(product).Error
}

func (r *ProductRepository) FindAll(filter models.ProductFilter) ([]models.Product, error) {
    var products []models.Product
    query := r.db.Model(&models.Product{})

    if filter.Name != "" {
        query = query.Where("name ILIKE ?", "%"+filter.Name+"%")
    }
    if filter.Category != "" {
        query = query.Where("category ILIKE ?", "%"+filter.Category+"%")
    }
    if filter.MinPrice > 0 {
        query = query.Where("price >= ?", filter.MinPrice)
    }
    if filter.MaxPrice > 0 {
        query = query.Where("price <= ?", filter.MaxPrice)
    }
    if filter.InStock != nil {
        if *filter.InStock {
            query = query.Where("stock > 0")
        } else {
            query = query.Where("stock = 0")
        }
    }

    err := query.Find(&products).Error
    return products, err
}

func (r *ProductRepository) FindByID(id uint) (*models.Product, error) {
    var product models.Product
    err := r.db.First(&product, id).Error
    if err != nil {
        return nil, err
    }
    return &product, nil
}

func (r *ProductRepository) Update(product *models.Product) error {
    return r.db.Save(product).Error
}

func (r *ProductRepository) Delete(id uint) error {
    return r.db.Delete(&models.Product{}, id).Error
}

func (r *ProductRepository) ExistsBySKU(sku string) (bool, error) {
    var count int64
    err := r.db.Model(&models.Product{}).Where("sku = ?", sku).Count(&count).Error
    return count > 0, err
}
```

### 4. Handlers

```go
// handlers/product.go
package handlers

import (
    "net/http"
    "strconv"

    "github.com/labstack/echo/v4"
    "productstore/models"
    "productstore/repositories"
)

type ProductHandler struct {
    repo *repositories.ProductRepository
}

func NewProductHandler(repo *repositories.ProductRepository) *ProductHandler {
    return &ProductHandler{repo: repo}
}

// @Summary Create a new product
// @Description Create a new product with the provided details
// @Tags products
// @Accept json
// @Produce json
// @Param product body models.Product true "Product object"
// @Success 201 {object} models.Product
// @Failure 400 {object} ErrorResponse
// @Router /products [post]
func (h *ProductHandler) Create(c echo.Context) error {
    var product models.Product
    if err := c.Bind(&product); err != nil {
        return echo.NewHTTPError(http.StatusBadRequest, err.Error())
    }

    if err := c.Validate(&product); err != nil {
        return echo.NewHTTPError(http.StatusBadRequest, err.Error())
    }

    // Check if SKU already exists
    exists, err := h.repo.ExistsBySKU(product.SKU)
    if err != nil {
        return echo.NewHTTPError(http.StatusInternalServerError, "Failed to check SKU")
    }
    if exists {
        return echo.NewHTTPError(http.StatusBadRequest, "SKU already exists")
    }

    if err := h.repo.Create(&product); err != nil {
        return echo.NewHTTPError(http.StatusInternalServerError, "Failed to create product")
    }

    return c.JSON(http.StatusCreated, product)
}

// @Summary Get all products
// @Description Get all products with optional filtering
// @Tags products
// @Accept json
// @Produce json
// @Param name query string false "Filter by name"
// @Param category query string false "Filter by category"
// @Param min_price query number false "Minimum price"
// @Param max_price query number false "Maximum price"
// @Param in_stock query boolean false "Filter by stock availability"
// @Success 200 {array} models.Product
// @Router /products [get]
func (h *ProductHandler) GetAll(c echo.Context) error {
    var filter models.ProductFilter
    if err := c.Bind(&filter); err != nil {
        return echo.NewHTTPError(http.StatusBadRequest, err.Error())
    }

    products, err := h.repo.FindAll(filter)
    if err != nil {
        return echo.NewHTTPError(http.StatusInternalServerError, "Failed to fetch products")
    }

    return c.JSON(http.StatusOK, products)
}

// @Summary Get product by ID
// @Description Get a product by its ID
// @Tags products
// @Accept json
// @Produce json
// @Param id path int true "Product ID"
// @Success 200 {object} models.Product
// @Failure 404 {object} ErrorResponse
// @Router /products/{id} [get]
func (h *ProductHandler) GetByID(c echo.Context) error {
    id, err := strconv.ParseUint(c.Param("id"), 10, 32)
    if err != nil {
        return echo.NewHTTPError(http.StatusBadRequest, "Invalid product ID")
    }

    product, err := h.repo.FindByID(uint(id))
    if err != nil {
        return echo.NewHTTPError(http.StatusNotFound, "Product not found")
    }

    return c.JSON(http.StatusOK, product)
}

// @Summary Update product
// @Description Update an existing product
// @Tags products
// @Accept json
// @Produce json
// @Param id path int true "Product ID"
// @Param product body models.Product true "Product object"
// @Success 200 {object} models.Product
// @Failure 404 {object} ErrorResponse
// @Router /products/{id} [put]
func (h *ProductHandler) Update(c echo.Context) error {
    id, err := strconv.ParseUint(c.Param("id"), 10, 32)
    if err != nil {
        return echo.NewHTTPError(http.StatusBadRequest, "Invalid product ID")
    }

    existingProduct, err := h.repo.FindByID(uint(id))
    if err != nil {
        return echo.NewHTTPError(http.StatusNotFound, "Product not found")
    }

    var updatedProduct models.Product
    if err := c.Bind(&updatedProduct); err != nil {
        return echo.NewHTTPError(http.StatusBadRequest, err.Error())
    }

    if err := c.Validate(&updatedProduct); err != nil {
        return echo.NewHTTPError(http.StatusBadRequest, err.Error())
    }

    updatedProduct.ID = existingProduct.ID
    if err := h.repo.Update(&updatedProduct); err != nil {
        return echo.NewHTTPError(http.StatusInternalServerError, "Failed to update product")
    }

    return c.JSON(http.StatusOK, updatedProduct)
}

// @Summary Delete product
// @Description Delete a product by ID
// @Tags products
// @Accept json
// @Produce json
// @Param id path int true "Product ID"
// @Success 204
// @Failure 404 {object} ErrorResponse
// @Router /products/{id} [delete]
func (h *ProductHandler) Delete(c echo.Context) error {
    id, err := strconv.ParseUint(c.Param("id"), 10, 32)
    if err != nil {
        return echo.NewHTTPError(http.StatusBadRequest, "Invalid product ID")
    }

    if err := h.repo.Delete(uint(id)); err != nil {
        return echo.NewHTTPError(http.StatusInternalServerError, "Failed to delete product")
    }

    return c.NoContent(http.StatusNoContent)
}
```

### 5. Routes

```go
// routes/routes.go
package routes

import (
    "github.com/labstack/echo/v4"
    "productstore/handlers"
)

func SetupRoutes(e *echo.Echo, productHandler *handlers.ProductHandler) {
    api := e.Group("/api/v1")
    {
        products := api.Group("/products")
        {
            products.POST("", productHandler.Create)
            products.GET("", productHandler.GetAll)
            products.GET("/:id", productHandler.GetByID)
            products.PUT("/:id", productHandler.Update)
            products.DELETE("/:id", productHandler.Delete)
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

    "github.com/labstack/echo/v4"
    "github.com/labstack/echo/v4/middleware"
    "github.com/go-playground/validator/v10"
    "github.com/joho/godotenv"
    "productstore/config"
    "productstore/handlers"
    "productstore/models"
    "productstore/repositories"
    "productstore/routes"
)

type CustomValidator struct {
    validator *validator.Validate
}

func (cv *CustomValidator) Validate(i interface{}) error {
    if err := cv.validator.Struct(i); err != nil {
        return echo.NewHTTPError(400, err.Error())
    }
    return nil
}

func main() {
    // Load environment variables
    if err := godotenv.Load(); err != nil {
        log.Fatal("Error loading .env file")
    }

    // Setup database
    db := config.SetupDatabase()

    // Auto migrate models
    if err := db.AutoMigrate(&models.Product{}); err != nil {
        log.Fatal("Failed to migrate database:", err)
    }

    // Initialize repository and handler
    productRepo := repositories.NewProductRepository(db)
    productHandler := handlers.NewProductHandler(productRepo)

    // Setup Echo
    e := echo.New()
    e.Validator = &CustomValidator{validator: validator.New()}

    // Middleware
    e.Use(middleware.Logger())
    e.Use(middleware.Recover())
    e.Use(middleware.CORS())

    // Setup routes
    routes.SetupRoutes(e, productHandler)

    // Start server
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    if err := e.Start(":" + port); err != nil {
        log.Fatal("Failed to start server:", err)
    }
}
```

## GORM Best Practices with Echo

### 1. Database Transactions

```go
// Example of using transactions in repository
func (r *ProductRepository) CreateWithTransaction(product *models.Product) error {
    return r.db.Transaction(func(tx *gorm.DB) error {
        if err := tx.Create(product).Error; err != nil {
            return err
        }

        // Perform other operations within the same transaction
        if err := tx.Model(&models.Inventory{}).
            Where("product_id = ?", product.ID).
            Update("stock", product.Stock).Error; err != nil {
            return err
        }

        return nil
    })
}
```

### 2. Custom Middleware

```go
// middleware/db_transaction.go
func DBTransactionMiddleware(db *gorm.DB) echo.MiddlewareFunc {
    return func(next echo.HandlerFunc) echo.HandlerFunc {
        return func(c echo.Context) error {
            return db.Transaction(func(tx *gorm.DB) error {
                c.Set("tx", tx)
                return next(c)
            })
        }
    }
}
```

### 3. Error Handling

```go
// middleware/error_handler.go
func CustomHTTPErrorHandler(err error, c echo.Context) {
    var httpError *echo.HTTPError
    if errors.As(err, &httpError) {
        c.JSON(httpError.Code, map[string]interface{}{
            "message": httpError.Message,
        })
        return
    }

    if errors.Is(err, gorm.ErrRecordNotFound) {
        c.JSON(http.StatusNotFound, map[string]interface{}{
            "message": "Resource not found",
        })
        return
    }

    c.JSON(http.StatusInternalServerError, map[string]interface{}{
        "message": "Internal server error",
    })
}
```

### 4. Request Validation

```go
// middleware/validator.go
type CustomValidator struct {
    validator *validator.Validate
}

func (cv *CustomValidator) Validate(i interface{}) error {
    if err := cv.validator.Struct(i); err != nil {
        var ve validator.ValidationErrors
        if errors.As(err, &ve) {
            out := make([]string, len(ve))
            for i, fe := range ve {
                out[i] = fmt.Sprintf(
                    "Field: %s, Error: %s",
                    fe.Field(),
                    fe.Tag(),
                )
            }
            return echo.NewHTTPError(
                http.StatusBadRequest,
                map[string]interface{}{"errors": out},
            )
        }
        return echo.NewHTTPError(http.StatusBadRequest, err.Error())
    }
    return nil
}
```

## Testing

Here's an example of how to test our handlers:

```go
// handlers/product_test.go
package handlers

import (
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "strings"
    "testing"

    "github.com/labstack/echo/v4"
    "github.com/stretchr/testify/assert"
    "productstore/models"
)

func TestProductHandler_Create(t *testing.T) {
    e := echo.New()
    
    product := models.Product{
        Name:     "Test Product",
        SKU:      "TEST123",
        Price:    99.99,
        Stock:    100,
        Category: "Test",
    }

    jsonBytes, _ := json.Marshal(product)

    req := httptest.NewRequest(
        http.MethodPost,
        "/api/v1/products",
        strings.NewReader(string(jsonBytes)),
    )
    req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
    rec := httptest.NewRecorder()
    c := e.NewContext(req, rec)

    // Mock repository
    mockRepo := &MockProductRepository{}
    handler := NewProductHandler(mockRepo)

    // Test
    if assert.NoError(t, handler.Create(c)) {
        assert.Equal(t, http.StatusCreated, rec.Code)

        var response models.Product
        err := json.Unmarshal(rec.Body.Bytes(), &response)
        assert.NoError(t, err)
        assert.Equal(t, product.Name, response.Name)
    }
}
```

## Production Considerations

1. **Graceful Shutdown**

```go
// In main.go
go func() {
    if err := e.Start(":" + port); err != nil && err != http.ErrServerClosed {
        e.Logger.Fatal("shutting down the server")
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
```

2. **Rate Limiting**

```go
config := middleware.RateLimiterConfig{
    Skipper: middleware.DefaultSkipper,
    Store: middleware.NewRateLimiterMemoryStore(20),
    IdentifierExtractor: func(ctx echo.Context) (string, error) {
        id := ctx.RealIP()
        return id, nil
    },
    ErrorHandler: func(context echo.Context, err error) error {
        return context.JSON(http.StatusTooManyRequests, nil)
    },
    DenyHandler: func(context echo.Context, identifier string, err error) error {
        return context.JSON(http.StatusTooManyRequests, nil)
    },
}

e.Use(middleware.RateLimiterWithConfig(config))
```

3. **Monitoring and Metrics**

```go
// Add Prometheus metrics
e.Use(echoprometheus.NewMiddleware("productstore"))
e.GET("/metrics", echoprometheus.NewHandler())
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
      - DB_NAME=productstore
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
      - POSTGRES_DB=productstore
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
  - job_name: 'productstore'
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
      - POSTGRES_DB=productstore
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
DB_NAME=productstore
DB_PORT=5432
PORT=8080
```

This Docker configuration provides a complete development and production environment with monitoring capabilities using Prometheus and Grafana. The multi-stage Dockerfile ensures small image sizes and secure deployments.

e.GET("/metrics", echoprometheus.NewHandler())
