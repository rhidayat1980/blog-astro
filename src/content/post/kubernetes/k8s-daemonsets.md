---
title: "Kubernetes DaemonSets: Running Pods on Every Node"
description: "Complete guide to DaemonSets in Kubernetes, including use cases, configuration, and best practices"
publishDate: "11 Dec 2024"
tags: ["kubernetes", "k8s", "daemonsets", "devops", "cloud-native", "containers", "monitoring", "series:kubernetes:7"]
draft: false
---

## Understanding DaemonSets

DaemonSets ensure that all (or some) nodes run a copy of a Pod. As nodes are added to the cluster, Pods are added to them. As nodes are removed, those Pods are garbage collected.

## Common Use Cases

1. Node Monitoring
2. Log Collection
3. Network Plugins
4. Storage Daemons

## Basic DaemonSet Configuration

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentd-elasticsearch
  namespace: kube-system
  labels:
    k8s-app: fluentd-logging
spec:
  selector:
    matchLabels:
      name: fluentd-elasticsearch
  template:
    metadata:
      labels:
        name: fluentd-elasticsearch
    spec:
      tolerations:
      - key: node-role.kubernetes.io/master
        effect: NoSchedule
      containers:
      - name: fluentd-elasticsearch
        image: quay.io/fluentd_elasticsearch/fluentd:v2.5.2
        resources:
          limits:
            memory: 200Mi
          requests:
            cpu: 100m
            memory: 200Mi
        volumeMounts:
        - name: varlog
          mountPath: /var/log
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
```

## Node Selection

### Using Node Selectors

```yaml
spec:
  template:
    spec:
      nodeSelector:
        disk: ssd
```

### Using Node Affinity

```yaml
spec:
  template:
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: kubernetes.io/os
                operator: In
                values:
                - linux
```

## Example Use Cases

### 1. Network Plugin (Calico)

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: calico-node
  namespace: kube-system
spec:
  selector:
    matchLabels:
      k8s-app: calico-node
  template:
    metadata:
      labels:
        k8s-app: calico-node
    spec:
      containers:
      - name: calico-node
        image: calico/node:v3.20.0
        env:
        - name: DATASTORE_TYPE
          value: "kubernetes"
        securityContext:
          privileged: true
        volumeMounts:
        - name: lib-modules
          mountPath: /lib/modules
          readOnly: true
      volumes:
      - name: lib-modules
        hostPath:
          path: /lib/modules
```

### 2. Monitoring Agent (Prometheus Node Exporter)

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: node-exporter
  template:
    metadata:
      labels:
        app: node-exporter
    spec:
      hostNetwork: true
      containers:
      - name: node-exporter
        image: prom/node-exporter:v1.3.1
        args:
        - --path.procfs=/host/proc
        - --path.sysfs=/host/sys
        ports:
        - containerPort: 9100
          protocol: TCP
        volumeMounts:
        - name: proc
          mountPath: /host/proc
          readOnly: true
        - name: sys
          mountPath: /host/sys
          readOnly: true
      volumes:
      - name: proc
        hostPath:
          path: /proc
      - name: sys
        hostPath:
          path: /sys
```

### 3. Log Collection (Filebeat)

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: filebeat
  namespace: logging
spec:
  selector:
    matchLabels:
      app: filebeat
  template:
    metadata:
      labels:
        app: filebeat
    spec:
      containers:
      - name: filebeat
        image: docker.elastic.co/beats/filebeat:7.15.0
        args: [
          "-c", "/etc/filebeat.yml",
          "-e",
        ]
        volumeMounts:
        - name: config
          mountPath: /etc/filebeat.yml
          readOnly: true
          subPath: filebeat.yml
        - name: data
          mountPath: /usr/share/filebeat/data
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
      volumes:
      - name: config
        configMap:
          defaultMode: 0600
          name: filebeat-config
      - name: data
        hostPath:
          path: /var/lib/filebeat-data
          type: DirectoryOrCreate
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers
```

## Update Strategies

### Rolling Update

```yaml
spec:
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
```

### OnDelete

```yaml
spec:
  updateStrategy:
    type: OnDelete
```

## Resource Management

### Setting Resource Limits

```yaml
spec:
  template:
    spec:
      containers:
      - name: daemon-app
        resources:
          requests:
            cpu: 100m
            memory: 200Mi
          limits:
            cpu: 200m
            memory: 400Mi
```

## Security Considerations

### Pod Security Context

```yaml
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 2000
```

### Container Security Context

```yaml
spec:
  template:
    spec:
      containers:
      - name: daemon-app
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
```

## Best Practices

### 1. Resource Management
- Set appropriate resource requests and limits
- Monitor resource usage
- Use node selectors wisely
- Consider node capacity

### 2. Update Strategy
- Use rolling updates
- Set appropriate maxUnavailable
- Test updates thoroughly
- Plan for rollbacks

### 3. Security
- Run as non-root
- Use security contexts
- Implement RBAC
- Minimize privileges

### 4. Monitoring
- Monitor Pod health
- Track resource usage
- Set up alerts
- Monitor logs

## Troubleshooting

Common issues and solutions:

1. **Pods Not Scheduling**
   - Check node selectors
   - Verify tolerations
   - Review resource requests
   - Check node capacity

2. **Update Issues**
   - Verify update strategy
   - Check Pod health
   - Review logs
   - Monitor resources

3. **Resource Problems**
   - Adjust resource limits
   - Monitor usage
   - Check node capacity
   - Review scheduling

## Advanced Configurations

### Using Tolerations

```yaml
spec:
  template:
    spec:
      tolerations:
      - key: node-role.kubernetes.io/master
        effect: NoSchedule
      - key: node.kubernetes.io/disk-pressure
        operator: Exists
        effect: NoSchedule
```

### Init Containers

```yaml
spec:
  template:
    spec:
      initContainers:
      - name: init-ds
        image: busybox
        command: ['sh', '-c', 'until nslookup myservice; do echo waiting for myservice; sleep 2; done;']
```

## Series Navigation

- Previous: [Kubernetes StatefulSets](/posts/kubernetes/k8s-statefulsets)
- Next: [Jobs and CronJobs in Kubernetes](/posts/kubernetes/k8s-jobs-cronjobs)

## Conclusion

DaemonSets are essential for running system-level and monitoring applications across all nodes in a Kubernetes cluster. Understanding their configuration and best practices is crucial for maintaining cluster health and functionality.
