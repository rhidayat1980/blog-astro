---
title: "GitOps with Kubernetes"
description: "Implementing GitOps practices in Kubernetes using tools like Flux and ArgoCD"
publishDate: "11 Dec 2024"
tags: ["kubernetes", "k8s", "gitops", "flux", "argocd", "devops", "cloud-native", "containers", "series:kubernetes:21"]
draft: false
---

## Understanding GitOps

GitOps is a set of practices where the entire system's desired state is stored in Git, and automated processes ensure the actual state matches the desired state.

## GitOps Tools

### 1. Flux CD

```yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: GitRepository
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 1m
  ref:
    branch: main
  url: https://github.com/org/repo
---
apiVersion: kustomize.toolkit.fluxcd.io/v1beta2
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

### 2. Argo CD

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/org/repo.git
    targetRevision: HEAD
    path: apps/myapp
  destination:
    server: https://kubernetes.default.svc
    namespace: myapp
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Infrastructure as Code

### 1. Helm Charts

```yaml
# values.yaml
replicaCount: 3
image:
  repository: nginx
  tag: "1.21"
service:
  type: ClusterIP
  port: 80
```

```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}
spec:
  replicas: {{ .Values.replicaCount }}
  template:
    spec:
      containers:
      - name: {{ .Chart.Name }}
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
```

### 2. Kustomize

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- deployment.yaml
- service.yaml
patches:
- path: patch.yaml
  target:
    kind: Deployment
    name: myapp
```

## Continuous Deployment

### 1. Flux Pipeline

```yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: HelmRepository
metadata:
  name: podinfo
  namespace: flux-system
spec:
  interval: 5m
  url: https://stefanprodan.github.io/podinfo
---
apiVersion: helm.toolkit.fluxcd.io/v2beta1
kind: HelmRelease
metadata:
  name: podinfo
  namespace: default
spec:
  interval: 5m
  chart:
    spec:
      chart: podinfo
      version: ">=4.0.0 <5.0.0"
      sourceRef:
        kind: HelmRepository
        name: podinfo
        namespace: flux-system
  values:
    replicaCount: 2
```

### 2. ArgoCD Pipeline

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: cluster-addons
  namespace: argocd
spec:
  generators:
  - list:
      elements:
      - cluster: production
        url: https://kubernetes.default.svc
      - cluster: staging
        url: https://staging-cluster:6443
  template:
    metadata:
      name: '{{cluster}}-addons'
    spec:
      project: default
      source:
        repoURL: https://github.com/org/cluster-addons.git
        targetRevision: HEAD
        path: '{{cluster}}'
      destination:
        server: '{{url}}'
        namespace: addons
```

## Monitoring and Alerts

### 1. Prometheus Configuration

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: gitops-alerts
spec:
  groups:
  - name: gitops
    rules:
    - alert: ReconciliationFailed
      expr: |
        sum(increase(flux_reconcile_error[5m])) > 0
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: GitOps reconciliation failed
```

### 2. Alert Manager

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta1
kind: Alert
metadata:
  name: slack-notifications
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: info
  eventSources:
    - kind: GitRepository
      name: '*'
    - kind: Kustomization
      name: '*'
```

## Security Best Practices

### 1. RBAC Configuration

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: gitops-reconciler
rules:
- apiGroups:
  - "*"
  resources:
  - "*"
  verbs:
  - "*"
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: gitops-reconciler
subjects:
- kind: ServiceAccount
  name: flux-reconciler
  namespace: flux-system
roleRef:
  kind: ClusterRole
  name: gitops-reconciler
  apiGroup: rbac.authorization.k8s.io
```

### 2. Secret Management

```yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: GitRepository
metadata:
  name: secrets
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/org/secrets
  secretRef:
    name: git-credentials
---
apiVersion: kustomize.toolkit.fluxcd.io/v1beta2
kind: Kustomization
metadata:
  name: secrets
  namespace: flux-system
spec:
  decryption:
    provider: sops
    secretRef:
      name: sops-gpg
```

## Multi-Cluster Management

### 1. Cluster Configuration

```yaml
apiVersion: cluster.x-k8s.io/v1beta1
kind: Cluster
metadata:
  name: production-1
  namespace: default
spec:
  clusterNetwork:
    pods:
      cidrBlocks: ["192.168.0.0/16"]
  infrastructureRef:
    apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
    kind: AWSCluster
    name: production-1
```

### 2. Fleet Management

```yaml
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: fleet-example
  namespace: fleet-default
spec:
  repo: https://github.com/org/fleet-examples
  paths:
  - single-cluster/nginx
  targets:
  - name: prod
    clusterSelector:
      matchLabels:
        env: prod
```

## Troubleshooting

### Common Issues

1. Repository Sync Issues
```bash
flux get sources git
flux logs --level=error
```

2. Deployment Failures
```bash
argocd app get myapp
argocd app logs myapp
```

3. Reconciliation Problems
```bash
kubectl describe kustomization apps -n flux-system
```

## Best Practices

1. Use Semantic Versioning
2. Implement Progressive Delivery
3. Maintain Environment Parity
4. Regular Backup of Git Repository
5. Implement Proper Access Controls
6. Monitor Reconciliation Metrics
7. Document Deployment Procedures

## Conclusion

GitOps provides a powerful approach to managing Kubernetes clusters and applications. By following these practices and using the right tools, teams can achieve reliable, automated, and auditable deployments.

## Series Navigation

- Previous: [Kubernetes Troubleshooting Guide](/posts/kubernetes/k8s-troubleshooting)
- Next: [Kubernetes Policy Management](/posts/kubernetes/k8s-policy-management)
