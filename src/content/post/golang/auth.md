---
title: "Authentication and Authorization in Go"
description: "Learn how to implement secure authentication and authorization in Go applications"
publishDate: 2024-12-13
tags: ["golang", "programming", "tutorial", "security", "authentication", "authorization", "advanced"]
draft: false
---

## Authentication and Authorization in Go

This guide demonstrates how to implement secure authentication and authorization in Go applications. We'll cover different authentication methods and authorization strategies.

## Example Project: User Authentication System

We'll build a complete authentication system with the following features:

1. User registration and login
2. JWT-based authentication
3. Role-based authorization
4. Password hashing and validation
5. Refresh tokens
6. Rate limiting
7. Session management

### Project Structure

```bash
auth-system/
├── config/
│   └── config.go
├── middleware/
│   ├── auth.go
│   └── rate_limit.go
├── models/
│   ├── user.go
│   └── token.go
├── handlers/
│   └── auth.go
├── services/
│   └── auth.go
├── utils/
│   ├── password.go
│   └── jwt.go
├── main.go
└── go.mod
```

### 1. Models

```go
// models/user.go
package models

import (
    "time"
    "golang.org/x/crypto/bcrypt"
)

type Role string

const (
    RoleUser  Role = "user"
    RoleAdmin Role = "admin"
)

type User struct {
    ID           uint      `json:"id" gorm:"primaryKey"`
    Email        string    `json:"email" gorm:"unique;not null"`
    Password     string    `json:"-" gorm:"not null"`
    Name         string    `json:"name" gorm:"not null"`
    Role         Role      `json:"role" gorm:"type:varchar(20);default:'user'"`
    Active       bool      `json:"active" gorm:"default:true"`
    LastLogin    time.Time `json:"last_login"`
    RefreshToken string    `json:"-"`
    CreatedAt    time.Time `json:"created_at"`
    UpdatedAt    time.Time `json:"updated_at"`
}

func (u *User) SetPassword(password string) error {
    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
    if err != nil {
        return err
    }
    u.Password = string(hashedPassword)
    return nil
}

func (u *User) CheckPassword(password string) bool {
    err := bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(password))
    return err == nil
}

// models/token.go
package models

type TokenPair struct {
    AccessToken  string `json:"access_token"`
    RefreshToken string `json:"refresh_token"`
}

type TokenClaims struct {
    UserID uint   `json:"user_id"`
    Email  string `json:"email"`
    Role   Role   `json:"role"`
    jwt.StandardClaims
}
```

### 2. Configuration

```go
// config/config.go
package config

import (
    "time"
    "github.com/spf13/viper"
)

type Config struct {
    JWTSecret           string        `mapstructure:"JWT_SECRET"`
    JWTExpirationHours  time.Duration `mapstructure:"JWT_EXPIRATION_HOURS"`
    RefreshExpirationHours time.Duration `mapstructure:"REFRESH_EXPIRATION_HOURS"`
    RateLimitRequests   int           `mapstructure:"RATE_LIMIT_REQUESTS"`
    RateLimitDuration   time.Duration `mapstructure:"RATE_LIMIT_DURATION"`
}

func LoadConfig() (*Config, error) {
    viper.SetConfigFile(".env")
    viper.AutomaticEnv()
    
    if err := viper.ReadInConfig(); err != nil {
        return nil, err
    }
    
    config := &Config{}
    if err := viper.Unmarshal(config); err != nil {
        return nil, err
    }
    
    return config, nil
}
```

### 3. Utilities

```go
// utils/jwt.go
package utils

import (
    "time"
    "github.com/golang-jwt/jwt"
    "auth-system/models"
)

type JWTManager struct {
    secretKey []byte
    expiry    time.Duration
}

func NewJWTManager(secretKey string, expiry time.Duration) *JWTManager {
    return &JWTManager{
        secretKey: []byte(secretKey),
        expiry:    expiry,
    }
}

func (m *JWTManager) GenerateToken(user *models.User) (string, error) {
    claims := &models.TokenClaims{
        UserID: user.ID,
        Email:  user.Email,
        Role:   user.Role,
        StandardClaims: jwt.StandardClaims{
            ExpiresAt: time.Now().Add(m.expiry).Unix(),
            IssuedAt:  time.Now().Unix(),
        },
    }
    
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString(m.secretKey)
}

func (m *JWTManager) ValidateToken(tokenStr string) (*models.TokenClaims, error) {
    token, err := jwt.ParseWithClaims(
        tokenStr,
        &models.TokenClaims{},
        func(token *jwt.Token) (interface{}, error) {
            return m.secretKey, nil
        },
    )
    
    if err != nil {
        return nil, err
    }
    
    claims, ok := token.Claims.(*models.TokenClaims)
    if !ok {
        return nil, jwt.ErrInvalidKey
    }
    
    return claims, nil
}

// utils/password.go
package utils

import (
    "crypto/rand"
    "encoding/base64"
)

func GenerateRandomString(length int) (string, error) {
    bytes := make([]byte, length)
    if _, err := rand.Read(bytes); err != nil {
        return "", err
    }
    return base64.URLEncoding.EncodeToString(bytes)[:length], nil
}
```

### 4. Middleware

```go
// middleware/auth.go
package middleware

import (
    "net/http"
    "strings"
    
    "github.com/gin-gonic/gin"
    "auth-system/utils"
)

func AuthMiddleware(jwtManager *utils.JWTManager) gin.HandlerFunc {
    return func(c *gin.Context) {
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header is required"})
            c.Abort()
            return
        }
        
        tokenString := strings.TrimPrefix(authHeader, "Bearer ")
        if tokenString == authHeader {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token format"})
            c.Abort()
            return
        }
        
        claims, err := jwtManager.ValidateToken(tokenString)
        if err != nil {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
            c.Abort()
            return
        }
        
        c.Set("user_id", claims.UserID)
        c.Set("user_email", claims.Email)
        c.Set("user_role", claims.Role)
        c.Next()
    }
}

func RequireRole(roles ...models.Role) gin.HandlerFunc {
    return func(c *gin.Context) {
        userRole := c.GetString("user_role")
        authorized := false
        
        for _, role := range roles {
            if string(role) == userRole {
                authorized = true
                break
            }
        }
        
        if !authorized {
            c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
            c.Abort()
            return
        }
        
        c.Next()
    }
}

// middleware/rate_limit.go
package middleware

import (
    "net/http"
    "sync"
    "time"
    
    "github.com/gin-gonic/gin"
)

type RateLimiter struct {
    sync.Mutex
    requests    map[string][]time.Time
    limit       int
    duration    time.Duration
}

func NewRateLimiter(limit int, duration time.Duration) *RateLimiter {
    return &RateLimiter{
        requests: make(map[string][]time.Time),
        limit:    limit,
        duration: duration,
    }
}

func (rl *RateLimiter) RateLimit() gin.HandlerFunc {
    return func(c *gin.Context) {
        ip := c.ClientIP()
        
        rl.Lock()
        defer rl.Unlock()
        
        now := time.Now()
        
        // Remove old requests
        if requests, exists := rl.requests[ip]; exists {
            var valid []time.Time
            for _, t := range requests {
                if now.Sub(t) <= rl.duration {
                    valid = append(valid, t)
                }
            }
            rl.requests[ip] = valid
        }
        
        // Check limit
        if len(rl.requests[ip]) >= rl.limit {
            c.JSON(http.StatusTooManyRequests, gin.H{
                "error": "Rate limit exceeded",
            })
            c.Abort()
            return
        }
        
        // Add new request
        rl.requests[ip] = append(rl.requests[ip], now)
        
        c.Next()
    }
}
```

### 5. Services

```go
// services/auth.go
package services

import (
    "errors"
    "time"
    
    "auth-system/models"
    "auth-system/utils"
)

type AuthService struct {
    db         *gorm.DB
    jwtManager *utils.JWTManager
}

func NewAuthService(db *gorm.DB, jwtManager *utils.JWTManager) *AuthService {
    return &AuthService{
        db:         db,
        jwtManager: jwtManager,
    }
}

func (s *AuthService) Register(email, password, name string) error {
    var existingUser models.User
    if err := s.db.Where("email = ?", email).First(&existingUser).Error; err == nil {
        return errors.New("email already registered")
    }
    
    user := &models.User{
        Email: email,
        Name:  name,
        Role:  models.RoleUser,
    }
    
    if err := user.SetPassword(password); err != nil {
        return err
    }
    
    return s.db.Create(user).Error
}

func (s *AuthService) Login(email, password string) (*models.TokenPair, error) {
    var user models.User
    if err := s.db.Where("email = ?", email).First(&user).Error; err != nil {
        return nil, errors.New("invalid credentials")
    }
    
    if !user.CheckPassword(password) {
        return nil, errors.New("invalid credentials")
    }
    
    // Generate tokens
    accessToken, err := s.jwtManager.GenerateToken(&user)
    if err != nil {
        return nil, err
    }
    
    refreshToken, err := utils.GenerateRandomString(32)
    if err != nil {
        return nil, err
    }
    
    // Update user's refresh token
    user.RefreshToken = refreshToken
    user.LastLogin = time.Now()
    if err := s.db.Save(&user).Error; err != nil {
        return nil, err
    }
    
    return &models.TokenPair{
        AccessToken:  accessToken,
        RefreshToken: refreshToken,
    }, nil
}

func (s *AuthService) RefreshToken(refreshToken string) (*models.TokenPair, error) {
    var user models.User
    if err := s.db.Where("refresh_token = ?", refreshToken).First(&user).Error; err != nil {
        return nil, errors.New("invalid refresh token")
    }
    
    // Generate new tokens
    accessToken, err := s.jwtManager.GenerateToken(&user)
    if err != nil {
        return nil, err
    }
    
    newRefreshToken, err := utils.GenerateRandomString(32)
    if err != nil {
        return nil, err
    }
    
    // Update user's refresh token
    user.RefreshToken = newRefreshToken
    if err := s.db.Save(&user).Error; err != nil {
        return nil, err
    }
    
    return &models.TokenPair{
        AccessToken:  accessToken,
        RefreshToken: newRefreshToken,
    }, nil
}

func (s *AuthService) Logout(userID uint) error {
    return s.db.Model(&models.User{}).
        Where("id = ?", userID).
        Update("refresh_token", nil).
        Error
}
```

### 6. Handlers

```go
// handlers/auth.go
package handlers

import (
    "net/http"
    
    "github.com/gin-gonic/gin"
    "auth-system/services"
)

type AuthHandler struct {
    authService *services.AuthService
}

func NewAuthHandler(authService *services.AuthService) *AuthHandler {
    return &AuthHandler{
        authService: authService,
    }
}

type RegisterRequest struct {
    Email    string `json:"email" binding:"required,email"`
    Password string `json:"password" binding:"required,min=8"`
    Name     string `json:"name" binding:"required"`
}

func (h *AuthHandler) Register(c *gin.Context) {
    var req RegisterRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    
    if err := h.authService.Register(req.Email, req.Password, req.Name); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    
    c.JSON(http.StatusCreated, gin.H{"message": "User registered successfully"})
}

type LoginRequest struct {
    Email    string `json:"email" binding:"required,email"`
    Password string `json:"password" binding:"required"`
}

func (h *AuthHandler) Login(c *gin.Context) {
    var req LoginRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    
    tokens, err := h.authService.Login(req.Email, req.Password)
    if err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
        return
    }
    
    c.JSON(http.StatusOK, tokens)
}

type RefreshRequest struct {
    RefreshToken string `json:"refresh_token" binding:"required"`
}

func (h *AuthHandler) RefreshToken(c *gin.Context) {
    var req RefreshRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    
    tokens, err := h.authService.RefreshToken(req.RefreshToken)
    if err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
        return
    }
    
    c.JSON(http.StatusOK, tokens)
}

func (h *AuthHandler) Logout(c *gin.Context) {
    userID := c.GetUint("user_id")
    if err := h.authService.Logout(userID); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    
    c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}
```

### 7. Main Application

```go
// main.go
package main

import (
    "log"
    "time"
    
    "github.com/gin-gonic/gin"
    "gorm.io/gorm"
    "gorm.io/driver/postgres"
    
    "auth-system/config"
    "auth-system/handlers"
    "auth-system/middleware"
    "auth-system/models"
    "auth-system/services"
    "auth-system/utils"
)

func main() {
    // Load configuration
    cfg, err := config.LoadConfig()
    if err != nil {
        log.Fatal(err)
    }
    
    // Connect to database
    db, err := gorm.Open(postgres.Open("postgres://localhost/authdb"), &gorm.Config{})
    if err != nil {
        log.Fatal(err)
    }
    
    // Auto migrate
    if err := db.AutoMigrate(&models.User{}); err != nil {
        log.Fatal(err)
    }
    
    // Initialize components
    jwtManager := utils.NewJWTManager(cfg.JWTSecret, cfg.JWTExpirationHours)
    authService := services.NewAuthService(db, jwtManager)
    authHandler := handlers.NewAuthHandler(authService)
    rateLimiter := middleware.NewRateLimiter(
        cfg.RateLimitRequests,
        cfg.RateLimitDuration,
    )
    
    // Setup router
    r := gin.Default()
    
    // Public routes
    public := r.Group("/api")
    public.Use(rateLimiter.RateLimit())
    {
        public.POST("/register", authHandler.Register)
        public.POST("/login", authHandler.Login)
        public.POST("/refresh", authHandler.RefreshToken)
    }
    
    // Protected routes
    protected := r.Group("/api")
    protected.Use(rateLimiter.RateLimit())
    protected.Use(middleware.AuthMiddleware(jwtManager))
    {
        protected.POST("/logout", authHandler.Logout)
        
        // Admin routes
        admin := protected.Group("/admin")
        admin.Use(middleware.RequireRole(models.RoleAdmin))
        {
            // Add admin routes here
        }
    }
    
    // Start server
    if err := r.Run(":8080"); err != nil {
        log.Fatal(err)
    }
}
```

## Security Best Practices

1. **Password Handling**
   - Always hash passwords before storage
   - Use strong hashing algorithms (bcrypt)
   - Implement password complexity requirements

2. **Token Management**
   - Use short-lived access tokens
   - Implement refresh token rotation
   - Store tokens securely

3. **Rate Limiting**
   - Implement rate limiting for all endpoints
   - Use appropriate limits based on endpoint sensitivity
   - Consider different limits for authenticated users

4. **Input Validation**
   - Validate all input data
   - Use proper binding and validation tags
   - Sanitize user input

5. **Error Handling**
   - Don't expose sensitive information in errors
   - Log security events
   - Implement proper error responses

## Production Considerations

1. **Environment Configuration**
```bash
JWT_SECRET=your-secret-key
JWT_EXPIRATION_HOURS=1
REFRESH_EXPIRATION_HOURS=24
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_DURATION=1h
```

2. **Database Indexes**
```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_refresh_token ON users(refresh_token);
```

3. **Monitoring and Logging**
```go
// Add structured logging
log.WithFields(log.Fields{
    "user_id": user.ID,
    "action":  "login",
    "status":  "success",
}).Info("User logged in")
```

4. **Security Headers**
```go
// Add security middleware
r.Use(secure.New(secure.Options{
    AllowedHosts:         []string{"example.com"},
    SSLRedirect:          true,
    STSSeconds:           31536000,
    STSIncludeSubdomains: true,
    FrameDeny:           true,
    ContentTypeNosniff:   true,
    BrowserXssFilter:     true,
}))
```

This example demonstrates a complete authentication and authorization system in Go, following security best practices and providing a solid foundation for building secure web applications.
