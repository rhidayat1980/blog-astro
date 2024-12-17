---
title: "AWS Infrastructure with CDK - Part 6: IAM & Security"
description: "Implement comprehensive IAM policies and security controls using Terraform CDK"
publishDate: 2024-01-27
tags: ["terraform", "cdk", "typescript", "aws", "iam", "security", "series:terraform-cdk-aws:6"]
draft: false
---

## Series Navigation

- [Part 1: Project Setup](/posts/terraform-cdk/aws-example/01-project-setup)
- [Part 2: VPC and Network](/posts/terraform-cdk/aws-example/02-vpc-network)
- [Part 3: EKS Cluster](/posts/terraform-cdk/aws-example/03-eks-setup)
- [Part 4: RDS Database](/posts/terraform-cdk/aws-example/04-rds-setup)
- [Part 5: S3 Storage](/posts/terraform-cdk/aws-example/05-s3-setup)
- **Part 6: IAM & Security** (Current)
- [Part 7: CI/CD Pipeline](/posts/terraform-cdk/aws-example/07-cicd-setup)

## IAM Security

### IAM Roles

Create IAM roles for the EKS cluster and RDS database.

```typescript
import * as iam from 'aws-cdk-lib/aws-iam';

const eksRole = new iam.Role(this, 'EKSRole', {
  assumedBy: new iam.ServicePrincipal('eks.amazonaws.com'),
});

const rdsRole = new iam.Role(this, 'RDSRole', {
  assumedBy: new iam.ServicePrincipal('rds.amazonaws.com'),
});
```

### IAM Policies

Create IAM policies for the EKS cluster and RDS database.

```typescript
import * as iam from 'aws-cdk-lib/aws-iam';

const eksPolicy = new iam.Policy(this, 'EKSPolicy', {
  statements: [
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['eks:*'],
      resources: ['*'],
    }),
  ],
});

const rdsPolicy = new iam.Policy(this, 'RDSPolicy', {
  statements: [
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['rds:*'],
      resources: ['*'],
    }),
  ],
});
```

### Attach Policies to Roles

Attach the IAM policies to the IAM roles.

```typescript
eksRole.attachInlinePolicy(eksPolicy);
rdsRole.attachInlinePolicy(rdsPolicy);
```

## Next Steps

In [Part 7: CI/CD Pipeline](/posts/terraform-cdk/aws-example/07-cicd-setup), we'll create CI/CD pipelines for our infrastructure using GitHub Actions, GitLab CI, and other popular tools.
