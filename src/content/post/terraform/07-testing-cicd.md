---
title: "Testing and CI/CD Integration with Terraform"
description: "Learn how to implement testing strategies and integrate Terraform with CI/CD pipelines for automated infrastructure deployment"
publishDate: 2023-12-31
tags: ["terraform", "iac", "devops", "testing", "cicd", "infrastructure", "series:terraform:7"]
draft: false
---

## Series Navigation

- [Part 1: Terraform Fundamentals](/posts/terraform/01-fundamentals)
- [Part 2: Resource Management and State](/posts/terraform/02-resource-management)
- [Part 3: Essential Terraform Functions](/posts/terraform/03-terraform-functions)
- [Part 4: Variables, Outputs, and Dependencies](/posts/terraform/04-variables-outputs)
- [Part 5: Terraform Modules and Workspace Management](/posts/terraform/05-modules-workspace)
- [Part 6: Managing Remote State and Backend](/posts/terraform/06-remote-state)
- **Part 7: Testing and CI/CD Integration** (Current)
- [Part 8: Terraform Security and Best Practices](/posts/terraform/08-security-practices)

## Testing Strategies

### Unit Testing with Terratest

```go
// test/vpc_test.go
package test

import (
    "testing"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/assert"
)

func TestVPCCreation(t *testing.T) {
    terraformOptions := &terraform.Options{
        TerraformDir: "../modules/vpc",
        Vars: map[string]interface{}{
            "vpc_cidr":     "10.0.0.0/16",
            "environment":  "test",
            "region":       "us-west-2",
        },
    }

    defer terraform.Destroy(t, terraformOptions)
    terraform.InitAndApply(t, terraformOptions)

    vpcID := terraform.Output(t, terraformOptions, "vpc_id")
    assert.NotEmpty(t, vpcID)
}
```

### Integration Testing

```go
// test/integration_test.go
func TestFullStackDeployment(t *testing.T) {
    terraformOptions := &terraform.Options{
        TerraformDir: "../environments/test",
        Vars: map[string]interface{}{
            "environment": "test",
            "region":     "us-west-2",
        },
    }

    defer terraform.Destroy(t, terraformOptions)
    terraform.InitAndApply(t, terraformOptions)

    // Test VPC
    vpcID := terraform.Output(t, terraformOptions, "vpc_id")
    assert.NotEmpty(t, vpcID)

    // Test Subnets
    privateSubnets := terraform.Output(t, terraformOptions, "private_subnet_ids")
    assert.Greater(t, len(privateSubnets), 0)

    // Test Load Balancer
    lbDNS := terraform.Output(t, terraformOptions, "lb_dns_name")
    assert.NotEmpty(t, lbDNS)
}
```

### Static Analysis

```hcl
# .tflint.hcl
plugin "aws" {
    enabled = true
    version = "0.21.1"
    source  = "github.com/terraform-linters/tflint-ruleset-aws"
}

rule "terraform_deprecated_index" {
    enabled = true
}

rule "terraform_unused_declarations" {
    enabled = true
}

rule "terraform_documented_variables" {
    enabled = true
}
```

## CI/CD Pipeline Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/terraform.yml
name: Terraform CI/CD

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  terraform:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Terraform
      uses: hashicorp/setup-terraform@v1
      with:
        terraform_version: 1.0.0
    
    - name: Terraform Format
      run: terraform fmt -check
    
    - name: Terraform Init
      run: terraform init
      
    - name: Terraform Validate
      run: terraform validate
    
    - name: Terraform Plan
      run: terraform plan
      env:
        AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
        AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    
    - name: Terraform Apply
      if: github.ref == 'refs/heads/main' && github.event_name == 'push'
      run: terraform apply -auto-approve
      env:
        AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
        AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

### GitLab CI Pipeline

```yaml
# .gitlab-ci.yml
image:
  name: hashicorp/terraform:1.0.0
  entrypoint: [""]

variables:
  TF_ROOT: ${CI_PROJECT_DIR}/environments/prod
  TF_ADDRESS: ${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/terraform/state/prod

stages:
  - validate
  - plan
  - apply

before_script:
  - cd ${TF_ROOT}
  - terraform init

validate:
  stage: validate
  script:
    - terraform validate
    - terraform fmt -check

plan:
  stage: plan
  script:
    - terraform plan -out=plan.tfplan
  artifacts:
    paths:
      - plan.tfplan

apply:
  stage: apply
  script:
    - terraform apply plan.tfplan
  dependencies:
    - plan
  only:
    - main
  when: manual
```

### Jenkins Pipeline

```groovy
// Jenkinsfile
pipeline {
    agent any
    
    environment {
        TF_IN_AUTOMATION = 'true'
        AWS_CREDENTIALS = credentials('aws-credentials')
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Terraform Init') {
            steps {
                sh 'terraform init'
            }
        }
        
        stage('Terraform Format') {
            steps {
                sh 'terraform fmt -check'
            }
        }
        
        stage('Terraform Validate') {
            steps {
                sh 'terraform validate'
            }
        }
        
        stage('Terraform Plan') {
            steps {
                withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', 
                                credentialsId: 'aws-credentials',
                                accessKeyVariable: 'AWS_ACCESS_KEY_ID',
                                secretKeyVariable: 'AWS_SECRET_ACCESS_KEY']]) {
                    sh 'terraform plan -out=tfplan'
                }
            }
        }
        
        stage('Terraform Apply') {
            when {
                branch 'main'
            }
            steps {
                withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', 
                                credentialsId: 'aws-credentials',
                                accessKeyVariable: 'AWS_ACCESS_KEY_ID',
                                secretKeyVariable: 'AWS_SECRET_ACCESS_KEY']]) {
                    sh 'terraform apply -auto-approve tfplan'
                }
            }
        }
    }
    
    post {
        always {
            cleanWs()
        }
    }
}
```

## Automated Testing Setup

### Test Structure

```plaintext
.
├── modules/
│   └── vpc/
│       ├── main.tf
│       └── test/
│           ├── vpc_test.go
│           └── integration_test.go
├── environments/
│   ├── dev/
│   │   └── main.tf
│   └── prod/
│       └── main.tf
└── test/
    ├── go.mod
    ├── go.sum
    └── helper/
        └── test_helper.go
```

### Test Helper Functions

```go
// test/helper/test_helper.go
package helper

import (
    "testing"
    "github.com/gruntwork-io/terratest/modules/terraform"
)

func SetupTestEnvironment(t *testing.T, terraformDir string) *terraform.Options {
    terraformOptions := &terraform.Options{
        TerraformDir: terraformDir,
        Vars: map[string]interface{}{
            "environment": "test",
            "region":     "us-west-2",
        },
        NoColor: true,
    }

    terraform.Init(t, terraformOptions)
    return terraformOptions
}

func CleanupTestEnvironment(t *testing.T, terraformOptions *terraform.Options) {
    terraform.Destroy(t, terraformOptions)
}
```

## Continuous Deployment Strategies

### Blue-Green Deployment

```hcl
# modules/blue-green/main.tf
variable "environment" {
  type = string
}

variable "color" {
  type = string
}

resource "aws_autoscaling_group" "app" {
  name = "${var.environment}-${var.color}"
  
  launch_template {
    id = aws_launch_template.app.id
  }
  
  target_group_arns = [aws_lb_target_group.app.arn]
  
  tag {
    key                 = "Environment"
    value              = var.environment
    propagate_at_launch = true
  }
  
  tag {
    key                 = "Color"
    value              = var.color
    propagate_at_launch = true
  }
}

resource "aws_lb_listener_rule" "app" {
  listener_arn = aws_lb_listener.front_end.arn
  
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
  
  condition {
    host_header {
      values = ["${var.color}.${var.environment}.example.com"]
    }
  }
}
```

### Canary Deployment

```hcl
# modules/canary/main.tf
resource "aws_lambda_alias" "app" {
  name             = "production"
  function_name    = aws_lambda_function.app.function_name
  function_version = aws_lambda_function.app.version
  
  routing_config {
    additional_version_weights = {
      "${aws_lambda_function.app_new.version}" = var.canary_weight
    }
  }
}

resource "aws_cloudwatch_metric_alarm" "errors" {
  alarm_name          = "lambda-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "Errors"
  namespace          = "AWS/Lambda"
  period             = "300"
  statistic          = "Sum"
  threshold          = "1"
  
  dimensions = {
    FunctionName = aws_lambda_function.app_new.function_name
    Resource     = aws_lambda_function.app_new.function_name
  }
  
  alarm_actions = [aws_sns_topic.rollback.arn]
}
```

## Monitoring and Alerting

### CloudWatch Integration

```hcl
resource "aws_cloudwatch_dashboard" "terraform" {
  dashboard_name = "terraform-deployment"
  
  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        width  = 12
        height = 6
        
        properties = {
          metrics = [
            ["AWS/States", "ExecutionsSucceeded"],
            ["AWS/States", "ExecutionsFailed"]
          ]
          period = 300
          stat   = "Sum"
          region = "us-west-2"
          title  = "Terraform State Machine Executions"
        }
      }
    ]
  })
}

resource "aws_cloudwatch_metric_alarm" "deployment_failure" {
  alarm_name          = "terraform-deployment-failure"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name        = "ExecutionsFailed"
  namespace          = "AWS/States"
  period             = "300"
  statistic          = "Sum"
  threshold          = "0"
  
  alarm_actions = [aws_sns_topic.alerts.arn]
}
```

## Next Steps

In [Part 8: Terraform Security and Best Practices](/posts/terraform/08-security-practices), we'll explore security considerations and best practices for Terraform deployments.

## Additional Resources

- [Terratest Documentation](https://terratest.gruntwork.io/docs/)
- [Terraform CI/CD Best Practices](https://www.terraform.io/docs/cloud/guides/recommended-practices/index.html)
- [AWS CI/CD Pipeline Examples](https://docs.aws.amazon.com/codepipeline/latest/userguide/tutorials.html)
