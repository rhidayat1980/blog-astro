---
title: "Kubernetes Cost Optimization"
description: "Strategies and best practices for optimizing costs in Kubernetes clusters"
publishDate: "11 Dec 2024"
tags: ["kubernetes", "k8s", "cost-optimization", "resource-management", "devops", "cloud-native", "containers", "series:kubernetes:23"]
draft: false
---

## Understanding Kubernetes Costs

Cost optimization in Kubernetes involves managing resource allocation, scaling strategies, and infrastructure choices to maximize efficiency while minimizing expenses.

## Resource Optimization

### 1. Resource Requests and Limits

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: optimized-pod
spec:
  containers:
  - name: app
    image: nginx
    resources:
      requests:
        memory: "64Mi"
        cpu: "250m"
      limits:
        memory: "128Mi"
        cpu: "500m"
```

### 2. Vertical Pod Autoscaling

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: my-app-vpa
spec:
  targetRef:
    apiVersion: "apps/v1"
    kind: Deployment
    name: my-app
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: '*'
      minAllowed:
        cpu: "100m"
        memory: "50Mi"
      maxAllowed:
        cpu: "1"
        memory: "500Mi"
```

## Cluster Optimization

### 1. Node Pool Management

```yaml
apiVersion: v1
kind: Node
metadata:
  name: optimized-node
  labels:
    node-size: optimized
    workload-type: general
spec:
  taints:
  - key: workload-type
    value: general
    effect: NoSchedule
```

### 2. Pod Scheduling

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: cost-aware-pod
spec:
  nodeSelector:
    node-size: optimized
  tolerations:
  - key: workload-type
    operator: Equal
    value: general
    effect: NoSchedule
  containers:
  - name: app
    image: myapp:1.0
```

## Cost Monitoring

### 1. Prometheus Metrics

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: cost-metrics
spec:
  selector:
    matchLabels:
      app: cost-exporter
  endpoints:
  - port: metrics
    interval: 30s
  namespaceSelector:
    matchNames:
    - monitoring
```

### 2. Cost Allocation

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: team-a
  labels:
    cost-center: team-a
    department: engineering
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-a-quota
  namespace: team-a
spec:
  hard:
    requests.cpu: "4"
    requests.memory: "8Gi"
    pods: "20"
```

## Scaling Strategies

### 1. Horizontal Pod Autoscaling

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: cost-efficient-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  minReplicas: 1
  maxReplicas: 5
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
```

### 2. Cluster Autoscaling

```yaml
apiVersion: cluster.k8s.io/v1alpha1
kind: MachineDeployment
metadata:
  name: worker-nodes
spec:
  replicas: 3
  template:
    spec:
      providerSpec:
        value:
          instanceType: t3.medium
          diskSize: 50
      taints:
      - key: workload-type
        value: general
        effect: NoSchedule
```

## Storage Optimization

### 1. Storage Classes

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: optimized-storage
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
reclaimPolicy: Delete
allowVolumeExpansion: true
```

### 2. Volume Management

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: optimized-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: optimized-storage
  resources:
    requests:
      storage: 10Gi
```

## Cost Analysis Tools

### 1. Kubecost Configuration

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kubecost
spec:
  template:
    spec:
      containers:
      - name: cost-analyzer
        image: kubecost/cost-analyzer:latest
        env:
        - name: PROMETHEUS_SERVER_ENDPOINT
          value: http://prometheus:9090
        - name: CLOUD_PROVIDER_API_KEY
          valueFrom:
            secretKeyRef:
              name: cloud-secret
              key: api-key
```

### 2. Resource Reports

```yaml
apiVersion: cost.k8s.io/v1alpha1
kind: Report
metadata:
  name: monthly-cost-report
spec:
  timeframe:
    start: "2024-12-01"
    end: "2024-12-31"
  aggregateBy:
    - namespace
    - label:cost-center
  format: CSV
```

## Optimization Policies

### 1. Resource Quotas

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
spec:
  hard:
    requests.cpu: "4"
    requests.memory: "8Gi"
    limits.cpu: "8"
    limits.memory: "16Gi"
    pods: "20"
```

### 2. Limit Ranges

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
spec:
  limits:
  - default:
      cpu: "300m"
      memory: "256Mi"
    defaultRequest:
      cpu: "200m"
      memory: "128Mi"
    type: Container
```

## Best Practices

### 1. Node Affinity

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: cost-optimized
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: instance-type
            operator: In
            values:
            - spot
            - preemptible
```

### 2. Pod Disruption Budget

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: app-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: critical-app
```

## Monitoring and Alerts

### 1. Cost Alerts

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cost-alerts
spec:
  groups:
  - name: cost.rules
    rules:
    - alert: HighCostSpike
      expr: |
        sum(rate(container_cpu_usage_seconds_total[1h])) by (namespace)
        > 1000
      for: 1h
      labels:
        severity: warning
      annotations:
        summary: High cost detected in namespace
```

### 2. Resource Monitoring

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: resource-monitor
spec:
  selector:
    matchLabels:
      app: resource-metrics
  endpoints:
  - port: metrics
    interval: 30s
  namespaceSelector:
    matchNames:
    - monitoring
```

## Conclusion

Cost optimization in Kubernetes requires a comprehensive approach involving proper resource allocation, efficient scaling strategies, and continuous monitoring. By implementing these practices and regularly reviewing costs, organizations can maintain efficient and cost-effective Kubernetes clusters.

## Series Navigation

- Previous: [Kubernetes Policy Management](/posts/kubernetes/k8s-policy-management)
- Series Complete! Start from [Introduction to Kubernetes](/posts/kubernetes/introduction-to-k8s)
