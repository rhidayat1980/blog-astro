---
title: "Testing in Go"
description: "Learn about unit testing, testing patterns, and test-driven development in Go"
publishDate: 2024-12-13
tags: ["golang", "programming", "tutorial", "testing", "advanced"]
draft: false
---

## Testing in Go

Go has a built-in testing framework that makes it easy to write and run tests. Tests are written in files with names ending in `_test.go` and functions starting with `Test`.

## Basic Testing

### Writing Your First Test

```go
// math.go
package math

func Add(a, b int) int {
    return a + b
}

// math_test.go
package math

import "testing"

func TestAdd(t *testing.T) {
    result := Add(2, 3)
    if result != 5 {
        t.Errorf("Add(2, 3) = %d; want 5", result)
    }
}
```

### Running Tests

```bash
# Run all tests in current package
go test

# Run tests with verbose output
go test -v

# Run specific test
go test -run TestAdd

# Run tests with coverage
go test -cover
```

## Table-Driven Tests

A common pattern for testing multiple cases:

```go
func TestAdd(t *testing.T) {
    tests := []struct {
        name     string
        a, b     int
        expected int
    }{
        {"positive numbers", 2, 3, 5},
        {"negative numbers", -2, -3, -5},
        {"zero", 0, 0, 0},
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result := Add(tt.a, tt.b)
            if result != tt.expected {
                t.Errorf("Add(%d, %d) = %d; want %d",
                    tt.a, tt.b, result, tt.expected)
            }
        })
    }
}
```

## Test Organization

### Test Helpers

```go
func setupTestCase(t *testing.T) func() {
    t.Log("Setting up test case")
    return func() {
        t.Log("Tearing down test case")
    }
}

func TestSomething(t *testing.T) {
    teardown := setupTestCase(t)
    defer teardown()
    
    // Test code here
}
```

### Test Fixtures

```go
type TestFixture struct {
    db     *sql.DB
    server *http.Server
    client *http.Client
}

func setupFixture(t *testing.T) *TestFixture {
    // Set up test dependencies
    return &TestFixture{
        // Initialize components
    }
}

func (f *TestFixture) teardown() {
    // Clean up resources
}

func TestWithFixture(t *testing.T) {
    f := setupFixture(t)
    defer f.teardown()
    
    // Test code using fixture
}
```

## Testing HTTP Handlers

```go
func TestHandler(t *testing.T) {
    // Create a request
    req, err := http.NewRequest("GET", "/api/users", nil)
    if err != nil {
        t.Fatal(err)
    }
    
    // Create a response recorder
    rr := httptest.NewRecorder()
    handler := http.HandlerFunc(UserHandler)
    
    // Serve the request
    handler.ServeHTTP(rr, req)
    
    // Check status code
    if status := rr.Code; status != http.StatusOK {
        t.Errorf("handler returned wrong status code: got %v want %v",
            status, http.StatusOK)
    }
    
    // Check response body
    expected := `{"status":"success"}`
    if rr.Body.String() != expected {
        t.Errorf("handler returned unexpected body: got %v want %v",
            rr.Body.String(), expected)
    }
}
```

## Testing with Interfaces and Mocks

```go
// Interface
type UserStore interface {
    GetUser(id string) (*User, error)
    SaveUser(user *User) error
}

// Mock implementation
type MockUserStore struct {
    users map[string]*User
}

func NewMockUserStore() *MockUserStore {
    return &MockUserStore{
        users: make(map[string]*User),
    }
}

func (m *MockUserStore) GetUser(id string) (*User, error) {
    user, exists := m.users[id]
    if !exists {
        return nil, fmt.Errorf("user not found")
    }
    return user, nil
}

// Test using mock
func TestUserService(t *testing.T) {
    store := NewMockUserStore()
    service := NewUserService(store)
    
    // Test service using mock store
}
```

## Benchmarking

```go
func BenchmarkAdd(b *testing.B) {
    for i := 0; i < b.N; i++ {
        Add(2, 3)
    }
}

// Run with custom inputs
func BenchmarkAddBig(b *testing.B) {
    big := 1000000
    for i := 0; i < b.N; i++ {
        Add(big, big)
    }
}
```

## Parallel Testing

```go
func TestParallel(t *testing.T) {
    tests := []struct {
        name string
        fn   func(*testing.T)
    }{
        {"test1", test1Func},
        {"test2", test2Func},
        {"test3", test3Func},
    }
    
    for _, tt := range tests {
        tt := tt // Capture range variable
        t.Run(tt.name, func(t *testing.T) {
            t.Parallel() // Mark test for parallel execution
            tt.fn(t)
        })
    }
}
```

## Test Coverage

```bash
# Generate coverage profile
go test -coverprofile=coverage.out

# View coverage in browser
go tool cover -html=coverage.out

# View coverage in terminal
go tool cover -func=coverage.out
```

## Best Practices

1. **Use Table-Driven Tests**

```go
func TestValidateEmail(t *testing.T) {
    tests := []struct {
        name    string
        email   string
        isValid bool
    }{
        {"valid email", "user@example.com", true},
        {"missing @", "userexample.com", false},
        {"missing domain", "user@", false},
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            valid := ValidateEmail(tt.email)
            if valid != tt.isValid {
                t.Errorf("ValidateEmail(%q) = %v; want %v",
                    tt.email, valid, tt.isValid)
            }
        })
    }
}
```

2. **Use Subtests for Better Organization**

```go
func TestUser(t *testing.T) {
    t.Run("creation", func(t *testing.T) {
        // Test user creation
    })
    
    t.Run("validation", func(t *testing.T) {
        // Test user validation
    })
    
    t.Run("deletion", func(t *testing.T) {
        // Test user deletion
    })
}
```

3. **Use Test Helpers**

```go
func assertNoError(t *testing.T, err error) {
    t.Helper()
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
}

func assertEqual(t *testing.T, got, want interface{}) {
    t.Helper()
    if !reflect.DeepEqual(got, want) {
        t.Errorf("got %v; want %v", got, want)
    }
}
```

## Practical Example

Here's a complete example demonstrating various testing concepts:

```go
// user.go
package user

import (
    "errors"
    "regexp"
)

type User struct {
    ID    string
    Name  string
    Email string
    Age   int
}

type UserStore interface {
    GetUser(id string) (*User, error)
    SaveUser(user *User) error
}

type UserService struct {
    store UserStore
}

func NewUserService(store UserStore) *UserService {
    return &UserService{store: store}
}

func (s *UserService) CreateUser(name, email string, age int) (*User, error) {
    if !ValidateEmail(email) {
        return nil, errors.New("invalid email")
    }
    
    if age < 0 {
        return nil, errors.New("age must be positive")
    }
    
    user := &User{
        ID:    GenerateID(),
        Name:  name,
        Email: email,
        Age:   age,
    }
    
    err := s.store.SaveUser(user)
    if err != nil {
        return nil, err
    }
    
    return user, nil
}

func ValidateEmail(email string) bool {
    pattern := `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`
    matched, _ := regexp.MatchString(pattern, email)
    return matched
}

// user_test.go
package user

import (
    "testing"
)

// Mock implementation
type MockUserStore struct {
    users map[string]*User
}

func NewMockUserStore() *MockUserStore {
    return &MockUserStore{
        users: make(map[string]*User),
    }
}

func (m *MockUserStore) GetUser(id string) (*User, error) {
    user, exists := m.users[id]
    if !exists {
        return nil, errors.New("user not found")
    }
    return user, nil
}

func (m *MockUserStore) SaveUser(user *User) error {
    m.users[user.ID] = user
    return nil
}

func TestUserService_CreateUser(t *testing.T) {
    tests := []struct {
        name      string
        inputName string
        inputEmail string
        inputAge  int
        wantErr   bool
    }{
        {
            name:       "valid user",
            inputName:  "John Doe",
            inputEmail: "john@example.com",
            inputAge:   30,
            wantErr:    false,
        },
        {
            name:       "invalid email",
            inputName:  "John Doe",
            inputEmail: "invalid-email",
            inputAge:   30,
            wantErr:    true,
        },
        {
            name:       "negative age",
            inputName:  "John Doe",
            inputEmail: "john@example.com",
            inputAge:   -1,
            wantErr:    true,
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Create a new service with mock store for each test
            store := NewMockUserStore()
            service := NewUserService(store)
            
            // Call the method being tested
            user, err := service.CreateUser(
                tt.inputName,
                tt.inputEmail,
                tt.inputAge,
            )
            
            // Check error expectation
            if (err != nil) != tt.wantErr {
                t.Errorf("CreateUser() error = %v, wantErr %v",
                    err, tt.wantErr)
                return
            }
            
            // If we expect success, verify the user was created correctly
            if !tt.wantErr {
                if user == nil {
                    t.Error("CreateUser() returned nil user on success")
                    return
                }
                
                if user.Name != tt.inputName {
                    t.Errorf("CreateUser() user.Name = %v, want %v",
                        user.Name, tt.inputName)
                }
                
                if user.Email != tt.inputEmail {
                    t.Errorf("CreateUser() user.Email = %v, want %v",
                        user.Email, tt.inputEmail)
                }
                
                if user.Age != tt.inputAge {
                    t.Errorf("CreateUser() user.Age = %v, want %v",
                        user.Age, tt.inputAge)
                }
                
                // Verify user was saved in store
                savedUser, err := store.GetUser(user.ID)
                if err != nil {
                    t.Errorf("Failed to retrieve saved user: %v", err)
                }
                
                if savedUser != user {
                    t.Error("Saved user doesn't match created user")
                }
            }
        })
    }
}

func TestValidateEmail(t *testing.T) {
    tests := []struct {
        name  string
        email string
        want  bool
    }{
        {"valid email", "user@example.com", true},
        {"valid email with numbers", "user123@example.com", true},
        {"valid email with dots", "user.name@example.com", true},
        {"missing @", "userexample.com", false},
        {"missing domain", "user@", false},
        {"missing local part", "@example.com", false},
        {"invalid characters", "user@example!", false},
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            if got := ValidateEmail(tt.email); got != tt.want {
                t.Errorf("ValidateEmail(%q) = %v, want %v",
                    tt.email, got, tt.want)
            }
        })
    }
}
```

In the next post, we'll explore Web Development with Go!
