---
title: "Jobs and CronJobs in Kubernetes"
description: "Comprehensive guide to using Jobs and CronJobs in Kubernetes for batch processing and scheduled tasks"
publishDate: "11 Dec 2024"
tags: ["kubernetes", "k8s", "jobs", "cronjobs", "devops", "cloud-native", "containers", "batch", "series:kubernetes:8"]
draft: false
---

## Understanding Jobs and CronJobs

Jobs create one or more Pods to perform a specific task and ensure they successfully complete. CronJobs create Jobs on a schedule.

## Jobs

### Basic Job Configuration

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: pi
spec:
  template:
    spec:
      containers:
      - name: pi
        image: perl:5.34.0
        command: ["perl",  "-Mbignum=bpi", "-wle", "print bpi(2000)"]
      restartPolicy: Never
  backoffLimit: 4
```

### Job Patterns

#### 1. Non-Parallel Jobs

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: single-task
spec:
  template:
    spec:
      containers:
      - name: worker
        image: busybox
        command: ["echo",  "Single task completed"]
      restartPolicy: Never
```

#### 2. Parallel Jobs with Fixed Completion Count

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: parallel-fixed
spec:
  completions: 5
  parallelism: 2
  template:
    spec:
      containers:
      - name: worker
        image: busybox
        command: ["echo", "Task completed"]
      restartPolicy: Never
```

#### 3. Parallel Jobs with Work Queue

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: job-wq
spec:
  parallelism: 2
  template:
    spec:
      containers:
      - name: worker
        image: worker-image
        env:
        - name: REDIS_HOST
          value: redis-service
      restartPolicy: Never
```

## CronJobs

### Basic CronJob Configuration

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: hello
spec:
  schedule: "*/1 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: hello
            image: busybox:1.28
            command:
            - /bin/sh
            - -c
            - date; echo Hello from the Kubernetes cluster
          restartPolicy: OnFailure
```

### Common Use Cases

#### 1. Database Backup

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
            image: mysql:8.0
            command:
            - /bin/sh
            - -c
            - mysqldump -h mysql-service -u root -p$MYSQL_ROOT_PASSWORD --all-databases > /backup/dump.sql
            env:
            - name: MYSQL_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mysql-secret
                  key: password
            volumeMounts:
            - name: backup-volume
              mountPath: /backup
          volumes:
          - name: backup-volume
            persistentVolumeClaim:
              claimName: backup-pvc
          restartPolicy: OnFailure
```

#### 2. Log Rotation

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: log-rotation
spec:
  schedule: "0 0 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: log-cleaner
            image: busybox
            command:
            - /bin/sh
            - -c
            - find /var/log -type f -mtime +7 -delete
            volumeMounts:
            - name: log-volume
              mountPath: /var/log
          volumes:
          - name: log-volume
            hostPath:
              path: /var/log
          restartPolicy: OnFailure
```

## Job Control and Management

### Job Completion Modes

```yaml
spec:
  completionMode: Indexed
  completions: 5
  parallelism: 3
```

### TTL Controller for Finished Jobs

```yaml
spec:
  ttlSecondsAfterFinished: 100
```

### Handling Job Failures

```yaml
spec:
  backoffLimit: 6
  activeDeadlineSeconds: 600
```

## Best Practices

### 1. Resource Management

```yaml
spec:
  template:
    spec:
      containers:
      - name: job-task
        resources:
          requests:
            memory: "64Mi"
            cpu: "250m"
          limits:
            memory: "128Mi"
            cpu: "500m"
```

### 2. Pod Security

```yaml
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
      containers:
      - name: job-task
        securityContext:
          allowPrivilegeEscalation: false
```

### 3. Error Handling

```yaml
spec:
  backoffLimit: 4
  template:
    spec:
      containers:
      - name: job-task
        command:
        - /bin/bash
        - -c
        - |
          if ! my-task; then
            echo "Task failed"
            exit 1
          fi
```

## Advanced Configurations

### Suspending CronJobs

```yaml
spec:
  suspend: true
```

### Concurrency Policy

```yaml
spec:
  concurrencyPolicy: Forbid  # Allow, Forbid, or Replace
```

### Historical Limit

```yaml
spec:
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
```

## Monitoring and Debugging

### Job Status Checking

```bash
kubectl get jobs
kubectl get cronjobs
kubectl describe job <job-name>
kubectl logs job/<job-name>
```

### Common Issues

1. **Job Never Completes**
   - Check resource constraints
   - Verify logic completion
   - Review logs
   - Check node capacity

2. **CronJob Not Running**
   - Verify schedule format
   - Check concurrency policy
   - Review suspend status
   - Check previous job status

## Example Scenarios

### 1. Data Processing Job

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: data-processor
spec:
  parallelism: 3
  completions: 10
  template:
    spec:
      containers:
      - name: processor
        image: data-processor:v1
        env:
        - name: BATCH_SIZE
          value: "1000"
        - name: INPUT_PATH
          value: "/data/input"
        volumeMounts:
        - name: data-volume
          mountPath: /data
      volumes:
      - name: data-volume
        persistentVolumeClaim:
          claimName: data-pvc
      restartPolicy: Never
```

### 2. Scheduled Report Generation

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: report-generator
spec:
  schedule: "0 6 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: reporter
            image: report-generator:v1
            env:
            - name: REPORT_TYPE
              value: "daily"
            - name: OUTPUT_FORMAT
              value: "pdf"
          restartPolicy: OnFailure
```

## Series Navigation

- Previous: [Kubernetes DaemonSets](/posts/kubernetes/k8s-daemonsets)
- Next: [Managing Application Configuration in Kubernetes](/posts/kubernetes/k8s-configmaps-secrets)

## Conclusion

Jobs and CronJobs are essential for running batch processes and scheduled tasks in Kubernetes. Understanding their configurations and best practices helps in implementing reliable task execution in your cluster.
