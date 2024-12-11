---
title: "Autoscaling in Kubernetes"
description: "Complete guide to Horizontal Pod Autoscaling (HPA), Vertical Pod Autoscaling (VPA), and Cluster Autoscaling"
publishDate: "11 Dec 2024"
tags: ["kubernetes", "k8s", "autoscaling", "hpa", "vpa", "devops", "cloud-native", "containers", "series:kubernetes:15"]
draft: false
---

## Understanding Kubernetes Autoscaling

Kubernetes provides three types of autoscaling:

1. Horizontal Pod Autoscaling (HPA)
2. Vertical Pod Autoscaling (VPA)
3. Cluster Autoscaling (CA)

## Horizontal Pod Autoscaling (HPA)

### Basic HPA Configuration

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: nginx-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nginx
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 50
```

### Advanced HPA Configurations

#### Multiple Metrics

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: multi-metric-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: app
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 50
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 70
  - type: Pods
    pods:
      metric:
        name: packets-per-second
      target:
        type: AverageValue
        averageValue: 1k
```

#### Custom Metrics

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: custom-metric-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: app
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Object
    object:
      metric:
        name: requests-per-second
      describedObject:
        apiVersion: networking.k8s.io/v1
        kind: Ingress
        name: main-ingress
      target:
        type: Value
        value: 100
```

## Vertical Pod Autoscaling (VPA)

### VPA Installation

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: metrics-server
  namespace: kube-system
spec:
  selector:
    matchLabels:
      k8s-app: metrics-server
  template:
    metadata:
      labels:
        k8s-app: metrics-server
    spec:
      containers:
      - name: metrics-server
        image: k8s.gcr.io/metrics-server/metrics-server:v0.6.1
```

### Basic VPA Configuration

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

### VPA Modes

1. Auto Mode

```yaml
updatePolicy:
  updateMode: "Auto"
```

1. Initial Mode

```yaml
updatePolicy:
  updateMode: "Initial"
```

1. Off Mode

```yaml
updatePolicy:
  updateMode: "Off"
```

## Cluster Autoscaling (CA)

### AWS EKS Configuration

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-config
  namespace: kube-system
data:
  config.yaml: |
    ---
    autoDiscovery:
      clusterName: my-eks-cluster
    awsRegion: us-west-2
    extraArgs:
      scale-down-delay-after-add: 10m
      scale-down-unneeded-time: 10m
      skip-nodes-with-system-pods: false
```

### GKE Configuration

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-config
  namespace: kube-system
data:
  config.yaml: |
    ---
    clusterName: my-gke-cluster
    cloudProvider: gce
    nodeGroups:
    - minSize: 1
      maxSize: 5
      name: default-pool
```

### AKS Configuration

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-config
  namespace: kube-system
data:
  config.yaml: |
    ---
    autoscalingGroups:
    - name: nodepool1
      minSize: 1
      maxSize: 5
```

## Best Practices

### 1. HPA Best Practices

- Set appropriate min/max replicas
- Choose metrics carefully
- Consider scaling behavior
- Monitor scaling events

### 2. VPA Best Practices

- Use appropriate update mode
- Set reasonable min/max limits
- Test with non-critical workloads first
- Monitor resource recommendations

### 3. CA Best Practices

- Configure scale-down delays
- Set appropriate node group sizes
- Monitor cluster utilization
- Consider cost implications

## Monitoring Autoscaling

### Prometheus Metrics

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: autoscaling-monitor
spec:
  selector:
    matchLabels:
      app: autoscaling-metrics
  endpoints:
  - port: metrics
```

### Grafana Dashboard

```yaml
apiVersion: integreatly.org/v1alpha1
kind: GrafanaDashboard
metadata:
  name: autoscaling-dashboard
spec:
  json: |
    {
      "title": "Autoscaling Metrics",
      "panels": [
        {
          "title": "HPA Metrics",
          "type": "graph"
        }
      ]
    }
```

## Troubleshooting

### Common Issues

1. HPA Not Scaling

```bash
kubectl describe hpa <hpa-name>
kubectl get --raw "/apis/metrics.k8s.io/v1beta1/pods"
```

2. VPA Issues

```bash
kubectl describe vpa <vpa-name>
kubectl logs -n kube-system vpa-recommender
```

3. CA Issues

```bash
kubectl logs -n kube-system cluster-autoscaler
kubectl describe nodes
```

## Conclusion

Implementing autoscaling in Kubernetes requires careful consideration of your application's requirements and behavior. Proper configuration of HPA, VPA, and CA ensures optimal resource utilization and cost efficiency.

## Series Navigation
- Previous: [Resource Management in Kubernetes](/posts/kubernetes/k8s-resource-management)
- Next: [Kubernetes Operators and CRDs](/posts/kubernetes/k8s-operators)
