---
title: "Kubernetes Networking Fundamentals"
description: "Deep dive into Kubernetes networking concepts, including Pod networking, Services, and Ingress controllers"
publishDate: "11 Dec 2024"
tags: ["kubernetes", "k8s", "networking", "devops", "cloud-native", "containers", "series:kubernetes:2"]
draft: false
---

## Kubernetes Networking Model

Kubernetes follows a flat networking model where all Pods can communicate with each other without NAT. This creates a clean, backwards-compatible model where Pods can be treated much like VMs or physical hosts from the perspectives of ports allocation, naming, service discovery, load balancing, application configuration, and migration.

## Pod Networking

### Pod-to-Pod Communication

Each Pod in Kubernetes gets its own IP address. This means:

- Containers within a Pod share the network namespace
- They can communicate via localhost
- They share the same IP address and port space
- Container-to-container communication follows standard Linux networking rules

### Container Network Interface (CNI)

CNI is a specification and libraries for writing plugins to configure network interfaces in Linux containers. Popular CNI plugins include:

- Calico
- Flannel
- Weave Net
- Cilium

## Service Types

### ClusterIP

- Default service type
- Internal cluster IP only
- Only reachable within cluster
- Useful for internal services

### NodePort

- Exposes service on each Node's IP
- Port range: 30000-32767
- Automatically creates ClusterIP service
- Useful for development and testing

### LoadBalancer

- Exposes service externally
- Uses cloud provider's load balancer
- Automatically creates NodePort & ClusterIP services
- Standard way to expose services to the internet

### ExternalName

- Maps service to DNS name
- Useful for service discovery
- No proxying involved
- Used for external service integration

## Ingress Controllers

Ingress provides HTTP/HTTPS routing to services. Benefits include:

- URL path-based routing
- SSL/TLS termination
- Name-based virtual hosting
- Load balancing
- Custom rules for routing

Popular Ingress controllers:

- NGINX Ingress Controller
- HAProxy
- Traefik
- Ambassador

## Network Policies

Network Policies specify how groups of Pods are allowed to communicate:

- Pod-level firewall rules
- Namespace isolation
- Ingress and egress rules
- Label selector-based policies

Example Network Policy:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: test-network-policy
spec:
  podSelector:
    matchLabels:
      role: db
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          role: frontend
    ports:
    - protocol: TCP
      port: 6379
```

## DNS in Kubernetes

Kubernetes provides DNS-based service discovery:

- Service discovery via DNS names
- Pod DNS naming convention
- Namespace-based DNS resolution
- Cluster DNS service (CoreDNS)

## Best Practices

1. **Security**
   - Use Network Policies to restrict traffic
   - Implement proper segmentation
   - Follow least privilege principle

2. **Performance**
   - Choose appropriate CNI plugin
   - Monitor network latency
   - Use appropriate service types

3. **Scalability**
   - Plan IP address space carefully
   - Consider multi-cluster scenarios
   - Use appropriate load balancing

4. **Troubleshooting**
   - Use proper logging
   - Monitor network metrics
   - Implement tracing

## Conclusion

Understanding Kubernetes networking is crucial for building robust, scalable applications. This post covered the fundamentals, but there's always more to learn about specific implementations and advanced scenarios.

## Series Navigation
- Previous: [Introduction to Kubernetes](/posts/kubernetes/introduction-to-k8s)
- Next: [Kubernetes Storage](/posts/kubernetes/k8s-storage)
