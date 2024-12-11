---
title: "Kubernetes Backup and Recovery"
description: "Comprehensive guide to backing up and recovering Kubernetes clusters and applications"
publishDate: "11 Dec 2024"
tags: ["kubernetes", "k8s", "backup", "recovery", "disaster-recovery", "devops", "cloud-native", "containers", "series:kubernetes:19"]
draft: false
---

## Understanding Kubernetes Backup and Recovery

Kubernetes backup and recovery involves protecting both cluster state and application data to ensure business continuity and disaster recovery (BCDR).

## Cluster State Backup

### 1. etcd Backup

```bash
# Backup etcd
ETCDCTL_API=3 etcdctl snapshot save snapshot.db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key

# Verify backup
ETCDCTL_API=3 etcdctl snapshot status snapshot.db
```

### 2. Using Velero

```yaml
apiVersion: velero.io/v1
kind: Backup
metadata:
  name: daily-backup
  namespace: velero
spec:
  includedNamespaces:
  - "*"
  excludedNamespaces:
  - kube-system
  storageLocation: default
  volumeSnapshotLocations:
  - default
  schedule: "0 1 * * *"
  ttl: 720h
```

## Application Data Backup

### 1. Volume Snapshots

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

### 2. Custom Backup Jobs

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: db-backup
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: bitnami/mongodb:4.4
            command:
            - /bin/sh
            - -c
            - |
              mongodump --uri="mongodb://mongodb:27017" --out="/backup/$(date +%Y%m%d)"
            volumeMounts:
            - name: backup
              mountPath: /backup
          volumes:
          - name: backup
            persistentVolumeClaim:
              claimName: backup-pvc
          restartPolicy: OnFailure
```

## Disaster Recovery

### 1. etcd Recovery

```bash
# Stop the API server
systemctl stop kube-apiserver

# Restore etcd snapshot
ETCDCTL_API=3 etcdctl snapshot restore snapshot.db \
  --data-dir /var/lib/etcd-restore \
  --initial-cluster="master-1=https://192.168.1.10:2380" \
  --initial-advertise-peer-urls="https://192.168.1.10:2380" \
  --name=master-1

# Update etcd configuration
mv /var/lib/etcd /var/lib/etcd.bak
mv /var/lib/etcd-restore /var/lib/etcd

# Restart etcd and API server
systemctl restart etcd
systemctl start kube-apiserver
```

### 2. Using Velero for Recovery

```yaml
apiVersion: velero.io/v1
kind: Restore
metadata:
  name: restore-production
  namespace: velero
spec:
  backupName: daily-backup
  includedNamespaces:
  - "*"
  excludedNamespaces:
  - kube-system
  restorePVs: true
```

## Backup Strategies

### 1. Full Cluster Backup

```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: full-cluster-backup
  namespace: velero
spec:
  schedule: "0 0 * * *"
  template:
    includedNamespaces:
    - "*"
    includedResources:
    - "*"
    includeClusterResources: true
    storageLocation: default
    volumeSnapshotLocations:
    - default
    ttl: 720h
```

### 2. Selective Backup

```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: app-backup
  namespace: velero
spec:
  schedule: "0 1 * * *"
  template:
    labelSelector:
      matchLabels:
        app: critical
    includedNamespaces:
    - production
    excludedResources:
    - secrets
    storageLocation: default
    ttl: 168h
```

## Storage Providers

### 1. AWS S3 Configuration

```yaml
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: aws-backup
  namespace: velero
spec:
  provider: aws
  objectStorage:
    bucket: my-backup-bucket
  config:
    region: us-west-2
    profile: default
```

### 2. Azure Blob Storage

```yaml
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: azure-backup
  namespace: velero
spec:
  provider: azure
  objectStorage:
    bucket: my-backup-container
  config:
    resourceGroup: my-resource-group
    storageAccount: my-storage-account
```

## Monitoring and Alerts

### 1. Prometheus Rules

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: backup-alerts
  namespace: monitoring
spec:
  groups:
  - name: backup
    rules:
    - alert: BackupFailed
      expr: |
        velero_backup_failure_total > 0
      for: 1h
      labels:
        severity: critical
      annotations:
        summary: Backup failed
        description: Velero backup has failed
```

### 2. Alert Manager Configuration

```yaml
apiVersion: monitoring.coreos.com/v1alpha1
kind: AlertmanagerConfig
metadata:
  name: backup-alerts
  namespace: monitoring
spec:
  route:
    receiver: 'slack'
    routes:
    - match:
        alertname: BackupFailed
      receiver: 'pagerduty'
  receivers:
  - name: 'slack'
    slackConfigs:
    - channel: '#alerts'
      apiURL: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX'
  - name: 'pagerduty'
    pagerdutyConfigs:
    - serviceKey: '<key>'
```

## Best Practices

### 1. Backup Verification

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup-verification
spec:
  schedule: "0 3 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: verify
            image: velero/velero:latest
            command:
            - /bin/sh
            - -c
            - |
              velero backup describe --details latest-backup
              velero restore create --from-backup latest-backup --namespace-mappings prod:verify
```

### 2. Retention Policy

```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: retention-policy
spec:
  schedule: "0 0 * * *"
  template:
    ttl: 720h # 30 days
    hooks:
      resources:
      - name: backup-cleanup
        includedNamespaces:
        - "*"
        pre:
        - exec:
            command:
            - /bin/sh
            - -c
            - |
              # Clean up old backups
              velero backup delete --older-than 30d --confirm
```

## Troubleshooting

### Common Issues

1. Failed Backups
```bash
velero backup describe <backup-name>
velero backup logs <backup-name>
```

2. Restore Issues
```bash
velero restore describe <restore-name>
velero restore logs <restore-name>
```

3. Storage Issues
```bash
kubectl logs deployment/velero -n velero
```

## Security Considerations

### 1. Encryption Configuration

```yaml
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: encrypted-backup
spec:
  provider: aws
  objectStorage:
    bucket: my-backup-bucket
    encryption:
      kmsKeyId: arn:aws:kms:region:account-id:key/key-id
```

### 2. RBAC Configuration

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: backup-operator
rules:
- apiGroups:
  - velero.io
  resources:
  - backups
  - restores
  verbs:
  - create
  - delete
  - get
  - list
  - patch
  - update
  - watch
```

## Conclusion

A robust backup and recovery strategy is crucial for maintaining the reliability and availability of Kubernetes clusters and applications. Regular testing of backup and restore procedures ensures that your disaster recovery plan works when needed.

## Series Navigation
- Previous: [Kubernetes Service Mesh (Istio)](/posts/kubernetes/k8s-service-mesh)
- Next: [Kubernetes Troubleshooting Guide](/posts/kubernetes/k8s-troubleshooting)
