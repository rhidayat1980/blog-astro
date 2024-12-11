---
title: "Persistent Storage in Kubernetes"
description: "Complete guide to Persistent Volumes (PV) and Persistent Volume Claims (PVC) in Kubernetes, including storage classes and dynamic provisioning"
publishDate: "11 Dec 2024"
tags: ["kubernetes", "k8s", "storage", "persistent-volumes", "pv", "pvc", "devops", "cloud-native", "series:kubernetes:11"]
draft: false
---

## Understanding Persistent Volumes

Persistent Volumes (PV) provide a way to store data that persists beyond the lifecycle of a Pod. They are cluster resources that exist independently of Pods.

## Basic Concepts

### 1. Persistent Volume (PV)

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv-example
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: standard
  hostPath:
    path: /mnt/data
```

### 2. Persistent Volume Claim (PVC)

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: pvc-example
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
  storageClassName: standard
```

## Storage Classes

### Basic StorageClass

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: standard
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp2
reclaimPolicy: Delete
allowVolumeExpansion: true
```

### Cloud Provider Examples

#### 1. AWS EBS

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ebs-sc
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp3
  iopsPerGB: "10"
  encrypted: "true"
```

#### 2. Azure Disk

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: azure-disk
provisioner: kubernetes.io/azure-disk
parameters:
  storageaccounttype: Premium_LRS
  kind: Managed
```

#### 3. Google Persistent Disk

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gcp-pd
provisioner: kubernetes.io/gce-pd
parameters:
  type: pd-standard
  replication-type: none
```

## Access Modes

1. ReadWriteOnce (RWO)
2. ReadOnlyMany (ROX)
3. ReadWriteMany (RWX)

Example with multiple access modes:

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: multi-access-pv
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteOnce
    - ReadOnlyMany
  nfs:
    server: nfs-server.example.com
    path: "/share"
```

## Dynamic Provisioning

### StorageClass with Dynamic Provisioning

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp3
  encrypted: "true"
allowVolumeExpansion: true
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
```

### PVC Using Dynamic Provisioning

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: dynamic-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: fast
  resources:
    requests:
      storage: 100Gi
```

## Real-World Examples

### 1. Database Storage

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-data
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
  storageClassName: fast
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
spec:
  serviceName: mysql
  replicas: 1
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
        volumeMounts:
        - name: data
          mountPath: /var/lib/mysql
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: mysql-data
```

### 2. Shared File Storage

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: nfs-pv
spec:
  capacity:
    storage: 100Gi
  accessModes:
    - ReadWriteMany
  nfs:
    server: nfs-server.example.com
    path: "/shared"
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: nfs-pvc
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 100Gi
  volumeName: nfs-pv
```

## Volume Expansion

### Expanding PVC

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: expandable-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi  # Can be increased later
  storageClassName: expandable-sc
```

### StorageClass with Expansion

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: expandable-sc
provisioner: kubernetes.io/aws-ebs
allowVolumeExpansion: true
parameters:
  type: gp3
```

## Backup and Restore

### Volume Snapshot

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: data-snapshot
spec:
  volumeSnapshotClassName: csi-hostpath-snapclass
  source:
    persistentVolumeClaimName: data-pvc
```

### Restore from Snapshot

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: restore-pvc
spec:
  dataSource:
    name: data-snapshot
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

## Best Practices

### 1. Capacity Planning

- Right-size volumes
- Monitor usage
- Plan for growth
- Consider costs

### 2. Performance

- Choose appropriate storage class
- Monitor I/O metrics
- Consider workload requirements
- Use local storage when needed

### 3. Data Protection

- Regular backups
- Use snapshots
- Implement disaster recovery
- Test restore procedures

### 4. Security

- Encrypt data at rest
- Use appropriate access modes
- Implement RBAC
- Follow security policies

## Troubleshooting

Common issues and solutions:

1. **PVC Pending**
   - Check storage class
   - Verify capacity
   - Review access modes
   - Check provisioner status

2. **Volume Mount Issues**
   - Check permissions
   - Verify paths
   - Review mount options
   - Check node capacity

## Advanced Configurations

### Local Volumes

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: local-pv
spec:
  capacity:
    storage: 100Gi
  accessModes:
  - ReadWriteOnce
  persistentVolumeReclaimPolicy: Delete
  storageClassName: local-storage
  local:
    path: /mnt/disks/vol1
  nodeAffinity:
    required:
      nodeSelectorTerms:
      - matchExpressions:
        - key: kubernetes.io/hostname
          operator: In
          values:
          - node-1
```

### CSI Integration

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: csi-sc
provisioner: csi.example.com
parameters:
  csi.storage.k8s.io/provisioner-secret-name: csi-secret
  csi.storage.k8s.io/provisioner-secret-namespace: default
```

## Monitoring

### Prometheus Metrics

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: storage-monitor
spec:
  selector:
    matchLabels:
      app: storage-provider
  endpoints:
  - port: metrics
```

## Series Navigation

- Previous: [Kubernetes Services and Ingress](/posts/kubernetes/k8s-services-ingress)
- Next: [Monitoring Kubernetes Clusters](/posts/kubernetes/k8s-monitoring)

## Conclusion

Understanding Persistent Volumes is crucial for managing stateful applications in Kubernetes. Proper configuration and management of storage resources ensures data persistence and reliability in your applications.
