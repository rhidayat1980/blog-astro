---
title: "Kubernetes Series - Part 9: Production Best Practices"
description: "Essential best practices and guidelines for running Kubernetes in production at scale"
publishDate: 2024-02-04
tags: ["kubernetes", "production", "best-practices", "scaling", "series:kubernetes:9"]
draft: false
---

## Series Navigation

- [Part 1: Core Fundamentals](/posts/kubernetes/01-fundamentals)
- [Part 2: Workload Management](/posts/kubernetes/02-workload-management)
- [Part 3: Networking Essentials](/posts/kubernetes/03-networking)
- [Part 4: Storage and Persistence](/posts/kubernetes/04-storage)
- [Part 5: Configuration and Secrets](/posts/kubernetes/05-configuration)
- [Part 6: Security and Access Control](/posts/kubernetes/06-security)
- [Part 7: Observability](/posts/kubernetes/07-observability)
- [Part 8: Advanced Patterns](/posts/kubernetes/08-advanced-patterns)
- **Part 9: Production Best Practices** (Current)

## Introduction

After managing Kubernetes clusters in production for several years, I've learned that success depends on following proven practices and avoiding common pitfalls. In this final article of the series, I'll share critical best practices that have helped me maintain reliable, secure, and efficient Kubernetes deployments at scale.

## Resource Management

### Resource Quotas

Namespace-level quota configuration:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  namespace: production
spec:
  hard:
    requests.cpu: "20"
    requests.memory: 40Gi
    limits.cpu: "40"
    limits.memory: 80Gi
    pods: "50"
    services: "20"
    persistentvolumeclaims: "30"
```

### Limit Ranges

Default resource constraints:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: production
spec:
  limits:
  - default:
      cpu: 500m
      memory: 512Mi
    defaultRequest:
      cpu: 200m
      memory: 256Mi
    type: Container
```

## High Availability Configuration

### Pod Anti-Affinity

Ensuring pod distribution:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ha-app
spec:
  replicas: 3
  template:
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - ha-app
            topologyKey: kubernetes.io/hostname
      containers:
      - name: app
        image: myapp:1.0
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 1
            memory: 1Gi
```

### Pod Disruption Budget

Maintaining availability during updates:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: ha-app-pdb
spec:
  minAvailable: "50%"
  selector:
    matchLabels:
      app: ha-app
```

## Production-Grade Security

### Network Policies

Strict network isolation:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: strict-policy
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
          environment: production
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
          environment: production
    ports:
    - protocol: TCP
      port: 5432
```

### Pod Security Standards

Enforcing security contexts:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-pod
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 2000
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: app
    image: myapp:1.0
    securityContext:
      allowPrivilegeEscalation: false
      capabilities:
        drop:
        - ALL
      readOnlyRootFilesystem: true
```

## Backup and Disaster Recovery

### Velero Configuration

Automated backup setup:

```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: daily-backup
spec:
  schedule: "0 1 * * *"
  template:
    includedNamespaces:
    - production
    - staging
    excludedResources:
    - nodes
    - events
    includeClusterResources: true
    storageLocation: default
    volumeSnapshotLocations:
    - default
    ttl: 720h
```

### Cluster State Backup

Critical resource backup:

```yaml
apiVersion: velero.io/v1
kind: Backup
metadata:
  name: pre-upgrade-backup
spec:
  includedNamespaces:
  - "*"
  excludedNamespaces:
  - kube-system
  includeClusterResources: true
  hooks:
    resources:
    - name: backup-hook
      includedNamespaces:
      - production
      pre:
      - exec:
          command:
          - /bin/sh
          - -c
          - "echo 'Starting backup' && /backup.sh"
```

## Scaling and Performance

### Horizontal Pod Autoscaling

Advanced metrics-based scaling:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: advanced-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: scalable-app
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: AverageValue
        averageValue: 800Mi
  - type: Pods
    pods:
      metric:
        name: requests_per_second
      target:
        type: AverageValue
        averageValue: 1k
```

### Cluster Autoscaling

Node group configuration:

```yaml
apiVersion: cluster.k8s.io/v1alpha1
kind: MachineDeployment
metadata:
  name: worker-nodes
spec:
  replicas: 3
  selector:
    matchLabels:
      node-type: worker
  template:
    spec:
      providerSpec:
        value:
          machineType: n1-standard-4
          diskSizeGb: 100
          diskType: pd-ssd
          metadata:
            labels:
              node-type: worker
```

## Cost Optimization

### Resource Optimization

Pod resource rightsizing:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: optimized-app
spec:
  template:
    spec:
      containers:
      - name: app
        image: myapp:1.0
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
        startupProbe:
          httpGet:
            path: /startup
            port: 8080
          failureThreshold: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /live
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 20
```

## Monitoring and Alerting

### Prometheus Rules

Critical alerts configuration:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: production-alerts
spec:
  groups:
  - name: production
    rules:
    - alert: HighErrorRate
      expr: |
        sum(rate(http_requests_total{code=~"5.."}[5m])) 
        / 
        sum(rate(http_requests_total[5m])) > 0.1
      for: 5m
      labels:
        severity: critical
      annotations:
        description: Error rate is above 10% for 5 minutes
    - alert: PodCrashLooping
      expr: rate(kube_pod_container_status_restarts_total[15m]) > 0
      for: 15m
      labels:
        severity: warning
      annotations:
        description: Pod {{ $labels.pod }} is crash looping
```

## Production Checklist

✅ **Resource Management**

- [ ] Resource quotas configured
- [ ] Limit ranges defined
- [ ] Quality of Service classes set
- [ ] Resource monitoring enabled

✅ **High Availability**

- [ ] Pod anti-affinity rules
- [ ] Pod disruption budgets
- [ ] Multi-zone deployment
- [ ] Load balancing configured

✅ **Security**

- [ ] Network policies enforced
- [ ] Pod security standards
- [ ] RBAC properly configured
- [ ] Secrets management

✅ **Backup & DR**

- [ ] Regular backups scheduled
- [ ] Backup verification process
- [ ] Disaster recovery plan
- [ ] Restore procedures tested

✅ **Monitoring**

- [ ] Metrics collection
- [ ] Alert rules defined
- [ ] Logging pipeline
- [ ] Dashboard setup

✅ **Cost Optimization**

- [ ] Resource rightsizing
- [ ] Autoscaling configured
- [ ] Spot instances utilized
- [ ] Cost monitoring

## Common Production Issues

1. **Resource Contention**
   - Implement proper resource limits
   - Use priority classes
   - Monitor resource usage
   - Configure HPA properly

2. **Network Issues**
   - Implement retries and circuit breakers
   - Use proper timeouts
   - Monitor network metrics
   - Configure proper DNS settings

3. **Storage Problems**
   - Use appropriate storage classes
   - Monitor storage usage
   - Implement backup strategies
   - Handle storage scaling

## Real-world Example

Complete production-ready application deployment:

```yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: production-app
  labels:
    app: production-app
spec:
  replicas: 3
  strategy:
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: production-app
  template:
    metadata:
      labels:
        app: production-app
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - production-app
            topologyKey: kubernetes.io/hostname
      containers:
      - name: app
        image: myapp:1.0
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            drop:
            - ALL
          readOnlyRootFilesystem: true
        livenessProbe:
          httpGet:
            path: /live
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 20
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: config
          mountPath: /config
      volumes:
      - name: tmp
        emptyDir: {}
      - name: config
        configMap:
          name: app-config
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: production-app-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: production-app
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: production-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: production-app
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: production-app-network
spec:
  podSelector:
    matchLabels:
      app: production-app
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          environment: production
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          environment: production
    ports:
    - protocol: TCP
      port: 5432
```

## Conclusion

Running Kubernetes in production requires careful attention to detail and following established best practices. Key takeaways from my experience:

- Implement proper resource management
- Ensure high availability
- Follow security best practices
- Set up comprehensive monitoring
- Plan for disaster recovery
- Optimize costs effectively

This concludes our Kubernetes series. I hope these articles have provided you with practical insights for running Kubernetes effectively in production. Remember that Kubernetes is constantly evolving, so keep learning and adapting your practices as the technology advances.

## Additional Resources

- [Kubernetes Production Best Practices](https://kubernetes.io/docs/setup/best-practices/)
- [Cloud Native Trail Map](https://landscape.cncf.io/)
- [Kubernetes Failure Stories](https://k8s.af/)
- [SIG Scalability](https://github.com/kubernetes/community/tree/master/sig-scalability)
