---
title: "Resource Management in Kubernetes"
description: "Comprehensive guide to managing CPU, Memory, and Quality of Service (QoS) in Kubernetes"
publishDate: "11 Dec 2024"
tags: ["kubernetes", "k8s", "resources", "cpu", "memory", "qos", "devops", "cloud-native", "containers", "series:kubernetes:14"]
draft: false
---

## Understanding Kubernetes Resource Management

Resource management is crucial for maintaining a healthy and efficient Kubernetes cluster. This guide covers CPU, Memory, and Quality of Service (QoS) management.

## Resource Requests and Limits

### CPU Resources

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: cpu-demo
spec:
  containers:
  - name: cpu-demo
    image: nginx
    resources:
      requests:
        cpu: "500m"      # 500 milliCPU (0.5 CPU)
      limits:
        cpu: "1000m"     # 1000 milliCPU (1 CPU)
```

CPU is a compressible resource:

- Requests guarantee minimum CPU
- Limits cap maximum CPU usage
- Values can be in cores (1) or millicores (1000m)

### Memory Resources

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: memory-demo
spec:
  containers:
  - name: memory-demo
    image: nginx
    resources:
      requests:
        memory: "64Mi"   # 64 Mebibytes
      limits:
        memory: "128Mi"  # 128 Mebibytes
```

Memory is a non-compressible resource:

- Requests guarantee minimum memory
- Limits enforce hard memory constraints
- Pod is killed if it exceeds memory limits

## Quality of Service (QoS) Classes

### 1. Guaranteed QoS

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: guaranteed-pod
spec:
  containers:
  - name: guaranteed
    image: nginx
    resources:
      requests:
        memory: "128Mi"
        cpu: "500m"
      limits:
        memory: "128Mi"
        cpu: "500m"
```

Characteristics:

- Requests equal limits for all resources
- Highest priority
- Last to be evicted

### 2. Burstable QoS

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: burstable-pod
spec:
  containers:
  - name: burstable
    image: nginx
    resources:
      requests:
        memory: "64Mi"
        cpu: "250m"
      limits:
        memory: "128Mi"
        cpu: "500m"
```

Characteristics:

- At least one container has requests < limits
- Medium priority
- Evicted after BestEffort pods

### 3. BestEffort QoS

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: besteffort-pod
spec:
  containers:
  - name: besteffort
    image: nginx
```

Characteristics:

- No resource requests or limits defined
- Lowest priority
- First to be evicted

## Resource Quotas

### Namespace Resource Quota

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  namespace: my-namespace
spec:
  hard:
    requests.cpu: "4"
    requests.memory: "4Gi"
    limits.cpu: "8"
    limits.memory: "8Gi"
    pods: "10"
```

### LimitRange for Defaults

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
spec:
  limits:
  - type: Container
    default:
      cpu: "500m"
      memory: "256Mi"
    defaultRequest:
      cpu: "250m"
      memory: "128Mi"
    max:
      cpu: "1"
      memory: "512Mi"
    min:
      cpu: "100m"
      memory: "64Mi"
```

## Best Practices

### 1. Setting Resource Requests

- Start with metrics from application profiling
- Consider peak and average usage
- Add buffer for unexpected spikes
- Monitor and adjust based on actual usage

### 2. Setting Resource Limits

- Set reasonable limits to prevent resource hogging
- Consider application behavior under resource constraints
- Test application behavior when hitting limits
- Balance resource utilization and stability

### 3. QoS Configuration

- Use Guaranteed QoS for critical workloads
- Use Burstable QoS for general workloads
- Use BestEffort only for non-critical batch jobs

### 4. Monitoring and Optimization

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
```

## Troubleshooting

### Common Issues

1. OOMKilled Containers

```bash
kubectl describe pod <pod-name>
kubectl logs <pod-name> --previous
```

2. CPU Throttling

```bash
kubectl top pod <pod-name>
kubectl describe pod <pod-name>
```

3. Evicted Pods

```bash
kubectl get events --field-selector reason=Evicted
```

### Resource Metrics

```bash
# Pod resource usage
kubectl top pod

# Node resource usage
kubectl top node

# Detailed pod metrics
kubectl describe pod <pod-name>
```

## Conclusion

Proper resource management is essential for running efficient and reliable workloads in Kubernetes. Understanding and implementing appropriate resource requests, limits, and QoS classes ensures optimal cluster utilization and application performance.

## Series Navigation
- Previous: [CI/CD with Kubernetes](/posts/kubernetes/k8s-cicd)
- Next: [Kubernetes Autoscaling](/posts/kubernetes/k8s-autoscaling)
