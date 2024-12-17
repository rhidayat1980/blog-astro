---
title: "Resource Management with Terraform CDK"
description: "Learn how to manage cloud resources effectively using Terraform CDK and TypeScript"
publishDate: 2024-01-05
tags: ["terraform", "cdk", "typescript", "iac", "devops", "infrastructure", "series:terraform-cdk:2"]
draft: false
---

## Series Navigation

- [Part 1: Getting Started with Terraform CDK](/posts/terraform-cdk/01-getting-started)
- **Part 2: Resource Management with CDK** (Current)
- [Part 3: Advanced TypeScript Patterns](/posts/terraform-cdk/03-typescript-patterns)
- [Part 4: Custom Constructs and Components](/posts/terraform-cdk/04-custom-constructs)
- [Part 5: Testing CDK Applications](/posts/terraform-cdk/05-testing)
- [Part 6: CI/CD for CDK Projects](/posts/terraform-cdk/06-cicd)

## Resource Management in CDKTF

In this post, we'll explore how to manage various cloud resources using CDKTF, handle dependencies between resources, and work with state management.

## Resource Definition Patterns

### Basic Resource Definition

```typescript
import { Construct } from "constructs";
import { App, TerraformStack } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { Vpc } from "@cdktf/provider-aws/lib/vpc";
import { Subnet } from "@cdktf/provider-aws/lib/subnet";

class NetworkStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AwsProvider(this, "AWS", {
      region: "us-west-2",
    });

    const vpc = new Vpc(this, "MyVpc", {
      cidrBlock: "10.0.0.0/16",
      enableDnsHostnames: true,
      enableDnsSupport: true,
      tags: {
        Name: "MyVpc",
        Environment: "Production",
      },
    });

    new Subnet(this, "PublicSubnet", {
      vpcId: vpc.id,
      cidrBlock: "10.0.1.0/24",
      availabilityZone: "us-west-2a",
      tags: {
        Name: "PublicSubnet",
        Type: "Public",
      },
    });
  }
}
```

### Resource Properties and References

CDKTF allows you to reference properties of other resources using TypeScript's type system:

```typescript
import { Instance } from "@cdktf/provider-aws/lib/instance";
import { SecurityGroup } from "@cdktf/provider-aws/lib/security-group";

// In your stack class
const securityGroup = new SecurityGroup(this, "WebSG", {
  vpcId: vpc.id,
  ingress: [{
    fromPort: 80,
    toPort: 80,
    protocol: "tcp",
    cidrBlocks: ["0.0.0.0/0"],
  }],
});

const webServer = new Instance(this, "WebServer", {
  ami: "ami-0735c191cf914754d",
  instanceType: "t2.micro",
  subnetId: publicSubnet.id,
  vpcSecurityGroupIds: [securityGroup.id],
});
```

## Working with Dependencies

### Explicit Dependencies

Use the `dependsOn` property to create explicit dependencies:

```typescript
import { S3Bucket } from "@cdktf/provider-aws/lib/s3-bucket";
import { S3BucketPolicy } from "@cdktf/provider-aws/lib/s3-bucket-policy";

const bucket = new S3Bucket(this, "MyBucket", {
  bucket: "my-unique-bucket-name",
});

const bucketPolicy = new S3BucketPolicy(this, "BucketPolicy", {
  bucket: bucket.id,
  policy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [{
      Effect: "Allow",
      Principal: "*",
      Action: "s3:GetObject",
      Resource: `${bucket.arn}/*`,
    }],
  }),
  dependsOn: [bucket], // Explicit dependency
});
```

### Implicit Dependencies

CDKTF automatically handles dependencies when you reference one resource in another:

```typescript
import { IamRole } from "@cdktf/provider-aws/lib/iam-role";
import { IamRolePolicyAttachment } from "@cdktf/provider-aws/lib/iam-role-policy-attachment";

const role = new IamRole(this, "MyRole", {
  name: "my-role",
  assumeRolePolicy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [{
      Action: "sts:AssumeRole",
      Effect: "Allow",
      Principal: {
        Service: "ec2.amazonaws.com",
      },
    }],
  }),
});

// Policy attachment implicitly depends on the role
new IamRolePolicyAttachment(this, "RolePolicy", {
  role: role.name, // Implicit dependency
  policyArn: "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess",
});
```

## State Management

### Remote State Configuration

Configure remote state storage using the `cdktf.json` file:

```json
{
  "language": "typescript",
  "app": "npm run --silent compile && node main.js",
  "terraformProviders": ["aws@~> 4.0"],
  "terraformModules": [],
  "context": {
    "excludeStackIdFromLogicalIds": "true",
    "allowSepCharsInLogicalIds": "true"
  },
  "projectId": "my-project",
  "terraformBackend": {
    "hostname": "app.terraform.io",
    "organization": "my-org",
    "workspaces": {
      "name": "my-workspace"
    }
  }
}
```

### State Management in Code

You can also configure backend settings in your TypeScript code:

```typescript
import { S3Backend } from "cdktf";

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Configure S3 backend
    new S3Backend(this, {
      bucket: "my-terraform-state",
      key: "terraform.tfstate",
      region: "us-west-2",
      encrypt: true,
      dynamodbTable: "terraform-locks",
    });

    // Rest of your stack configuration...
  }
}
```

## Resource Organization

### Using TypeScript Classes

Organize related resources into classes:

```typescript
class DatabaseResources extends Construct {
  public readonly dbInstance: Instance;
  public readonly securityGroup: SecurityGroup;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.securityGroup = new SecurityGroup(this, "DbSG", {
      // Security group configuration
    });

    this.dbInstance = new Instance(this, "DbInstance", {
      // Instance configuration
    });
  }
}

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const dbResources = new DatabaseResources(this, "Database");
    // Use dbResources.dbInstance and dbResources.securityGroup
  }
}
```

## Best Practices

1. **Resource Naming**
   - Use consistent naming conventions
   - Leverage TypeScript's type system for validation

```typescript
interface ResourceConfig {
  environment: string;
  project: string;
}

function createResourceName(config: ResourceConfig, resourceType: string): string {
  return `${config.project}-${config.environment}-${resourceType}`;
}
```

2. **Resource Tagging**
   - Implement consistent tagging strategies
   - Create reusable tag functions

```typescript
interface Tags {
  [key: string]: string;
}

function getDefaultTags(config: ResourceConfig): Tags {
  return {
    Environment: config.environment,
    Project: config.project,
    ManagedBy: "CDKTF",
  };
}
```

3. **Resource Configuration**
   - Use environment variables or configuration files
   - Create type-safe configuration interfaces

```typescript
interface StackConfig {
  vpcCidr: string;
  environment: string;
  region: string;
}

const config: StackConfig = {
  vpcCidr: process.env.VPC_CIDR || "10.0.0.0/16",
  environment: process.env.ENVIRONMENT || "development",
  region: process.env.AWS_REGION || "us-west-2",
};
```

## Next Steps

In [Part 3: Advanced TypeScript Patterns](/posts/terraform-cdk/03-typescript-patterns), we'll explore advanced TypeScript patterns and features that can make your CDKTF code more maintainable and reusable.

## Additional Resources

- [CDKTF State Management](https://developer.hashicorp.com/terraform/cdktf/concepts/remote-backends)
- [AWS CDK Patterns](https://cdkpatterns.com/)
- [TypeScript Design Patterns](https://www.typescriptlang.org/docs/handbook/2/classes.html)
