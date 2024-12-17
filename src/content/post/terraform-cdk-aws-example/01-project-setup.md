---
title: "AWS Infrastructure with CDK - Part 1: Project Setup"
description: "Set up a Terraform CDK project with TypeScript for AWS infrastructure"
publishDate: 2024-01-22
tags: ["terraform", "cdk", "typescript", "aws", "infrastructure", "series:terraform-cdk-aws:1"]
draft: false
---

## Series Navigation

- **Part 1: Project Setup** (Current)
- [Part 2: VPC and Network](/posts/terraform-cdk/aws-example/02-vpc-network)
- [Part 3: EKS Cluster](/posts/terraform-cdk/aws-example/03-eks-setup)
- [Part 4: RDS Database](/posts/terraform-cdk/aws-example/04-rds-setup)
- [Part 5: S3 Storage](/posts/terraform-cdk/aws-example/05-s3-setup)
- [Part 6: IAM & Security](/posts/terraform-cdk/aws-example/06-iam-security)
- [Part 7: CI/CD Pipeline](/posts/terraform-cdk/aws-example/07-cicd-setup)

## Project Structure

First, let's set up our project with the right structure:

```bash
mkdir aws-infra-cdk
cd aws-infra-cdk
cdktf init --template="typescript" --local
```

Create the following directory structure:

```bash
aws-infra-cdk/
├── src/
│   ├── config/
│   │   ├── environments.ts
│   │   └── tags.ts
│   ├── constructs/
│   │   ├── vpc/
│   │   ├── eks/
│   │   ├── rds/
│   │   ├── s3/
│   │   └── iam/
│   └── stacks/
│       ├── network-stack.ts
│       ├── eks-stack.ts
│       ├── database-stack.ts
│       └── storage-stack.ts
├── test/
├── cdktf.json
├── package.json
└── main.ts
```

## Environment Configuration

```typescript
// src/config/environments.ts
export interface Environment {
  readonly name: string;
  readonly region: string;
  readonly account: string;
  readonly cidr: string;
  readonly azs: string[];
  readonly eksVersion: string;
  readonly dbInstanceType: string;
  readonly dbVersion: string;
}

export const environments: Record<string, Environment> = {
  dev: {
    name: "dev",
    region: "us-west-2",
    account: "123456789012", // Replace with your AWS account ID
    cidr: "10.0.0.0/16",
    azs: ["us-west-2a", "us-west-2b"],
    eksVersion: "1.27",
    dbInstanceType: "db.t3.medium",
    dbVersion: "14.7",
  },
  staging: {
    name: "staging",
    region: "us-west-2",
    account: "123456789012",
    cidr: "10.1.0.0/16",
    azs: ["us-west-2a", "us-west-2b"],
    eksVersion: "1.27",
    dbInstanceType: "db.t3.large",
    dbVersion: "14.7",
  },
  prod: {
    name: "prod",
    region: "us-west-2",
    account: "123456789012",
    cidr: "10.2.0.0/16",
    azs: ["us-west-2a", "us-west-2b", "us-west-2c"],
    eksVersion: "1.27",
    dbInstanceType: "db.r6g.xlarge",
    dbVersion: "14.7",
  },
};

// src/config/tags.ts
export interface ResourceTags {
  [key: string]: string;
}

export function getResourceTags(env: string): ResourceTags {
  return {
    Environment: env,
    ManagedBy: "terraform-cdk",
    Owner: "platform-team",
    Project: "aws-infra",
  };
}
```

## Base Stack Class

```typescript
// src/stacks/base-stack.ts
import { Construct } from "constructs";
import { TerraformStack } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { Environment } from "../config/environments";
import { getResourceTags } from "../config/tags";

export class BaseStack extends TerraformStack {
  protected readonly env: Environment;
  protected readonly tags: Record<string, string>;

  constructor(scope: Construct, id: string, env: Environment) {
    super(scope, id);

    this.env = env;
    this.tags = getResourceTags(env.name);

    new AwsProvider(this, "AWS", {
      region: env.region,
      defaultTags: {
        tags: this.tags,
      },
    });
  }

  protected createNamePrefix(resourceName: string): string {
    return `${this.env.name}-${resourceName}`;
  }
}
```

## Main Application

```typescript
// main.ts
import { App } from "cdktf";
import { environments } from "./src/config/environments";
import { NetworkStack } from "./src/stacks/network-stack";
import { EksStack } from "./src/stacks/eks-stack";
import { DatabaseStack } from "./src/stacks/database-stack";
import { StorageStack } from "./src/stacks/storage-stack";

const app = new App();

// Get environment from command line or environment variable
const envName = process.env.ENVIRONMENT || "dev";
const environment = environments[envName];

if (!environment) {
  throw new Error(`Environment ${envName} not found`);
}

// Create stacks for the environment
const networkStack = new NetworkStack(app, `${envName}-network`, environment);
const eksStack = new EksStack(app, `${envName}-eks`, environment, {
  vpc: networkStack.vpc,
});
const dbStack = new DatabaseStack(app, `${envName}-database`, environment, {
  vpc: networkStack.vpc,
});
const storageStack = new StorageStack(app, `${envName}-storage`, environment);

app.synth();
```

## Package Configuration

```json
// package.json
{
  "name": "aws-infra-cdk",
  "version": "1.0.0",
  "scripts": {
    "build": "tsc",
    "synth": "cdktf synth",
    "compile": "tsc --pretty",
    "watch": "tsc -w",
    "test": "jest",
    "test:watch": "jest --watch",
    "upgrade": "npm i cdktf@latest cdktf-cli@latest",
    "upgrade:next": "npm i cdktf@next cdktf-cli@next",
    "deploy": "cdktf deploy",
    "destroy": "cdktf destroy"
  },
  "dependencies": {
    "@cdktf/provider-aws": "^15.0.0",
    "cdktf": "^0.17.0",
    "constructs": "^10.2.69",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/node": "^20.0.0",
    "jest": "^29.5.0",
    "ts-jest": "^29.1.0",
    "ts-node": "^10.9.1",
    "typescript": "^5.0.0"
  }
}
```

## CDKTF Configuration

```json
// cdktf.json
{
  "language": "typescript",
  "app": "npx ts-node main.ts",
  "projectId": "aws-infra-cdk",
  "sendCrashReports": "false",
  "terraformProviders": ["aws@~> 5.0"],
  "terraformModules": [],
  "context": {
    "excludeStackIdFromLogicalIds": "true"
  }
}
```

## Environment Variables

```bash
# .env.example
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
ENVIRONMENT=dev
```

## Running the Project

1. Install dependencies:

```bash
npm install
```

2. Set up your AWS credentials:

```bash
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=us-west-2
```

3. Deploy to a specific environment:

```bash
ENVIRONMENT=dev npm run deploy
```

In the next parts, we'll implement each stack (Network, EKS, Database, and Storage) with their respective constructs and configurations.

## Next Steps

- [Part 2: VPC and Network Infrastructure](/posts/terraform-cdk/aws-example/02-vpc-network)
- [Part 3: EKS Cluster Setup](/posts/terraform-cdk/aws-example/03-eks-setup)
- [Part 4: RDS PostgreSQL Configuration](/posts/terraform-cdk/aws-example/04-rds-setup)
- [Part 5: S3 and Storage](/posts/terraform-cdk/aws-example/05-storage)
- [Part 6: IAM and Security](/posts/terraform-cdk/aws-example/06-iam-security)
- [Part 7: CI/CD Pipeline](/posts/terraform-cdk/aws-example/07-cicd)
