---
title: "Kubernetes Series - Part 5: Configuration and Secrets"
description: "Learn how to manage application configuration and secrets securely in Kubernetes"
publishDate: 2024-01-19
tags: ["kubernetes", "configuration", "secrets", "security", "series:kubernetes:5"]
draft: false
---

## Series Navigation

- [Part 1: Core Fundamentals](/posts/kubernetes/01-fundamentals)
- [Part 2: Workload Management](/posts/kubernetes/02-workload-management)
- [Part 3: Networking Essentials](/posts/kubernetes/03-networking)
- [Part 4: Storage and Persistence](/posts/kubernetes/04-storage)
- **Part 5: Configuration and Secrets** (Current)
- [Part 6: Security and Access Control](/posts/kubernetes/06-security)
- [Part 7: Observability](/posts/kubernetes/07-observability)
- [Part 8: Advanced Patterns](/posts/kubernetes/08-advanced-patterns)
- [Part 9: Production Best Practices](/posts/kubernetes/09-production)

## Introduction

After managing dozens of applications across multiple environments, I've learned that proper configuration management is crucial for maintaining reliable and secure Kubernetes deployments. In this article, I'll share practical insights from real-world experience managing configurations and secrets.

## ConfigMaps

Here's how we structure our ConfigMaps for different environments:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  labels:
    app: myapp
    env: production
data:
  app.properties: |
    log.level=INFO
    cache.ttl=3600
    api.timeout=30
    metrics.enabled=true
  nginx.conf: |
    server {
      listen 80;
      location /health {
        return 200 'healthy\n';
      }
      location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
      }
    }
```

### ConfigMap Best Practices

1. **Organization**
   - Use meaningful names
   - Group related configurations
   - Version your configs

   ```yaml
   metadata:
     name: app-config-v2
     labels:
       version: "2.0"
   ```

2. **Environment Management**
   - Separate configs by environment
   - Use kustomize for variations
   - Document all options

## Secrets Management

Our approach to managing secrets securely:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  annotations:
    vault.hashicorp.com/agent-inject: "true"
    vault.hashicorp.com/role: "myapp"
type: Opaque
stringData:
  api-key: ${VAULT_API_KEY}
  db-password: ${VAULT_DB_PASSWORD}
```

### External Secrets Integration

We use External Secrets Operator for AWS Secrets Manager:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-external-secrets
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets
    kind: SecretStore
  target:
    name: app-secrets
  data:
  - secretKey: api-key
    remoteRef:
      key: myapp/production/api-key
  - secretKey: db-password
    remoteRef:
      key: myapp/production/db-password
```

### Secret Management Tips

1. **Security Practices**
   - Never commit secrets to git
   - Rotate secrets regularly
   - Use external secret managers
   - Implement least privilege access

2. **Secret Rotation**
   - Automate rotation where possible
   - Plan for zero-downtime updates
   - Monitor secret usage

## Environment Variables

How we handle environment variables in deployments:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      containers:
      - name: myapp
        env:
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: DB_HOST
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: database.host
        - name: API_KEY
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: api-key
        envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secrets
```

### Environment Variable Best Practices

1. **Organization**
   - Group related variables
   - Use clear naming conventions
   - Document each variable's purpose

2. **Security**
   - Avoid sensitive data in env vars
   - Use secrets for credentials
   - Implement proper RBAC

## Configuration Updates

How we handle configuration updates:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    metadata:
      annotations:
        checksum/config: ${CONFIG_CHECKSUM}
    spec:
      containers:
      - name: myapp
        volumeMounts:
        - name: config
          mountPath: /app/config
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: app-config
```

### Update Strategies

1. **Rolling Updates**
   - Use checksums to trigger updates
   - Implement proper health checks
   - Monitor update progress

2. **Zero-downtime Updates**
   - Use readiness probes
   - Implement graceful shutdown
   - Monitor application health

## Real-world Example

Complete example of a production application with configs and secrets:

```yaml
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  application.yaml: |
    server:
      port: 8080
    logging:
      level: INFO
    cache:
      enabled: true
      ttl: 3600
---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-secrets
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets
    kind: SecretStore
  target:
    name: app-secrets
  data:
  - secretKey: db-password
    remoteRef:
      key: myapp/production/db-password
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    metadata:
      annotations:
        checksum/config: ${CONFIG_CHECKSUM}
    spec:
      containers:
      - name: myapp
        image: myapp:1.0.0
        volumeMounts:
        - name: config
          mountPath: /app/config
          readOnly: true
        env:
        - name: SPRING_CONFIG_LOCATION
          value: /app/config/application.yaml
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: db-password
      volumes:
      - name: config
        configMap:
          name: app-config
```

## Common Issues and Solutions

From my experience, here are frequent problems and solutions:

1. **Configuration Drift**
   - Use GitOps practices
   - Implement configuration validation
   - Regular audits

2. **Secret Management**
   - Implement proper rotation
   - Monitor secret access
   - Regular security audits

3. **Update Problems**
   - Test updates thoroughly
   - Implement rollback procedures
   - Monitor application health

## Production Checklist

✅ **Configuration Management**

- [ ] Version control for configs
- [ ] Environment separation
- [ ] Documentation
- [ ] Validation procedures

✅ **Secret Management**

- [ ] External secrets manager
- [ ] Rotation policy
- [ ] Access controls
- [ ] Audit logging

✅ **Security**

- [ ] RBAC configuration
- [ ] Network policies
- [ ] Encryption
- [ ] Security scanning

✅ **Monitoring**

- [ ] Configuration changes
- [ ] Secret access
- [ ] Error tracking
- [ ] Health metrics

## Conclusion

Proper configuration and secrets management is fundamental to running reliable and secure Kubernetes applications. Key takeaways from my experience:

- Use external secret managers
- Implement proper versioning
- Automate where possible
- Monitor and audit regularly
- Plan for updates and rollbacks

In the next part, we'll explore security and access control in Kubernetes, where I'll share practical tips for securing your cluster and applications.

## Additional Resources

- [Kubernetes ConfigMaps and Secrets](https://kubernetes.io/docs/concepts/configuration/)
- [External Secrets Operator](https://external-secrets.io/latest/)
- [HashiCorp Vault with Kubernetes](https://www.vaultproject.io/docs/platform/k8s)
- [Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets)
