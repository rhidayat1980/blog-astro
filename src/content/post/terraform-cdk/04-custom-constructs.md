---
title: "Custom Constructs and Components in Terraform CDK"
description: "Learn how to create reusable and maintainable infrastructure components using Terraform CDK constructs"
publishDate: 2024-01-11
tags: ["terraform", "cdk", "typescript", "iac", "devops", "constructs", "series:terraform-cdk:4"]
draft: false
---

## Series Navigation

- [Part 1: Getting Started with Terraform CDK](/posts/terraform-cdk/01-getting-started)
- [Part 2: Resource Management with CDK](/posts/terraform-cdk/02-resource-management)
- [Part 3: Advanced TypeScript Patterns](/posts/terraform-cdk/03-typescript-patterns)
- **Part 4: Custom Constructs and Components** (Current)
- [Part 5: Testing CDK Applications](/posts/terraform-cdk/05-testing)
- [Part 6: CI/CD for CDK Projects](/posts/terraform-cdk/06-cicd)

## Creating Custom Constructs

Custom constructs in CDKTF allow you to create reusable components that encapsulate infrastructure patterns and best practices.

## Basic Custom Construct

### Creating a VPC Construct

```typescript
interface VpcConstructProps {
  readonly cidrBlock: string;
  readonly enableDnsHostnames?: boolean;
  readonly enableDnsSupport?: boolean;
  readonly tags?: { [key: string]: string };
}

export class VpcConstruct extends Construct {
  public readonly vpc: Vpc;
  public readonly publicSubnets: Subnet[];
  public readonly privateSubnets: Subnet[];

  constructor(scope: Construct, id: string, props: VpcConstructProps) {
    super(scope, id);

    this.vpc = new Vpc(this, "vpc", {
      cidrBlock: props.cidrBlock,
      enableDnsHostnames: props.enableDnsHostnames ?? true,
      enableDnsSupport: props.enableDnsSupport ?? true,
      tags: props.tags,
    });

    // Create Internet Gateway
    const igw = new InternetGateway(this, "igw", {
      vpcId: this.vpc.id,
      tags: props.tags,
    });

    // Create subnets
    this.publicSubnets = this.createPublicSubnets(props.tags);
    this.privateSubnets = this.createPrivateSubnets(props.tags);
  }

  private createPublicSubnets(tags?: { [key: string]: string }): Subnet[] {
    // Implementation details...
  }

  private createPrivateSubnets(tags?: { [key: string]: string }): Subnet[] {
    // Implementation details...
  }
}
```

## Higher-Level Constructs

### Web Application Pattern

```typescript
interface WebAppProps {
  readonly environment: string;
  readonly instanceType: string;
  readonly minSize: number;
  readonly maxSize: number;
  readonly vpcId: string;
  readonly subnetIds: string[];
}

export class WebApplication extends Construct {
  public readonly loadBalancer: Alb;
  public readonly autoScalingGroup: AutoScalingGroup;

  constructor(scope: Construct, id: string, props: WebAppProps) {
    super(scope, id);

    // Create security groups
    const lbSecurityGroup = this.createLoadBalancerSecurityGroup(props.vpcId);
    const instanceSecurityGroup = this.createInstanceSecurityGroup(
      props.vpcId,
      lbSecurityGroup.id
    );

    // Create load balancer
    this.loadBalancer = new Alb(this, "alb", {
      internal: false,
      loadBalancerType: "application",
      securityGroups: [lbSecurityGroup.id],
      subnets: props.subnetIds,
      tags: {
        Environment: props.environment,
      },
    });

    // Create launch template
    const launchTemplate = new LaunchTemplate(this, "lt", {
      imageId: this.getLatestAmiId(),
      instanceType: props.instanceType,
      vpcSecurityGroupIds: [instanceSecurityGroup.id],
      userData: this.getUserData(),
    });

    // Create auto scaling group
    this.autoScalingGroup = new AutoScalingGroup(this, "asg", {
      vpcZoneIdentifier: props.subnetIds,
      minSize: props.minSize,
      maxSize: props.maxSize,
      launchTemplate: {
        id: launchTemplate.id,
        version: launchTemplate.latestVersion,
      },
    });
  }

  private createLoadBalancerSecurityGroup(vpcId: string): SecurityGroup {
    return new SecurityGroup(this, "lb-sg", {
      vpcId,
      ingress: [{
        fromPort: 80,
        toPort: 80,
        protocol: "tcp",
        cidrBlocks: ["0.0.0.0/0"],
      }],
    });
  }

  private createInstanceSecurityGroup(
    vpcId: string,
    lbSecurityGroupId: string
  ): SecurityGroup {
    return new SecurityGroup(this, "instance-sg", {
      vpcId,
      ingress: [{
        fromPort: 80,
        toPort: 80,
        protocol: "tcp",
        securityGroups: [lbSecurityGroupId],
      }],
    });
  }

  private getLatestAmiId(): string {
    // Implementation to get latest AMI
    return "ami-12345678";
  }

  private getUserData(): string {
    return base64encode(`#!/bin/bash
      yum update -y
      yum install -y httpd
      systemctl start httpd
      systemctl enable httpd
    `);
  }
}
```

## Composition Patterns

### Database Cluster Pattern

```typescript
interface DbClusterProps {
  readonly engine: "mysql" | "postgres";
  readonly instanceClass: string;
  readonly masterUsername: string;
  readonly masterPassword: string;
  readonly vpcId: string;
  readonly subnetIds: string[];
}

export class DatabaseCluster extends Construct {
  public readonly cluster: RdsCluster;
  public readonly parameterGroup: RdsClusterParameterGroup;
  public readonly securityGroup: SecurityGroup;

  constructor(scope: Construct, id: string, props: DbClusterProps) {
    super(scope, id);

    // Create subnet group
    const subnetGroup = new DbSubnetGroup(this, "subnet-group", {
      subnetIds: props.subnetIds,
    });

    // Create parameter group
    this.parameterGroup = new RdsClusterParameterGroup(this, "param-group", {
      family: `${props.engine}13`,
      parameters: this.getDefaultParameters(props.engine),
    });

    // Create security group
    this.securityGroup = new SecurityGroup(this, "security-group", {
      vpcId: props.vpcId,
      ingress: [{
        fromPort: this.getEnginePort(props.engine),
        toPort: this.getEnginePort(props.engine),
        protocol: "tcp",
        cidrBlocks: [Fn.cidr_block(props.vpcId)],
      }],
    });

    // Create cluster
    this.cluster = new RdsCluster(this, "cluster", {
      engine: props.engine,
      masterUsername: props.masterUsername,
      masterPassword: props.masterPassword,
      dbSubnetGroupName: subnetGroup.name,
      vpcSecurityGroupIds: [this.securityGroup.id],
      clusterParameterGroupName: this.parameterGroup.name,
    });
  }

  private getEnginePort(engine: string): number {
    return engine === "mysql" ? 3306 : 5432;
  }

  private getDefaultParameters(engine: string): { [key: string]: string } {
    return engine === "mysql"
      ? {
          "character_set_server": "utf8mb4",
          "collation_server": "utf8mb4_unicode_ci",
        }
      : {
          "timezone": "UTC",
          "shared_buffers": "256MB",
        };
  }
}
```

## Best Practices for Custom Constructs

### 1. Interface Design

```typescript
// Define clear and specific interfaces
interface ResourceProps {
  readonly required: string;
  readonly optional?: string;
  readonly defaulted: string = "default";
}

// Use discriminated unions for different configurations
interface BaseConfig {
  readonly type: string;
}

interface ProductionConfig extends BaseConfig {
  readonly type: "production";
  readonly highAvailability: boolean;
}

interface DevelopmentConfig extends BaseConfig {
  readonly type: "development";
  readonly debugMode: boolean;
}

type EnvironmentConfig = ProductionConfig | DevelopmentConfig;
```

### 2. Error Handling

```typescript
class CustomError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CustomError";
  }
}

class ResourceConstruct extends Construct {
  constructor(scope: Construct, id: string, props: ResourceProps) {
    super(scope, id);

    this.validateProps(props);
    // Continue with resource creation
  }

  private validateProps(props: ResourceProps): void {
    if (!props.required) {
      throw new CustomError("Required property is missing");
    }
  }
}
```

### 3. Resource Naming

```typescript
class ResourceNaming {
  static generateName(
    resourceType: string,
    environment: string,
    uniqueId: string
  ): string {
    return `${environment}-${resourceType}-${uniqueId}`.toLowerCase();
  }

  static generateTags(
    environment: string,
    additionalTags?: { [key: string]: string }
  ): { [key: string]: string } {
    return {
      Environment: environment,
      ManagedBy: "CDKTF",
      ...additionalTags,
    };
  }
}
```

## Testing Custom Constructs

```typescript
import { Testing } from "cdktf";

describe("WebApplication", () => {
  test("creates all required resources", () => {
    const app = Testing.app();
    const stack = new TerraformStack(app, "test");
    
    new WebApplication(stack, "web", {
      environment: "test",
      instanceType: "t2.micro",
      minSize: 1,
      maxSize: 3,
      vpcId: "vpc-123",
      subnetIds: ["subnet-1", "subnet-2"],
    });

    const synthStack = Testing.synth(stack);
    expect(synthStack).toHaveResource("aws_lb");
    expect(synthStack).toHaveResource("aws_autoscaling_group");
  });
});
```

## Next Steps

In [Part 5: Testing CDK Applications](/posts/terraform-cdk/05-testing), we'll dive deeper into testing strategies for CDKTF applications, including unit tests, snapshot tests, and integration tests.

## Additional Resources

- [CDK Patterns](https://cdkpatterns.com/)
- [AWS Construct Library](https://docs.aws.amazon.com/cdk/api/latest/docs/aws-construct-library.html)
- [TypeScript Design Patterns](https://www.patterns.dev/posts/typescript-patterns/)
