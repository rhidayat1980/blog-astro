---
title: "AWS Infrastructure with CDK - Part 5: S3 Storage"
description: "Create secure S3 buckets with Terraform CDK and implement proper access controls"
publishDate: 2024-01-26
tags: ["terraform", "cdk", "typescript", "aws", "s3", "storage", "series:terraform-cdk-aws:5"]
draft: false
---

## Series Navigation

- [Part 1: Project Setup](/posts/terraform-cdk/aws-example/01-project-setup)
- [Part 2: VPC and Network](/posts/terraform-cdk/aws-example/02-vpc-network)
- [Part 3: EKS Cluster](/posts/terraform-cdk/aws-example/03-eks-setup)
- [Part 4: RDS Database](/posts/terraform-cdk/aws-example/04-rds-setup)
- **Part 5: S3 Storage** (Current)
- [Part 6: IAM & Security](/posts/terraform-cdk/aws-example/06-iam-security)
- [Part 7: CI/CD Pipeline](/posts/terraform-cdk/aws-example/07-cicd-setup)

## S3 Storage Setup

Let's create secure S3 buckets with proper encryption, lifecycle policies, and access controls.

## S3 Bucket Policy

```typescript
// src/constructs/s3/s3-bucket-policy-construct.ts
import { Construct } from "constructs";
import { DataAwsIamPolicyDocument } from "@cdktf/provider-aws/lib/data-aws-iam-policy-document";
import { S3BucketPolicy } from "@cdktf/provider-aws/lib/s3-bucket-policy";

export interface S3BucketPolicyConstructProps {
  readonly bucketName: string;
  readonly bucketArn: string;
  readonly allowedPrincipals: string[];
  readonly allowedActions: string[];
}

export class S3BucketPolicyConstruct extends Construct {
  public readonly policy: S3BucketPolicy;

  constructor(scope: Construct, id: string, props: S3BucketPolicyConstructProps) {
    super(scope, id);

    const policyDocument = new DataAwsIamPolicyDocument(this, "bucket-policy", {
      statement: [
        {
          sid: "EnforceTLS",
          effect: "Deny",
          principals: [{
            type: "*",
            identifiers: ["*"],
          }],
          actions: ["s3:*"],
          resources: [
            props.bucketArn,
            `${props.bucketArn}/*`,
          ],
          condition: [{
            test: "Bool",
            variable: "aws:SecureTransport",
            values: ["false"],
          }],
        },
        {
          sid: "AllowSpecificActions",
          effect: "Allow",
          principals: props.allowedPrincipals.map(principal => ({
            type: "AWS",
            identifiers: [principal],
          })),
          actions: props.allowedActions,
          resources: [
            props.bucketArn,
            `${props.bucketArn}/*`,
          ],
        },
      ],
    });

    this.policy = new S3BucketPolicy(this, "policy", {
      bucket: props.bucketName,
      policy: policyDocument.json,
    });
  }
}
```

## S3 Lifecycle Rules

```typescript
// src/constructs/s3/s3-lifecycle-rules-construct.ts
import { Construct } from "constructs";
import { S3BucketLifecycleRule } from "@cdktf/provider-aws/lib/s3-bucket-lifecycle-rule";

export interface S3LifecycleRulesConstructProps {
  readonly bucketId: string;
  readonly rules: {
    prefix: string;
    enabled: boolean;
    expirationDays?: number;
    transitionDays?: number;
    transitionStorageClass?: string;
  }[];
}

export class S3LifecycleRulesConstruct extends Construct {
  constructor(scope: Construct, id: string, props: S3LifecycleRulesConstructProps) {
    super(scope, id);

    props.rules.forEach((rule, index) => {
      new S3BucketLifecycleRule(this, `lifecycle-rule-${index}`, {
        bucket: props.bucketId,
        enabled: rule.enabled,
        prefix: rule.prefix,
        expiration: rule.expirationDays ? {
          days: rule.expirationDays,
        } : undefined,
        transition: rule.transitionDays && rule.transitionStorageClass ? {
          days: rule.transitionDays,
          storageClass: rule.transitionStorageClass,
        } : undefined,
      });
    });
  }
}
```

## S3 Bucket

```typescript
// src/constructs/s3/s3-bucket-construct.ts
import { Construct } from "constructs";
import { S3Bucket } from "@cdktf/provider-aws/lib/s3-bucket";
import { S3BucketVersioning } from "@cdktf/provider-aws/lib/s3-bucket-versioning";
import { S3BucketServerSideEncryptionConfiguration } from "@cdktf/provider-aws/lib/s3-bucket-server-side-encryption-configuration";
import { S3BucketPublicAccessBlock } from "@cdktf/provider-aws/lib/s3-bucket-public-access-block";
import { S3BucketLogging } from "@cdktf/provider-aws/lib/s3-bucket-logging";
import { KmsKey } from "@cdktf/provider-aws/lib/kms-key";
import { KmsAlias } from "@cdktf/provider-aws/lib/kms-alias";
import { S3BucketPolicyConstruct } from "./s3-bucket-policy-construct";
import { S3LifecycleRulesConstruct } from "./s3-lifecycle-rules-construct";

export interface S3BucketConstructProps {
  readonly name: string;
  readonly versioning: boolean;
  readonly allowedPrincipals: string[];
  readonly allowedActions: string[];
  readonly lifecycleRules?: {
    prefix: string;
    enabled: boolean;
    expirationDays?: number;
    transitionDays?: number;
    transitionStorageClass?: string;
  }[];
  readonly accessLogging?: {
    targetBucket: string;
    targetPrefix: string;
  };
  readonly tags?: { [key: string]: string };
}

export class S3BucketConstruct extends Construct {
  public readonly bucket: S3Bucket;
  public readonly kmsKey: KmsKey;

  constructor(scope: Construct, id: string, props: S3BucketConstructProps) {
    super(scope, id);

    // Create KMS key for encryption
    this.kmsKey = new KmsKey(this, "kms-key", {
      description: `KMS key for S3 bucket ${props.name}`,
      enableKeyRotation: true,
      tags: props.tags,
    });

    new KmsAlias(this, "kms-alias", {
      name: `alias/${props.name}-s3`,
      targetKeyId: this.kmsKey.id,
    });

    // Create S3 bucket
    this.bucket = new S3Bucket(this, "bucket", {
      bucket: props.name,
      forceDestroy: false,
      tags: props.tags,
    });

    // Enable versioning
    new S3BucketVersioning(this, "versioning", {
      bucket: this.bucket.id,
      versioningConfiguration: {
        status: props.versioning ? "Enabled" : "Suspended",
      },
    });

    // Configure encryption
    new S3BucketServerSideEncryptionConfiguration(this, "encryption", {
      bucket: this.bucket.id,
      rule: [{
        applyServerSideEncryptionByDefault: {
          sseAlgorithm: "aws:kms",
          kmsMasterKeyId: this.kmsKey.id,
        },
        bucketKeyEnabled: true,
      }],
    });

    // Block public access
    new S3BucketPublicAccessBlock(this, "public-access-block", {
      bucket: this.bucket.id,
      blockPublicAcls: true,
      blockPublicPolicy: true,
      ignorePublicAcls: true,
      restrictPublicBuckets: true,
    });

    // Configure bucket policy
    new S3BucketPolicyConstruct(this, "bucket-policy", {
      bucketName: this.bucket.id,
      bucketArn: this.bucket.arn,
      allowedPrincipals: props.allowedPrincipals,
      allowedActions: props.allowedActions,
    });

    // Configure lifecycle rules
    if (props.lifecycleRules) {
      new S3LifecycleRulesConstruct(this, "lifecycle-rules", {
        bucketId: this.bucket.id,
        rules: props.lifecycleRules,
      });
    }

    // Configure access logging
    if (props.accessLogging) {
      new S3BucketLogging(this, "logging", {
        bucket: this.bucket.id,
        targetBucket: props.accessLogging.targetBucket,
        targetPrefix: props.accessLogging.targetPrefix,
      });
    }
  }
}
```

## S3 Stack

```typescript
// src/stacks/s3-stack.ts
import { BaseStack } from "./base-stack";
import { S3BucketConstruct } from "../constructs/s3/s3-bucket-construct";
import { Environment } from "../config/environments";

export interface S3StackProps {
  readonly allowedPrincipals: string[];
}

export class S3Stack extends BaseStack {
  public readonly dataBucket: S3BucketConstruct;
  public readonly logsBucket: S3BucketConstruct;

  constructor(scope: Construct, id: string, env: Environment, props: S3StackProps) {
    super(scope, id, env);

    // Create logs bucket first
    this.logsBucket = new S3BucketConstruct(this, "logs-bucket", {
      name: this.createNamePrefix("logs"),
      versioning: true,
      allowedPrincipals: props.allowedPrincipals,
      allowedActions: [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket",
      ],
      lifecycleRules: [
        {
          prefix: "",
          enabled: true,
          transitionDays: 30,
          transitionStorageClass: "STANDARD_IA",
        },
        {
          prefix: "",
          enabled: true,
          transitionDays: 90,
          transitionStorageClass: "GLACIER",
        },
        {
          prefix: "",
          enabled: true,
          expirationDays: 365,
        },
      ],
      tags: this.tags,
    });

    // Create data bucket with logging enabled
    this.dataBucket = new S3BucketConstruct(this, "data-bucket", {
      name: this.createNamePrefix("data"),
      versioning: true,
      allowedPrincipals: props.allowedPrincipals,
      allowedActions: [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket",
        "s3:DeleteObject",
      ],
      lifecycleRules: [
        {
          prefix: "tmp/",
          enabled: true,
          expirationDays: 7,
        },
        {
          prefix: "archive/",
          enabled: true,
          transitionDays: 30,
          transitionStorageClass: "GLACIER",
        },
      ],
      accessLogging: {
        targetBucket: this.logsBucket.bucket.id,
        targetPrefix: "s3-access-logs/",
      },
      tags: this.tags,
    });
  }
}
```

## Testing the S3 Stack

```typescript
// test/s3-stack.test.ts
import { Testing } from "cdktf";
import { S3Stack } from "../src/stacks/s3-stack";
import { environments } from "../src/config/environments";

describe("S3Stack", () => {
  const env = environments.dev;
  const mockProps = {
    allowedPrincipals: ["arn:aws:iam::123456789012:role/example-role"],
  };

  test("should create buckets with versioning enabled", () => {
    const app = Testing.app();
    const stack = new S3Stack(app, "test-s3", env, mockProps);
    const synthStack = Testing.synth(stack);

    expect(synthStack).toHaveResource("aws_s3_bucket_versioning", {
      versioning_configuration: {
        status: "Enabled",
      },
    });
  });

  test("should create KMS keys for encryption", () => {
    const app = Testing.app();
    const stack = new S3Stack(app, "test-s3", env, mockProps);
    const synthStack = Testing.synth(stack);

    expect(synthStack).toHaveResource("aws_kms_key", {
      enable_key_rotation: true,
    });
  });

  test("should block public access", () => {
    const app = Testing.app();
    const stack = new S3Stack(app, "test-s3", env, mockProps);
    const synthStack = Testing.synth(stack);

    expect(synthStack).toHaveResource("aws_s3_bucket_public_access_block", {
      block_public_acls: true,
      block_public_policy: true,
      ignore_public_acls: true,
      restrict_public_buckets: true,
    });
  });
});
```

## Usage Example

Here's how to use the S3 stack in your infrastructure:

```typescript
// main.ts
import { App } from "cdktf";
import { NetworkStack } from "./src/stacks/network-stack";
import { EksStack } from "./src/stacks/eks-stack";
import { RdsStack } from "./src/stacks/rds-stack";
import { S3Stack } from "./src/stacks/s3-stack";
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

const s3Stack = new S3Stack(app, `${envName}-s3`, environment, {
  allowedPrincipals: [eksStack.cluster.cluster.roleArn],
});

app.synth();
```

## Next Steps

In [Part 6: IAM & Security](/posts/terraform-cdk/aws-example/06-iam-security), we'll implement comprehensive IAM policies and security controls for our infrastructure.
