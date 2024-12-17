---
title: "Terraform Modules and Workspace Management"
description: "Learn how to create reusable Terraform modules and manage multiple environments with workspaces"
publishDate: 2023-12-29
tags: ["terraform", "iac", "devops", "modules", "workspace", "infrastructure", "series:terraform:5"]
draft: false
---

## Series Navigation

- [Part 1: Terraform Fundamentals](/posts/terraform/01-fundamentals)
- [Part 2: Resource Management and State](/posts/terraform/02-resource-management)
- [Part 3: Essential Terraform Functions](/posts/terraform/03-terraform-functions)
- [Part 4: Variables, Outputs, and Dependencies](/posts/terraform/04-variables-outputs)
- **Part 5: Terraform Modules and Workspace Management** (Current)
- [Part 6: Managing Remote State and Backend](/posts/terraform/06-remote-state)
- [Part 7: Testing and CI/CD Integration](/posts/terraform/07-testing-cicd)
- [Part 8: Terraform Security and Best Practices](/posts/terraform/08-security-practices)

## Understanding Terraform Modules

Modules are containers for multiple resources that are used together. They help you organize and reuse your Terraform code.

## Module Structure

A typical module structure:

```plaintext
modules/
└── vpc/
    ├── main.tf
    ├── variables.tf
    ├── outputs.tf
    └── README.md
```

### Module Files

```hcl
# modules/vpc/variables.tf
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
}

# modules/vpc/main.tf
resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr
  
  tags = {
    Name        = "${var.environment}-vpc"
    Environment = var.environment
  }
}

resource "aws_subnet" "private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = var.availability_zones[count.index]
  
  tags = {
    Name        = "${var.environment}-private-${count.index + 1}"
    Environment = var.environment
  }
}

# modules/vpc/outputs.tf
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = aws_subnet.private[*].id
}
```

## Using Modules

### Local Modules

```hcl
# main.tf
module "vpc" {
  source = "./modules/vpc"
  
  vpc_cidr           = "10.0.0.0/16"
  environment        = "prod"
  availability_zones = ["us-west-2a", "us-west-2b"]
}

# Reference module outputs
resource "aws_instance" "example" {
  subnet_id = module.vpc.private_subnet_ids[0]
  # ... other configuration
}
```

### Remote Modules

```hcl
# Using public registry module
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "3.2.0"
  
  name = "my-vpc"
  cidr = "10.0.0.0/16"
  
  azs             = ["us-west-2a", "us-west-2b", "us-west-2c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

# Using Git source
module "vpc" {
  source = "git::https://github.com/example/terraform-aws-vpc.git?ref=v1.0.0"
  
  # Module inputs
}
```

## Module Composition

### Creating Composite Modules

```hcl
# modules/web-app/main.tf
module "vpc" {
  source = "../vpc"
  
  vpc_cidr           = var.vpc_cidr
  environment        = var.environment
  availability_zones = var.availability_zones
}

module "security_group" {
  source = "../security-group"
  
  vpc_id      = module.vpc.vpc_id
  environment = var.environment
}

resource "aws_instance" "web" {
  count         = var.instance_count
  subnet_id     = module.vpc.private_subnet_ids[count.index % length(module.vpc.private_subnet_ids)]
  vpc_security_group_ids = [module.security_group.id]
  
  # ... other configuration
}
```

### Module Versioning

```hcl
# Using specific version
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "3.2.0"
}

# Using version constraints
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 3.2"  # Any version in 3.2.x
}
```

## Terraform Workspaces

Workspaces allow you to manage multiple states for the same configuration.

### Managing Workspaces

```bash
# List workspaces
terraform workspace list

# Create new workspace
terraform workspace new dev

# Switch workspace
terraform workspace select prod

# Delete workspace
terraform workspace delete dev
```

### Using Workspaces in Configuration

```hcl
# main.tf
locals {
  environment = terraform.workspace
  
  instance_type = {
    default = "t3.micro"
    dev     = "t3.small"
    staging = "t3.medium"
    prod    = "t3.large"
  }
}

resource "aws_instance" "example" {
  instance_type = lookup(local.instance_type, local.environment, local.instance_type["default"])
  
  tags = {
    Environment = local.environment
  }
}
```

## Module Best Practices

### 1. Module Structure

```bash
module/
├── README.md           # Documentation
├── main.tf            # Main resources
├── variables.tf       # Input variables
├── outputs.tf         # Output values
├── versions.tf        # Required providers
└── examples/          # Example configurations
    └── basic/
        ├── main.tf
        └── variables.tf
```

### 2. Input Variable Validation

```hcl
variable "environment" {
  description = "Environment name"
  type        = string
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}
```

### 3. Module Documentation

```markdown
# AWS VPC Module

This module creates a VPC with private and public subnets.

## Usage

```hcl
module "vpc" {
  source = "./modules/vpc"
  
  vpc_cidr    = "10.0.0.0/16"
  environment = "prod"
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| vpc_cidr | CIDR block for VPC | string | n/a | yes |
| environment | Environment name | string | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| vpc_id | ID of the VPC |

```

## Advanced Module Patterns

### 1. Conditional Creation

```hcl
variable "create_vpc" {
  description = "Controls if VPC should be created"
  type        = bool
  default     = true
}

resource "aws_vpc" "main" {
  count = var.create_vpc ? 1 : 0
  
  cidr_block = var.vpc_cidr
}
```

### 2. Dynamic Block Generation

```hcl
variable "subnet_configs" {
  description = "List of subnet configurations"
  type = list(object({
    cidr_block = string
    az         = string
    public     = bool
  }))
}

resource "aws_subnet" "this" {
  for_each = {
    for idx, subnet in var.subnet_configs :
    "${subnet.az}-${subnet.public ? "public" : "private"}" => subnet
  }
  
  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value.cidr_block
  availability_zone = each.value.az
  
  tags = {
    Name = "${var.environment}-${each.key}"
    Type = each.value.public ? "public" : "private"
  }
}
```

### 3. Module Composition with Count

```hcl
module "subnet" {
  source = "./modules/subnet"
  count  = length(var.availability_zones)
  
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = var.availability_zones[count.index]
}
```

## Workspace Management Strategies

### 1. Environment-Specific Variables

```hcl
# terraform.tfvars.json
{
  "dev": {
    "instance_type": "t3.micro",
    "instance_count": 1
  },
  "prod": {
    "instance_type": "t3.large",
    "instance_count": 3
  }
}

# main.tf
locals {
  env_config = jsondecode(file("terraform.tfvars.json"))
  config     = local.env_config[terraform.workspace]
}

resource "aws_instance" "example" {
  count         = local.config.instance_count
  instance_type = local.config.instance_type
}
```

### 2. Workspace-Aware Backend Configuration

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket = "my-terraform-states"
    key    = "workspaces/${terraform.workspace}/terraform.tfstate"
    region = "us-west-2"
  }
}
```

## Next Steps

In [Part 6: Managing Remote State and Backend](/posts/terraform/06-remote-state), we'll explore how to manage Terraform state remotely and configure different backend options.

## Additional Resources

- [Terraform Module Documentation](https://www.terraform.io/docs/language/modules/index.html)
- [Terraform Registry](https://registry.terraform.io/)
- [Workspace Documentation](https://www.terraform.io/docs/language/state/workspaces.html)
