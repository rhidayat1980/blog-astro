---
title: "Managing Applications with ArgoCD"
description: "Learn how to create, configure, and manage applications in ArgoCD, including sync strategies and health checks"
publishDate: 2023-11-15
tags: ["kubernetes", "argocd", "gitops", "devops", "cloud-native", "continuous-deployment", "series:argocd:2"]
draft: false
---

## Series Navigation

- [Part 1: Introduction to ArgoCD](/posts/argocd/01-introduction)
- **Part 2: Managing Applications with ArgoCD** (Current)
- [Part 3: Multi-Cluster Management with ArgoCD](/posts/argocd/03-multicluster)
- [Part 4: Advanced ArgoCD Patterns](/posts/argocd/04-advanced-patterns)
- [Part 5: Real-World ArgoCD Case Studies](/posts/argocd/05-real-world-cases)
- [Part 6: Multi-Environment Deployments](/posts/argocd/06-multi-env-deployment)
- [Part 7: Environment-Specific Configurations](/posts/argocd/07-env-configs)
- [Part 8: Comparing Deployment Approaches](/posts/argocd/08-deployment-approaches)

## Managing Applications with ArgoCD

In this second part of our ArgoCD series, we'll dive deep into application management, covering everything from creating applications to advanced sync strategies.

## Creating Applications

### Via CLI

```bash
argocd app create guestbook \
  --repo https://github.com/argoproj/argocd-example-apps.git \
  --path guestbook \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace default
```

### Via YAML

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: guestbook
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/argoproj/argocd-example-apps.git
    targetRevision: HEAD
    path: guestbook
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Sync Strategies

### Manual Sync

- Requires explicit approval
- Good for production environments
- Allows review before deployment

### Automated Sync

```yaml
syncPolicy:
  automated:
    prune: true     # Remove resources that no longer exist in Git
    selfHeal: true  # Revert manual changes
```

## Health Checks

ArgoCD provides built-in health assessments for:

- Kubernetes resources
- Custom resources
- Helm releases
- Custom health checks

### Custom Health Checks

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
spec:
  ignoreDifferences:
  - group: apps
    kind: Deployment
    jsonPointers:
    - /spec/replicas
  health:
    - check:
        command: ["/scripts/health-check.sh"]
        args: ["myapp"]
```

## Resource Hooks

Pre-sync and post-sync hooks for tasks like:

- Database migrations
- Resource validation
- Notifications

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  annotations:
    argocd.argoproj.io/hook: PreSync
```

## Best Practices

1. **Application Structure**
   - Use Helm charts or Kustomize for templating
   - Maintain separate configs for different environments
   - Version your manifests

2. **Sync Policies**
   - Use automated sync for dev/staging
   - Manual sync for production
   - Enable pruning with caution

3. **Resource Management**
   - Set resource limits
   - Use namespaces for isolation
   - Implement RBAC

## Advanced Features

### App of Apps Pattern

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: apps
spec:
  source:
    path: apps
    repoURL: https://github.com/org/apps.git
  destination:
    namespace: argocd
    server: https://kubernetes.default.svc
```

### Sync Windows

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: myproject
spec:
  syncWindows:
  - kind: allow
    schedule: "10 1 * * *"
    duration: 1h
```

## Monitoring and Troubleshooting

1. **Sync Status**

   ```bash
   argocd app get myapp
   argocd app sync myapp
   ```

2. **Logs**

   ```bash
   argocd app logs myapp
   kubectl logs deployment/argocd-application-controller -n argocd
   ```

3. **Diff**

   ```bash
   argocd app diff myapp
   ```

## Conclusion

Effective application management in ArgoCD requires understanding:

- Application creation and configuration
- Sync strategies and policies
- Health checks and monitoring
- Resource hooks and advanced patterns

In the next part, we'll explore advanced topics including:

- Multi-cluster management
- SSO integration
- Custom resource management
- Notification systems
