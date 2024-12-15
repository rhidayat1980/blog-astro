---
title: "K8s Manifests vs Helm in ArgoCD"
description: "A detailed comparison of deploying applications using Kubernetes manifests and Helm charts in ArgoCD, with focus on secret management"
publishDate: 2023-12-13
tags: ["kubernetes", "argocd", "gitops", "devops", "helm", "secrets", "series:argocd:8"]
draft: false
---

## Series Navigation

- [Part 1: Introduction to ArgoCD](/posts/argocd/01-introduction)
- [Part 2: Managing Applications with ArgoCD](/posts/argocd/02-application-management)
- [Part 3: Multi-Cluster Management with ArgoCD](/posts/argocd/03-multicluster)
- [Part 4: Advanced ArgoCD Patterns](/posts/argocd/04-advanced-patterns)
- [Part 5: Real-World ArgoCD Case Studies](/posts/argocd/05-real-world-cases)
- [Part 6: Multi-Environment Deployments](/posts/argocd/06-multi-env-deployment)
- [Part 7: Environment-Specific Configurations](/posts/argocd/07-env-configs)
- **Part 8: Comparing Deployment Approaches** (Current)

## Introduction

In this article, we'll compare two popular approaches to deploying applications with ArgoCD:

1. Using raw Kubernetes manifests with Kustomize
2. Using Helm charts

We'll implement the same application using both methods and analyze their pros and cons, with special attention to secret management.

## Sample Application Overview

We'll deploy a simple web application with:

- Frontend deployment
- Backend deployment
- Database deployment
- Required services
- Ingress configuration
- Secrets for database credentials and API keys

## Approach 1: Kubernetes Manifests with Kustomize

### Directory Structure

```plaintext
├── base/
│   ├── kustomization.yaml
│   ├── frontend/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── backend/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   └── database/
│       ├── statefulset.yaml
│       └── service.yaml
└── overlays/
    ├── dev/
    │   ├── kustomization.yaml
    │   └── secrets/
    │       └── external-secret.yaml
    └── prod/
        ├── kustomization.yaml
        └── secrets/
            └── external-secret.yaml
```

### Base Configurations

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - frontend/deployment.yaml
  - frontend/service.yaml
  - backend/deployment.yaml
  - backend/service.yaml
  - database/statefulset.yaml
  - database/service.yaml
```

### Backend Deployment

```yaml
# base/backend/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: myapp-backend:latest
        env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
```

### Secret Management with External Secrets

```yaml
# overlays/dev/secrets/external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-credentials
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: db-credentials
  data:
  - secretKey: password
    remoteRef:
      key: dev/myapp/db
      property: password
```

### ArgoCD Application

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-k8s
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/myapp.git
    path: overlays/dev
    targetRevision: HEAD
  destination:
    server: https://kubernetes.default.svc
    namespace: myapp-dev
```

## Approach 2: Helm Charts

### Chart Structure

```plaintext
├── Chart.yaml
├── values.yaml
├── values-dev.yaml
├── values-prod.yaml
└── templates/
    ├── frontend/
    │   ├── deployment.yaml
    │   └── service.yaml
    ├── backend/
    │   ├── deployment.yaml
    │   └── service.yaml
    ├── database/
    │   ├── statefulset.yaml
    │   └── service.yaml
    └── secrets/
        └── external-secret.yaml
```

### Values Configuration

```yaml
# values.yaml
global:
  environment: production
  image:
    registry: docker.io
    pullPolicy: IfNotPresent

frontend:
  replicaCount: 2
  image:
    repository: myapp-frontend
    tag: latest

backend:
  replicaCount: 2
  image:
    repository: myapp-backend
    tag: latest

database:
  image:
    repository: postgres
    tag: "13"
```

### Backend Template

```yaml
# templates/backend/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "myapp.fullname" . }}-backend
spec:
  replicas: {{ .Values.backend.replicaCount }}
  selector:
    matchLabels:
      {{- include "myapp.selectorLabels" . | nindent 6 }}
      component: backend
  template:
    metadata:
      labels:
        {{- include "myapp.selectorLabels" . | nindent 8 }}
        component: backend
    spec:
      containers:
      - name: backend
        image: "{{ .Values.global.image.registry }}/{{ .Values.backend.image.repository }}:{{ .Values.backend.image.tag }}"
        env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: {{ include "myapp.fullname" . }}-db-credentials
              key: password
```

### Secret Management Template

```yaml
# templates/secrets/external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: {{ include "myapp.fullname" . }}-db-credentials
spec:
  refreshInterval: {{ .Values.secrets.refreshInterval }}
  secretStoreRef:
    name: {{ .Values.secrets.storeName }}
    kind: SecretStore
  target:
    name: {{ include "myapp.fullname" . }}-db-credentials
  data:
  - secretKey: password
    remoteRef:
      key: {{ .Values.global.environment }}/{{ include "myapp.name" . }}/db
      property: password
```

### ArgoCD Application

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-helm
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/myapp.git
    path: helm/myapp
    targetRevision: HEAD
    helm:
      valueFiles:
      - values-dev.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: myapp-dev
```

## Comparison Analysis

### Kubernetes Manifests with Kustomize

Advantages:

1. Simple and straightforward
2. Native Kubernetes resources
3. No templating language to learn
4. Easy to understand and debug

Disadvantages:

1. Limited templating capabilities
2. More repetitive code
3. Complex value substitutions
4. Manual chart versioning

### Helm Charts

Advantages:

1. Powerful templating
2. Built-in versioning
3. Easy package distribution
4. Reusable components
5. Built-in functions and helpers

Disadvantages:

1. Learning curve for Helm templates
2. More complex debugging
3. Template rendering overhead
4. Potential security concerns with Tiller (Helm 2)

## Secret Management Comparison

### Kubernetes Manifests Approach

Pros:

1. Direct integration with Kubernetes secrets
2. Straightforward external secrets configuration
3. Easy to audit and track changes

Cons:

1. Limited templating for secret names
2. Manual secret rotation handling
3. More verbose configuration

### Helm Charts Approach

Pros:

1. Template-based secret generation
2. Dynamic secret naming
3. Centralized secret configuration
4. Easy secret rotation through values

Cons:

1. More complex template debugging
2. Potential security risks in values files
3. Need for careful template escaping

## Best Practices

1. **Choose Based on Complexity**
   - Use K8s manifests for simple applications
   - Use Helm for complex, multi-component applications

2. **Secret Management**
   - Always use external secret management
   - Implement proper RBAC
   - Regular secret rotation
   - Audit logging

3. **Version Control**
   - Separate application and configuration repositories
   - Use semantic versioning
   - Maintain changelog

4. **Deployment Strategy**
   - Implement proper health checks
   - Use rolling updates
   - Configure resource limits

## Conclusion

Both approaches have their merits:

- **Kubernetes Manifests**: Better for simple applications and teams new to Kubernetes
- **Helm Charts**: Better for complex applications and experienced teams

Choose based on:

1. Application complexity
2. Team experience
3. Maintenance requirements
4. Deployment flexibility needs

Remember that both approaches can effectively manage secrets with external secret managers, but their implementation details differ significantly.
