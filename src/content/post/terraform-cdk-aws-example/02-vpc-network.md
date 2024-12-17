---
title: "AWS CDK with Terraform - Part 2: VPC Setup"
description: "Implement a secure and scalable VPC architecture using Terraform CDK with TypeScript"
publishDate: 2024-01-23
tags: ["terraform", "cdk", "typescript", "aws", "vpc", "networking", "series:terraform-cdk-aws:2"]
draft: false
---

## VPC and Network Infrastructure

Let's implement the VPC and networking components with proper subnetting and security.

## VPC Construct

```typescript
// src/constructs/vpc/vpc-construct.ts
import { Construct } from "constructs";
import { Vpc } from "@cdktf/provider-aws/lib/vpc";
import { Subnet } from "@cdktf/provider-aws/lib/subnet";
import { InternetGateway } from "@cdktf/provider-aws/lib/internet-gateway";
import { NatGateway } from "@cdktf/provider-aws/lib/nat-gateway";
import { RouteTable } from "@cdktf/provider-aws/lib/route-table";
import { RouteTableAssociation } from "@cdktf/provider-aws/lib/route-table-association";
import { Eip } from "@cdktf/provider-aws/lib/eip";

export interface VpcConstructProps {
  readonly name: string;
  readonly cidrBlock: string;
  readonly azs: string[];
  readonly tags?: { [key: string]: string };
}

export class VpcConstruct extends Construct {
  public readonly vpc: Vpc;
  public readonly publicSubnets: Subnet[];
  public readonly privateSubnets: Subnet[];
  public readonly databaseSubnets: Subnet[];
  public readonly internetGateway: InternetGateway;
  public readonly natGateways: NatGateway[];

  constructor(scope: Construct, id: string, props: VpcConstructProps) {
    super(scope, id);

    // Create VPC
    this.vpc = new Vpc(this, "vpc", {
      cidrBlock: props.cidrBlock,
      enableDnsHostnames: true,
      enableDnsSupport: true,
      tags: {
        Name: `${props.name}-vpc`,
        ...props.tags,
      },
    });

    // Create Internet Gateway
    this.internetGateway = new InternetGateway(this, "igw", {
      vpcId: this.vpc.id,
      tags: {
        Name: `${props.name}-igw`,
        ...props.tags,
      },
    });

    // Create subnets
    this.publicSubnets = this.createSubnets("public", props);
    this.privateSubnets = this.createSubnets("private", props);
    this.databaseSubnets = this.createSubnets("database", props);

    // Create NAT Gateways (one per AZ)
    this.natGateways = this.createNatGateways(props);

    // Create route tables
    this.createRouteTables(props);
  }

  private createSubnets(
    type: "public" | "private" | "database",
    props: VpcConstructProps
  ): Subnet[] {
    const subnets: Subnet[] = [];
    const baseOctet = type === "public" ? 0 : type === "private" ? 100 : 200;

    props.azs.forEach((az, index) => {
      const subnet = new Subnet(this, `${type}-subnet-${index + 1}`, {
        vpcId: this.vpc.id,
        cidrBlock: `${props.cidrBlock.split(".")[0]}.${props.cidrBlock.split(".")[1]}.${baseOctet + index}.0/24`,
        availabilityZone: az,
        mapPublicIpOnLaunch: type === "public",
        tags: {
          Name: `${props.name}-${type}-subnet-${index + 1}`,
          Type: type,
          ...props.tags,
        },
      });
      subnets.push(subnet);
    });

    return subnets;
  }

  private createNatGateways(props: VpcConstructProps): NatGateway[] {
    const natGateways: NatGateway[] = [];

    this.publicSubnets.forEach((subnet, index) => {
      const eip = new Eip(this, `nat-eip-${index + 1}`, {
        vpc: true,
        tags: {
          Name: `${props.name}-nat-eip-${index + 1}`,
          ...props.tags,
        },
      });

      const natGateway = new NatGateway(this, `nat-gateway-${index + 1}`, {
        allocationId: eip.id,
        subnetId: subnet.id,
        tags: {
          Name: `${props.name}-nat-${index + 1}`,
          ...props.tags,
        },
      });

      natGateways.push(natGateway);
    });

    return natGateways;
  }

  private createRouteTables(props: VpcConstructProps) {
    // Public route table
    const publicRouteTable = new RouteTable(this, "public-rt", {
      vpcId: this.vpc.id,
      route: [
        {
          cidrBlock: "0.0.0.0/0",
          gatewayId: this.internetGateway.id,
        },
      ],
      tags: {
        Name: `${props.name}-public-rt`,
        ...props.tags,
      },
    });

    // Associate public subnets with public route table
    this.publicSubnets.forEach((subnet, index) => {
      new RouteTableAssociation(this, `public-rta-${index + 1}`, {
        subnetId: subnet.id,
        routeTableId: publicRouteTable.id,
      });
    });

    // Private route tables (one per AZ)
    this.privateSubnets.forEach((subnet, index) => {
      const privateRouteTable = new RouteTable(this, `private-rt-${index + 1}`, {
        vpcId: this.vpc.id,
        route: [
          {
            cidrBlock: "0.0.0.0/0",
            natGatewayId: this.natGateways[index % this.natGateways.length].id,
          },
        ],
        tags: {
          Name: `${props.name}-private-rt-${index + 1}`,
          ...props.tags,
        },
      });

      new RouteTableAssociation(this, `private-rta-${index + 1}`, {
        subnetId: subnet.id,
        routeTableId: privateRouteTable.id,
      });
    });

    // Database route tables
    this.databaseSubnets.forEach((subnet, index) => {
      const dbRouteTable = new RouteTable(this, `database-rt-${index + 1}`, {
        vpcId: this.vpc.id,
        route: [
          {
            cidrBlock: "0.0.0.0/0",
            natGatewayId: this.natGateways[index % this.natGateways.length].id,
          },
        ],
        tags: {
          Name: `${props.name}-database-rt-${index + 1}`,
          ...props.tags,
        },
      });

      new RouteTableAssociation(this, `database-rta-${index + 1}`, {
        subnetId: subnet.id,
        routeTableId: dbRouteTable.id,
      });
    });
  }
}
```

## Network Stack

```typescript
// src/stacks/network-stack.ts
import { BaseStack } from "./base-stack";
import { VpcConstruct } from "../constructs/vpc/vpc-construct";
import { Environment } from "../config/environments";

export class NetworkStack extends BaseStack {
  public readonly vpc: VpcConstruct;

  constructor(scope: Construct, id: string, env: Environment) {
    super(scope, id, env);

    this.vpc = new VpcConstruct(this, "vpc", {
      name: this.createNamePrefix("main"),
      cidrBlock: env.cidr,
      azs: env.azs,
      tags: this.tags,
    });
  }
}
```

## VPC Flow Logs

```typescript
// src/constructs/vpc/flow-logs-construct.ts
import { Construct } from "constructs";
import { CloudwatchLogGroup } from "@cdktf/provider-aws/lib/cloudwatch-log-group";
import { IamRole } from "@cdktf/provider-aws/lib/iam-role";
import { IamRolePolicy } from "@cdktf/provider-aws/lib/iam-role-policy";
import { FlowLog } from "@cdktf/provider-aws/lib/flow-log";

export interface FlowLogsConstructProps {
  readonly name: string;
  readonly vpcId: string;
  readonly tags?: { [key: string]: string };
}

export class FlowLogsConstruct extends Construct {
  constructor(scope: Construct, id: string, props: FlowLogsConstructProps) {
    super(scope, id);

    // Create CloudWatch Log Group
    const logGroup = new CloudwatchLogGroup(this, "flow-logs-group", {
      name: `/aws/vpc/${props.name}/flow-logs`,
      retentionInDays: 30,
      tags: props.tags,
    });

    // Create IAM Role for Flow Logs
    const role = new IamRole(this, "flow-logs-role", {
      name: `${props.name}-flow-logs-role`,
      assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: {
              Service: "vpc-flow-logs.amazonaws.com",
            },
            Action: "sts:AssumeRole",
          },
        ],
      }),
      tags: props.tags,
    });

    // Create IAM Role Policy
    new IamRolePolicy(this, "flow-logs-policy", {
      name: `${props.name}-flow-logs-policy`,
      role: role.id,
      policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: [
              "logs:CreateLogGroup",
              "logs:CreateLogStream",
              "logs:PutLogEvents",
              "logs:DescribeLogGroups",
              "logs:DescribeLogStreams",
            ],
            Resource: `${logGroup.arn}:*`,
          },
        ],
      }),
    });

    // Create Flow Log
    new FlowLog(this, "flow-log", {
      iamRoleArn: role.arn,
      logDestination: logGroup.arn,
      trafficType: "ALL",
      vpcId: props.vpcId,
      logFormat: "${version} ${account-id} ${interface-id} ${srcaddr} ${dstaddr} ${srcport} ${dstport} ${protocol} ${packets} ${bytes} ${start} ${end} ${action} ${log-status}",
      tags: {
        Name: `${props.name}-flow-log`,
        ...props.tags,
      },
    });
  }
}
```

## Network ACLs

```typescript
// src/constructs/vpc/network-acl-construct.ts
import { Construct } from "constructs";
import { NetworkAcl } from "@cdktf/provider-aws/lib/network-acl";
import { NetworkAclRule } from "@cdktf/provider-aws/lib/network-acl-rule";

export interface NetworkAclConstructProps {
  readonly name: string;
  readonly vpcId: string;
  readonly subnetIds: string[];
  readonly tags?: { [key: string]: string };
}

export class NetworkAclConstruct extends Construct {
  constructor(scope: Construct, id: string, props: NetworkAclConstructProps) {
    super(scope, id);

    const nacl = new NetworkAcl(this, "nacl", {
      vpcId: props.vpcId,
      subnetIds: props.subnetIds,
      tags: {
        Name: `${props.name}-nacl`,
        ...props.tags,
      },
    });

    // Inbound rules
    new NetworkAclRule(this, "nacl-inbound-http", {
      networkAclId: nacl.id,
      ruleNumber: 100,
      protocol: "tcp",
      ruleAction: "allow",
      egress: false,
      cidrBlock: "0.0.0.0/0",
      fromPort: 80,
      toPort: 80,
    });

    new NetworkAclRule(this, "nacl-inbound-https", {
      networkAclId: nacl.id,
      ruleNumber: 110,
      protocol: "tcp",
      ruleAction: "allow",
      egress: false,
      cidrBlock: "0.0.0.0/0",
      fromPort: 443,
      toPort: 443,
    });

    // Outbound rules
    new NetworkAclRule(this, "nacl-outbound-all", {
      networkAclId: nacl.id,
      ruleNumber: 100,
      protocol: "-1",
      ruleAction: "allow",
      egress: true,
      cidrBlock: "0.0.0.0/0",
      fromPort: 0,
      toPort: 0,
    });
  }
}
```

## Testing the Network Stack

```typescript
// test/network-stack.test.ts
import { Testing } from "cdktf";
import { NetworkStack } from "../src/stacks/network-stack";
import { environments } from "../src/config/environments";

describe("NetworkStack", () => {
  const env = environments.dev;

  test("should create VPC with correct CIDR", () => {
    const app = Testing.app();
    const stack = new NetworkStack(app, "test-network", env);
    const synthStack = Testing.synth(stack);

    expect(synthStack).toHaveResource("aws_vpc", {
      cidr_block: env.cidr,
      enable_dns_hostnames: true,
      enable_dns_support: true,
    });
  });

  test("should create correct number of subnets", () => {
    const app = Testing.app();
    const stack = new NetworkStack(app, "test-network", env);
    const synthStack = Testing.synth(stack);

    // Each environment should have public, private, and database subnets
    const expectedSubnets = env.azs.length * 3;
    expect(synthStack).toHaveResourceWithProperties("aws_subnet", {
      count: expectedSubnets,
    });
  });
});
```

## Usage Example

Here's how to use the network stack in your infrastructure:

```typescript
// main.ts
import { App } from "cdktf";
import { NetworkStack } from "./src/stacks/network-stack";
import { environments } from "./src/config/environments";

const app = new App();
const envName = process.env.ENVIRONMENT || "dev";
const environment = environments[envName];

const networkStack = new NetworkStack(app, `${envName}-network`, environment);

// Add Flow Logs
new FlowLogsConstruct(networkStack, "flow-logs", {
  name: networkStack.createNamePrefix("vpc"),
  vpcId: networkStack.vpc.vpc.id,
  tags: networkStack.tags,
});

// Add Network ACLs for public subnets
new NetworkAclConstruct(networkStack, "public-nacl", {
  name: networkStack.createNamePrefix("public"),
  vpcId: networkStack.vpc.vpc.id,
  subnetIds: networkStack.vpc.publicSubnets.map(subnet => subnet.id),
  tags: networkStack.tags,
});

app.synth();
```

## Next Steps

In [Part 3: EKS Cluster Setup](/posts/terraform-cdk/aws-example/03-eks-setup), we'll build on this network infrastructure to deploy an EKS cluster with proper networking and security configurations.
