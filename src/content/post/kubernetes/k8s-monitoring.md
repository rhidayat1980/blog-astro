---
title: "Monitoring Kubernetes Clusters"
description: "Learn about monitoring Kubernetes clusters using Prometheus, Grafana, and other tools, along with best practices for observability"
publishDate: "11 Dec 2024"
tags: ["kubernetes", "k8s", "monitoring", "devops", "cloud-native", "prometheus", "grafana", "observability", "series:kubernetes:12"]
draft: false
---

## Kubernetes Monitoring Overview

Effective monitoring is crucial for maintaining healthy Kubernetes clusters and applications. This guide covers the essential aspects of Kubernetes monitoring and observability.

## Key Monitoring Components

### Metrics

Important metrics to monitor:

1. **Node Metrics**
   - CPU usage
   - Memory utilization
   - Disk I/O
   - Network traffic

2. **Pod Metrics**
   - Resource usage
   - Container states
   - Restart count
   - Network statistics

3. **Application Metrics**
   - Request latency
   - Error rates
   - Throughput
   - Custom metrics

## Prometheus

### Architecture

Prometheus components:

- Prometheus server
- Alert manager
- Push gateway
- Service discovery

### Configuration

Basic Prometheus configuration:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'kubernetes-apiservers'
    kubernetes_sd_configs:
    - role: endpoints
    scheme: https
    tls_config:
      ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
```

### Service Discovery

Kubernetes service discovery configuration:

```yaml
- job_name: 'kubernetes-pods'
  kubernetes_sd_configs:
  - role: pod
  relabel_configs:
  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
    action: keep
    regex: true
```

## Grafana

### Dashboard Setup

Essential dashboards:

1. Cluster overview
2. Node metrics
3. Pod resources
4. Application metrics

### Data Sources

Common data sources:

- Prometheus
- Loki
- Elasticsearch
- InfluxDB

### Alert Configuration

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: example-alert
spec:
  groups:
  - name: example
    rules:
    - alert: HighRequestLatency
      expr: http_request_duration_seconds > 1
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: High request latency
```

## Logging Solutions

### EFK Stack

Components:

1. Elasticsearch
2. Fluentd/Fluent Bit
3. Kibana

### Loki

Advantages:

- Lightweight
- Kubernetes-native
- Cost-effective
- Label-based indexing

## Tracing

### Jaeger

Features:

- Distributed tracing
- Service dependency analysis
- Performance optimization
- Root cause analysis

### OpenTelemetry

Benefits:

- Standardized instrumentation
- Multiple backend support
- Automatic instrumentation
- Cross-service tracing

## Best Practices

### 1. Resource Monitoring

Monitor and alert on:

- Resource utilization
- Performance metrics
- Error rates
- SLO violations

### 2. Log Management

Implement:

- Centralized logging
- Log rotation
- Structured logging
- Log retention policies

### 3. Alert Configuration

Design alerts for:

- Critical issues
- Performance degradation
- Resource constraints
- Application errors

### 4. Dashboard Organization

Create dashboards for:

- Overview metrics
- Detailed analysis
- Troubleshooting
- Custom views

## Tools Comparison

### Monitoring Stacks

1. **Prometheus + Grafana**
   - Open-source
   - Widely adopted
   - Powerful querying
   - Rich ecosystem

2. **Datadog**
   - SaaS solution
   - Easy setup
   - Comprehensive features
   - Built-in integrations

3. **New Relic**
   - Full observability
   - APM features
   - ML capabilities
   - Custom dashboards

## Implementation Guide

### 1. Basic Setup

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: example-app
spec:
  selector:
    matchLabels:
      app: example
  endpoints:
  - port: web
```

### 2. Custom Metrics

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: custom-metrics
spec:
  selector:
    matchLabels:
      app: custom-app
  podMetricsEndpoints:
  - port: metrics
```

### 3. Alert Rules

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: custom-alerts
spec:
  groups:
  - name: custom
    rules:
    - alert: PodNotReady
      expr: kube_pod_status_ready{condition="true"} == 0
      for: 5m
      labels:
        severity: critical
```

## Series Navigation

- Previous: [Persistent Storage in Kubernetes](/posts/kubernetes/k8s-persistent-volumes)
- Next: [CI/CD with Kubernetes](/posts/kubernetes/k8s-cicd)

## Troubleshooting

Common issues and solutions:

1. **Metric Collection**
   - Check endpoints
   - Verify permissions
   - Review configurations
   - Check network policies

2. **Alert Management**
   - Validate rules
   - Check routing
   - Review silences
   - Test notifications

3. **Dashboard Issues**
   - Verify data sources
   - Check queries
   - Review permissions
   - Update variables

## Conclusion

Effective monitoring is essential for maintaining reliable Kubernetes clusters. A combination of metrics, logging, and tracing provides comprehensive observability into your cluster's health and performance.
