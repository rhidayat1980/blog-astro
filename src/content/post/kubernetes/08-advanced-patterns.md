---
title: "Kubernetes Series - Part 8: Advanced Patterns"
description: "Master advanced Kubernetes patterns including operators, custom controllers, and sophisticated deployment strategies"
publishDate: 2024-01-28
tags: ["kubernetes", "patterns", "operators", "controllers", "series:kubernetes:8"]
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
- **Part 8: Advanced Patterns** (Current)
- [Part 9: Production Best Practices](/posts/kubernetes/09-production)

## Introduction

After years of managing complex Kubernetes deployments, I've learned that mastering advanced patterns is crucial for building robust, scalable systems. In this article, I'll share practical implementations of sophisticated Kubernetes patterns I've successfully used in production.

## Custom Controllers and Operators

Here's a practical example of a custom controller in Go:

```go
package controller

import (
    "context"
    "fmt"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/tools/cache"
    "k8s.io/client-go/util/workqueue"
)

type Controller struct {
    clientset    kubernetes.Interface
    queue        workqueue.RateLimitingInterface
    informer     cache.SharedIndexInformer
}

func NewController(clientset kubernetes.Interface) *Controller {
    queue := workqueue.NewRateLimitingQueue(workqueue.DefaultControllerRateLimiter())
    
    informer := cache.NewSharedIndexInformer(
        &cache.ListWatch{
            ListFunc: func(options metav1.ListOptions) (runtime.Object, error) {
                return clientset.CoreV1().Pods("").List(context.TODO(), options)
            },
            WatchFunc: func(options metav1.ListOptions) (watch.Interface, error) {
                return clientset.CoreV1().Pods("").Watch(context.TODO(), options)
            },
        },
        &v1.Pod{},
        0,
        cache.Indexers{},
    )

    return &Controller{
        clientset: clientset,
        queue:     queue,
        informer:  informer,
    }
}

func (c *Controller) Run(stopCh <-chan struct{}) {
    defer c.queue.ShutDown()

    go c.informer.Run(stopCh)

    if !cache.WaitForCacheSync(stopCh, c.informer.HasSynced) {
        return
    }

    go wait.Until(c.runWorker, time.Second, stopCh)
    <-stopCh
}
```

### Custom Resource Definition (CRD)

Example of a custom resource for database management:

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: databases.example.com
spec:
  group: example.com
  versions:
    - name: v1
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                engine:
                  type: string
                  enum: ["postgres", "mysql"]
                version:
                  type: string
                storage:
                  type: string
                replicas:
                  type: integer
                  minimum: 1
                backup:
                  type: object
                  properties:
                    schedule:
                      type: string
                    retention:
                      type: string
  scope: Namespaced
  names:
    plural: databases
    singular: database
    kind: Database
    shortNames:
    - db
```

## Advanced Deployment Patterns

### Blue-Green Deployment

Implementation using service selectors:

```yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-blue
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
      version: blue
  template:
    metadata:
      labels:
        app: myapp
        version: blue
    spec:
      containers:
      - name: app
        image: myapp:1.0
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-green
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
      version: green
  template:
    metadata:
      labels:
        app: myapp
        version: green
    spec:
      containers:
      - name: app
        image: myapp:2.0
---
apiVersion: v1
kind: Service
metadata:
  name: app-service
spec:
  selector:
    app: myapp
    version: blue  # Switch to green for cutover
  ports:
  - port: 80
    targetPort: 8080
```

### Canary Deployment

Using Istio for traffic splitting:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: app-route
spec:
  hosts:
  - app.example.com
  http:
  - route:
    - destination:
        host: app-service
        subset: stable
      weight: 90
    - destination:
        host: app-service
        subset: canary
      weight: 10
---
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: app-destination
spec:
  host: app-service
  subsets:
  - name: stable
    labels:
      version: v1
  - name: canary
    labels:
      version: v2
```

## Sidecar Pattern

Example of a logging sidecar:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-with-sidecar
spec:
  template:
    spec:
      containers:
      - name: app
        image: myapp:1.0
        volumeMounts:
        - name: logs
          mountPath: /var/log/app
      - name: log-shipper
        image: fluent/fluent-bit:1.9
        volumeMounts:
        - name: logs
          mountPath: /var/log/app
        - name: fluent-bit-config
          mountPath: /fluent-bit/etc/
      volumes:
      - name: logs
        emptyDir: {}
      - name: fluent-bit-config
        configMap:
          name: fluent-bit-config
```

## Ambassador Pattern

Implementation for API rate limiting:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-with-ambassador
spec:
  template:
    spec:
      containers:
      - name: app
        image: myapp:1.0
      - name: rate-limiter
        image: envoyproxy/envoy:v1.22
        ports:
        - containerPort: 9901
        - containerPort: 10000
        volumeMounts:
        - name: envoy-config
          mountPath: /etc/envoy
      volumes:
      - name: envoy-config
        configMap:
          name: envoy-config
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: envoy-config
data:
  envoy.yaml: |
    static_resources:
      listeners:
      - address:
          socket_address:
            address: 0.0.0.0
            port_value: 10000
        filter_chains:
        - filters:
          - name: envoy.filters.network.http_connection_manager
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
              stat_prefix: ingress_http
              route_config:
                name: local_route
                virtual_hosts:
                - name: backend
                  domains:
                  - "*"
                  routes:
                  - match:
                      prefix: "/"
                    route:
                      cluster: local_service
              http_filters:
              - name: envoy.filters.http.ratelimit
                typed_config:
                  "@type": type.googleapis.com/envoy.extensions.filters.http.ratelimit.v3.RateLimit
                  domain: myapp
                  rate_limit_service:
                    grpc_service:
                      envoy_grpc:
                        cluster_name: rate_limit_service
              - name: envoy.filters.http.router
                typed_config:
                  "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
```

## Event-Driven Patterns

### Using KEDA for Event-Driven Autoscaling:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: kafka-scaledobject
spec:
  scaleTargetRef:
    name: consumer-deployment
  triggers:
  - type: kafka
    metadata:
      bootstrapServers: kafka.default.svc:9092
      consumerGroup: my-group
      topic: events
      lagThreshold: "50"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: consumer-deployment
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: consumer
        image: consumer:1.0
```

## Multi-Cluster Patterns

### Federation Configuration:

```yaml
apiVersion: core.kubefed.io/v1beta1
kind: KubeFedConfig
metadata:
  name: kubefed
  namespace: kube-federation-system
spec:
  scope: Namespaced
  controllerDuration:
    availableDelay: 20s
    unavailableDelay: 60s
  leaderElect:
    resourceLock: configmaps
    retryPeriod: 3s
    leaseDuration: 15s
    renewDeadline: 10s
---
apiVersion: types.kubefed.io/v1beta1
kind: FederatedDeployment
metadata:
  name: test-deployment
  namespace: test-namespace
spec:
  template:
    metadata:
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
          - image: nginx:1.17
            name: nginx
  placement:
    clusters:
    - name: cluster1
    - name: cluster2
  overrides:
  - clusterName: cluster2
    clusterOverrides:
    - path: "/spec/replicas"
      value: 5
```

## Production Checklist

✅ **Custom Controllers**

- [ ] Error handling
- [ ] Rate limiting
- [ ] Resource cleanup
- [ ] Proper logging

✅ **Deployment Patterns**

- [ ] Rollback strategy
- [ ] Health checks
- [ ] Traffic management
- [ ] Monitoring

✅ **Sidecars**

- [ ] Resource limits
- [ ] Lifecycle management
- [ ] Inter-container communication
- [ ] Security context

✅ **Multi-Cluster**

- [ ] Network connectivity
- [ ] Service discovery
- [ ] Data consistency
- [ ] Disaster recovery

## Common Challenges and Solutions

1. **State Management**
   - Use StatefulSets for ordered deployment
   - Implement proper backup strategies
   - Handle data migration carefully

2. **Resource Optimization**
   - Implement proper resource requests/limits
   - Use horizontal pod autoscaling
   - Monitor resource usage

3. **Networking**
   - Implement service mesh
   - Configure proper network policies
   - Handle cross-cluster communication

## Real-world Example

Complete implementation of a resilient microservice:

```yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: resilient-service
spec:
  replicas: 3
  strategy:
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    spec:
      containers:
      - name: app
        image: myapp:1.0
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 200m
            memory: 512Mi
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /live
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 20
      - name: proxy
        image: envoyproxy/envoy:v1.22
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 100m
            memory: 128Mi
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: resilient-service-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: resilient-service
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: resilient-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: resilient-service
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Conclusion

Advanced Kubernetes patterns are essential for building resilient, scalable applications. Key takeaways from my experience:

- Use custom controllers for complex orchestration
- Implement sophisticated deployment strategies
- Leverage sidecars for cross-cutting concerns
- Consider multi-cluster architectures for high availability

In the next part, we'll explore production best practices, where I'll share crucial insights for running Kubernetes at scale.

## Additional Resources

- [Kubernetes Operator Framework](https://operatorframework.io/)
- [Istio Service Mesh](https://istio.io/docs/)
- [KEDA Documentation](https://keda.sh/docs/)
- [KubeFed Documentation](https://github.com/kubernetes-sigs/kubefed)
