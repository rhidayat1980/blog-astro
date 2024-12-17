---
title: "Kubernetes Series - Part 1: Core Fundamentals"
description: "Master the essential concepts and components of Kubernetes, from architecture to basic operations"
publishDate: 2024-01-15
tags: ["kubernetes", "containers", "devops", "cloud-native", "series:kubernetes:1"]
draft: false
---

## Series Navigation

- **Part 1: Core Fundamentals** (Current)
- [Part 2: Workload Management](/posts/kubernetes/02-workload-management)
- [Part 3: Networking Essentials](/posts/kubernetes/03-networking)
- [Part 4: Storage and Persistence](/posts/kubernetes/04-storage)
- [Part 5: Configuration and Secrets](/posts/kubernetes/05-configuration)
- [Part 6: Security and Access Control](/posts/kubernetes/06-security)
- [Part 7: Observability](/posts/kubernetes/07-observability)
- [Part 8: Advanced Patterns](/posts/kubernetes/08-advanced-patterns)
- [Part 9: Production Best Practices](/posts/kubernetes/09-production)

## Introduction

After spending five years managing production Kubernetes clusters across different cloud providers, I've learned that mastering the fundamentals is crucial for success. In this first part of our series, I'll share the essential concepts and practical insights I've gained from real-world experience.

## Core Architecture

### Control Plane Components

In my experience managing multiple production clusters, these components form the brain of Kubernetes:

```yaml
apiVersion: v1
kind: ComponentStatus
items:
- conditions:
  - status: "True"
    type: Healthy
  metadata:
    name: kube-apiserver
- conditions:
  - status: "True"
    type: Healthy
  metadata:
    name: etcd-0
```

1. **API Server**: The gateway for all cluster operations
   - Pro tip: Always use `kubectl proxy` for local development to avoid certificate issues
   - Set proper resource limits to prevent API server overload

2. **etcd**: The cluster's source of truth
   - Real-world lesson: Always maintain etcd backups
   - I once saved a production cluster thanks to our regular etcd snapshots

3. **Controller Manager**: Ensures desired state
   - Monitor its CPU usage - high utilization often indicates cluster issues
   - Set appropriate QPS and burst limits based on cluster size

4. **Scheduler**: Places workloads intelligently
   - Custom scheduling policies can significantly improve resource utilization
   - We reduced costs by 30% with proper node affinity rules

## Node Architecture

Each node in your cluster runs these essential components:

```yaml
apiVersion: v1
kind: Node
metadata:
  name: worker-1
status:
  conditions:
  - type: Ready
    status: "True"
  capacity:
    cpu: "4"
    memory: "8Gi"
```

1. **kubelet**: The node agent
   - Monitor its logs for troubleshooting node issues
   - Set appropriate garbage collection thresholds

2. **Container Runtime**: Usually containerd
   - Pro tip: Use crictl for debugging container issues
   - Regular garbage collection prevents disk space issues

3. **kube-proxy**: Network rules manager
   - IPVS mode offers better performance at scale
   - Monitor iptables rules count in large clusters

## Basic Operations

Here are some essential commands I use daily:

```bash
# Get cluster health status
kubectl get componentstatuses

# Check node resources
kubectl describe node <node-name>

# View system pods
kubectl get pods -n kube-system

# Check events
kubectl get events --sort-by='.lastTimestamp'
```

### Pro Tips from Production

1. **Resource Management**
   - Always set resource requests and limits
   - Use namespace resource quotas

   ```yaml
   apiVersion: v1
   kind: ResourceQuota
   metadata:
     name: compute-quota
   spec:
     hard:
       requests.cpu: "4"
       requests.memory: 8Gi
       limits.cpu: "8"
       limits.memory: 16Gi
   ```

2. **Namespace Organization**
   - Use namespaces for logical separation
   - Implement network policies per namespace

   ```yaml
   apiVersion: networking.k8s.io/v1
   kind: NetworkPolicy
   metadata:
     name: default-deny
   spec:
     podSelector: {}
     policyTypes:
     - Ingress
     - Egress
   ```

3. **Monitoring Basics**
   - Set up proper logging from day one
   - Monitor kubelet and container runtime metrics

   ```bash
   # Check kubelet metrics
   curl -k https://localhost:10250/metrics
   ```

## Common Pitfalls

Through my experience, here are issues I frequently encounter and their solutions:

1. **Resource Exhaustion**
   - Always monitor node resources
   - Set up cluster autoscaling
   - Use pod disruption budgets

2. **Network Issues**
   - Check kube-proxy logs
   - Verify CoreDNS functionality
   - Monitor CNI plugin health

3. **Certificate Problems**
   - Regularly rotate certificates
   - Monitor certificate expiration
   - Use cert-manager for automation

## Production Readiness Checklist

✅ **Basic Setup**

- [ ] Multiple master nodes
- [ ] Proper network plugin configuration
- [ ] Resource quotas per namespace
- [ ] Node labels and taints

✅ **Security**

- [ ] RBAC policies
- [ ] Network policies
- [ ] Pod security policies
- [ ] Regular certificate rotation

✅ **Monitoring**

- [ ] Node metrics
- [ ] Control plane metrics
- [ ] Logging solution
- [ ] Alerting rules

## Conclusion

Understanding Kubernetes fundamentals is crucial for running production workloads successfully. Through my experience managing clusters at scale, I've learned that a solid foundation in these concepts prevents many issues down the line.

Remember:

- Start with proper resource management
- Implement security from day one
- Monitor everything
- Keep your control plane healthy
- Document your configurations

In the next part of this series, we'll dive into workload management, where I'll share practical tips for deploying and managing applications in Kubernetes.

## Additional Resources

- [Official Kubernetes Documentation](https://kubernetes.io/docs/)
- [Kubernetes the Hard Way](https://github.com/kelseyhightower/kubernetes-the-hard-way)
- [Kubernetes Patterns](https://k8spatterns.io/)
