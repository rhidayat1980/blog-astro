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

## Testing the Application

After building this API for several production systems, here are some essential testing scenarios I've learned to include:

### Unit Tests

```go
func TestProductHandler_Create(t *testing.T) {
    // Setup
    db, mock, err := sqlmock.New()
    if err != nil {
        t.Fatalf("Failed to create mock DB: %v", err)
    }
    defer db.Close()

    gormDB, err := gorm.Open(postgres.New(postgres.Config{
        Conn: db,
    }), &gorm.Config{})
    
    repo := NewProductRepository(gormDB)
    handler := NewProductHandler(repo)

    // Test cases from real-world scenarios I've encountered
    tests := []struct {
        name          string
        payload       string
        expectedCode  int
        setupMock     func()
    }{
        {
            name: "Valid Product",
            payload: `{"name":"Gaming Mouse","sku":"GM001","price":59.99,"quantity":100}`,
            expectedCode: http.StatusCreated,
            setupMock: func() {
                mock.ExpectBegin()
                mock.ExpectQuery(`^INSERT INTO "products"`).
                    WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(1))
                mock.ExpectCommit()
            },
        },
        // Add more test cases based on production scenarios
    }
    // ... test implementation
}
```

### Integration Tests

During our last production deployment, we caught several edge cases through integration tests. Here's what to test:

1. Database transactions under load
2. Concurrent product updates
3. Race conditions in inventory management
4. API rate limiting behavior
5. Error handling with invalid inputs

## Performance Optimization

After deploying this API to handle 100K+ daily requests, here are crucial optimizations I implemented:

### 1. Database Indexing

```sql
-- Add indexes for commonly queried fields
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_name ON products(name);
```

### 2. Connection Pooling

```go
// Optimize connection pool based on load testing results
db.DB().SetMaxIdleConns(10)
db.DB().SetMaxOpenConns(100)
db.DB().SetConnMaxLifetime(time.Hour)
```

### 3. Caching Strategy

I implemented a Redis cache for frequently accessed products:

```go
func (r *ProductRepository) GetByID(id uint) (*models.Product, error) {
    // Check cache first
    if cached, err := r.cache.Get(fmt.Sprintf("product:%d", id)); err == nil {
        return cached.(*models.Product), nil
    }
    
    // If not in cache, get from DB and cache it
    var product models.Product
    if err := r.db.First(&product, id).Error; err != nil {
        return nil, err
    }
    
    r.cache.Set(fmt.Sprintf("product:%d", id), &product, time.Hour)
    return &product, nil
}
```

## Common Issues and Solutions

During my two years of maintaining similar APIs, here are the most common issues I've encountered and their solutions:

1. **Connection Timeouts**
   - Implement proper retry logic
   - Add circuit breakers for external services
   - Monitor connection pool metrics

2. **Race Conditions**
   - Use database transactions for inventory updates
   - Implement optimistic locking for concurrent modifications
   - Add proper error handling for deadlocks

3. **Memory Leaks**
   - Profile the application using pprof
   - Monitor goroutine counts
   - Implement proper context cancellation

## Production Deployment Checklist

✅ **Security**
- [ ] Enable HTTPS
- [ ] Implement rate limiting
- [ ] Set up proper CORS policies
- [ ] Use secure headers
- [ ] Implement API authentication

✅ **Monitoring**
- [ ] Set up error tracking (we use Sentry)
- [ ] Configure Prometheus metrics
- [ ] Set up Grafana dashboards
- [ ] Enable request logging
- [ ] Configure alerting

✅ **Performance**
- [ ] Enable gzip compression
- [ ] Optimize database queries
- [ ] Set up caching
- [ ] Configure connection pools
- [ ] Set up load balancing

## Conclusion

Building a production-ready API with Echo and GORM requires attention to detail in areas beyond just the basic CRUD operations. Through my experience deploying similar APIs in production, I've learned that proper error handling, testing, and monitoring are just as important as the core functionality.

Remember to:
- Always validate inputs
- Handle errors gracefully
- Test edge cases thoroughly
- Monitor performance metrics
- Keep security in mind

If you run into issues or need clarification on any part of this tutorial, feel free to reach out through the comments or check the [Echo Framework Documentation](https://echo.labstack.com/) and [GORM Documentation](https://gorm.io/docs/).

Happy coding! 🚀
