---
title: "Kubernetes Series - Part 3: Networking Essentials"
description: "Master Kubernetes networking concepts including Services, Ingress, and Network Policies"
publishDate: 2024-01-17
tags: ["kubernetes", "networking", "devops", "cloud-native", "series:kubernetes:3"]
draft: false
---

## Series Navigation

- [Part 1: Core Fundamentals](/posts/kubernetes/01-fundamentals)
- [Part 2: Workload Management](/posts/kubernetes/02-workload-management)
- **Part 3: Networking Essentials** (Current)
- [Part 4: Storage and Persistence](/posts/kubernetes/04-storage)
- [Part 5: Configuration and Secrets](/posts/kubernetes/05-configuration)
- [Part 6: Security and Access Control](/posts/kubernetes/06-security)
- [Part 7: Observability](/posts/kubernetes/07-observability)
- [Part 8: Advanced Patterns](/posts/kubernetes/08-advanced-patterns)
- [Part 9: Production Best Practices](/posts/kubernetes/09-production)

## Introduction

After managing Kubernetes clusters in production for several years, I've learned that networking is often the most challenging aspect to get right. In this article, I'll share practical insights from real-world experience implementing Kubernetes networking solutions.

## Services

Services provide stable networking for pods. Here's a production-ready example with common annotations we use:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-app
  annotations:
    prometheus.io/scrape: 'true'
    prometheus.io/port: '8080'
    service.beta.kubernetes.io/aws-load-balancer-type: nlb
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 8080
    protocol: TCP
  selector:
    app: web-app
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 10800
```

### Service Types and Use Cases

1. **ClusterIP**
   - Internal service communication
   - Default type for most services

   ```yaml
   spec:
     type: ClusterIP
     clusterIP: None  # Headless service
   ```

2. **NodePort**
   - Development and testing
   - Direct node access needed

   ```yaml
   spec:
     type: NodePort
     ports:
     - port: 80
       nodePort: 30080
   ```

3. **LoadBalancer**
   - Production external access
   - Cloud provider integration

   ```yaml
   spec:
     type: LoadBalancer
     loadBalancerSourceRanges:
     - 10.0.0.0/8
   ```

## Ingress Controllers

In production, we use Nginx Ingress Controller. Here's our base configuration:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - app.example.com
    secretName: tls-secret
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 80
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-service
            port:
              number: 80
```

### Advanced Ingress Patterns

Here's how we handle advanced scenarios:

1. **Rate Limiting**:
```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/limit-rps: "10"
    nginx.ingress.kubernetes.io/limit-whitelist: "10.0.0.0/8"
```

2. **Authentication**:
```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/auth-type: basic
    nginx.ingress.kubernetes.io/auth-secret: basic-auth
    nginx.ingress.kubernetes.io/auth-realm: "Authentication Required"
```

3. **Canary Deployments**:
```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "20"
```

### Ingress Best Practices

1. **SSL/TLS Configuration**
   - Always use HTTPS in production
   - Implement automatic certificate management
   - Configure proper SSL policies

2. **Path Management**
   - Use precise path matching
   - Configure proper redirects
   - Handle trailing slashes

3. **Load Balancing**
   - Configure session affinity when needed
   - Set appropriate timeouts
   - Monitor backend health

## Network Policies

Security through network isolation is crucial. Here's our default deny policy:

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

And a more specific policy for microservices:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-network-policy
spec:
  podSelector:
    matchLabels:
      app: api-service
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: frontend
    - podSelector:
        matchLabels:
          app: web-frontend
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: database
    ports:
    - protocol: TCP
      port: 5432
```

### Network Policy Best Practices

1. **Default Deny**
   - Start with denying all traffic
   - Explicitly allow required communication
   - Document exceptions

2. **Namespace Isolation**
   - Use namespace labels for policy targeting
   - Implement environment separation
   - Control cross-namespace traffic

3. **Egress Control**
   - Limit external endpoints
   - Monitor egress traffic
   - Use DNS policies

## DNS and Service Discovery

CoreDNS configuration we use in production:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    .:53 {
        errors
        health {
            lameduck 5s
        }
        ready
        kubernetes cluster.local in-addr.arpa ip6.arpa {
            pods insecure
            fallthrough in-addr.arpa ip6.arpa
            ttl 30
        }
        prometheus :9153
        forward . /etc/resolv.conf {
            max_concurrent 1000
        }
        cache 30
        loop
        reload
        loadbalance
    }
    
    example.com:53 {
        errors
        cache 30
        forward . 10.0.0.53
    }
```

### DNS Troubleshooting Tips

1. **Common Issues**
   - DNS resolution delays
   - Cache problems
   - Zone transfer failures

2. **Resolution Steps**
   - Check CoreDNS pods
   - Verify service DNS
   - Monitor DNS metrics

## Production Checklist

✅ **Service Configuration**

- [ ] Appropriate service type
- [ ] Resource limits set
- [ ] Health checks configured
- [ ] Monitoring enabled

✅ **Ingress Setup**

- [ ] TLS configured
- [ ] Rate limiting
- [ ] Authentication
- [ ] Path routing

✅ **Network Policies**

- [ ] Default deny policy
- [ ] Explicit allow rules
- [ ] Namespace isolation
- [ ] Egress control

✅ **DNS Management**

- [ ] CoreDNS optimization
- [ ] Custom domains
- [ ] Caching configuration
- [ ] Monitoring setup

## Common Networking Issues

1. **Service Discovery**
   - DNS resolution delays
   - Endpoint updates
   - Service mesh integration

2. **Load Balancing**
   - Session affinity
   - Health check configuration
   - SSL termination

3. **Network Policy**
   - Policy ordering
   - Namespace isolation
   - Egress control

## Real-world Example

Here's a complete networking setup we use in production:

```yaml
---
apiVersion: v1
kind: Service
metadata:
  name: web-app
  annotations:
    prometheus.io/scrape: 'true'
    prometheus.io/port: '8080'
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 8080
  selector:
    app: web-app
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-app
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/limit-rps: "10"
spec:
  tls:
  - hosts:
    - app.example.com
    secretName: app-tls
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-app
            port:
              number: 80
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: web-app-policy
spec:
  podSelector:
    matchLabels:
      app: web-app
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          environment: production
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          environment: production
    ports:
    - protocol: TCP
      port: 5432
```

## Conclusion

Kubernetes networking requires careful planning and implementation. Key takeaways:

- Use appropriate service types
- Implement secure ingress configurations
- Enforce network policies
- Optimize DNS settings

In the next part, we'll explore storage and persistence in Kubernetes, where I'll share practical insights about managing stateful workloads.

## Additional Resources

- [Kubernetes Networking](https://kubernetes.io/docs/concepts/services-networking/)
- [Nginx Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [CoreDNS](https://coredns.io/manual/toc/)
