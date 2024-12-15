---
title: "Database Access and ORMs in Go"
description: "Learn how to work with databases using native SQL and popular ORMs in Go"
publishDate: 2024-12-13
tags: ["golang", "programming", "tutorial", "database", "orm", "gorm", "sqlx", "advanced"]
draft: false
---

## Database Access and ORMs in Go

This guide demonstrates how to work with databases in Go using both native SQL and popular ORMs. We'll cover different approaches and best practices for database operations.

## Example Project: Book Management System

We'll build a book management system using three different approaches:

1. Native SQL with database/sql
2. Enhanced SQL with sqlx
3. ORM with GORM

### Project Structure

```bash
book-management/
├── models/
│   └── book.go
├── database/
│   ├── native/
│   │   └── repository.go
│   ├── sqlx/
│   │   └── repository.go
│   └── gorm/
│       └── repository.go
├── main.go
└── go.mod
```

### 1. Models and Interfaces

```go
// models/book.go
package models

import "time"

type Book struct {
    ID          uint      `json:"id" db:"id" gorm:"primaryKey"`
    Title       string    `json:"title" db:"title" gorm:"not null"`
    Author      string    `json:"author" db:"author" gorm:"not null"`
    ISBN        string    `json:"isbn" db:"isbn" gorm:"unique;not null"`
    Price       float64   `json:"price" db:"price" gorm:"not null"`
    PublishedAt time.Time `json:"published_at" db:"published_at" gorm:"not null"`
    CreatedAt   time.Time `json:"created_at" db:"created_at" gorm:"autoCreateTime"`
    UpdatedAt   time.Time `json:"updated_at" db:"updated_at" gorm:"autoUpdateTime"`
}

type BookRepository interface {
    Create(book *Book) error
    GetByID(id uint) (*Book, error)
    GetAll(limit, offset int) ([]Book, error)
    Update(book *Book) error
    Delete(id uint) error
    SearchByTitle(title string) ([]Book, error)
}
```

### 2. Native SQL Implementation

```go
// database/native/repository.go
package native

import (
    "database/sql"
    "time"
    
    _ "github.com/lib/pq"
    "book-management/models"
)

type BookRepository struct {
    db *sql.DB
}

func NewBookRepository(db *sql.DB) *BookRepository {
    return &BookRepository{db: db}
}

func (r *BookRepository) Create(book *models.Book) error {
    query := `
        INSERT INTO books (title, author, isbn, price, published_at, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id`
    
    now := time.Now()
    book.CreatedAt = now
    book.UpdatedAt = now
    
    return r.db.QueryRow(
        query,
        book.Title,
        book.Author,
        book.ISBN,
        book.Price,
        book.PublishedAt,
        book.CreatedAt,
        book.UpdatedAt,
    ).Scan(&book.ID)
}

func (r *BookRepository) GetByID(id uint) (*models.Book, error) {
    query := `
        SELECT id, title, author, isbn, price, published_at, created_at, updated_at
        FROM books
        WHERE id = $1`
    
    book := &models.Book{}
    err := r.db.QueryRow(query, id).Scan(
        &book.ID,
        &book.Title,
        &book.Author,
        &book.ISBN,
        &book.Price,
        &book.PublishedAt,
        &book.CreatedAt,
        &book.UpdatedAt,
    )
    if err == sql.ErrNoRows {
        return nil, nil
    }
    return book, err
}

func (r *BookRepository) GetAll(limit, offset int) ([]models.Book, error) {
    query := `
        SELECT id, title, author, isbn, price, published_at, created_at, updated_at
        FROM books
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2`
    
    rows, err := r.db.Query(query, limit, offset)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    var books []models.Book
    for rows.Next() {
        var book models.Book
        err := rows.Scan(
            &book.ID,
            &book.Title,
            &book.Author,
            &book.ISBN,
            &book.Price,
            &book.PublishedAt,
            &book.CreatedAt,
            &book.UpdatedAt,
        )
        if err != nil {
            return nil, err
        }
        books = append(books, book)
    }
    return books, rows.Err()
}

func (r *BookRepository) Update(book *models.Book) error {
    query := `
        UPDATE books
        SET title = $1, author = $2, isbn = $3, price = $4, published_at = $5, updated_at = $6
        WHERE id = $7`
    
    book.UpdatedAt = time.Now()
    result, err := r.db.Exec(
        query,
        book.Title,
        book.Author,
        book.ISBN,
        book.Price,
        book.PublishedAt,
        book.UpdatedAt,
        book.ID,
    )
    if err != nil {
        return err
    }
    
    rowsAffected, err := result.RowsAffected()
    if err != nil {
        return err
    }
    if rowsAffected == 0 {
        return sql.ErrNoRows
    }
    return nil
}

func (r *BookRepository) Delete(id uint) error {
    query := `DELETE FROM books WHERE id = $1`
    
    result, err := r.db.Exec(query, id)
    if err != nil {
        return err
    }
    
    rowsAffected, err := result.RowsAffected()
    if err != nil {
        return err
    }
    if rowsAffected == 0 {
        return sql.ErrNoRows
    }
    return nil
}

func (r *BookRepository) SearchByTitle(title string) ([]models.Book, error) {
    query := `
        SELECT id, title, author, isbn, price, published_at, created_at, updated_at
        FROM books
        WHERE title ILIKE $1
        ORDER BY created_at DESC`
    
    rows, err := r.db.Query(query, "%"+title+"%")
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    var books []models.Book
    for rows.Next() {
        var book models.Book
        err := rows.Scan(
            &book.ID,
            &book.Title,
            &book.Author,
            &book.ISBN,
            &book.Price,
            &book.PublishedAt,
            &book.CreatedAt,
            &book.UpdatedAt,
        )
        if err != nil {
            return nil, err
        }
        books = append(books, book)
    }
    return books, rows.Err()
}
```

### 3. SQLx Implementation

```go
// database/sqlx/repository.go
package sqlx

import (
    "time"
    
    "github.com/jmoiron/sqlx"
    _ "github.com/lib/pq"
    "book-management/models"
)

type BookRepository struct {
    db *sqlx.DB
}

func NewBookRepository(db *sqlx.DB) *BookRepository {
    return &BookRepository{db: db}
}

func (r *BookRepository) Create(book *models.Book) error {
    query := `
        INSERT INTO books (title, author, isbn, price, published_at, created_at, updated_at)
        VALUES (:title, :author, :isbn, :price, :published_at, :created_at, :updated_at)
        RETURNING id`
    
    now := time.Now()
    book.CreatedAt = now
    book.UpdatedAt = now
    
    rows, err := r.db.NamedQuery(query, book)
    if err != nil {
        return err
    }
    defer rows.Close()
    
    if rows.Next() {
        return rows.Scan(&book.ID)
    }
    return nil
}

func (r *BookRepository) GetByID(id uint) (*models.Book, error) {
    query := `
        SELECT *
        FROM books
        WHERE id = $1`
    
    book := &models.Book{}
    err := r.db.Get(book, query, id)
    if err != nil {
        return nil, err
    }
    return book, nil
}

func (r *BookRepository) GetAll(limit, offset int) ([]models.Book, error) {
    query := `
        SELECT *
        FROM books
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2`
    
    var books []models.Book
    err := r.db.Select(&books, query, limit, offset)
    return books, err
}

func (r *BookRepository) Update(book *models.Book) error {
    query := `
        UPDATE books
        SET title = :title,
            author = :author,
            isbn = :isbn,
            price = :price,
            published_at = :published_at,
            updated_at = :updated_at
        WHERE id = :id`
    
    book.UpdatedAt = time.Now()
    result, err := r.db.NamedExec(query, book)
    if err != nil {
        return err
    }
    
    rowsAffected, err := result.RowsAffected()
    if err != nil {
        return err
    }
    if rowsAffected == 0 {
        return sql.ErrNoRows
    }
    return nil
}

func (r *BookRepository) Delete(id uint) error {
    query := `DELETE FROM books WHERE id = $1`
    
    result, err := r.db.Exec(query, id)
    if err != nil {
        return err
    }
    
    rowsAffected, err := result.RowsAffected()
    if err != nil {
        return err
    }
    if rowsAffected == 0 {
        return sql.ErrNoRows
    }
    return nil
}

func (r *BookRepository) SearchByTitle(title string) ([]models.Book, error) {
    query := `
        SELECT *
        FROM books
        WHERE title ILIKE $1
        ORDER BY created_at DESC`
    
    var books []models.Book
    err := r.db.Select(&books, query, "%"+title+"%")
    return books, err
}
```

### 4. GORM Implementation

```go
// database/gorm/repository.go
package gorm

import (
    "gorm.io/gorm"
    "book-management/models"
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

func (r *BookRepository) GetByID(id uint) (*models.Book, error) {
    var book models.Book
    err := r.db.First(&book, id).Error
    if err != nil {
        return nil, err
    }
    return &book, nil
}

func (r *BookRepository) GetAll(limit, offset int) ([]models.Book, error) {
    var books []models.Book
    err := r.db.Order("created_at desc").Limit(limit).Offset(offset).Find(&books).Error
    return books, err
}

func (r *BookRepository) Update(book *models.Book) error {
    result := r.db.Save(book)
    if result.Error != nil {
        return result.Error
    }
    if result.RowsAffected == 0 {
        return gorm.ErrRecordNotFound
    }
    return nil
}

func (r *BookRepository) Delete(id uint) error {
    result := r.db.Delete(&models.Book{}, id)
    if result.Error != nil {
        return result.Error
    }
    if result.RowsAffected == 0 {
        return gorm.ErrRecordNotFound
    }
    return nil
}

func (r *BookRepository) SearchByTitle(title string) ([]models.Book, error) {
    var books []models.Book
    err := r.db.Where("title ILIKE ?", "%"+title+"%").
        Order("created_at desc").
        Find(&books).Error
    return books, err
}
```

### 5. Main Application

```go
// main.go
package main

import (
    "database/sql"
    "fmt"
    "log"
    "os"
    
    "github.com/jmoiron/sqlx"
    "gorm.io/driver/postgres"
    "gorm.io/gorm"
    
    "book-management/database/native"
    "book-management/database/sqlx"
    "book-management/database/gorm"
    "book-management/models"
)

func main() {
    // Database connection string
    dsn := "host=localhost user=postgres password=postgres dbname=bookdb port=5432 sslmode=disable"
    
    // Example using native SQL
    db, err := sql.Open("postgres", dsn)
    if err != nil {
        log.Fatal(err)
    }
    nativeRepo := native.NewBookRepository(db)
    
    // Example using SQLx
    dbx, err := sqlx.Connect("postgres", dsn)
    if err != nil {
        log.Fatal(err)
    }
    sqlxRepo := sqlx.NewBookRepository(dbx)
    
    // Example using GORM
    gormDB, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
    if err != nil {
        log.Fatal(err)
    }
    gormRepo := gorm.NewBookRepository(gormDB)
    
    // Example usage with GORM
    book := &models.Book{
        Title:       "The Go Programming Language",
        Author:      "Alan A. A. Donovan",
        ISBN:        "978-0134190440",
        Price:       44.99,
        PublishedAt: time.Now(),
    }
    
    // Create
    if err := gormRepo.Create(book); err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Created book with ID: %d\n", book.ID)
    
    // Get by ID
    fetchedBook, err := gormRepo.GetByID(book.ID)
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Fetched book: %+v\n", fetchedBook)
    
    // Update
    book.Price = 49.99
    if err := gormRepo.Update(book); err != nil {
        log.Fatal(err)
    }
    fmt.Println("Updated book price")
    
    // Search
    books, err := gormRepo.SearchByTitle("Go")
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Found %d books with 'Go' in title\n", len(books))
    
    // Delete
    if err := gormRepo.Delete(book.ID); err != nil {
        log.Fatal(err)
    }
    fmt.Println("Deleted book")
}
```

## Comparison: Native SQL vs SQLx vs GORM

### 1. Native SQL

**Pros:**

- Complete control over SQL queries
- No overhead or magic
- Best performance
- Clear understanding of what's happening

**Cons:**

- More boilerplate code
- Manual scanning of results
- No automatic struct mapping
- More error-prone

### 2. SQLx

**Pros:**

- Reduces boilerplate compared to native SQL
- Struct tag mapping
- Named query support
- Maintains SQL control
- Good performance

**Cons:**

- Still requires writing SQL
- Limited ORM features
- No automatic migrations

### 3. GORM

**Pros:**

- Minimal boilerplate
- Automatic migrations
- Rich feature set
- Active Record pattern
- Hooks and callbacks
- Association handling

**Cons:**

- Performance overhead
- Magic/implicit behavior
- Can be complex for advanced queries
- Learning curve for features

## Best Practices

1. **Connection Management**

```go
// Configure connection pool
db.SetMaxOpenConns(25)
db.SetMaxIdleConns(25)
db.SetConnMaxLifetime(5 * time.Minute)
```

2. **Transaction Handling**

```go
// Using GORM
err := db.Transaction(func(tx *gorm.DB) error {
    // do some database operations in the transaction
    if err := tx.Create(&order).Error; err != nil {
        return err
    }
    if err := tx.Create(&orderItems).Error; err != nil {
        return err
    }
    return nil
})
```

3. **Context Usage**

```go
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

var books []models.Book
err := db.WithContext(ctx).Find(&books).Error
```

4. **Error Handling**

```go
if err := db.First(&book, id).Error; err != nil {
    switch {
    case errors.Is(err, gorm.ErrRecordNotFound):
        return nil, ErrBookNotFound
    default:
        return nil, fmt.Errorf("failed to get book: %w", err)
    }
}
```

## Production Considerations

1. **Migration Management**

```go
// Using GORM auto-migration
if err := db.AutoMigrate(&models.Book{}); err != nil {
    log.Fatal(err)
}
```

2. **Logging and Monitoring**

```go
db.Logger = logger.Default.LogMode(logger.Info)
```

3. **Performance Optimization**

```go
// Index creation
type Book struct {
    gorm.Model
    Title string `gorm:"index:idx_title"`
    ISBN  string `gorm:"uniqueIndex"`
}
```

4. **Security**

```go
// Use parameterized queries
db.Where("title LIKE ?", "%"+title+"%")
```

5. **Testing**

```go
func TestBookRepository(t *testing.T) {
    // Use test database
    db, err := gorm.Open(postgres.Open("postgres://localhost/testdb"))
    if err != nil {
        t.Fatal(err)
    }
    
    repo := NewBookRepository(db)
    
    // Run tests
    t.Run("Create", func(t *testing.T) {
        book := &models.Book{
            Title: "Test Book",
        }
        err := repo.Create(book)
        assert.NoError(t, err)
        assert.NotZero(t, book.ID)
    })
}
```

This guide demonstrates different approaches to database access in Go, from low-level SQL to high-level ORM usage. Choose the approach that best fits your project's needs, considering factors like performance requirements, development speed, and maintainability.
