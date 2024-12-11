---
title: "Kubernetes Policy Management"
description: "Implementing and managing policies in Kubernetes using OPA, Kyverno, and other tools"
publishDate: "11 Dec 2024"
tags: ["kubernetes", "k8s", "policy", "opa", "kyverno", "security", "devops", "cloud-native", "containers", "series:kubernetes:22"]
draft: false
---

## Understanding Policy Management

Policy management in Kubernetes ensures compliance, security, and operational best practices across your clusters through automated enforcement of rules and constraints.

## Policy Engines

### 1. Open Policy Agent (OPA)

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: opa-policy
data:
  policy.rego: |
    package kubernetes.admission
    
    deny[msg] {
      input.request.kind.kind == "Pod"
      not input.request.object.spec.securityContext.runAsNonRoot
      msg := "Pods must run as non-root user"
    }
```

### 2. Kyverno

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-labels
spec:
  validationFailureAction: enforce
  rules:
  - name: check-required-labels
    match:
      resources:
        kinds:
        - Pod
    validate:
      message: "label 'app' is required"
      pattern:
        metadata:
          labels:
            app: "?*"
```

## Security Policies

### 1. Pod Security Standards

```yaml
apiVersion: pod-security.kubernetes.io/v1
kind: PodSecurityStandard
metadata:
  name: restricted
spec:
  enforce: restricted
  audit: restricted
  warn: restricted
---
apiVersion: v1
kind: Pod
metadata:
  name: secure-pod
spec:
  securityContext:
    runAsNonRoot: true
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: app
    image: nginx
    securityContext:
      allowPrivilegeEscalation: false
      capabilities:
        drop: ["ALL"]
```

### 2. Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-specific
spec:
  podSelector:
    matchLabels:
      app: web
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          purpose: frontend
    ports:
    - protocol: TCP
      port: 80
```

## Resource Management Policies

### 1. Resource Quotas

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-resources
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
```

### 2. Limit Ranges

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: mem-limit-range
spec:
  limits:
  - default:
      memory: "512Mi"
      cpu: "500m"
    defaultRequest:
      memory: "256Mi"
      cpu: "200m"
    type: Container
```

## Compliance Policies

### 1. Image Security

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: allowed-registries
spec:
  validationFailureAction: enforce
  rules:
  - name: validate-registries
    match:
      resources:
        kinds:
        - Pod
    validate:
      message: "Only approved registries are allowed"
      pattern:
        spec:
          containers:
          - image: "registry.company.com/*"
```

### 2. Configuration Standards

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: ns-must-have-env
spec:
  match:
    kinds:
    - apiGroups: [""]
      kinds: ["Namespace"]
  parameters:
    labels: ["environment"]
```

## Custom Policies

### 1. OPA Custom Rules

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: custom-policies
data:
  policy.rego: |
    package kubernetes.admission
    
    deny[msg] {
      input.request.kind.kind == "Deployment"
      not input.request.object.spec.template.spec.containers[_].resources.limits
      msg := "Resource limits are required for all containers"
    }
```

### 2. Kyverno Custom Rules

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: custom-deployment-rules
spec:
  validationFailureAction: enforce
  rules:
  - name: check-replicas
    match:
      resources:
        kinds:
        - Deployment
    validate:
      message: "Minimum replicas should be 2"
      pattern:
        spec:
          replicas: ">1"
```

## Policy Testing

### 1. OPA Testing

```yaml
package kubernetes.admission

test_deny_no_resource_limits {
    deny["Resource limits are required"] with input as {
        "request": {
            "kind": {"kind": "Deployment"},
            "object": {
                "spec": {
                    "template": {
                        "spec": {
                            "containers": [
                                {"name": "app"}
                            ]
                        }
                    }
                }
            }
        }
    }
}
```

### 2. Kyverno Testing

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: policy-test
spec:
  background: false
  rules:
  - name: test-policy
    match:
      resources:
        kinds:
        - Pod
    validate:
      message: "Test validation"
      pattern:
        metadata:
          labels:
            test: "true"
```

## Monitoring and Reporting

### 1. Policy Violations

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: policy-alerts
spec:
  groups:
  - name: policy.rules
    rules:
    - alert: PolicyViolation
      expr: sum(increase(policy_violation_total[1h])) > 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: Policy violations detected
```

### 2. Compliance Reports

```yaml
apiVersion: wgpolicyk8s.io/v1alpha2
kind: PolicyReport
metadata:
  name: cluster-compliance
spec:
  results:
  - policy: require-labels
    rule: check-required-labels
    status: fail
    severity: high
    category: compliance
    properties:
      created_at: '2024-12-11T10:00:00Z'
```

## Best Practices

1. Start with Baseline Policies
2. Implement Gradual Enforcement
3. Regular Policy Review
4. Document Policy Decisions
5. Monitor Policy Impact
6. Test Before Enforcement
7. Maintain Policy Version Control

## Troubleshooting

### Common Issues

1. Policy Conflicts
```bash
kubectl describe clusterpolicy <policy-name>
kubectl get policyreport
```

2. Admission Control Issues
```bash
kubectl logs -n kyverno -l app=kyverno
kubectl get events --field-selector reason=Failed
```

3. Performance Impact
```bash
kubectl top pod -n kyverno
kubectl describe podsecuritypolicy
```

## Conclusion

Effective policy management is crucial for maintaining security, compliance, and operational standards in Kubernetes clusters. Using tools like OPA and Kyverno, organizations can implement automated policy enforcement and maintain consistent standards across their infrastructure.

## Series Navigation
- Previous: [GitOps with Kubernetes](/posts/kubernetes/k8s-gitops)
- Next: [Kubernetes Cost Optimization](/posts/kubernetes/k8s-cost-optimization)
