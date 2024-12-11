---
title: "CI/CD with Kubernetes"
description: "Learn how to implement CI/CD pipelines for Kubernetes using popular tools like GitLab, Jenkins, and ArgoCD"
publishDate: "11 Dec 2024"
tags: ["kubernetes", "k8s", "cicd", "devops", "cloud-native", "gitops", "containers", "automation", "series:kubernetes:13"]
draft: false
---

## Understanding CI/CD in Kubernetes

Continuous Integration and Continuous Deployment (CI/CD) in Kubernetes involves automating the build, test, and deployment of containerized applications.

## Popular CI/CD Tools for Kubernetes

### GitLab CI/CD

Example `.gitlab-ci.yml`:

```yaml
stages:
  - build
  - test
  - deploy

build:
  stage: build
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

test:
  stage: test
  script:
    - kubectl create namespace test-$CI_COMMIT_SHA
    - helm upgrade --install app ./helm -n test-$CI_COMMIT_SHA
    - ./run-tests.sh
  after_script:
    - kubectl delete namespace test-$CI_COMMIT_SHA

deploy:
  stage: deploy
  script:
    - kubectl set image deployment/app app=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  only:
    - main
```

### Jenkins Pipeline

Example `Jenkinsfile`:

```groovy
pipeline {
    agent {
        kubernetes {
            yaml '''
                apiVersion: v1
                kind: Pod
                spec:
                  containers:
                  - name: docker
                    image: docker:latest
                    command:
                    - cat
                    tty: true
                    volumeMounts:
                    - mountPath: /var/run/docker.sock
                      name: docker-sock
                  volumes:
                  - name: docker-sock
                    hostPath:
                      path: /var/run/docker.sock
            '''
        }
    }
    stages {
        stage('Build') {
            steps {
                container('docker') {
                    sh 'docker build -t myapp:$BUILD_NUMBER .'
                }
            }
        }
        stage('Deploy') {
            steps {
                sh 'kubectl apply -f k8s/'
            }
        }
    }
}
```

### ArgoCD (GitOps)

Example Application manifest:

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
    path: k8s
  destination:
    server: https://kubernetes.default.svc
    namespace: myapp
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## CI/CD Best Practices

### 1. Container Image Management

- Use semantic versioning
- Never use `latest` tag in production
- Implement vulnerability scanning
- Sign container images

### 2. Environment Management

- Use separate namespaces
- Implement environment parity
- Use configuration management
- Implement secrets management

### 3. Deployment Strategies

1. **Rolling Updates**
```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
```

2. **Blue-Green Deployments**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp
spec:
  selector:
    app: myapp
    version: v2  # Switch between v1 and v2
```

3. **Canary Deployments**
```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
spec:
  route:
  - destination:
      host: myapp-v1
    weight: 90
  - destination:
      host: myapp-v2
    weight: 10
```

## Pipeline Security

### 1. Secrets Management

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: pipeline-secrets
type: Opaque
data:
  docker-config: <base64-encoded>
```

### 2. RBAC Configuration

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: ci-role
rules:
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
```

## Testing in CI/CD

### 1. Unit Tests
```bash
#!/bin/bash
go test ./... -v -cover
```

### 2. Integration Tests
```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: integration-tests
spec:
  template:
    spec:
      containers:
      - name: tests
        image: test-runner:latest
        command: ["./run-integration-tests.sh"]
```

### 3. End-to-End Tests
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: e2e-tests
spec:
  containers:
  - name: cypress
    image: cypress/included:latest
    command: ["cypress", "run"]
```

## Monitoring and Observability

### 1. Pipeline Metrics

Key metrics to monitor:
- Build duration
- Deployment frequency
- Failure rate
- Recovery time

### 2. Deployment Tracking

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  annotations:
    kubernetes.io/change-cause: "Release v1.2.3"
```

## GitOps Workflow

### 1. Infrastructure as Code

```yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: GitRepository
metadata:
  name: infrastructure
spec:
  interval: 1m
  url: https://github.com/org/infrastructure
  ref:
    branch: main
```

### 2. Application Deployment

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1beta2
kind: Kustomization
metadata:
  name: applications
spec:
  interval: 10m
  path: ./apps
  prune: true
  sourceRef:
    kind: GitRepository
    name: infrastructure
```

## Conclusion

Implementing CI/CD in Kubernetes requires careful consideration of tools, practices, and security measures. The key is to automate wherever possible while maintaining security and reliability.

## Series Navigation
- Previous: [Monitoring Kubernetes Clusters](/posts/kubernetes/k8s-monitoring)
- Next: This is the last post in the Kubernetes series

## Next Steps

1. Set up a basic CI/CD pipeline
2. Implement automated testing
3. Configure deployment strategies
4. Establish monitoring and alerting
5. Implement GitOps practices
