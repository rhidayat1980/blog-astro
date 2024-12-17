---
title: "Kubernetes Series - Part 7: Observability"
description: "Master Kubernetes observability with comprehensive monitoring, logging, and tracing solutions"
publishDate: 2024-01-21
tags: ["kubernetes", "monitoring", "logging", "observability", "series:kubernetes:7"]
draft: false
---

## Series Navigation

- [Part 1: Core Fundamentals](/posts/kubernetes/01-fundamentals)
- [Part 2: Workload Management](/posts/kubernetes/02-workload-management)
- [Part 3: Networking Essentials](/posts/kubernetes/03-networking)
- [Part 4: Storage and Persistence](/posts/kubernetes/04-storage)
- [Part 5: Configuration and Secrets](/posts/kubernetes/05-configuration)
- [Part 6: Security and Access Control](/posts/kubernetes/06-security)
- **Part 7: Observability** (Current)
- [Part 8: Advanced Patterns](/posts/kubernetes/08-advanced-patterns)
- [Part 9: Production Best Practices](/posts/kubernetes/09-production)

## Introduction

After managing large-scale Kubernetes clusters, I've learned that proper observability is crucial for maintaining reliable systems. In this article, I'll share practical insights from implementing monitoring, logging, and tracing solutions in production environments.

## Monitoring with Prometheus

Here's our production Prometheus configuration:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: prometheus
spec:
  serviceAccountName: prometheus
  serviceMonitorSelector:
    matchLabels:
      team: platform
  resources:
    requests:
      memory: 400Mi
    limits:
      memory: 2Gi
  retention: 15d
  storage:
    volumeClaimTemplate:
      spec:
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 100Gi
```

### Service Monitoring

How we monitor services:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: app-monitor
  labels:
    team: platform
spec:
  selector:
    matchLabels:
      app: myapp
  endpoints:
  - port: metrics
    interval: 15s
    path: /metrics
  - port: metrics
    interval: 30s
    path: /metrics/detailed
    metricRelabelings:
    - sourceLabels: [__name__]
      regex: 'http_requests_total'
      action: keep
```

### Alert Configuration

Our critical alerts setup:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: critical-alerts
spec:
  groups:
  - name: node
    rules:
    - alert: HighCPUUsage
      expr: instance:node_cpu_utilisation:rate5m > 0.8
      for: 5m
      labels:
        severity: warning
      annotations:
        description: "CPU usage above 80% for 5 minutes"
    - alert: MemoryExhausted
      expr: instance:node_memory_utilisation:ratio > 0.95
      for: 5m
      labels:
        severity: critical
      annotations:
        description: "Memory usage above 95%"
```

## Logging with EFK Stack

Our Fluent Bit configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush         1
        Log_Level    info
        Parsers_File parsers.conf

    [INPUT]
        Name             tail
        Path             /var/log/containers/*.log
        Parser           docker
        Tag              kube.*
        Refresh_Interval 5
        Mem_Buf_Limit    5MB
        Skip_Long_Lines  On

    [FILTER]
        Name                kubernetes
        Match               kube.*
        Kube_URL           https://kubernetes.default.svc:443
        Kube_CA_File       /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        Kube_Token_File    /var/run/secrets/kubernetes.io/serviceaccount/token
        Merge_Log          On
        K8S-Logging.Parser On

    [OUTPUT]
        Name            es
        Match           *
        Host            elasticsearch-master
        Port            9200
        Index           kubernetes_cluster
        Type            _doc
        HTTP_User       ${ES_USER}
        HTTP_Passwd     ${ES_PASSWORD}
        Logstash_Format On
        Replace_Dots    On
        Retry_Limit     False
```

### Log Aggregation Tips

1. **Collection Strategy**
   - Use node-level daemonsets
   - Implement proper buffering
   - Handle multiline logs

2. **Performance Tuning**
   - Set appropriate buffer limits
   - Configure retention policies
   - Monitor resource usage

## Distributed Tracing

Our Jaeger configuration:

```yaml
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: jaeger
spec:
  strategy: production
  storage:
    type: elasticsearch
    options:
      es:
        server-urls: https://elasticsearch:9200
        username: ${ES_USER}
        password: ${ES_PASSWORD}
  ingress:
    enabled: true
    hosts:
    - jaeger.example.com
  agent:
    strategy: DaemonSet
```

### Application Instrumentation

Example of tracing in Go:

```go
func main() {
    // Initialize tracer
    cfg := config.Configuration{
        Sampler: &config.SamplerConfig{
            Type:  jaeger.SamplerTypeConst,
            Param: 1,
        },
        Reporter: &config.ReporterConfig{
            LogSpans: true,
            LocalAgentHostPort: "jaeger-agent:6831",
        },
    }
    tracer, closer, err := cfg.NewTracer()
    defer closer.Close()
    opentracing.SetGlobalTracer(tracer)

    // Create span
    span := tracer.StartSpan("operation_name")
    defer span.Finish()
    
    ctx := opentracing.ContextWithSpan(context.Background(), span)
    // Your application code here
}
```

## Metrics Collection

Custom metrics with Prometheus client:

```go
var (
    httpRequestsTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total number of HTTP requests",
        },
        []string{"method", "endpoint", "status"},
    )
    
    requestDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "http_request_duration_seconds",
            Help:    "HTTP request duration in seconds",
            Buckets: []float64{.005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10},
        },
        []string{"method", "endpoint"},
    )
)

func init() {
    prometheus.MustRegister(httpRequestsTotal)
    prometheus.MustRegister(requestDuration)
}
```

## Grafana Dashboards

Our production dashboard configuration:

```yaml
apiVersion: integreatly.org/v1alpha1
kind: GrafanaDashboard
metadata:
  name: kubernetes-cluster
spec:
  json: |
    {
      "annotations": {
        "list": []
      },
      "editable": true,
      "panels": [
        {
          "title": "CPU Usage",
          "type": "graph",
          "datasource": "Prometheus",
          "targets": [
            {
              "expr": "sum(rate(container_cpu_usage_seconds_total{container!=\"\"}[5m])) by (pod)",
              "legendFormat": "{{pod}}"
            }
          ]
        },
        {
          "title": "Memory Usage",
          "type": "graph",
          "datasource": "Prometheus",
          "targets": [
            {
              "expr": "sum(container_memory_usage_bytes{container!=\"\"}) by (pod)",
              "legendFormat": "{{pod}}"
            }
          ]
        }
      ]
    }
```

## Common Observability Issues

From my experience, here are frequent problems and solutions:

1. **Data Volume**
   - Implement proper sampling
   - Set retention policies
   - Use appropriate storage

2. **Performance Impact**
   - Monitor collector overhead
   - Optimize collection intervals
   - Use efficient exporters

3. **Alert Fatigue**
   - Define meaningful thresholds
   - Implement proper grouping
   - Regular alert review

## Production Checklist

✅ **Monitoring**

- [ ] Metrics collection
- [ ] Alert configuration
- [ ] Dashboard setup
- [ ] Resource monitoring

✅ **Logging**

- [ ] Log aggregation
- [ ] Search capabilities
- [ ] Retention policies
- [ ] Access controls

✅ **Tracing**

- [ ] Service instrumentation
- [ ] Sampling configuration
- [ ] Trace correlation
- [ ] Performance analysis

✅ **Alerting**

- [ ] Alert rules
- [ ] Notification channels
- [ ] On-call rotation
- [ ] Escalation policies

## Real-world Example

Complete observability stack deployment:

```yaml
---
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: prometheus
spec:
  serviceAccountName: prometheus
  serviceMonitorSelector:
    matchLabels:
      team: platform
  resources:
    requests:
      memory: 400Mi
    limits:
      memory: 2Gi
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluent-bit
spec:
  template:
    spec:
      containers:
      - name: fluent-bit
        image: fluent/fluent-bit:1.9
        volumeMounts:
        - name: varlog
          mountPath: /var/log
        - name: config
          mountPath: /fluent-bit/etc/
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: config
        configMap:
          name: fluent-bit-config
---
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: jaeger
spec:
  strategy: production
  storage:
    type: elasticsearch
```

## Conclusion

Proper observability is essential for running reliable Kubernetes applications. Key takeaways from my experience:

- Implement comprehensive monitoring
- Collect meaningful metrics
- Configure appropriate alerts
- Use distributed tracing
- Regular system audits

In the next part, we'll explore advanced patterns in Kubernetes, where I'll share practical tips for implementing complex deployment strategies and architectural patterns.

## Additional Resources

- [Prometheus Operator Documentation](https://prometheus-operator.dev/)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [EFK Stack on Kubernetes](https://www.elastic.co/guide/en/cloud-on-k8s/current/k8s-overview.html)
