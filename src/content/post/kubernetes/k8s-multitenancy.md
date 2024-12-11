---
title: "Kubernetes Multi-tenancy"
description: "Comprehensive guide to implementing and managing multi-tenant Kubernetes clusters"
publishDate: "11 Dec 2024"
tags: ["kubernetes", "k8s", "multi-tenancy", "security", "devops", "cloud-native", "containers", "series:kubernetes:17"]
draft: false
---

## Understanding Multi-tenancy in Kubernetes

Multi-tenancy in Kubernetes allows multiple users, teams, or applications to share a Kubernetes cluster while maintaining isolation and security.

## Multi-tenancy Models

### 1. Namespace-based Multi-tenancy

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: team-a
  labels:
    team: a
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-a-quota
  namespace: team-a
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
    pods: "20"
```

### 2. Cluster-based Multi-tenancy

```yaml
apiVersion: v1
kind: Cluster
metadata:
  name: team-b-cluster
spec:
  kubernetesVersion: "1.26"
  networkPolicy:
    enabled: true
  podSecurityPolicy:
    enabled: true
```

## Resource Isolation

### 1. Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all
  namespace: team-a
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-specific
  namespace: team-a
spec:
  podSelector:
    matchLabels:
      app: web
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          team: a
    ports:
    - protocol: TCP
      port: 80
```

### 2. Pod Security Standards

```yaml
apiVersion: pod-security.kubernetes.io/v1
kind: PodSecurityStandard
metadata:
  name: restricted
  namespace: team-a
spec:
  enforce: restricted
  audit: restricted
  warn: restricted
```

## Access Control

### 1. Role-Based Access Control (RBAC)

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: team-a
  name: pod-reader
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: team-a
subjects:
- kind: User
  name: jane
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

### 2. Service Accounts

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: team-a-sa
  namespace: team-a
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-a-sa-binding
  namespace: team-a
subjects:
- kind: ServiceAccount
  name: team-a-sa
  namespace: team-a
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

## Resource Management

### 1. Resource Quotas

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-resources
  namespace: team-a
spec:
  hard:
    requests.cpu: "1"
    requests.memory: 1Gi
    limits.cpu: "2"
    limits.memory: 2Gi
    requests.nvidia.com/gpu: 1
```

### 2. Limit Ranges

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: mem-limit-range
  namespace: team-a
spec:
  limits:
  - default:
      memory: 512Mi
      cpu: 500m
    defaultRequest:
      memory: 256Mi
      cpu: 200m
    type: Container
```

## Cost Allocation

### 1. Resource Labels

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-app
  namespace: team-a
  labels:
    cost-center: team-a
    environment: production
    project: web
spec:
  containers:
  - name: web
    image: nginx:1.14.2
```

### 2. Chargeback System

```yaml
apiVersion: cost.k8s.io/v1alpha1
kind: CostReport
metadata:
  name: monthly-report
spec:
  timeframe:
    start: "2024-12-01"
    end: "2024-12-31"
  groupBy:
    - namespace
    - label:cost-center
```

## Security Considerations

### 1. Pod Security Context

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-pod
  namespace: team-a
spec:
  securityContext:
    runAsUser: 1000
    runAsGroup: 3000
    fsGroup: 2000
  containers:
  - name: app
    image: secure-app:1.0
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
```

### 2. Network Segmentation

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: tenant-isolation
  namespace: team-a
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          tenant: team-a
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          tenant: team-a
    - namespaceSelector:
        matchLabels:
          common: true
```

## Monitoring and Logging

### 1. Prometheus Configuration

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: team-a-monitor
  namespace: monitoring
spec:
  selector:
    matchLabels:
      team: a
  namespaceSelector:
    matchNames:
    - team-a
  endpoints:
  - port: metrics
```

### 2. Logging Pipeline

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: Flow
metadata:
  name: team-a-logs
  namespace: team-a
spec:
  filters:
    - tag_normaliser: {}
    - parser:
        remove_key_name_field: true
        parse:
          type: json
  match:
    - select:
        labels:
          app.kubernetes.io/name: team-a
  localOutputRefs:
    - elasticsearch-output
```

## Best Practices

1. Use Namespaces for Logical Separation
2. Implement Resource Quotas and Limits
3. Configure Network Policies
4. Apply Pod Security Standards
5. Set Up RBAC Properly
6. Monitor Resource Usage
7. Implement Cost Allocation
8. Regular Security Audits

## Troubleshooting

### Common Issues

1. Resource Constraints

```bash
kubectl describe quota -n team-a
kubectl top pods -n team-a
```

2. Access Issues

```bash
kubectl auth can-i --as=jane --namespace=team-a get pods
```

3. Network Policy Issues

```bash
kubectl describe networkpolicy -n team-a
```

## Conclusion

Implementing multi-tenancy in Kubernetes requires careful planning and consideration of security, resource isolation, and management aspects. By following best practices and using the right combination of Kubernetes features, you can create a secure and efficient multi-tenant environment.

## Series Navigation
- Previous: [Kubernetes Operators and CRDs](/posts/kubernetes/k8s-operators)
- Next: [Kubernetes Service Mesh (Istio)](/posts/kubernetes/k8s-service-mesh)
