---
title: "Kubernetes Series - Part 2: Workload Management"
description: "Learn how to effectively manage applications in Kubernetes using Deployments, StatefulSets, and DaemonSets"
publishDate: 2024-01-16
tags: ["kubernetes", "containers", "devops", "cloud-native", "series:kubernetes:2"]
draft: false
---

## Series Navigation

- [Part 1: Core Fundamentals](/posts/kubernetes/01-fundamentals)
- **Part 2: Workload Management** (Current)
- [Part 3: Networking Essentials](/posts/kubernetes/03-networking)
- [Part 4: Storage and Persistence](/posts/kubernetes/04-storage)
- [Part 5: Configuration and Secrets](/posts/kubernetes/05-configuration)
- [Part 6: Security and Access Control](/posts/kubernetes/06-security)
- [Part 7: Observability](/posts/kubernetes/07-observability)
- [Part 8: Advanced Patterns](/posts/kubernetes/08-advanced-patterns)
- [Part 9: Production Best Practices](/posts/kubernetes/09-production)

## Introduction

After deploying hundreds of applications to Kubernetes, I've learned that choosing the right workload resource is crucial for application stability and maintainability. In this article, I'll share practical insights from my experience managing different types of workloads in production.

## Deployments

Deployments are the most common way to run stateless applications. Here's a production-ready example I use as a template:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  annotations:
    kubernetes.io/change-cause: "Update to v2.0.1"
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: web-app
        image: nginx:1.21
        ports:
        - containerPort: 80
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
        readinessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 15
          periodSeconds: 20
```

### Pro Tips for Deployments

1. **Rolling Update Strategy**
   - Use `maxUnavailable: 0` for zero-downtime updates
   - Set appropriate `maxSurge` based on resource availability
   - Always include change-cause annotations for rollback reference

2. **Resource Management**
   - Start with conservative resource requests
   - Monitor actual usage and adjust accordingly
   - Use vertical pod autoscaling for optimization

3. **Health Checks**
   - Implement both readiness and liveness probes
   - Set appropriate timeouts and periods
   - Use different endpoints for different health checks

## StatefulSets

For stateful applications like databases, StatefulSets are essential. Here's a real-world example from our production environment:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres
  replicas: 3
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:14
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secrets
              key: password
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 10Gi
```

### StatefulSet Best Practices

1. **Data Management**
   - Always use persistent volumes
   - Implement proper backup strategies
   - Test restore procedures regularly

2. **Scaling Considerations**
   - Plan for data rebalancing when scaling
   - Use pod disruption budgets
   - Implement proper leader election

## DaemonSets

DaemonSets are perfect for cluster-wide operations. Here's how we deploy our monitoring agents:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: monitoring-agent
spec:
  selector:
    matchLabels:
      name: monitoring-agent
  template:
    metadata:
      labels:
        name: monitoring-agent
    spec:
      tolerations:
      - key: node-role.kubernetes.io/master
        effect: NoSchedule
      containers:
      - name: agent
        image: datadog/agent:latest
        resources:
          limits:
            memory: 512Mi
          requests:
            memory: 256Mi
        volumeMounts:
        - name: dockersocket
          mountPath: /var/run/docker.sock
        - name: proc
          mountPath: /host/proc
          readOnly: true
        - name: cgroup
          mountPath: /host/sys/fs/cgroup
          readOnly: true
      volumes:
      - name: dockersocket
        hostPath:
          path: /var/run/docker.sock
      - name: proc
        hostPath:
          path: /proc
      - name: cgroup
        hostPath:
          path: /sys/fs/cgroup
```

### DaemonSet Tips

1. **Resource Management**
   - Be careful with resource requests
   - Monitor impact on node resources
   - Use node selectors when needed

2. **Security Considerations**
   - Limit host access
   - Use security contexts
   - Implement proper RBAC

## Jobs and CronJobs

For batch processing and scheduled tasks:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup-job
spec:
  schedule: "0 2 * * *"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: backup-tool:latest
            env:
            - name: BACKUP_DIR
              value: /backup
          restartPolicy: OnFailure
```

### Job Best Practices

1. **Scheduling**
   - Use appropriate concurrency policies
   - Set history limits
   - Monitor job completion times

2. **Error Handling**
   - Implement proper retry logic
   - Set appropriate backoff limits
   - Monitor failed jobs

## Common Pitfalls

From my experience, here are common issues to watch out for:

1. **Resource Contention**
   - Improper resource requests/limits
   - Not using pod disruption budgets
   - Insufficient node resources

2. **Update Strategies**
   - Too aggressive rolling updates
   - Not testing rollback procedures
   - Improper health check configuration

3. **State Management**
   - Not backing up StatefulSet data
   - Improper volume management
   - Not handling pod termination properly

## Production Checklist

✅ **Deployment Configuration**

- [ ] Resource requests and limits
- [ ] Proper health checks
- [ ] Update strategy configuration
- [ ] Pod disruption budgets

✅ **State Management**

- [ ] Persistent volume configuration
- [ ] Backup procedures
- [ ] Data migration strategy
- [ ] Leader election (if needed)

✅ **Monitoring**

- [ ] Resource utilization
- [ ] Application metrics
- [ ] Health check status
- [ ] Update success rate

## Conclusion

Proper workload management is crucial for running applications successfully in Kubernetes. Through my experience, I've learned that:

- Choose the right workload type for your application
- Always implement proper health checks
- Monitor resource usage and adjust accordingly
- Plan for scaling and updates
- Test failure scenarios

In the next part, we'll dive into Kubernetes networking, where I'll share practical tips for service discovery and load balancing.

## Additional Resources

- [Kubernetes Workloads Documentation](https://kubernetes.io/docs/concepts/workloads/)
- [Production-Ready Microservices](https://www.oreilly.com/library/view/production-ready-microservices/9781491965962/)
- [Kubernetes Patterns](https://www.redhat.com/cms/managed-files/cm-oreilly-kubernetes-patterns-ebook-f19824-201910-en.pdf)
