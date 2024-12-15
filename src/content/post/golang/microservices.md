---
title: "Building Microservices with Go"
description: "Learn how to build, deploy, and manage microservices using Go"
publishDate: 2024-12-13
tags: ["golang", "programming", "tutorial", "microservices", "advanced"]
draft: false
---

## Building Microservices with Go

This guide demonstrates how to build a microservices architecture using Go. We'll create multiple services that work together to form a complete system.

## Basic Microservice Structure

First, let's create a basic microservice structure that we'll use as a template:

```go
package main

import (
    "context"
    "encoding/json"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"
)

// Service represents our microservice
type Service struct {
    server *http.Server
    logger *log.Logger
}

// NewService creates a new instance of our service
func NewService(addr string) *Service {
    logger := log.New(os.Stdout, "[service] ", log.LstdFlags)
    
    // Create router and add routes
    router := http.NewServeMux()
    
    // Create service
    s := &Service{
        server: &http.Server{
            Addr:         addr,
            Handler:      router,
            ReadTimeout:  5 * time.Second,
            WriteTimeout: 10 * time.Second,
            IdleTimeout:  15 * time.Second,
        },
        logger: logger,
    }
    
    // Add routes
    router.HandleFunc("/health", s.healthHandler)
    
    return s
}

// Start begins listening for requests
func (s *Service) Start() error {
    // Start server
    go func() {
        s.logger.Printf("Starting server on %s", s.server.Addr)
        if err := s.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            s.logger.Fatalf("Server failed: %v", err)
        }
    }()
    
    // Wait for interrupt signal
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit
    
    // Shutdown gracefully
    s.logger.Println("Shutting down server...")
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()
    
    if err := s.server.Shutdown(ctx); err != nil {
        return err
    }
    
    s.logger.Println("Server stopped")
    return nil
}

// Health check handler
func (s *Service) healthHandler(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }
    
    response := map[string]string{
        "status": "healthy",
        "time":   time.Now().Format(time.RFC3339),
    }
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

func main() {
    service := NewService(":8080")
    if err := service.Start(); err != nil {
        log.Fatal(err)
    }
}
```

## Complete Microservices Example

Now, let's create a more complex example with multiple services that work together. We'll build a simple e-commerce system with three services:

1. Product Service
2. Order Service
3. User Service

### 1. Product Service

```go
// product/main.go
package main

import (
    "encoding/json"
    "log"
    "net/http"
    "sync"
)

type Product struct {
    ID       string  `json:"id"`
    Name     string  `json:"name"`
    Price    float64 `json:"price"`
    Quantity int     `json:"quantity"`
}

type ProductService struct {
    sync.RWMutex
    products map[string]Product
}

func NewProductService() *ProductService {
    return &ProductService{
        products: make(map[string]Product),
    }
}

func (s *ProductService) getProducts(w http.ResponseWriter, r *http.Request) {
    s.RLock()
    products := make([]Product, 0, len(s.products))
    for _, product := range s.products {
        products = append(products, product)
    }
    s.RUnlock()
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(products)
}

func (s *ProductService) getProduct(w http.ResponseWriter, r *http.Request) {
    id := r.URL.Query().Get("id")
    if id == "" {
        http.Error(w, "Missing product ID", http.StatusBadRequest)
        return
    }
    
    s.RLock()
    product, exists := s.products[id]
    s.RUnlock()
    
    if !exists {
        http.Error(w, "Product not found", http.StatusNotFound)
        return
    }
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(product)
}

func main() {
    service := NewProductService()
    
    // Add some sample products
    service.products["1"] = Product{ID: "1", Name: "Laptop", Price: 999.99, Quantity: 10}
    service.products["2"] = Product{ID: "2", Name: "Mouse", Price: 24.99, Quantity: 100}
    
    http.HandleFunc("/products", service.getProducts)
    http.HandleFunc("/product", service.getProduct)
    
    log.Fatal(http.ListenAndServe(":8081", nil))
}
```

### 2. Order Service

```go
// order/main.go
package main

import (
    "encoding/json"
    "log"
    "net/http"
    "sync"
    "time"
)

type Order struct {
    ID        string    `json:"id"`
    UserID    string    `json:"user_id"`
    Products  []string  `json:"products"`
    Total     float64   `json:"total"`
    Status    string    `json:"status"`
    CreatedAt time.Time `json:"created_at"`
}

type OrderService struct {
    sync.RWMutex
    orders map[string]Order
}

func NewOrderService() *OrderService {
    return &OrderService{
        orders: make(map[string]Order),
    }
}

func (s *OrderService) createOrder(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }
    
    var order Order
    if err := json.NewDecoder(r.Body).Decode(&order); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }
    
    order.CreatedAt = time.Now()
    order.Status = "pending"
    
    s.Lock()
    s.orders[order.ID] = order
    s.Unlock()
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(order)
}

func (s *OrderService) getOrders(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }
    
    userID := r.URL.Query().Get("user_id")
    
    s.RLock()
    var orders []Order
    for _, order := range s.orders {
        if userID == "" || order.UserID == userID {
            orders = append(orders, order)
        }
    }
    s.RUnlock()
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(orders)
}

func main() {
    service := NewOrderService()
    
    http.HandleFunc("/orders", service.getOrders)
    http.HandleFunc("/order", service.createOrder)
    
    log.Fatal(http.ListenAndServe(":8082", nil))
}
```

### 3. User Service

```go
// user/main.go
package main

import (
    "encoding/json"
    "log"
    "net/http"
    "sync"
)

type User struct {
    ID       string `json:"id"`
    Name     string `json:"name"`
    Email    string `json:"email"`
    Password string `json:"-"` // Never send password in response
}

type UserService struct {
    sync.RWMutex
    users map[string]User
}

func NewUserService() *UserService {
    return &UserService{
        users: make(map[string]User),
    }
}

func (s *UserService) createUser(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }
    
    var user User
    if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }
    
    s.Lock()
    s.users[user.ID] = user
    s.Unlock()
    
    // Don't send password back
    user.Password = ""
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(user)
}

func (s *UserService) getUser(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }
    
    id := r.URL.Query().Get("id")
    if id == "" {
        http.Error(w, "Missing user ID", http.StatusBadRequest)
        return
    }
    
    s.RLock()
    user, exists := s.users[id]
    s.RUnlock()
    
    if !exists {
        http.Error(w, "User not found", http.StatusNotFound)
        return
    }
    
    // Don't send password
    user.Password = ""
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(user)
}

func main() {
    service := NewUserService()
    
    http.HandleFunc("/users", s.getUser)
    http.HandleFunc("/user", s.createUser)
    
    log.Fatal(http.ListenAndServe(":8083", nil))
}
```

### API Gateway

Now, let's create an API Gateway to route requests to appropriate services:

```go
// gateway/main.go
package main

import (
    "log"
    "net/http"
    "net/http/httputil"
    "net/url"
)

type Gateway struct {
    productService *url.URL
    orderService   *url.URL
    userService    *url.URL
}

func NewGateway() *Gateway {
    productService, _ := url.Parse("http://localhost:8081")
    orderService, _ := url.Parse("http://localhost:8082")
    userService, _ := url.Parse("http://localhost:8083")
    
    return &Gateway{
        productService: productService,
        orderService:   orderService,
        userService:    userService,
    }
}

func (g *Gateway) handleRequest(w http.ResponseWriter, r *http.Request) {
    var target *url.URL
    
    // Route based on path
    switch {
    case r.URL.Path == "/api/products" || r.URL.Path == "/api/product":
        target = g.productService
    case r.URL.Path == "/api/orders" || r.URL.Path == "/api/order":
        target = g.orderService
    case r.URL.Path == "/api/users" || r.URL.Path == "/api/user":
        target = g.userService
    default:
        http.Error(w, "Not found", http.StatusNotFound)
        return
    }
    
    // Create reverse proxy
    proxy := httputil.NewSingleHostReverseProxy(target)
    
    // Update the headers to allow for SSL redirection
    r.URL.Host = target.Host
    r.URL.Scheme = target.Scheme
    r.Header.Set("X-Forwarded-Host", r.Header.Get("Host"))
    
    // Remove /api prefix
    r.URL.Path = r.URL.Path[4:]
    
    proxy.ServeHTTP(w, r)
}

func main() {
    gateway := NewGateway()
    
    // Handle all requests
    http.HandleFunc("/api/", gateway.handleRequest)
    
    log.Printf("Gateway starting on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

### Docker Compose Configuration

Let's add a Docker Compose file to run all services:

```yaml
# docker-compose.yml
version: '3'

services:
  gateway:
    build: ./gateway
    ports:
      - "8080:8080"
    depends_on:
      - product-service
      - order-service
      - user-service

  product-service:
    build: ./product
    ports:
      - "8081:8081"

  order-service:
    build: ./order
    ports:
      - "8082:8082"

  user-service:
    build: ./user
    ports:
      - "8083:8083"
```

### Example Usage

Here's how to use the microservices system:

1. Create a user:

```bash
curl -X POST http://localhost:8080/api/user \
  -H "Content-Type: application/json" \
  -d '{"id":"1","name":"John Doe","email":"john@example.com","password":"secret"}'
```

2. Get product list:

```bash
curl http://localhost:8080/api/products
```

3. Create an order:

```bash
curl -X POST http://localhost:8080/api/order \
  -H "Content-Type: application/json" \
  -d '{"id":"1","user_id":"1","products":["1","2"],"total":1024.98}'
```

4. Get user's orders:

```bash
curl http://localhost:8080/api/orders?user_id=1
```

This example demonstrates:

- Service isolation
- API Gateway pattern
- Basic service discovery
- Docker containerization
- RESTful API design
- Concurrent request handling
- Error handling
- Data persistence (in-memory)

In a production environment, you would also want to add:

1. Database integration
2. Authentication and authorization
3. Service discovery (e.g., Consul)
4. Message queues (e.g., RabbitMQ)
5. Monitoring and logging
6. Circuit breakers
7. Rate limiting
8. Caching

In the next post, we'll explore gRPC and Protocol Buffers in Go!
