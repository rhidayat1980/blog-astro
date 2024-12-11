---
title: "Kubernetes Operators and Custom Resource Definitions (CRDs)"
description: "Deep dive into Kubernetes Operators, Custom Resource Definitions (CRDs), and how to extend Kubernetes functionality"
publishDate: "11 Dec 2024"
tags: ["kubernetes", "k8s", "operators", "crds", "devops", "cloud-native", "containers", "series:kubernetes:16"]
draft: false
---

## Understanding Kubernetes Operators

Kubernetes Operators are software extensions to Kubernetes that make use of custom resources to manage applications and their components. They follow Kubernetes principles, particularly the control loop pattern.

## Custom Resource Definitions (CRDs)

### Basic CRD Structure

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: databases.example.com
spec:
  group: example.com
  versions:
    - name: v1
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                size:
                  type: integer
                image:
                  type: string
                version:
                  type: string
  scope: Namespaced
  names:
    plural: databases
    singular: database
    kind: Database
    shortNames:
      - db
```

### Custom Resource Example

```yaml
apiVersion: example.com/v1
kind: Database
metadata:
  name: my-database
spec:
  size: 3
  image: postgres:14
  version: "14.5"
```

## Creating an Operator

### 1. Using Operator SDK

```bash
# Install Operator SDK
operator-sdk init --domain example.com --repo github.com/example/my-operator

# Create API
operator-sdk create api --group cache --version v1alpha1 --kind Redis
```

### 2. Controller Structure

```go
// Redis controller
package controllers

import (
    "context"
    "fmt"
    cachev1alpha1 "github.com/example/my-operator/api/v1alpha1"
    appsv1 "k8s.io/api/apps/v1"
    corev1 "k8s.io/api/core/v1"
    "k8s.io/apimachinery/pkg/runtime"
    ctrl "sigs.k8s.io/controller-runtime"
    "sigs.k8s.io/controller-runtime/pkg/client"
)

type RedisReconciler struct {
    client.Client
    Scheme *runtime.Scheme
}

func (r *RedisReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    redis := &cachev1alpha1.Redis{}
    if err := r.Get(ctx, req.NamespacedName, redis); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }

    // Implement reconciliation logic here
    return ctrl.Result{}, nil
}
```

## Common Operator Patterns

### 1. Basic Operator Pattern

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: example-operator
spec:
  replicas: 1
  selector:
    matchLabels:
      name: example-operator
  template:
    metadata:
      labels:
        name: example-operator
    spec:
      containers:
        - name: operator
          image: example-operator:v1.0.0
          command:
          - example-operator
          imagePullPolicy: Always
```

### 2. Finalizers

```go
const finalizerName = "example.com/finalizer"

func (r *ReconcileExample) Reconcile(request reconcile.Request) (reconcile.Result, error) {
    instance := &examplev1.Example{}
    err := r.Get(context.TODO(), request.NamespacedName, instance)

    if instance.ObjectMeta.DeletionTimestamp.IsZero() {
        if !containsString(instance.ObjectMeta.Finalizers, finalizerName) {
            instance.ObjectMeta.Finalizers = append(instance.ObjectMeta.Finalizers, finalizerName)
            r.Update(context.TODO(), instance)
        }
    } else {
        if containsString(instance.ObjectMeta.Finalizers, finalizerName) {
            // Cleanup logic here
            instance.ObjectMeta.Finalizers = removeString(instance.ObjectMeta.Finalizers, finalizerName)
            r.Update(context.TODO(), instance)
        }
    }
    return reconcile.Result{}, nil
}
```

## Popular Kubernetes Operators

### 1. Prometheus Operator

```yaml
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: prometheus
spec:
  serviceAccountName: prometheus
  serviceMonitorSelector:
    matchLabels:
      team: frontend
  resources:
    requests:
      memory: 400Mi
```

### 2. PostgreSQL Operator

```yaml
apiVersion: acid.zalan.do/v1
kind: postgresql
metadata:
  name: acid-minimal-cluster
spec:
  teamId: "acid"
  volume:
    size: 1Gi
  numberOfInstances: 2
  users:
    zalando:  # database owner
    - superuser
    - createdb
```

## Best Practices

### 1. Operator Design

- Follow single responsibility principle
- Implement proper error handling
- Use status subresource
- Implement proper finalizers

### 2. CRD Design

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: examples.example.com
spec:
  group: example.com
  versions:
    - name: v1
      served: true
      storage: true
      additionalPrinterColumns:
        - name: Status
          type: string
          jsonPath: .status.phase
      schema:
        openAPIV3Schema:
          type: object
          properties:
            status:
              type: object
              properties:
                phase:
                  type: string
```

### 3. Status Management

```go
type ExampleStatus struct {
    Phase      string       `json:"phase"`
    Conditions []Condition  `json:"conditions,omitempty"`
}

type Condition struct {
    Type               string `json:"type"`
    Status             string `json:"status"`
    LastTransitionTime string `json:"lastTransitionTime,omitempty"`
    Reason             string `json:"reason,omitempty"`
    Message            string `json:"message,omitempty"`
}
```

## Testing Operators

### 1. Unit Tests

```go
func TestReconcile(t *testing.T) {
    // Create a fake client
    objs := []runtime.Object{&examplev1.Example{}}
    cl := fake.NewFakeClient(objs...)
    
    r := &ReconcileExample{client: cl}
    
    req := reconcile.Request{
        NamespacedName: types.NamespacedName{
            Name:      "example",
            Namespace: "default",
        },
    }
    
    _, err := r.Reconcile(req)
    if err != nil {
        t.Fatalf("reconcile: (%v)", err)
    }
}
```

### 2. Integration Tests

```go
func TestController(t *testing.T) {
    // Start test environment
    testEnv := &envtest.Environment{
        CRDDirectoryPaths: []string{filepath.Join("..", "config", "crd", "bases")},
    }
    
    cfg, err := testEnv.Start()
    if err != nil {
        t.Fatalf("could not start test environment: %v", err)
    }
    defer testEnv.Stop()
    
    // Run tests
}
```

## Troubleshooting

### Common Issues

1. CRD Validation

```bash
kubectl get crd
kubectl describe crd databases.example.com
```

2. Operator Logs

```bash
kubectl logs -n operators deployment/example-operator
```

3. Resource Status

```bash
kubectl get database my-database -o yaml
```

## Conclusion

Kubernetes Operators and CRDs provide a powerful way to extend Kubernetes functionality and automate complex application management. By following best practices and patterns, you can create robust operators that manage your applications effectively.

## Series Navigation
- Previous: [Autoscaling in Kubernetes](/posts/kubernetes/k8s-autoscaling)
- Next: [Kubernetes Multi-tenancy](/posts/kubernetes/k8s-multitenancy)
