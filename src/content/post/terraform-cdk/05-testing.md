---
title: "Testing CDK Applications with TypeScript"
description: "Learn comprehensive testing strategies for Terraform CDK applications, from unit tests to integration testing"
publishDate: 2024-01-14
tags: ["terraform", "cdk", "typescript", "testing", "devops", "infrastructure", "series:terraform-cdk:5"]
draft: false
---

## Series Navigation

- [Part 1: Getting Started with Terraform CDK](/posts/terraform-cdk/01-getting-started)
- [Part 2: Resource Management with CDK](/posts/terraform-cdk/02-resource-management)
- [Part 3: Advanced TypeScript Patterns](/posts/terraform-cdk/03-typescript-patterns)
- [Part 4: Custom Constructs and Components](/posts/terraform-cdk/04-custom-constructs)
- **Part 5: Testing CDK Applications** (Current)
- [Part 6: CI/CD for CDK Projects](/posts/terraform-cdk/06-cicd)

## Testing CDKTF Applications

Testing infrastructure code is crucial for maintaining reliability and preventing costly mistakes. Let's explore different testing strategies for CDKTF applications.

## Setting Up the Testing Environment

### Test Configuration

```typescript
// jest.config.js
module.exports = {
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverage: true,
  coverageReporters: ['text', 'lcov'],
  coverageDirectory: 'coverage',
  testEnvironment: 'node'
};
```

### Test Utilities

```typescript
// test-utils.ts
import { Testing } from "cdktf";
import { TerraformStack } from "cdktf";

export function createTestStack(): TerraformStack {
  const app = Testing.app();
  return new TerraformStack(app, "test-stack");
}

export function synthesizeStack(stack: TerraformStack) {
  return Testing.synth(stack);
}
```

## Unit Testing

### Testing Custom Constructs

```typescript
// vpc.test.ts
import { Testing } from "cdktf";
import { VpcConstruct } from "./vpc-construct";

describe("VpcConstruct", () => {
  test("creates VPC with correct CIDR", () => {
    const stack = createTestStack();
    
    new VpcConstruct(stack, "test-vpc", {
      cidrBlock: "10.0.0.0/16",
      enableDnsHostnames: true,
    });

    const synthStack = synthesizeStack(stack);
    expect(synthStack).toHaveResourceWithProperties("aws_vpc", {
      cidr_block: "10.0.0.0/16",
      enable_dns_hostnames: true,
    });
  });

  test("creates public and private subnets", () => {
    const stack = createTestStack();
    
    const vpc = new VpcConstruct(stack, "test-vpc", {
      cidrBlock: "10.0.0.0/16",
    });

    const synthStack = synthesizeStack(stack);
    expect(vpc.publicSubnets).toHaveLength(2);
    expect(vpc.privateSubnets).toHaveLength(2);
    expect(synthStack).toHaveResource("aws_subnet");
  });
});
```

### Testing Resource Properties

```typescript
// security-group.test.ts
describe("SecurityGroupConstruct", () => {
  test("creates security group with correct rules", () => {
    const stack = createTestStack();
    
    new SecurityGroupConstruct(stack, "test-sg", {
      vpcId: "vpc-123",
      ingressRules: [{
        fromPort: 80,
        toPort: 80,
        protocol: "tcp",
        cidrBlocks: ["0.0.0.0/0"],
      }],
    });

    const synthStack = synthesizeStack(stack);
    expect(synthStack).toHaveResourceWithProperties("aws_security_group_rule", {
      type: "ingress",
      from_port: 80,
      to_port: 80,
      protocol: "tcp",
      cidr_blocks: ["0.0.0.0/0"],
    });
  });
});
```

## Snapshot Testing

### Infrastructure Snapshot Tests

```typescript
// infrastructure.test.ts
describe("Infrastructure Snapshot", () => {
  test("infrastructure matches snapshot", () => {
    const stack = createTestStack();
    
    new WebApplication(stack, "web-app", {
      environment: "test",
      instanceType: "t2.micro",
      minSize: 1,
      maxSize: 3,
      vpcId: "vpc-123",
      subnetIds: ["subnet-1", "subnet-2"],
    });

    const synthStack = synthesizeStack(stack);
    expect(JSON.stringify(synthStack, null, 2)).toMatchSnapshot();
  });
});
```

## Integration Testing

### Testing Resource Dependencies

```typescript
// database-cluster.test.ts
describe("DatabaseCluster Integration", () => {
  test("creates RDS cluster with correct dependencies", async () => {
    const stack = createTestStack();
    
    const dbCluster = new DatabaseCluster(stack, "test-db", {
      engine: "postgres",
      instanceClass: "db.t3.medium",
      masterUsername: "admin",
      masterPassword: "password123",
      vpcId: "vpc-123",
      subnetIds: ["subnet-1", "subnet-2"],
    });

    const synthStack = synthesizeStack(stack);
    
    // Test resource creation order
    expect(synthStack).toHaveResource("aws_db_subnet_group");
    expect(synthStack).toHaveResource("aws_rds_cluster_parameter_group");
    expect(synthStack).toHaveResource("aws_security_group");
    expect(synthStack).toHaveResource("aws_rds_cluster");

    // Test dependencies
    const cluster = synthStack.getResource("aws_rds_cluster", dbCluster.cluster.id);
    expect(cluster.dependsOn).toContain(
      synthStack.getResource("aws_db_subnet_group", dbCluster.subnetGroup.id)
    );
  });
});
```

## Testing Utilities and Helpers

### Custom Matchers

```typescript
// custom-matchers.ts
expect.extend({
  toHaveTag(received: any, key: string, value: string) {
    const tags = received.tags || {};
    const pass = tags[key] === value;
    return {
      message: () =>
        `expected resource to have tag ${key}=${value}`,
      pass,
    };
  },
});

// Usage in tests
test("resources have correct tags", () => {
  const stack = createTestStack();
  
  const vpc = new VpcConstruct(stack, "test-vpc", {
    cidrBlock: "10.0.0.0/16",
    tags: {
      Environment: "test",
    },
  });

  expect(vpc).toHaveTag("Environment", "test");
});
```

### Test Data Generators

```typescript
// test-data.ts
export class TestDataGenerator {
  static generateVpcConfig(overrides: Partial<VpcConfig> = {}) {
    return {
      cidrBlock: "10.0.0.0/16",
      enableDnsHostnames: true,
      enableDnsSupport: true,
      tags: {
        Environment: "test",
      },
      ...overrides,
    };
  }

  static generateDbConfig(overrides: Partial<DbConfig> = {}) {
    return {
      engine: "postgres",
      instanceClass: "db.t3.medium",
      masterUsername: "admin",
      masterPassword: "password123",
      ...overrides,
    };
  }
}
```

## Testing Best Practices

1. **Test Organization**
   - Group tests logically
   - Use descriptive test names
   - Maintain test independence

```typescript
describe("WebApplication", () => {
  describe("load balancer", () => {
    test("creates ALB with correct configuration");
    test("configures health checks");
    test("sets up listener rules");
  });

  describe("auto scaling group", () => {
    test("sets correct capacity limits");
    test("uses specified launch template");
    test("configures scaling policies");
  });
});
```

2. **Test Coverage**
   - Aim for high coverage
   - Focus on critical paths
   - Test edge cases

```typescript
// coverage-threshold.js
module.exports = {
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

3. **Mocking and Stubs**
   - Mock external services
   - Stub complex computations
   - Use test doubles effectively

```typescript
jest.mock("./aws-client", () => ({
  getLatestAmiId: jest.fn().mockResolvedValue("ami-12345"),
  describeVpc: jest.fn().mockResolvedValue({
    VpcId: "vpc-123",
    CidrBlock: "10.0.0.0/16",
  }),
}));
```

## Next Steps

In [Part 6: CI/CD for CDK Projects](/posts/terraform-cdk/06-cicd), we'll explore how to set up continuous integration and deployment pipelines for your CDKTF applications.

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [CDKTF Testing Guide](https://developer.hashicorp.com/terraform/cdktf/test)
- [TypeScript Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
