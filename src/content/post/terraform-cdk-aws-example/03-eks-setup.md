---
title: "AWS Infrastructure with CDK - Part 3: EKS Cluster"
description: "Deploy a production-ready EKS cluster with Terraform CDK and TypeScript"
publishDate: 2024-01-24
tags: ["terraform", "cdk", "typescript", "aws", "eks", "kubernetes", "series:terraform-cdk-aws:3"]
draft: false
---

## Series Navigation

- [Part 1: Project Setup](/posts/terraform-cdk/aws-example/01-project-setup)
- [Part 2: VPC and Network](/posts/terraform-cdk/aws-example/02-vpc-network)
- **Part 3: EKS Cluster** (Current)
- [Part 4: RDS Database](/posts/terraform-cdk/aws-example/04-rds-setup)
- [Part 5: S3 Storage](/posts/terraform-cdk/aws-example/05-s3-setup)
- [Part 6: IAM & Security](/posts/terraform-cdk/aws-example/06-iam-security)
- [Part 7: CI/CD Pipeline](/posts/terraform-cdk/aws-example/07-cicd-setup)

## EKS Cluster Setup

Let's create a production-ready EKS cluster with proper IAM roles, node groups, and security configurations.

## IAM Roles for EKS

```typescript
// src/constructs/eks/eks-roles-construct.ts
import { Construct } from "constructs";
import { IamRole } from "@cdktf/provider-aws/lib/iam-role";
import { IamRolePolicy } from "@cdktf/provider-aws/lib/iam-role-policy";
import { IamRolePolicyAttachment } from "@cdktf/provider-aws/lib/iam-role-policy-attachment";
import { DataAwsIamPolicyDocument } from "@cdktf/provider-aws/lib/data-aws-iam-policy-document";

export interface EksRolesConstructProps {
  readonly name: string;
  readonly tags?: { [key: string]: string };
}

export class EksRolesConstruct extends Construct {
  public readonly clusterRole: IamRole;
  public readonly nodeRole: IamRole;

  constructor(scope: Construct, id: string, props: EksRolesConstructProps) {
    super(scope, id);

    // EKS Cluster Role
    const clusterAssumeRolePolicy = new DataAwsIamPolicyDocument(this, "cluster-assume-role-policy", {
      statement: [{
        actions: ["sts:AssumeRole"],
        effect: "Allow",
        principals: [{
          type: "Service",
          identifiers: ["eks.amazonaws.com"],
        }],
      }],
    });

    this.clusterRole = new IamRole(this, "cluster-role", {
      name: `${props.name}-eks-cluster-role`,
      assumeRolePolicy: clusterAssumeRolePolicy.json,
      tags: props.tags,
    });

    // Attach required policies to cluster role
    const clusterPolicies = [
      "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy",
      "arn:aws:iam::aws:policy/AmazonEKSVPCResourceController",
    ];

    clusterPolicies.forEach((policyArn, index) => {
      new IamRolePolicyAttachment(this, `cluster-policy-${index}`, {
        policyArn,
        role: this.clusterRole.name,
      });
    });

    // EKS Node Role
    const nodeAssumeRolePolicy = new DataAwsIamPolicyDocument(this, "node-assume-role-policy", {
      statement: [{
        actions: ["sts:AssumeRole"],
        effect: "Allow",
        principals: [{
          type: "Service",
          identifiers: ["ec2.amazonaws.com"],
        }],
      }],
    });

    this.nodeRole = new IamRole(this, "node-role", {
      name: `${props.name}-eks-node-role`,
      assumeRolePolicy: nodeAssumeRolePolicy.json,
      tags: props.tags,
    });

    // Attach required policies to node role
    const nodePolicies = [
      "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
      "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
      "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
    ];

    nodePolicies.forEach((policyArn, index) => {
      new IamRolePolicyAttachment(this, `node-policy-${index}`, {
        policyArn,
        role: this.nodeRole.name,
      });
    });
  }
}
```

## EKS Security Groups

```typescript
// src/constructs/eks/eks-security-groups-construct.ts
import { Construct } from "constructs";
import { SecurityGroup } from "@cdktf/provider-aws/lib/security-group";
import { SecurityGroupRule } from "@cdktf/provider-aws/lib/security-group-rule";

export interface EksSecurityGroupsConstructProps {
  readonly name: string;
  readonly vpcId: string;
  readonly tags?: { [key: string]: string };
}

export class EksSecurityGroupsConstruct extends Construct {
  public readonly clusterSg: SecurityGroup;
  public readonly nodeSg: SecurityGroup;

  constructor(scope: Construct, id: string, props: EksSecurityGroupsConstructProps) {
    super(scope, id);

    // Cluster Security Group
    this.clusterSg = new SecurityGroup(this, "cluster-sg", {
      name: `${props.name}-eks-cluster-sg`,
      vpcId: props.vpcId,
      description: "Security group for EKS cluster control plane",
      tags: {
        "kubernetes.io/cluster/${props.name}": "owned",
        ...props.tags,
      },
    });

    // Node Security Group
    this.nodeSg = new SecurityGroup(this, "node-sg", {
      name: `${props.name}-eks-node-sg`,
      vpcId: props.vpcId,
      description: "Security group for EKS worker nodes",
      tags: {
        "kubernetes.io/cluster/${props.name}": "owned",
        ...props.tags,
      },
    });

    // Allow nodes to communicate with the cluster API Server
    new SecurityGroupRule(this, "node-to-cluster-rule", {
      type: "ingress",
      fromPort: 443,
      toPort: 443,
      protocol: "tcp",
      securityGroupId: this.clusterSg.id,
      sourceSecurityGroupId: this.nodeSg.id,
    });

    // Allow cluster API Server to communicate with the worker nodes
    new SecurityGroupRule(this, "cluster-to-node-rule", {
      type: "ingress",
      fromPort: 1025,
      toPort: 65535,
      protocol: "tcp",
      securityGroupId: this.nodeSg.id,
      sourceSecurityGroupId: this.clusterSg.id,
    });

    // Allow worker nodes to communicate with each other
    new SecurityGroupRule(this, "node-to-node-rule", {
      type: "ingress",
      fromPort: 0,
      toPort: 65535,
      protocol: "-1",
      securityGroupId: this.nodeSg.id,
      sourceSecurityGroupId: this.nodeSg.id,
    });

    // Allow worker nodes outbound internet access
    new SecurityGroupRule(this, "node-outbound-rule", {
      type: "egress",
      fromPort: 0,
      toPort: 0,
      protocol: "-1",
      securityGroupId: this.nodeSg.id,
      cidrBlocks: ["0.0.0.0/0"],
    });
  }
}
```

## EKS Cluster Construct

```typescript
// src/constructs/eks/eks-cluster-construct.ts
import { Construct } from "constructs";
import { EksCluster } from "@cdktf/provider-aws/lib/eks-cluster";
import { EksNodeGroup } from "@cdktf/provider-aws/lib/eks-node-group";
import { EksRolesConstruct } from "./eks-roles-construct";
import { EksSecurityGroupsConstruct } from "./eks-security-groups-construct";

export interface EksClusterConstructProps {
  readonly name: string;
  readonly version: string;
  readonly vpcId: string;
  readonly subnetIds: string[];
  readonly instanceTypes: string[];
  readonly desiredSize: number;
  readonly minSize: number;
  readonly maxSize: number;
  readonly tags?: { [key: string]: string };
}

export class EksClusterConstruct extends Construct {
  public readonly cluster: EksCluster;
  public readonly nodeGroup: EksNodeGroup;

  constructor(scope: Construct, id: string, props: EksClusterConstructProps) {
    super(scope, id);

    // Create IAM roles
    const roles = new EksRolesConstruct(this, "roles", {
      name: props.name,
      tags: props.tags,
    });

    // Create security groups
    const securityGroups = new EksSecurityGroupsConstruct(this, "security-groups", {
      name: props.name,
      vpcId: props.vpcId,
      tags: props.tags,
    });

    // Create EKS cluster
    this.cluster = new EksCluster(this, "cluster", {
      name: props.name,
      roleArn: roles.clusterRole.arn,
      version: props.version,
      vpcConfig: {
        subnetIds: props.subnetIds,
        securityGroupIds: [securityGroups.clusterSg.id],
        endpointPrivateAccess: true,
        endpointPublicAccess: true,
      },
      tags: {
        Name: props.name,
        ...props.tags,
      },
    });

    // Create EKS node group
    this.nodeGroup = new EksNodeGroup(this, "node-group", {
      clusterName: this.cluster.name,
      nodeGroupName: `${props.name}-node-group`,
      nodeRoleArn: roles.nodeRole.arn,
      subnetIds: props.subnetIds,
      instanceTypes: props.instanceTypes,
      scalingConfig: {
        desiredSize: props.desiredSize,
        minSize: props.minSize,
        maxSize: props.maxSize,
      },
      updateConfig: {
        maxUnavailable: 1,
      },
      tags: props.tags,
    });
  }
}
```

## EKS Stack

```typescript
// src/stacks/eks-stack.ts
import { BaseStack } from "./base-stack";
import { EksClusterConstruct } from "../constructs/eks/eks-cluster-construct";
import { Environment } from "../config/environments";

export interface EksStackProps {
  readonly vpcId: string;
  readonly privateSubnetIds: string[];
}

export class EksStack extends BaseStack {
  public readonly cluster: EksClusterConstruct;

  constructor(scope: Construct, id: string, env: Environment, props: EksStackProps) {
    super(scope, id, env);

    this.cluster = new EksClusterConstruct(this, "eks", {
      name: this.createNamePrefix("eks"),
      version: "1.27",
      vpcId: props.vpcId,
      subnetIds: props.privateSubnetIds,
      instanceTypes: ["t3.medium"],
      desiredSize: env.eks.desiredSize,
      minSize: env.eks.minSize,
      maxSize: env.eks.maxSize,
      tags: this.tags,
    });
  }
}
```

## Testing the EKS Stack

```typescript
// test/eks-stack.test.ts
import { Testing } from "cdktf";
import { EksStack } from "../src/stacks/eks-stack";
import { environments } from "../src/config/environments";

describe("EksStack", () => {
  const env = environments.dev;
  const mockProps = {
    vpcId: "vpc-12345",
    privateSubnetIds: ["subnet-1", "subnet-2"],
  };

  test("should create EKS cluster with correct version", () => {
    const app = Testing.app();
    const stack = new EksStack(app, "test-eks", env, mockProps);
    const synthStack = Testing.synth(stack);

    expect(synthStack).toHaveResource("aws_eks_cluster", {
      version: "1.27",
      name: expect.stringContaining("eks"),
    });
  });

  test("should create node group with correct configuration", () => {
    const app = Testing.app();
    const stack = new EksStack(app, "test-eks", env, mockProps);
    const synthStack = Testing.synth(stack);

    expect(synthStack).toHaveResource("aws_eks_node_group", {
      instance_types: ["t3.medium"],
      scaling_config: {
        desired_size: env.eks.desiredSize,
        min_size: env.eks.minSize,
        max_size: env.eks.maxSize,
      },
    });
  });
});
```

## Usage Example

Here's how to use the EKS stack in your infrastructure:

```typescript
// main.ts
import { App } from "cdktf";
import { NetworkStack } from "./src/stacks/network-stack";
import { EksStack } from "./src/stacks/eks-stack";
import { environments } from "./src/config/environments";

const app = new App();
const envName = process.env.ENVIRONMENT || "dev";
const environment = environments[envName];

const networkStack = new NetworkStack(app, `${envName}-network`, environment);

const eksStack = new EksStack(app, `${envName}-eks`, environment, {
  vpcId: networkStack.vpc.vpc.id,
  privateSubnetIds: networkStack.vpc.privateSubnets.map(subnet => subnet.id),
});

app.synth();
```

## Next Steps

In [Part 4: RDS Database Setup](/posts/terraform-cdk/aws-example/04-rds-setup), we'll create a secure RDS PostgreSQL instance in our private subnets with proper security groups and access controls.
