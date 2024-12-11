---
title: "Kubernetes StatefulSets: Managing Stateful Applications"
description: "Complete guide to using StatefulSets in Kubernetes for stateful applications like databases and message queues"
publishDate: "11 Dec 2024"
tags: ["kubernetes", "k8s", "statefulsets", "devops", "cloud-native", "containers", "databases", "series:kubernetes:6"]
draft: false
---

## Understanding StatefulSets

StatefulSets are workload objects designed to manage stateful applications, providing guarantees about the ordering and uniqueness of Pods.

## Key Features

1. Stable Network Identity
2. Ordered Pod Creation and Deletion
3. Stable Storage
4. Ordered Rolling Updates

## Basic StatefulSet Configuration

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: web
spec:
  serviceName: "nginx"
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
          name: web
        volumeMounts:
        - name: www
          mountPath: /usr/share/nginx/html
  volumeClaimTemplates:
  - metadata:
      name: www
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 1Gi
```

## Headless Service

Required for network identity:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx
  labels:
    app: nginx
spec:
  ports:
  - port: 80
    name: web
  clusterIP: None
  selector:
    app: nginx
```

## Use Cases

### 1. Databases

Example MySQL StatefulSet:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
spec:
  serviceName: mysql
  replicas: 3
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
      - name: mysql
        image: mysql:8.0
        env:
        - name: MYSQL_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mysql-secret
              key: password
        ports:
        - containerPort: 3306
          name: mysql
        volumeMounts:
        - name: data
          mountPath: /var/lib/mysql
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 10Gi
```

### 2. Message Queues

Example Kafka StatefulSet:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: kafka
spec:
  serviceName: kafka-headless
  replicas: 3
  selector:
    matchLabels:
      app: kafka
  template:
    metadata:
      labels:
        app: kafka
    spec:
      containers:
      - name: kafka
        image: confluentinc/cp-kafka:latest
        ports:
        - containerPort: 9092
          name: kafka
        volumeMounts:
        - name: data
          mountPath: /var/lib/kafka/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 10Gi
```

## Pod Identity

### Stable Network Identifiers

Each Pod gets a predictable hostname:
- `<statefulset-name>-0`
- `<statefulset-name>-1`
- `<statefulset-name>-2`

### DNS Entries

```
<pod-name>.<service-name>.<namespace>.svc.cluster.local
```

## Scaling Operations

### Manual Scaling

```bash
kubectl scale statefulset mysql --replicas=5
```

### Automated Scaling

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: mysql-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: mysql
  minReplicas: 3
  maxReplicas: 5
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 50
```

## Update Strategies

### Rolling Updates

```yaml
spec:
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      partition: 2
```

### OnDelete Strategy

```yaml
spec:
  updateStrategy:
    type: OnDelete
```

## Best Practices

### 1. Storage Management
- Use appropriate storage class
- Configure proper backup strategies
- Monitor storage usage
- Plan for scaling

### 2. Pod Management
- Set appropriate resource requests/limits
- Configure readiness/liveness probes
- Use pod disruption budgets
- Plan for maintenance

### 3. Networking
- Use headless services
- Configure proper DNS
- Plan for service discovery
- Monitor network connectivity

## Common Issues and Solutions

### 1. Pod Scheduling
- Check node resources
- Verify storage availability
- Review anti-affinity rules
- Check topology constraints

### 2. Volume Management
- Verify PVC binding
- Check storage provisioner
- Monitor volume status
- Review volume permissions

### 3. Network Identity
- Verify DNS resolution
- Check service configuration
- Review network policies
- Test connectivity

## Advanced Configurations

### Pod Anti-Affinity

```yaml
spec:
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
                - mysql
            topologyKey: "kubernetes.io/hostname"
```

### Init Containers

```yaml
spec:
  template:
    spec:
      initContainers:
      - name: init-mysql
        image: mysql:8.0
        command:
        - bash
        - "-c"
        - |
          set -ex
          # Generate mysql server-id from pod ordinal index.
          [[ `hostname` =~ -([0-9]+)$ ]] || exit 1
          ordinal=${BASH_REMATCH[1]}
          echo [mysqld] > /mnt/conf.d/server-id.cnf
          echo server-id=$((100 + $ordinal)) >> /mnt/conf.d/server-id.cnf
        volumeMounts:
        - name: conf
          mountPath: /mnt/conf.d
```

## Monitoring and Maintenance

### Prometheus Metrics

```yaml
spec:
  template:
    metadata:
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9104"
```

### Backup Strategies

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mysql-backup
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: mysql:8.0
            command:
            - /bin/sh
            - -c
            - |
              mysqldump -h mysql-0.mysql --all-databases > /backup/dump.sql
```

## Series Navigation
- Previous: [Managing Application Updates with Kubernetes Deployments](/posts/kubernetes/k8s-deployments)
- Next: [Kubernetes DaemonSets](/posts/kubernetes/k8s-daemonsets)

## Conclusion

StatefulSets are essential for running stateful applications in Kubernetes. Understanding their features and best practices is crucial for successful deployment and management of stateful workloads.
