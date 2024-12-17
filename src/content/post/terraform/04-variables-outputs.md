---
title: "Variables, Outputs, and Dependencies in Terraform"
description: "Learn how to use variables and outputs effectively in Terraform, including variable types, validation, and dependency management"
publishDate: 2023-12-26
tags: ["terraform", "iac", "devops", "variables", "outputs", "dependencies", "series:terraform:4"]
draft: false
---

## Series Navigation

- [Part 1: Terraform Fundamentals](/posts/terraform/01-fundamentals)
- [Part 2: Resource Management and State](/posts/terraform/02-resource-management)
- [Part 3: Essential Terraform Functions](/posts/terraform/03-terraform-functions)
- **Part 4: Variables, Outputs, and Dependencies** (Current)
- [Part 5: Terraform Modules and Workspace Management](/posts/terraform/05-modules-workspace)
- [Part 6: Managing Remote State and Backend](/posts/terraform/06-remote-state)
- [Part 7: Testing and CI/CD Integration](/posts/terraform/07-testing-cicd)
- [Part 8: Terraform Security and Best Practices](/posts/terraform/08-security-practices)

## Understanding Variables in Terraform

Variables make your Terraform configurations flexible and reusable. This post explores different types of variables and how to use them effectively.

## Input Variables

### Basic Variable Declaration

```hcl
# variables.tf
variable "region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-west-2"
}

variable "instance_count" {
  description = "Number of EC2 instances to create"
  type        = number
  default     = 1
}

variable "environment" {
  description = "Environment name"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}
```

### Complex Variable Types

```hcl
# List variable
variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-west-2a", "us-west-2b"]
}

# Map variable
variable "instance_types" {
  description = "Instance types per environment"
  type        = map(string)
  default     = {
    dev     = "t3.micro"
    staging = "t3.small"
    prod    = "t3.medium"
  }
}

# Object variable
variable "vpc_config" {
  description = "VPC configuration"
  type = object({
    cidr_block = string
    enable_dns = bool
    tags       = map(string)
  })
  default = {
    cidr_block = "10.0.0.0/16"
    enable_dns = true
    tags       = {
      Environment = "dev"
    }
  }
}
```

### Variable Validation

```hcl
variable "database_port" {
  description = "Database port number"
  type        = number
  
  validation {
    condition     = var.database_port > 1024 && var.database_port < 65535
    error_message = "Database port must be between 1024 and 65535."
  }
}

variable "environment_name" {
  description = "Environment name with specific format"
  type        = string
  
  validation {
    condition     = can(regex("^[a-z]+-[a-z]+$", var.environment_name))
    error_message = "Environment name must be lowercase and contain two words separated by a hyphen."
  }
}
```

## Local Variables

Local variables are useful for intermediate calculations and reducing repetition.

```hcl
locals {
  # Simple local variable
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
  
  # Computed local variable
  instance_name = "${var.project_name}-${var.environment}-instance"
  
  # Complex transformation
  subnet_cidrs = [
    for index, az in var.availability_zones :
    cidrsubnet(var.vpc_cidr, 8, index)
  ]
  
  # Conditional local variable
  instance_type = var.environment == "prod" ? "t3.medium" : "t3.micro"
}
```

## Output Values

Outputs expose specific values that can be queried or used by other configurations.

### Basic Outputs

```hcl
# outputs.tf
output "vpc_id" {
  description = "ID of the created VPC"
  value       = aws_vpc.main.id
}

output "instance_ips" {
  description = "Private IPs of created instances"
  value       = aws_instance.web[*].private_ip
}

output "database_endpoint" {
  description = "Database connection endpoint"
  value       = aws_db_instance.main.endpoint
  sensitive   = true  # Marks output as sensitive
}
```

### Complex Outputs

```hcl
output "instance_details" {
  description = "Details of all created instances"
  value = {
    for instance in aws_instance.web :
    instance.id => {
      private_ip = instance.private_ip
      public_ip  = instance.public_ip
      subnet_id  = instance.subnet_id
      tags       = instance.tags
    }
  }
}

output "subnet_info" {
  description = "Information about created subnets"
  value = [
    for subnet in aws_subnet.main :
    {
      id         = subnet.id
      cidr_block = subnet.cidr_block
      az         = subnet.availability_zone
    }
  ]
}
```

## Variable Files

### terraform.tfvars

```hcl
# terraform.tfvars
region         = "us-west-2"
instance_count = 2
environment    = "prod"

vpc_config = {
  cidr_block = "172.16.0.0/16"
  enable_dns = true
  tags = {
    Environment = "prod"
    Team        = "infrastructure"
  }
}
```

### Environment-specific Variables

```hcl
# prod.tfvars
environment    = "prod"
instance_count = 3
instance_type  = "t3.medium"

vpc_config = {
  cidr_block = "10.0.0.0/16"
  enable_dns = true
  tags = {
    Environment = "prod"
    Compliance  = "pci"
  }
}

# dev.tfvars
environment    = "dev"
instance_count = 1
instance_type  = "t3.micro"

vpc_config = {
  cidr_block = "172.16.0.0/16"
  enable_dns = true
  tags = {
    Environment = "dev"
    Team        = "development"
  }
}
```

## Managing Dependencies

### Implicit Dependencies

```hcl
# VPC and subnet with implicit dependency
resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr
}

resource "aws_subnet" "main" {
  vpc_id     = aws_vpc.main.id  # Implicit dependency
  cidr_block = var.subnet_cidr
}
```

### Explicit Dependencies

```hcl
# Using depends_on for explicit dependencies
resource "aws_iam_role_policy" "example" {
  name   = "example"
  role   = aws_iam_role.example.id
  policy = data.aws_iam_policy_document.example.json
  
  depends_on = [
    aws_iam_role.example,
    aws_s3_bucket.log_bucket
  ]
}
```

### Data Source Dependencies

```hcl
# Using data sources
data "aws_vpc" "existing" {
  id = var.vpc_id
}

resource "aws_subnet" "example" {
  vpc_id     = data.aws_vpc.existing.id
  cidr_block = cidrsubnet(data.aws_vpc.existing.cidr_block, 8, 1)
}
```

## Variable Best Practices

1. **Use Descriptive Names**
   ```hcl
   # Good
   variable "vpc_cidr_block" { }
   
   # Avoid
   variable "vcb" { }
   ```

2. **Always Include Descriptions**
   ```hcl
   variable "environment" {
     description = "The deployment environment (dev/staging/prod)"
     type        = string
   }
   ```

3. **Set Appropriate Defaults**
   ```hcl
   variable "enable_monitoring" {
     description = "Enable detailed monitoring"
     type        = bool
     default     = false  # Conservative default
   }
   ```

4. **Use Type Constraints**
   ```hcl
   variable "instance_tags" {
     description = "Tags to apply to instances"
     type        = map(string)
     default     = {}
   }
   ```

## Practical Examples

### Complete Infrastructure Configuration

```hcl
# variables.tf
variable "project" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

# main.tf
locals {
  name_prefix = "${var.project}-${var.environment}"
  
  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-vpc"
  })
}

resource "aws_subnet" "private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = var.availability_zones[count.index]
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-private-${count.index + 1}"
    Type = "private"
  })
}

# outputs.tf
output "vpc_details" {
  description = "VPC and subnet details"
  value = {
    vpc_id     = aws_vpc.main.id
    vpc_cidr   = aws_vpc.main.cidr_block
    subnet_ids = aws_subnet.private[*].id
  }
}
```

## Next Steps

In [Part 5: Terraform Modules and Workspace Management](/posts/terraform/05-modules-workspace), we'll explore how to organize your Terraform code into reusable modules and manage different workspaces.

## Additional Resources

- [Terraform Variables Documentation](https://www.terraform.io/docs/language/values/variables.html)
- [Output Values Documentation](https://www.terraform.io/docs/language/values/outputs.html)
- [Variable Validation Documentation](https://www.terraform.io/docs/language/values/variables.html#custom-validation-rules)
