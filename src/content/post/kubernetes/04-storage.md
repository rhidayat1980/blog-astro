---
title: "Kubernetes Series - Part 4: Storage and Persistence"
description: "Learn how to effectively manage persistent storage in Kubernetes using volumes, PVs, and PVCs"
publishDate: 2024-01-18
tags: ["kubernetes", "storage", "persistence", "cloud-native", "series:kubernetes:4"]
draft: false
---

## Series Navigation

- [Part 1: Core Fundamentals](/posts/kubernetes/01-fundamentals)
- [Part 2: Workload Management](/posts/kubernetes/02-workload-management)
- [Part 3: Networking Essentials](/posts/kubernetes/03-networking)
- **Part 4: Storage and Persistence** (Current)
- [Part 5: Configuration and Secrets](/posts/kubernetes/05-configuration)
- [Part 6: Security and Access Control](/posts/kubernetes/06-security)
- [Part 7: Observability](/posts/kubernetes/07-observability)
- [Part 8: Advanced Patterns](/posts/kubernetes/08-advanced-patterns)
- [Part 9: Production Best Practices](/posts/kubernetes/09-production)

## Introduction

After managing stateful applications in Kubernetes for several years, I've learned that proper storage configuration is crucial for data reliability and performance. In this article, I'll share practical insights from real-world experience managing persistent storage in production environments.

## Persistent Volumes

Here's a production-ready PV configuration we use with cloud providers:

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: data-volume
  labels:
    type: ssd
    environment: production
spec:
  capacity:
    storage: 100Gi
  volumeMode: Filesystem
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: fast-ssd
  csi:
    driver: ebs.csi.aws.com
    volumeHandle: vol-0123456789abcdef0
    fsType: ext4
    volumeAttributes:
      encrypted: "true"
```

### Storage Classes

We use different storage classes for different needs:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iopsPerGB: "3000"
  encrypted: "true"
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

### PV Best Practices

1. **Volume Types**
   - Use SSD for performance-critical workloads
   - Consider cost vs performance
   - Implement proper encryption

2. **Reclaim Policies**
   - Use Retain for important data
   - Implement backup strategies
   - Plan for disaster recovery

## Persistent Volume Claims

Here's how we request storage in our applications:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: database-data
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: fast-ssd
  resources:
    requests:
      storage: 100Gi
  selector:
    matchLabels:
      type: ssd
      environment: production
```

### PVC Tips from Production

1. **Sizing Considerations**
   - Start with conservative estimates
   - Monitor usage patterns
   - Plan for growth

   ```yaml
   resources:
     requests:
       storage: 100Gi
     limits:
       storage: 150Gi
   ```

2. **Access Modes**
   - Choose appropriate access mode
   - Consider multi-pod access needs
   - Plan for scaling

## Volume Snapshots

We use this for backup and migration:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: data-snapshot
spec:
  volumeSnapshotClassName: csi-aws-vsc
  source:
    persistentVolumeClaimName: database-data
```

### Snapshot Best Practices

1. **Backup Strategy**
   - Regular automated snapshots
   - Retention policy
   - Verification process

2. **Restoration Testing**
   - Regular restore tests
   - Document procedures
   - Automate where possible

## Dynamic Provisioning

Our dynamic provisioning setup:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: dynamic-ssd
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  encrypted: "true"
  kmsKeyId: arn:aws:kms:region:account:key/key-id
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

### Dynamic Provisioning Tips

1. **Storage Options**
   - Configure default storage class
   - Set appropriate parameters
   - Monitor provisioning status

2. **Cost Management**
   - Set storage limits
   - Monitor usage
   - Implement cleanup policies

## Volume Expansion

How we handle growing storage needs:

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
      storage: 100Gi
  storageClassName: expandable-storage
```

### Expansion Considerations

1. **Planning**
   - Monitor usage trends
   - Set up alerts
   - Plan for downtime if needed

2. **Implementation**
   - Test expansion procedures
   - Document steps
   - Monitor for errors

## Common Storage Issues

From my experience, here are frequent problems and solutions:

1. **Performance Issues**
   - Monitor IOPS
   - Check storage class settings
   - Verify network connectivity

2. **Capacity Problems**
   - Set up monitoring
   - Implement alerts
   - Plan for expansion

3. **Data Loss Prevention**
   - Regular backups
   - Snapshot strategy
   - Disaster recovery plan

## Production Checklist

✅ **Storage Configuration**

- [ ] Appropriate storage classes
- [ ] Backup configuration
- [ ] Monitoring setup
- [ ] Encryption enabled

✅ **Volume Management**

- [ ] Snapshot schedule
- [ ] Retention policy
- [ ] Restore procedures
- [ ] Expansion strategy

✅ **Performance**

- [ ] IOPS monitoring
- [ ] Latency tracking
- [ ] Resource utilization
- [ ] Alert configuration

✅ **Security**

- [ ] Encryption at rest
- [ ] Access controls
- [ ] Audit logging
- [ ] Compliance checks

## Real-world Example

Here's a complete example of a production database setup:

```yaml
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: fast-ssd
  resources:
    requests:
      storage: 100Gi
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres
  replicas: 1
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
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "2Gi"
            cpu: "1"
          limits:
            memory: "4Gi"
            cpu: "2"
      volumes:
      - name: postgres-data
        persistentVolumeClaim:
          claimName: postgres-data
```

## Conclusion

Proper storage management in Kubernetes requires careful planning and ongoing maintenance. Key takeaways from my experience:

- Choose appropriate storage classes
- Implement proper backup strategies
- Monitor performance and capacity
- Plan for growth and scaling
- Test disaster recovery regularly

In the next part, we'll explore configuration and secrets management, where I'll share practical tips for managing application configurations securely.

## Additional Resources

- [Kubernetes Storage Documentation](https://kubernetes.io/docs/concepts/storage/)
- [CSI Documentation](https://kubernetes-csi.github.io/docs/)
- [Storage Best Practices](https://kubernetes.io/docs/concepts/storage/storage-classes/#best-practices)
- [Volume Snapshot Documentation](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
