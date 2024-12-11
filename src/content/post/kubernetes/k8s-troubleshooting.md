---
title: "Kubernetes Troubleshooting Guide"
description: "Comprehensive guide to debugging and troubleshooting Kubernetes clusters and applications"
publishDate: "11 Dec 2024"
tags: ["kubernetes", "k8s", "troubleshooting", "debugging", "devops", "cloud-native", "containers", "series:kubernetes:20"]
draft: false
---

## Understanding Kubernetes Troubleshooting

Effective Kubernetes troubleshooting requires understanding of the architecture, components, and common failure points. This guide covers systematic approaches to identifying and resolving issues.

## Cluster Health

### 1. Node Status

```bash
# Check node status
kubectl get nodes
kubectl describe node <node-name>

# Check node conditions
kubectl get nodes -o custom-columns=NAME:.metadata.name,STATUS:.status.conditions[?(@.type=="Ready")].status
```

### 2. Control Plane Components

```bash
# Check control plane pods
kubectl get pods -n kube-system
kubectl describe pod <pod-name> -n kube-system

# Check component status
kubectl get componentstatuses
```

## Pod Issues

### 1. Pod Lifecycle

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: debug-pod
spec:
  containers:
  - name: main
    image: busybox
    command: ['sh', '-c', 'echo "Started"; sleep 3600']
  initContainers:
  - name: init
    image: busybox
    command: ['sh', '-c', 'echo "Init complete"']
```

### 2. Common Pod States

```bash
# Check pod status
kubectl get pods -o wide
kubectl describe pod <pod-name>

# Check pod logs
kubectl logs <pod-name> [-c container-name]
kubectl logs <pod-name> -p # Previous container logs

# Debug with ephemeral container
kubectl debug -it <pod-name> --image=busybox --target=<container-name>
```

## Networking Issues

### 1. Service Connectivity

```yaml
apiVersion: v1
kind: Service
metadata:
  name: debug-service
spec:
  selector:
    app: debug
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
```

### 2. Network Policy Debugging

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: debug-policy
spec:
  podSelector:
    matchLabels:
      app: debug
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          role: frontend
    ports:
    - protocol: TCP
      port: 80
```

## Storage Issues

### 1. PersistentVolume Problems

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: debug-pv
spec:
  capacity:
    storage: 1Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: standard
  hostPath:
    path: /tmp/data
```

### 2. Storage Class Issues

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: debug-storage
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp2
reclaimPolicy: Retain
allowVolumeExpansion: true
```

## Resource Management

### 1. Resource Constraints

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: resource-debug
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

### 2. Resource Quotas

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 4Gi
    limits.cpu: "8"
    limits.memory: 8Gi
```

## Security Issues

### 1. RBAC Debugging

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
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
subjects:
- kind: ServiceAccount
  name: default
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

### 2. Security Context

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: security-debug
spec:
  securityContext:
    runAsUser: 1000
    runAsGroup: 3000
    fsGroup: 2000
  containers:
  - name: sec-ctx-demo
    image: busybox
    command: [ "sh", "-c", "sleep 1h" ]
    securityContext:
      allowPrivilegeEscalation: false
```

## Logging and Monitoring

### 1. Logging Configuration

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: logging-pod
spec:
  containers:
  - name: counter
    image: busybox
    args: [/bin/sh, -c, 'i=0; while true; do echo "$i: $(date)"; i=$((i+1)); sleep 1; done']
```

### 2. Prometheus Monitoring

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: app-monitor
spec:
  selector:
    matchLabels:
      app: myapp
  endpoints:
  - port: metrics
```

## Performance Issues

### 1. CPU Profiling

```bash
# Using cAdvisor
kubectl proxy &
curl http://localhost:8001/api/v1/nodes/<node-name>/proxy/debug/pprof/profile > cpu.profile

# Using custom profiling
kubectl exec <pod-name> -- curl http://localhost:6060/debug/pprof/profile > cpu.profile
```

### 2. Memory Analysis

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: memory-debug
spec:
  containers:
  - name: memory-hog
    image: k8s.gcr.io/stress:v1
    args:
    - -mem-total
    - "1024Mi"
    - -mem-alloc-size
    - "100Mi"
    - -mem-alloc-sleep
    - "1s"
```

## Debugging Tools

### 1. Debug Container

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: debug-tools
spec:
  containers:
  - name: debug
    image: nicolaka/netshoot
    command:
    - sleep
    - "3600"
```

### 2. Network Debugging

```bash
# Network connectivity test
kubectl run test-dns --image=busybox:1.28 --rm -it -- nslookup kubernetes.default

# Port forward for debugging
kubectl port-forward service/my-service 8080:80

# Network policy testing
kubectl run test-netpol --image=busybox --rm -it -- wget -qO- http://service-name
```

## Common Troubleshooting Patterns

### 1. Pod Crash Loop

```bash
# Check pod status
kubectl get pod <pod-name> -o yaml
kubectl logs <pod-name> --previous

# Check events
kubectl get events --sort-by=.metadata.creationTimestamp
```

### 2. Service Discovery Issues

```bash
# Debug DNS
kubectl run dns-test --image=busybox:1.28 --rm -it -- nslookup kubernetes.default

# Check endpoints
kubectl get endpoints <service-name>

# Test service connectivity
kubectl run curl --image=curlimages/curl --rm -it -- curl http://service-name
```

## Best Practices

1. Use Descriptive Pod Names
2. Implement Proper Logging
3. Set Resource Limits
4. Use Liveness and Readiness Probes
5. Implement Monitoring
6. Regular Audit of RBAC
7. Keep Documentation Updated

## Conclusion

Effective troubleshooting in Kubernetes requires a systematic approach and understanding of various components. This guide provides a foundation for identifying and resolving common issues in Kubernetes clusters.

## Series Navigation
- Previous: [Kubernetes Backup and Recovery](/posts/kubernetes/k8s-backup-recovery)
- Series Complete! Start from [Introduction to Kubernetes](/posts/kubernetes/introduction-to-k8s)
