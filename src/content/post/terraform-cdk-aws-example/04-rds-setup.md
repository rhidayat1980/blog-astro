---
title: "AWS Infrastructure with CDK - Part 4: RDS Database"
description: "Deploy a secure RDS PostgreSQL instance using Terraform CDK with TypeScript"
publishDate: 2024-01-25
tags: ["terraform", "cdk", "typescript", "aws", "rds", "postgresql", "series:terraform-cdk-aws:4"]
draft: false
---

## Series Navigation

- [Part 1: Project Setup](/posts/terraform-cdk/aws-example/01-project-setup)
- [Part 2: VPC and Network](/posts/terraform-cdk/aws-example/02-vpc-network)
- [Part 3: EKS Cluster](/posts/terraform-cdk/aws-example/03-eks-setup)
- **Part 4: RDS Database** (Current)
- [Part 5: S3 Storage](/posts/terraform-cdk/aws-example/05-s3-setup)
- [Part 6: IAM & Security](/posts/terraform-cdk/aws-example/06-iam-security)
- [Part 7: CI/CD Pipeline](/posts/terraform-cdk/aws-example/07-cicd-setup)

## RDS Database Setup

Let's create a secure RDS PostgreSQL instance with proper networking, security, and backup configurations.

## RDS Security Group

```typescript
// src/constructs/rds/rds-security-group-construct.ts
import { Construct } from "constructs";
import { SecurityGroup } from "@cdktf/provider-aws/lib/security-group";
import { SecurityGroupRule } from "@cdktf/provider-aws/lib/security-group-rule";

export interface RdsSecurityGroupConstructProps {
  readonly name: string;
  readonly vpcId: string;
  readonly allowedSecurityGroupIds: string[];
  readonly tags?: { [key: string]: string };
}

export class RdsSecurityGroupConstruct extends Construct {
  public readonly securityGroup: SecurityGroup;

  constructor(scope: Construct, id: string, props: RdsSecurityGroupConstructProps) {
    super(scope, id);

    this.securityGroup = new SecurityGroup(this, "rds-sg", {
      name: `${props.name}-rds-sg`,
      vpcId: props.vpcId,
      description: "Security group for RDS instance",
      tags: props.tags,
    });

    // Allow PostgreSQL access from specified security groups
    props.allowedSecurityGroupIds.forEach((sgId, index) => {
      new SecurityGroupRule(this, `rds-ingress-${index}`, {
        type: "ingress",
        fromPort: 5432,
        toPort: 5432,
        protocol: "tcp",
        securityGroupId: this.securityGroup.id,
        sourceSecurityGroupId: sgId,
      });
    });
  }
}
```

## RDS Parameter Group

```typescript
// src/constructs/rds/rds-parameter-group-construct.ts
import { Construct } from "constructs";
import { DbParameterGroup } from "@cdktf/provider-aws/lib/db-parameter-group";

export interface RdsParameterGroupConstructProps {
  readonly name: string;
  readonly family: string;
  readonly tags?: { [key: string]: string };
}

export class RdsParameterGroupConstruct extends Construct {
  public readonly parameterGroup: DbParameterGroup;

  constructor(scope: Construct, id: string, props: RdsParameterGroupConstructProps) {
    super(scope, id);

    this.parameterGroup = new DbParameterGroup(this, "parameter-group", {
      name: `${props.name}-pg`,
      family: props.family,
      parameter: [
        {
          name: "log_connections",
          value: "1",
        },
        {
          name: "log_disconnections",
          value: "1",
        },
        {
          name: "log_duration",
          value: "1",
        },
        {
          name: "log_lock_waits",
          value: "1",
        },
        {
          name: "log_min_duration_statement",
          value: "1000", // Log statements taking more than 1 second
        },
        {
          name: "autovacuum",
          value: "1",
        },
        {
          name: "track_activities",
          value: "1",
        },
      ],
      tags: props.tags,
    });
  }
}
```

## RDS Subnet Group

```typescript
// src/constructs/rds/rds-subnet-group-construct.ts
import { Construct } from "constructs";
import { DbSubnetGroup } from "@cdktf/provider-aws/lib/db-subnet-group";

export interface RdsSubnetGroupConstructProps {
  readonly name: string;
  readonly subnetIds: string[];
  readonly tags?: { [key: string]: string };
}

export class RdsSubnetGroupConstruct extends Construct {
  public readonly subnetGroup: DbSubnetGroup;

  constructor(scope: Construct, id: string, props: RdsSubnetGroupConstructProps) {
    super(scope, id);

    this.subnetGroup = new DbSubnetGroup(this, "subnet-group", {
      name: `${props.name}-subnet-group`,
      subnetIds: props.subnetIds,
      description: "Subnet group for RDS instance",
      tags: props.tags,
    });
  }
}
```

## RDS Instance

```typescript
// src/constructs/rds/rds-instance-construct.ts
import { Construct } from "constructs";
import { DbInstance } from "@cdktf/provider-aws/lib/db-instance";
import { RdsSecurityGroupConstruct } from "./rds-security-group-construct";
import { RdsParameterGroupConstruct } from "./rds-parameter-group-construct";
import { RdsSubnetGroupConstruct } from "./rds-subnet-group-construct";
import { KmsKey } from "@cdktf/provider-aws/lib/kms-key";
import { KmsAlias } from "@cdktf/provider-aws/lib/kms-alias";

export interface RdsInstanceConstructProps {
  readonly name: string;
  readonly vpcId: string;
  readonly subnetIds: string[];
  readonly allowedSecurityGroupIds: string[];
  readonly instanceClass: string;
  readonly allocatedStorage: number;
  readonly maxAllocatedStorage?: number;
  readonly engine: string;
  readonly engineVersion: string;
  readonly username: string;
  readonly multiAz: boolean;
  readonly tags?: { [key: string]: string };
}

export class RdsInstanceConstruct extends Construct {
  public readonly instance: DbInstance;
  public readonly kmsKey: KmsKey;

  constructor(scope: Construct, id: string, props: RdsInstanceConstructProps) {
    super(scope, id);

    // Create KMS key for encryption
    this.kmsKey = new KmsKey(this, "kms-key", {
      description: `KMS key for RDS instance ${props.name}`,
      enableKeyRotation: true,
      tags: props.tags,
    });

    new KmsAlias(this, "kms-alias", {
      name: `alias/${props.name}-rds`,
      targetKeyId: this.kmsKey.id,
    });

    // Create security group
    const securityGroup = new RdsSecurityGroupConstruct(this, "security-group", {
      name: props.name,
      vpcId: props.vpcId,
      allowedSecurityGroupIds: props.allowedSecurityGroupIds,
      tags: props.tags,
    });

    // Create parameter group
    const parameterGroup = new RdsParameterGroupConstruct(this, "parameter-group", {
      name: props.name,
      family: `${props.engine}${props.engineVersion.split(".")[0]}`,
      tags: props.tags,
    });

    // Create subnet group
    const subnetGroup = new RdsSubnetGroupConstruct(this, "subnet-group", {
      name: props.name,
      subnetIds: props.subnetIds,
      tags: props.tags,
    });

    // Create RDS instance
    this.instance = new DbInstance(this, "instance", {
      identifier: props.name,
      instanceClass: props.instanceClass,
      allocatedStorage: props.allocatedStorage,
      maxAllocatedStorage: props.maxAllocatedStorage,
      engine: props.engine,
      engineVersion: props.engineVersion,
      username: props.username,
      parameterGroupName: parameterGroup.parameterGroup.name,
      vpcSecurityGroupIds: [securityGroup.securityGroup.id],
      dbSubnetGroupName: subnetGroup.subnetGroup.name,
      publiclyAccessible: false,
      multiAz: props.multiAz,
      storageEncrypted: true,
      kmsKeyId: this.kmsKey.arn,
      backupRetentionPeriod: 7,
      backupWindow: "03:00-04:00",
      maintenanceWindow: "Mon:04:00-Mon:05:00",
      autoMinorVersionUpgrade: true,
      deletionProtection: true,
      skipFinalSnapshot: false,
      finalSnapshotIdentifier: `${props.name}-final-snapshot`,
      tags: {
        Name: props.name,
        ...props.tags,
      },
    });
  }
}
```

## RDS Stack

```typescript
// src/stacks/rds-stack.ts
import { BaseStack } from "./base-stack";
import { RdsInstanceConstruct } from "../constructs/rds/rds-instance-construct";
import { Environment } from "../config/environments";

export interface RdsStackProps {
  readonly vpcId: string;
  readonly databaseSubnetIds: string[];
  readonly allowedSecurityGroupIds: string[];
}

export class RdsStack extends BaseStack {
  public readonly database: RdsInstanceConstruct;

  constructor(scope: Construct, id: string, env: Environment, props: RdsStackProps) {
    super(scope, id, env);

    this.database = new RdsInstanceConstruct(this, "rds", {
      name: this.createNamePrefix("postgres"),
      vpcId: props.vpcId,
      subnetIds: props.databaseSubnetIds,
      allowedSecurityGroupIds: props.allowedSecurityGroupIds,
      instanceClass: env.rds.instanceClass,
      allocatedStorage: env.rds.allocatedStorage,
      maxAllocatedStorage: env.rds.maxAllocatedStorage,
      engine: "postgres",
      engineVersion: "14.7",
      username: "postgres",
      multiAz: env.rds.multiAz,
      tags: this.tags,
    });
  }
}
```

## Testing the RDS Stack

```typescript
// test/rds-stack.test.ts
import { Testing } from "cdktf";
import { RdsStack } from "../src/stacks/rds-stack";
import { environments } from "../src/config/environments";

describe("RdsStack", () => {
  const env = environments.dev;
  const mockProps = {
    vpcId: "vpc-12345",
    databaseSubnetIds: ["subnet-1", "subnet-2"],
    allowedSecurityGroupIds: ["sg-12345"],
  };

  test("should create RDS instance with correct configuration", () => {
    const app = Testing.app();
    const stack = new RdsStack(app, "test-rds", env, mockProps);
    const synthStack = Testing.synth(stack);

    expect(synthStack).toHaveResource("aws_db_instance", {
      engine: "postgres",
      engine_version: "14.7",
      instance_class: env.rds.instanceClass,
      allocated_storage: env.rds.allocatedStorage,
      storage_encrypted: true,
      multi_az: env.rds.multiAz,
      publicly_accessible: false,
    });
  });

  test("should create KMS key for encryption", () => {
    const app = Testing.app();
    const stack = new RdsStack(app, "test-rds", env, mockProps);
    const synthStack = Testing.synth(stack);

    expect(synthStack).toHaveResource("aws_kms_key", {
      enable_key_rotation: true,
    });
  });
});
```

## Usage Example

Here's how to use the RDS stack in your infrastructure:

```typescript
// main.ts
import { App } from "cdktf";
import { NetworkStack } from "./src/stacks/network-stack";
import { EksStack } from "./src/stacks/eks-stack";
import { RdsStack } from "./src/stacks/rds-stack";
import { environments } from "./src/config/environments";

const app = new App();
const envName = process.env.ENVIRONMENT || "dev";
const environment = environments[envName];

const networkStack = new NetworkStack(app, `${envName}-network`, environment);

const eksStack = new EksStack(app, `${envName}-eks`, environment, {
  vpcId: networkStack.vpc.vpc.id,
  privateSubnetIds: networkStack.vpc.privateSubnets.map(subnet => subnet.id),
});

const rdsStack = new RdsStack(app, `${envName}-rds`, environment, {
  vpcId: networkStack.vpc.vpc.id,
  databaseSubnetIds: networkStack.vpc.databaseSubnets.map(subnet => subnet.id),
  allowedSecurityGroupIds: [eksStack.cluster.cluster.vpcConfig.clusterSecurityGroupId],
});

app.synth();
```

## Next Steps

In [Part 5: S3 Storage Setup](/posts/terraform-cdk/aws-example/05-s3-setup), we'll create S3 buckets with proper security configurations, lifecycle policies, and access controls.
