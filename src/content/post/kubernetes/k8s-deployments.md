---
title: "Managing Application Updates with Kubernetes Deployments"
description: "Deep dive into Kubernetes Deployments, including configuration, strategies, scaling, and best practices"
publishDate: "11 Dec 2024"
tags: ["kubernetes", "k8s", "deployments", "devops", "cloud-native", "containers", "series:kubernetes:5"]
draft: false
---

## Understanding Kubernetes Deployments

A Deployment provides declarative updates for Pods and ReplicaSets, making it the preferred way to manage stateless applications in Kubernetes.

## Basic Deployment Configuration

### Simple Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.14.2
        ports:
        - containerPort: 80
```

## Deployment Strategies

### 1. Rolling Update (Default)

```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 25%
      maxUnavailable: 25%
```

### 2. Recreate Strategy

```yaml
spec:
  strategy:
    type: Recreate
```

## Scaling Deployments

### Manual Scaling

```yaml
spec:
  replicas: 5
```

### Horizontal Pod Autoscaling

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: nginx-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nginx-deployment
  minReplicas: 1
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 50
```

## Health Checks

### Liveness Probe

```yaml
spec:
  template:
    spec:
      containers:
      - name: nginx
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 3
          periodSeconds: 3
```

### Readiness Probe

```yaml
spec:
  template:
    spec:
      containers:
      - name: nginx
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

## Resource Management

### Resource Requests and Limits

```yaml
spec:
  template:
    spec:
      containers:
      - name: nginx
        resources:
          requests:
            memory: "64Mi"
            cpu: "250m"
          limits:
            memory: "128Mi"
            cpu: "500m"
```

## Update Strategies

### Progressive Updates

```yaml
spec:
  progressDeadlineSeconds: 600
  minReadySeconds: 5
  revisionHistoryLimit: 10
```

### Rollback Configuration

```yaml
spec:
  revisionHistoryLimit: 10
```

## Labels and Selectors

### Using Multiple Labels

```yaml
metadata:
  labels:
    app: nginx
    environment: production
    tier: frontend
spec:
  selector:
    matchLabels:
      app: nginx
      tier: frontend
```

## Pod Disruption Budget

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: nginx-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: nginx
```

## Best Practices

### 1. Resource Management
- Always set resource requests and limits
- Use horizontal pod autoscaling
- Implement pod disruption budgets

### 2. Health Checks
- Configure both liveness and readiness probes
- Set appropriate timing parameters
- Use appropriate probe types

### 3. Update Strategy
- Use rolling updates when possible
- Set appropriate surge and unavailable parameters
- Maintain revision history

### 4. Labels and Annotations
- Use meaningful labels
- Implement proper label hierarchy
- Document with annotations

## Troubleshooting

Common issues and solutions:

1. **Failed Rollouts**
   - Check events
   - Review pod logs
   - Verify image availability
   - Check resource constraints

2. **Scaling Issues**
   - Verify HPA configuration
   - Check metrics availability
   - Review resource usage
   - Check cluster capacity

3. **Health Check Failures**
   - Verify probe endpoints
   - Check timing parameters
   - Review container logs
   - Test endpoints manually

## Deployment Commands

### Common kubectl Commands

```bash
# Create deployment
kubectl create deployment nginx --image=nginx

# Scale deployment
kubectl scale deployment nginx --replicas=5

# Update image
kubectl set image deployment/nginx nginx=nginx:1.16.1

# Roll back deployment
kubectl rollout undo deployment/nginx

# Check rollout status
kubectl rollout status deployment/nginx

# View rollout history
kubectl rollout history deployment/nginx
```

## Advanced Configurations

### Init Containers

```yaml
spec:
  template:
    spec:
      initContainers:
      - name: init-myservice
        image: busybox:1.28
        command: ['sh', '-c', 'until nslookup myservice; do echo waiting for myservice; sleep 2; done;']
```

### Volume Mounts

```yaml
spec:
  template:
    spec:
      containers:
      - name: nginx
        volumeMounts:
        - name: config-volume
          mountPath: /etc/nginx/conf.d
      volumes:
      - name: config-volume
        configMap:
          name: nginx-config
```

## Series Navigation

- Previous: [Kubernetes Security](/posts/kubernetes/k8s-security)
- Next: [Kubernetes StatefulSets](/posts/kubernetes/k8s-statefulsets)

## Conclusion

Kubernetes Deployments are a powerful way to manage application lifecycles. Understanding their features and best practices is crucial for successful application deployment and management.
