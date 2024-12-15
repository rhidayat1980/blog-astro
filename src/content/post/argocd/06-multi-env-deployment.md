---
title: "Multi-Environment Deployments with ArgoCD"
description: "Learn how to manage multiple environments (dev, staging, prod) effectively using ArgoCD and Kubernetes"
publishDate: 2023-12-05
tags: ["kubernetes", "argocd", "gitops", "devops", "cloud-native", "multi-environment", "series:argocd:6"]
draft: false
---

## Series Navigation

- [Part 1: Introduction to ArgoCD](/posts/argocd/01-introduction)
- [Part 2: Managing Applications with ArgoCD](/posts/argocd/02-application-management)
- [Part 3: Multi-Cluster Management with ArgoCD](/posts/argocd/03-multicluster)
- [Part 4: Advanced ArgoCD Patterns](/posts/argocd/04-advanced-patterns)
- [Part 5: Real-World ArgoCD Case Studies](/posts/argocd/05-real-world-cases)
- **Part 6: Multi-Environment Deployments** (Current)
- [Part 7: Environment-Specific Configurations](/posts/argocd/07-env-configs)
- [Part 8: Comparing Deployment Approaches](/posts/argocd/08-deployment-approaches)

## Multi-Environment Deployments with ArgoCD

In this sixth part of our ArgoCD series, we'll explore strategies for managing deployments across multiple environments.

## Environment Management Strategies

### 1. Directory-Based Structure

```plaintext
├── environments/
│   ├── dev/
│   │   ├── kustomization.yaml
│   │   └── values.yaml
│   ├── staging/
│   │   ├── kustomization.yaml
│   │   └── values.yaml
│   └── prod/
│       ├── kustomization.yaml
│       └── values.yaml
└── base/
    ├── deployment.yaml
    ├── service.yaml
    └── kustomization.yaml
```

### 2. Branch-Based Strategy

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-dev
spec:
  source:
    repoURL: https://github.com/org/myapp.git
    targetRevision: dev
    path: k8s
  destination:
    server: https://dev-cluster:6443
    namespace: myapp-dev
```

## Using Kustomize for Environment Management

### Base Configuration

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
  - configmap.yaml
```

### Environment Overlay

```yaml
# environments/dev/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
bases:
  - ../../base
namePrefix: dev-
namespace: dev
patchesStrategicMerge:
  - replica-count.yaml
  - resource-limits.yaml
configMapGenerator:
  - name: app-config
    behavior: merge
    literals:
      - ENV=development
```

## Using Helm for Environment Management

### Values File Structure

```yaml
# values-dev.yaml
environment: development
replicaCount: 2
resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi
```

### ArgoCD Application with Helm

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-dev
spec:
  source:
    repoURL: https://github.com/org/myapp.git
    path: helm
    helm:
      valueFiles:
        - values-dev.yaml
  destination:
    server: https://dev-cluster:6443
    namespace: myapp-dev
```

## ApplicationSet for Multiple Environments

### Using Matrix Generator

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: myapp-environments
spec:
  generators:
    - matrix:
        generators:
          - list:
              elements:
                - env: dev
                  cluster: dev-cluster
                  namespace: dev
                - env: staging
                  cluster: staging-cluster
                  namespace: staging
                - env: prod
                  cluster: prod-cluster
                  namespace: prod
          - list:
              elements:
                - component: frontend
                  path: frontend
                - component: backend
                  path: backend
  template:
    metadata:
      name: '{{component}}-{{env}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/org/myapp.git
        targetRevision: HEAD
        path: '{{path}}/environments/{{env}}'
      destination:
        server: 'https://{{cluster}}:6443'
        namespace: '{{namespace}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

## Environment-Specific Configurations

### Config Maps

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  DATABASE_URL: "postgres://dev-db:5432/myapp"
  CACHE_URL: "redis://dev-redis:6379"
  LOG_LEVEL: "debug"
```

### Secrets Management

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-secrets
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: app-secrets
  data:
    - secretKey: API_KEY
      remoteRef:
        key: myapp/{{.Env}}/api-key
```

## Deployment Strategies

### Progressive Delivery

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: myapp
spec:
  strategy:
    canary:
      steps:
      - setWeight: 20
      - pause: {duration: 1h}
      - setWeight: 40
      - pause: {duration: 1h}
      - setWeight: 60
      - pause: {duration: 1h}
      - setWeight: 80
      - pause: {duration: 1h}
```

## Best Practices

1. **Environment Parity**
   - Keep configurations as similar as possible
   - Use the same deployment process
   - Automate environment creation

2. **Configuration Management**
   - Use environment variables
   - Externalize configurations
   - Version control all changes

3. **Security**
   - Implement RBAC per environment
   - Use different secrets per environment
   - Audit all changes

4. **Monitoring**
   - Set up monitoring per environment
   - Configure appropriate alerting
   - Track deployment success rates

## Conclusion

Effective multi-environment management with ArgoCD requires:

- Clear environment separation
- Consistent deployment processes
- Environment-specific configurations
- Robust security measures

In the next part, we'll dive deeper into environment-specific configurations and advanced deployment patterns.
