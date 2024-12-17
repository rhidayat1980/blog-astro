---
title: "Kubernetes Series - Part 6: Security and Access Control"
description: "Learn how to implement comprehensive security measures in Kubernetes using RBAC, Pod Security, and Network Policies"
publishDate: 2024-01-20
tags: ["kubernetes", "security", "rbac", "devsecops", "series:kubernetes:6"]
draft: false
---

## Series Navigation

- [Part 1: Core Fundamentals](/posts/kubernetes/01-fundamentals)
- [Part 2: Workload Management](/posts/kubernetes/02-workload-management)
- [Part 3: Networking Essentials](/posts/kubernetes/03-networking)
- [Part 4: Storage and Persistence](/posts/kubernetes/04-storage)
- [Part 5: Configuration and Secrets](/posts/kubernetes/05-configuration)
- **Part 6: Security and Access Control** (Current)
- [Part 7: Observability](/posts/kubernetes/07-observability)
- [Part 8: Advanced Patterns](/posts/kubernetes/08-advanced-patterns)
- [Part 9: Production Best Practices](/posts/kubernetes/09-production)

## Introduction

After securing numerous Kubernetes clusters in production environments, I've learned that security requires a comprehensive, layered approach. In this article, I'll share practical insights from implementing security measures across various organizations.

## Role-Based Access Control (RBAC)

Here's our production RBAC setup for different teams:

```yaml
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: developer
  namespace: development
rules:
- apiGroups: ["", "apps", "batch"]
  resources: ["pods", "deployments", "services", "jobs"]
  verbs: ["get", "list", "watch", "create", "update", "patch"]
- apiGroups: [""]
  resources: ["configmaps", "secrets"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: dev-team-binding
  namespace: development
subjects:
- kind: Group
  name: development-team
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: developer
  apiGroup: rbac.authorization.k8s.io
```

### RBAC Best Practices

1. **Principle of Least Privilege**
   - Grant minimal required permissions
   - Regular access reviews
   - Document role assignments

2. **Role Organization**
   - Create roles per responsibility
   - Use aggregated roles
   - Implement role hierarchy

## Pod Security Standards

Our pod security policy implementation:

```yaml
apiVersion: pod-security.kubernetes.io/v1
kind: SecurityContext
metadata:
  name: restricted-pods
spec:
  runAsNonRoot: true
  runAsUser: 1000
  runAsGroup: 3000
  fsGroup: 2000
  supplementalGroups: [1000]
  seccompProfile:
    type: RuntimeDefault
  capabilities:
    drop: ["ALL"]
```

### Container Security

Secure container configuration:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-app
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
      containers:
      - name: app
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            drop: ["ALL"]
          readOnlyRootFilesystem: true
        resources:
          limits:
            memory: "256Mi"
            cpu: "500m"
```

### Security Context Tips

1. **Container Hardening**
   - Run as non-root
   - Use read-only root filesystem
   - Drop unnecessary capabilities

2. **Resource Controls**
   - Set appropriate limits
   - Implement quotas
   - Monitor resource usage

## Network Security

Our comprehensive network policy:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: secure-policy
spec:
  podSelector:
    matchLabels:
      app: secure-app
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: frontend
    - podSelector:
        matchLabels:
          role: frontend
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: backend
    ports:
    - protocol: TCP
      port: 5432
```

### Network Security Best Practices

1. **Segmentation**
   - Implement zero-trust model
   - Use namespace isolation
   - Control egress traffic

2. **Monitoring**
   - Log denied connections
   - Monitor policy effectiveness
   - Regular security audits

## Service Accounts

How we manage service accounts:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-service-account
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::account-id:role/app-role
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: app-role
rules:
- apiGroups: [""]
  resources: ["configmaps", "secrets"]
  verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: app-role-binding
subjects:
- kind: ServiceAccount
  name: app-service-account
roleRef:
  kind: Role
  name: app-role
  apiGroup: rbac.authorization.k8s.io
```

### Service Account Tips

1. **Access Management**
   - Use dedicated service accounts
   - Implement proper RBAC
   - Regular rotation of credentials

2. **Cloud Integration**
   - Use cloud provider IAM
   - Implement proper role assumption
   - Monitor access patterns

## Secrets Management

Our approach to secure secrets:

```yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: aws-secrets
spec:
  provider: aws
  parameters:
    objects: |
      - objectName: "production/app1/secret1"
        objectType: "secretsmanager"
        objectVersion: "AWSCURRENT"
  secretObjects:
  - secretName: app-secret
    type: Opaque
    data:
    - objectName: production/app1/secret1
      key: secret-key
```

### Secrets Best Practices

1. **Storage**
   - Use external secret managers
   - Encrypt secrets at rest
   - Implement proper rotation

2. **Access Control**
   - Implement least privilege
   - Audit secret access
   - Monitor usage patterns

## Audit Logging

Our audit policy configuration:

```yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
- level: RequestResponse
  resources:
  - group: ""
    resources: ["secrets", "configmaps"]
- level: Metadata
  resources:
  - group: ""
    resources: ["pods", "services"]
- level: None
  users: ["system:kube-proxy"]
  resources:
  - group: "" # core
    resources: ["endpoints", "services", "services/status"]
```

### Audit Best Practices

1. **Log Management**
   - Configure appropriate log levels
   - Implement log retention
   - Regular log analysis

2. **Monitoring**
   - Set up alerts
   - Monitor suspicious activities
   - Regular security reviews

## Common Security Issues

From my experience, here are frequent problems and solutions:

1. **Access Control**
   - Over-privileged service accounts
   - Insufficient network policies
   - Improper RBAC configuration

2. **Container Security**
   - Running as root
   - Unnecessary capabilities
   - Vulnerable dependencies

3. **Secret Management**
   - Exposed secrets in configs
   - Improper rotation
   - Insufficient monitoring

## Production Checklist

✅ **Access Control**

- [ ] RBAC implementation
- [ ] Service account configuration
- [ ] Regular access reviews
- [ ] Audit logging

✅ **Pod Security**

- [ ] Security contexts
- [ ] Resource limits
- [ ] Image scanning
- [ ] Runtime security

✅ **Network Security**

- [ ] Network policies
- [ ] Ingress/Egress controls
- [ ] Service mesh
- [ ] TLS configuration

✅ **Monitoring**

- [ ] Security logging
- [ ] Audit trails
- [ ] Alert configuration
- [ ] Regular audits

## Real-world Example

Complete example of a secure application deployment:

```yaml
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: secure-app
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-app
spec:
  template:
    metadata:
      annotations:
        seccomp.security.alpha.kubernetes.io/pod: runtime/default
    spec:
      serviceAccountName: secure-app
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 2000
      containers:
      - name: app
        image: secure-app:1.0.0
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            drop: ["ALL"]
          readOnlyRootFilesystem: true
        resources:
          limits:
            memory: "256Mi"
            cpu: "500m"
        volumeMounts:
        - name: secrets
          mountPath: /mnt/secrets-store
          readOnly: true
      volumes:
      - name: secrets
        csi:
          driver: secrets-store.csi.k8s.io
          readOnly: true
          volumeAttributes:
            secretProviderClass: aws-secrets
```

## Conclusion

Kubernetes security requires a comprehensive approach covering multiple layers. Key takeaways from my experience:

- Implement security at every layer
- Follow the principle of least privilege
- Monitor and audit continuously
- Keep dependencies updated
- Regular security reviews

In the next part, we'll explore observability in Kubernetes, where I'll share practical tips for monitoring and troubleshooting your applications.

## Additional Resources

- [Kubernetes Security Documentation](https://kubernetes.io/docs/concepts/security/)
- [CIS Kubernetes Benchmark](https://www.cisecurity.org/benchmark/kubernetes)
- [RBAC Documentation](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
