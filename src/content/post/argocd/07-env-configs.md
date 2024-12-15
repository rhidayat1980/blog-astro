---
title: "Environment-Specific Configurations in ArgoCD"
description: "Master environment-specific configurations in ArgoCD using Kustomize, Helm, and advanced configuration management techniques"
publishDate: 2023-12-10
tags: ["kubernetes", "argocd", "gitops", "devops", "cloud-native", "configuration", "series:argocd:7"]
draft: false
---

## Series Navigation

- [Part 1: Introduction to ArgoCD](/posts/argocd/01-introduction)
- [Part 2: Managing Applications with ArgoCD](/posts/argocd/02-application-management)
- [Part 3: Multi-Cluster Management with ArgoCD](/posts/argocd/03-multicluster)
- [Part 4: Advanced ArgoCD Patterns](/posts/argocd/04-advanced-patterns)
- [Part 5: Real-World ArgoCD Case Studies](/posts/argocd/05-real-world-cases)
- [Part 6: Multi-Environment Deployments](/posts/argocd/06-multi-env-deployment)
- **Part 7: Environment-Specific Configurations** (Current)
- [Part 8: Comparing Deployment Approaches](/posts/argocd/08-deployment-approaches)

## Environment-Specific Configurations in ArgoCD

In this final part of our ArgoCD series, we'll explore advanced techniques for managing environment-specific configurations.

## Configuration Management Approaches

### 1. Kustomize Overlays

#### Base Configuration

```yaml
# base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      containers:
      - name: myapp
        image: myapp:latest
        env:
        - name: CONFIG_PATH
          value: /config/app.yaml
```

#### Environment Overlays

```yaml
# overlays/dev/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
bases:
  - ../../base
patchesJson6902:
- target:
    group: apps
    version: v1
    kind: Deployment
    name: myapp
  patch: |-
    - op: replace
      path: /spec/template/spec/containers/0/env/0/value
      value: /config/dev.yaml
```

### 2. Helm Value Files

#### Common Values

```yaml
# values.yaml
global:
  environment: production
  monitoring:
    enabled: true

application:
  replicaCount: 3
  image:
    repository: myapp
    tag: latest
```

#### Environment Values

```yaml
# values-dev.yaml
global:
  environment: development
  monitoring:
    enabled: false

application:
  replicaCount: 1
  resources:
    limits:
      cpu: 500m
      memory: 512Mi
```

## Advanced Configuration Patterns

### 1. Configuration Layers

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-config
spec:
  source:
    plugin:
      name: config-manager
      env:
      - name: CONFIG_LAYER
        value: "{{env}}"
      - name: CONFIG_VERSION
        value: "{{version}}"
```

### 2. Dynamic Configuration Updates

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: dynamic-configs
spec:
  generators:
  - matrix:
      generators:
      - clusters: {}
      - list:
          elements:
          - config: database
          - config: cache
          - config: logging
  template:
    spec:
      source:
        plugin:
          name: config-updater
```

## Secret Management

### 1. External Secrets Integration

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: vault-backend
spec:
  provider:
    vault:
      server: "https://vault.example.com"
      path: "secret/{{.Environment}}/myapp"
      version: "v2"
      auth:
        kubernetes:
          role: "myapp-{{.Environment}}"
```

### 2. Sealed Secrets

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: mysecret
  namespace: {{.Environment}}
spec:
  encryptedData:
    API_KEY: AgBy8hCi...
```

## Configuration Validation

### 1. Pre-Sync Hooks

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: config-validator
  annotations:
    argocd.argoproj.io/hook: PreSync
spec:
  template:
    spec:
      containers:
      - name: validator
        image: config-validator:latest
        env:
        - name: CONFIG_PATH
          value: /configs/{{.Environment}}
```

### 2. Post-Sync Validation

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: config-test
  annotations:
    argocd.argoproj.io/hook: PostSync
spec:
  template:
    spec:
      containers:
      - name: tester
        image: config-tester:latest
        command: ["./test-configs.sh"]
```

## Configuration Rollback Strategy

### 1. Version Control

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
spec:
  source:
    targetRevision: v1.2.3
    helm:
      valueFiles:
      - values-{{.Environment}}-v1.2.3.yaml
```

### 2. Rollback Hooks

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: config-rollback
  annotations:
    argocd.argoproj.io/hook: SyncFail
spec:
  template:
    spec:
      containers:
      - name: rollback
        image: config-manager:latest
        command: ["./rollback.sh"]
```

## Monitoring and Alerting

### 1. Configuration Drift Detection

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: config-drift
spec:
  groups:
  - name: config.rules
    rules:
    - alert: ConfigurationDrift
      expr: config_drift > 0
      for: 5m
```

### 2. Configuration Health Checks

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
spec:
  ignoreDifferences:
  - group: ""
    kind: ConfigMap
    jsonPointers:
    - /data/timestamp
```

## Best Practices

1. **Configuration Organization**
   - Use clear naming conventions
   - Maintain version control
   - Document all configurations

2. **Security**
   - Encrypt sensitive data
   - Use RBAC for access control
   - Implement audit logging

3. **Validation**
   - Test configurations before deployment
   - Validate against schemas
   - Implement health checks

4. **Maintenance**
   - Regular configuration reviews
   - Clean up unused configs
   - Monitor configuration usage

## Conclusion

Effective environment-specific configuration management requires:

- Clear organization structure
- Robust security measures
- Comprehensive validation
- Regular maintenance

Key takeaways:

1. Use appropriate tools (Kustomize, Helm)
2. Implement proper secret management
3. Validate configurations thoroughly
4. Monitor and maintain configurations
5. Plan for rollbacks and recovery
