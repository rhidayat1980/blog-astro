---
title: "Advanced TypeScript Patterns in Terraform CDK"
description: "Master advanced TypeScript patterns and features to write maintainable and type-safe infrastructure code"
publishDate: 2024-01-08
tags: ["terraform", "cdk", "typescript", "iac", "devops", "patterns", "series:terraform-cdk:3"]
draft: false
---

## Series Navigation

- [Part 1: Getting Started with Terraform CDK](/posts/terraform-cdk/01-getting-started)
- [Part 2: Resource Management with CDK](/posts/terraform-cdk/02-resource-management)
- **Part 3: Advanced TypeScript Patterns** (Current)
- [Part 4: Custom Constructs and Components](/posts/terraform-cdk/04-custom-constructs)
- [Part 5: Testing CDK Applications](/posts/terraform-cdk/05-testing)
- [Part 6: CI/CD for CDK Projects](/posts/terraform-cdk/06-cicd)

## Advanced TypeScript Patterns for CDKTF

This post explores advanced TypeScript patterns that can help you write more maintainable, type-safe, and reusable infrastructure code with CDKTF.

## Generics and Type Constraints

### Resource Factory Pattern

```typescript
interface ResourceConfig<T> {
  name: string;
  tags: Record<string, string>;
  properties: T;
}

interface EC2Config {
  instanceType: string;
  ami: string;
}

class ResourceFactory<T> {
  static create<T>(
    scope: Construct,
    config: ResourceConfig<T>,
    creator: (scope: Construct, id: string, props: T) => any
  ) {
    return creator(scope, config.name, {
      ...config.properties,
      tags: config.tags,
    });
  }
}

// Usage
const ec2Config: ResourceConfig<EC2Config> = {
  name: "web-server",
  tags: { Environment: "prod" },
  properties: {
    instanceType: "t2.micro",
    ami: "ami-123456",
  },
};

const instance = ResourceFactory.create(
  this,
  ec2Config,
  (scope, id, props) => new Instance(scope, id, props)
);
```

## Abstract Classes and Inheritance

### Base Stack Pattern

```typescript
abstract class BaseStack extends TerraformStack {
  protected readonly config: StackConfig;
  protected readonly provider: AwsProvider;

  constructor(scope: Construct, id: string, config: StackConfig) {
    super(scope, id);
    this.config = config;
    this.provider = new AwsProvider(this, "AWS", {
      region: config.region,
    });
  }

  protected abstract createResources(): void;

  protected getDefaultTags(): Record<string, string> {
    return {
      Environment: this.config.environment,
      ManagedBy: "CDKTF",
      Project: this.config.projectName,
    };
  }
}

class NetworkStack extends BaseStack {
  protected createResources(): void {
    const vpc = new Vpc(this, "VPC", {
      cidrBlock: this.config.vpcCidr,
      tags: this.getDefaultTags(),
    });
    // Additional resources...
  }
}
```

## Decorators for Resource Configuration

### Validation Decorators

```typescript
function validateCidr() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args: any[]) {
      const cidr = args[0];
      const cidrRegex = /^([0-9]{1,3}\.){3}[0-9]{1,3}(\/([0-9]|[1-2][0-9]|3[0-2]))$/;
      if (!cidrRegex.test(cidr)) {
        throw new Error(`Invalid CIDR block: ${cidr}`);
      }
      return originalMethod.apply(this, args);
    };
  };
}

class NetworkConfig {
  @validateCidr()
  setVpcCidr(cidr: string) {
    this.vpcCidr = cidr;
  }
}
```

## Union Types and Type Guards

### Resource Type Safety

```typescript
type ResourceType = "vpc" | "subnet" | "instance";
type ResourceConfig = VpcConfig | SubnetConfig | InstanceConfig;

interface BaseConfig {
  type: ResourceType;
  name: string;
}

interface VpcConfig extends BaseConfig {
  type: "vpc";
  cidrBlock: string;
}

interface SubnetConfig extends BaseConfig {
  type: "subnet";
  vpcId: string;
  cidrBlock: string;
}

function isVpcConfig(config: ResourceConfig): config is VpcConfig {
  return config.type === "vpc";
}

class ResourceManager {
  createResource(config: ResourceConfig) {
    if (isVpcConfig(config)) {
      return new Vpc(this, config.name, {
        cidrBlock: config.cidrBlock,
      });
    }
    // Handle other resource types...
  }
}
```

## Utility Types

### Partial Configuration

```typescript
interface SecurityGroupRule {
  protocol: string;
  fromPort: number;
  toPort: number;
  cidrBlocks: string[];
}

type PartialRule = Partial<SecurityGroupRule>;

class SecurityGroupBuilder {
  private rules: SecurityGroupRule[] = [];

  addRule(rule: PartialRule): this {
    const defaultRule: SecurityGroupRule = {
      protocol: "tcp",
      fromPort: 80,
      toPort: 80,
      cidrBlocks: ["0.0.0.0/0"],
    };

    this.rules.push({ ...defaultRule, ...rule });
    return this;
  }

  build(scope: Construct, id: string): SecurityGroup {
    return new SecurityGroup(scope, id, {
      ingress: this.rules,
    });
  }
}
```

## Advanced Mapping Types

### Resource Tag Mapping

```typescript
type RequiredTags = "Environment" | "Project" | "ManagedBy";
type OptionalTags = "Owner" | "CostCenter";

type Tags = Record<RequiredTags, string> & Partial<Record<OptionalTags, string>>;

class TaggableResource {
  protected validateTags(tags: Tags) {
    const requiredTags: RequiredTags[] = [
      "Environment",
      "Project",
      "ManagedBy",
    ];
    
    for (const tag of requiredTags) {
      if (!tags[tag]) {
        throw new Error(`Missing required tag: ${tag}`);
      }
    }
  }
}
```

## Async Patterns

### Resource Dependencies

```typescript
class AsyncResourceManager {
  private readonly resourcePromises: Map<string, Promise<any>> = new Map();

  async createVpc(config: VpcConfig): Promise<Vpc> {
    const vpc = new Vpc(this, config.name, config);
    this.resourcePromises.set(config.name, Promise.resolve(vpc));
    return vpc;
  }

  async createSubnet(config: SubnetConfig): Promise<Subnet> {
    const vpc = await this.resourcePromises.get(config.vpcName);
    if (!vpc) {
      throw new Error(`VPC ${config.vpcName} not found`);
    }

    return new Subnet(this, config.name, {
      ...config,
      vpcId: vpc.id,
    });
  }
}
```

## Best Practices

1. **Type Safety**
   - Use strict TypeScript configuration
   - Leverage type inference
   - Create custom type guards

2. **Code Organization**
   - Use abstract classes for common patterns
   - Implement the builder pattern for complex resources
   - Create utility functions for repeated operations

3. **Error Handling**
   - Create custom error types
   - Use type guards for runtime checks
   - Implement validation decorators

4. **Testing**
   - Write unit tests for utility functions
   - Test type constraints
   - Mock AWS resources for testing

## Next Steps

In [Part 4: Custom Constructs and Components](/posts/terraform-cdk/04-custom-constructs), we'll explore how to create reusable components and custom constructs using these advanced TypeScript patterns.

## Additional Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [CDKTF Best Practices](https://developer.hashicorp.com/terraform/cdktf/create-and-deploy/best-practices)
- [Design Patterns in TypeScript](https://refactoring.guru/design-patterns/typescript)
