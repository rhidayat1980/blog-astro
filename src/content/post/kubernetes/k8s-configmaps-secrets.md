---
title: "Managing Application Configuration in Kubernetes"
description: "Complete guide to using ConfigMaps and Secrets in Kubernetes for configuration management and sensitive data"
publishDate: "11 Dec 2024"
tags: ["kubernetes", "k8s", "configmaps", "secrets", "devops", "cloud-native", "containers", "security", "series:kubernetes:9"]
draft: false
---

## Understanding ConfigMaps and Secrets

ConfigMaps and Secrets are Kubernetes objects used to decouple configuration details from container images, with Secrets specifically designed for sensitive data.

## ConfigMaps

### Basic ConfigMap Creation

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: game-config
data:
  game.properties: |
    enemies=aliens
    lives=3
    enemies.cheat=true
    enemies.cheat.level=noGoodRotten
  ui.properties: |
    color.good=purple
    color.bad=yellow
    allow.textmode=true
```

### Using ConfigMaps

#### 1. Environment Variables

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: config-env-pod
spec:
  containers:
  - name: test-container
    image: busybox
    command: [ "/bin/sh", "-c", "env" ]
    env:
    - name: SPECIAL_LEVEL
      valueFrom:
        configMapKeyRef:
          name: game-config
          key: special.how
```

#### 2. Volume Mounts

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: config-volume-pod
spec:
  containers:
  - name: test-container
    image: busybox
    command: [ "/bin/sh","-c","cat /etc/config/game.properties" ]
    volumeMounts:
    - name: config-volume
      mountPath: /etc/config
  volumes:
  - name: config-volume
    configMap:
      name: game-config
```

## Secrets

### Types of Secrets

1. Opaque (generic)
2. kubernetes.io/tls
3. kubernetes.io/dockerconfigjson
4. kubernetes.io/basic-auth
5. kubernetes.io/ssh-auth

### Creating Secrets

#### 1. Generic Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: mysecret
type: Opaque
data:
  username: YWRtaW4=  # base64 encoded
  password: MWYyZDFlMmU2N2Rm  # base64 encoded
```

#### 2. TLS Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: tls-secret
type: kubernetes.io/tls
data:
  tls.crt: <base64-encoded-cert>
  tls.key: <base64-encoded-key>
```

### Using Secrets

#### 1. As Environment Variables

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secret-env-pod
spec:
  containers:
  - name: mycontainer
    image: redis
    env:
    - name: SECRET_USERNAME
      valueFrom:
        secretKeyRef:
          name: mysecret
          key: username
    - name: SECRET_PASSWORD
      valueFrom:
        secretKeyRef:
          name: mysecret
          key: password
```

#### 2. As Files in a Volume

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secret-volume-pod
spec:
  containers:
  - name: mycontainer
    image: redis
    volumeMounts:
    - name: secret-volume
      mountPath: /etc/secrets
      readOnly: true
  volumes:
  - name: secret-volume
    secret:
      secretName: mysecret
```

## Best Practices

### 1. ConfigMap Best Practices

- Keep configurations small
- Use meaningful names
- Version control configurations
- Consider using Helm for templating

### 2. Secret Best Practices

- Enable encryption at rest
- Rotate secrets regularly
- Use RBAC to restrict access
- Consider external secret stores

## Real-World Examples

### 1. Database Configuration

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mysql-config
data:
  my.cnf: |
    [mysqld]
    max_connections=250
    max_allowed_packet=32M
    sql_mode=STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION
---
apiVersion: v1
kind: Secret
metadata:
  name: mysql-secrets
type: Opaque
data:
  root-password: cm9vdHBhc3N3b3Jk
  user-password: dXNlcnBhc3N3b3Jk
```

### 2. Web Application Configuration

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-config
data:
  nginx.conf: |
    server {
      listen 80;
      server_name example.com;
      location / {
        root /usr/share/nginx/html;
        index index.html;
      }
    }
---
apiVersion: v1
kind: Secret
metadata:
  name: app-tls
type: kubernetes.io/tls
data:
  tls.crt: <base64-encoded-cert>
  tls.key: <base64-encoded-key>
```

## Advanced Usage

### 1. Dynamic Updates

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: config-env-pod
spec:
  containers:
  - name: test-container
    image: k8s.gcr.io/busybox
    command: [ "/bin/sh", "-c", "while true; do echo $(cat /etc/config/game.properties); sleep 10; done" ]
    volumeMounts:
    - name: config-volume
      mountPath: /etc/config
  volumes:
  - name: config-volume
    configMap:
      name: game-config
```

### 2. Immutable ConfigMaps and Secrets

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: immutable-config
immutable: true
data:
  config.json: |
    {
      "environment": "production"
    }
```

## Security Considerations

### 1. Encryption at Rest

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
    - secrets
    providers:
    - aescbc:
        keys:
        - name: key1
          secret: <base64-encoded-key>
    - identity: {}
```

### 2. RBAC Configuration

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: secret-reader
rules:
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "list"]
```

## Troubleshooting

Common issues and solutions:

1. **ConfigMap Not Updating**
   - Check volume mounts
   - Verify pod recreation
   - Review configuration
   - Check permissions

2. **Secret Access Issues**
   - Verify base64 encoding
   - Check RBAC permissions
   - Review mount paths
   - Check secret existence

## Integration with External Tools

### 1. External Secrets Operator

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: vault-example
spec:
  refreshInterval: "15s"
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: secret-to-be-created
  data:
  - secretKey: password
    remoteRef:
      key: secret/data/myapp
      property: password
```

### 2. Sealed Secrets

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: mysecret
spec:
  encryptedData:
    password: AgBy8hCi4...
```

## Series Navigation

- Previous: [Jobs and CronJobs in Kubernetes](/posts/kubernetes/k8s-jobs-cronjobs)
- Next: [Kubernetes Services and Ingress](/posts/kubernetes/k8s-services-ingress)

## Conclusion

ConfigMaps and Secrets are essential for managing application configuration and sensitive data in Kubernetes. Understanding their proper usage and best practices is crucial for building secure and maintainable applications.
