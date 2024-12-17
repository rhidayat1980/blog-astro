---
title: "AWS Infrastructure with CDK - Part 6: CI/CD Setup"
description: "Implement CI/CD pipelines for Terraform CDK infrastructure using popular tools"
publishDate: 2024-01-27
tags: ["terraform", "cdk", "typescript", "aws", "cicd", "github-actions", "gitlab", "series:terraform-cdk-aws:6"]
draft: false
---

## Series Navigation

- [Part 1: Project Setup](/posts/terraform-cdk/aws-example/01-project-setup)
- [Part 2: VPC and Network](/posts/terraform-cdk/aws-example/02-vpc-network)
- [Part 3: EKS Cluster](/posts/terraform-cdk/aws-example/03-eks-setup)
- [Part 4: RDS Database](/posts/terraform-cdk/aws-example/04-rds-setup)
- [Part 5: S3 Storage](/posts/terraform-cdk/aws-example/05-s3-setup)
- **Part 6: CI/CD Pipeline** (Current)

## CI/CD Pipeline Setup

Let's set up CI/CD pipelines for our Terraform CDK infrastructure using popular tools like GitHub Actions, GitLab CI, and Azure DevOps.

## GitHub Actions Pipeline

```yaml
# .github/workflows/terraform.yml
name: 'Terraform CDK'

on:
  push:
    branches: [ main ]
    paths:
      - 'infrastructure/**'
  pull_request:
    branches: [ main ]
    paths:
      - 'infrastructure/**'

env:
  AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
  AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
  AWS_REGION: us-west-2
  NODE_VERSION: '18'

jobs:
  validate:
    name: Validate
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./infrastructure

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
        cache-dependency-path: ./infrastructure/package-lock.json

    - name: Install dependencies
      run: npm ci

    - name: Run linter
      run: npm run lint

    - name: Run tests
      run: npm test

    - name: Synth CDK
      run: npm run synth

  plan:
    name: Plan
    needs: validate
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./infrastructure

    strategy:
      matrix:
        environment: [dev, staging, prod]

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
        cache-dependency-path: ./infrastructure/package-lock.json

    - name: Install dependencies
      run: npm ci

    - name: Terraform Plan
      run: |
        ENVIRONMENT=${{ matrix.environment }} npm run plan
      
    - name: Upload Plan
      uses: actions/upload-artifact@v3
      with:
        name: terraform-plan-${{ matrix.environment }}
        path: ./infrastructure/cdktf.out/stacks/*
        retention-days: 5

  apply:
    name: Apply
    needs: plan
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./infrastructure
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'

    strategy:
      matrix:
        environment: [dev, staging, prod]

    environment:
      name: ${{ matrix.environment }}
      
    concurrency: 
      group: ${{ matrix.environment }}
      cancel-in-progress: false

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
        cache-dependency-path: ./infrastructure/package-lock.json

    - name: Install dependencies
      run: npm ci

    - name: Download Plan
      uses: actions/download-artifact@v3
      with:
        name: terraform-plan-${{ matrix.environment }}
        path: ./infrastructure/cdktf.out/stacks

    - name: Terraform Apply
      run: |
        ENVIRONMENT=${{ matrix.environment }} npm run deploy
```

## GitLab CI Pipeline

```yaml
# .gitlab-ci.yml
image: node:18-alpine

variables:
  AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}
  AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}
  AWS_REGION: us-west-2

cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - infrastructure/node_modules/

stages:
  - validate
  - plan
  - apply

.infrastructure_changes:
  rules:
    - changes:
        - infrastructure/**/*
      when: always
    - when: never

validate:
  stage: validate
  extends: .infrastructure_changes
  script:
    - cd infrastructure
    - npm ci
    - npm run lint
    - npm test
    - npm run synth

.plan_template:
  stage: plan
  extends: .infrastructure_changes
  script:
    - cd infrastructure
    - npm ci
    - ENVIRONMENT=$DEPLOY_ENV npm run plan
  artifacts:
    paths:
      - infrastructure/cdktf.out/stacks/
    expire_in: 1 day

plan:dev:
  extends: .plan_template
  variables:
    DEPLOY_ENV: dev

plan:staging:
  extends: .plan_template
  variables:
    DEPLOY_ENV: staging

plan:prod:
  extends: .plan_template
  variables:
    DEPLOY_ENV: prod

.apply_template:
  stage: apply
  extends: .infrastructure_changes
  script:
    - cd infrastructure
    - npm ci
    - ENVIRONMENT=$DEPLOY_ENV npm run deploy
  dependencies:
    - plan:$DEPLOY_ENV
  when: manual
  allow_failure: false

apply:dev:
  extends: .apply_template
  variables:
    DEPLOY_ENV: dev
  environment:
    name: dev
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

apply:staging:
  extends: .apply_template
  variables:
    DEPLOY_ENV: staging
  environment:
    name: staging
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

apply:prod:
  extends: .apply_template
  variables:
    DEPLOY_ENV: prod
  environment:
    name: prod
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
```

## Azure DevOps Pipeline

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main
  paths:
    include:
      - infrastructure/*

variables:
  AWS_ACCESS_KEY_ID: $(AWS_ACCESS_KEY_ID)
  AWS_SECRET_ACCESS_KEY: $(AWS_SECRET_ACCESS_KEY)
  AWS_REGION: us-west-2
  NODE_VERSION: '18.x'

stages:
- stage: validate
  jobs:
  - job: validate
    pool:
      vmImage: ubuntu-latest
    steps:
    - task: NodeTool@0
      inputs:
        versionSpec: $(NODE_VERSION)
      displayName: 'Install Node.js'
    
    - script: |
        cd infrastructure
        npm ci
        npm run lint
        npm test
        npm run synth
      displayName: 'Validate'

- stage: plan
  dependsOn: validate
  jobs:
  - job: plan
    strategy:
      matrix:
        dev:
          environment: dev
        staging:
          environment: staging
        prod:
          environment: prod
    pool:
      vmImage: ubuntu-latest
    steps:
    - task: NodeTool@0
      inputs:
        versionSpec: $(NODE_VERSION)
      displayName: 'Install Node.js'
    
    - script: |
        cd infrastructure
        npm ci
        ENVIRONMENT=$(environment) npm run plan
      displayName: 'Plan'
    
    - publish: $(System.DefaultWorkingDirectory)/infrastructure/cdktf.out/stacks
      artifact: terraform-plan-$(environment)

- stage: apply_dev
  dependsOn: plan
  condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
  jobs:
  - deployment: deploy
    environment: dev
    pool:
      vmImage: ubuntu-latest
    strategy:
      runOnce:
        deploy:
          steps:
          - task: NodeTool@0
            inputs:
              versionSpec: $(NODE_VERSION)
            displayName: 'Install Node.js'
          
          - download: current
            artifact: terraform-plan-dev
          
          - script: |
              cd infrastructure
              npm ci
              ENVIRONMENT=dev npm run deploy
            displayName: 'Apply'

- stage: apply_staging
  dependsOn: apply_dev
  condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
  jobs:
  - deployment: deploy
    environment: staging
    pool:
      vmImage: ubuntu-latest
    strategy:
      runOnce:
        deploy:
          steps:
          - task: NodeTool@0
            inputs:
              versionSpec: $(NODE_VERSION)
            displayName: 'Install Node.js'
          
          - download: current
            artifact: terraform-plan-staging
          
          - script: |
              cd infrastructure
              npm ci
              ENVIRONMENT=staging npm run deploy
            displayName: 'Apply'

- stage: apply_prod
  dependsOn: apply_staging
  condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
  jobs:
  - deployment: deploy
    environment: prod
    pool:
      vmImage: ubuntu-latest
    strategy:
      runOnce:
        deploy:
          steps:
          - task: NodeTool@0
            inputs:
              versionSpec: $(NODE_VERSION)
            displayName: 'Install Node.js'
          
          - download: current
            artifact: terraform-plan-prod
          
          - script: |
              cd infrastructure
              npm ci
              ENVIRONMENT=prod npm run deploy
            displayName: 'Apply'
```

## Jenkins Pipeline

```groovy
// Jenkinsfile
pipeline {
    agent any

    environment {
        AWS_ACCESS_KEY_ID     = credentials('aws-access-key-id')
        AWS_SECRET_ACCESS_KEY = credentials('aws-secret-access-key')
        AWS_REGION           = 'us-west-2'
        NODE_VERSION         = '18'
    }

    stages {
        stage('Validate') {
            steps {
                dir('infrastructure') {
                    sh 'npm ci'
                    sh 'npm run lint'
                    sh 'npm test'
                    sh 'npm run synth'
                }
            }
        }

        stage('Plan') {
            parallel {
                stage('Plan Dev') {
                    steps {
                        dir('infrastructure') {
                            sh 'ENVIRONMENT=dev npm run plan'
                        }
                    }
                }
                stage('Plan Staging') {
                    steps {
                        dir('infrastructure') {
                            sh 'ENVIRONMENT=staging npm run plan'
                        }
                    }
                }
                stage('Plan Prod') {
                    steps {
                        dir('infrastructure') {
                            sh 'ENVIRONMENT=prod npm run plan'
                        }
                    }
                }
            }
        }

        stage('Deploy Dev') {
            when {
                branch 'main'
            }
            steps {
                dir('infrastructure') {
                    sh 'ENVIRONMENT=dev npm run deploy'
                }
            }
        }

        stage('Deploy Staging') {
            when {
                branch 'main'
            }
            input {
                message "Deploy to staging?"
            }
            steps {
                dir('infrastructure') {
                    sh 'ENVIRONMENT=staging npm run deploy'
                }
            }
        }

        stage('Deploy Prod') {
            when {
                branch 'main'
            }
            input {
                message "Deploy to production?"
            }
            steps {
                dir('infrastructure') {
                    sh 'ENVIRONMENT=prod npm run deploy'
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
    }
}
```

## NPM Scripts

Update your `package.json` with these scripts:

```json
{
  "scripts": {
    "lint": "eslint . --ext .ts",
    "test": "jest",
    "synth": "cdktf synth",
    "plan": "cdktf plan",
    "deploy": "cdktf deploy --auto-approve",
    "destroy": "cdktf destroy"
  }
}
```

## Environment Configuration

Create environment-specific configuration files:

```typescript
// src/config/environments.ts
export interface Environment {
  readonly name: string;
  readonly region: string;
  readonly cidr: string;
  readonly azs: string[];
  readonly eks: {
    readonly desiredSize: number;
    readonly minSize: number;
    readonly maxSize: number;
  };
  readonly rds: {
    readonly instanceClass: string;
    readonly allocatedStorage: number;
    readonly maxAllocatedStorage?: number;
    readonly multiAz: boolean;
  };
}

export const environments: { [key: string]: Environment } = {
  dev: {
    name: "dev",
    region: "us-west-2",
    cidr: "10.0.0.0/16",
    azs: ["us-west-2a", "us-west-2b"],
    eks: {
      desiredSize: 2,
      minSize: 1,
      maxSize: 3,
    },
    rds: {
      instanceClass: "db.t3.medium",
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      multiAz: false,
    },
  },
  staging: {
    name: "staging",
    region: "us-west-2",
    cidr: "10.1.0.0/16",
    azs: ["us-west-2a", "us-west-2b"],
    eks: {
      desiredSize: 3,
      minSize: 2,
      maxSize: 4,
    },
    rds: {
      instanceClass: "db.t3.large",
      allocatedStorage: 50,
      maxAllocatedStorage: 200,
      multiAz: true,
    },
  },
  prod: {
    name: "prod",
    region: "us-west-2",
    cidr: "10.2.0.0/16",
    azs: ["us-west-2a", "us-west-2b", "us-west-2c"],
    eks: {
      desiredSize: 5,
      minSize: 3,
      maxSize: 10,
    },
    rds: {
      instanceClass: "db.r5.xlarge",
      allocatedStorage: 100,
      maxAllocatedStorage: 500,
      multiAz: true,
    },
  },
};
```

## Security Considerations

1. **Secret Management**:
   - Use environment-specific secrets management
   - Never commit secrets to version control
   - Rotate credentials regularly

2. **Access Control**:
   - Implement proper RBAC for CI/CD systems
   - Use separate AWS credentials per environment
   - Enable audit logging for all operations

3. **Pipeline Security**:
   - Enable branch protection rules
   - Require code reviews
   - Implement automated security scanning

4. **State Management**:
   - Use remote state storage with encryption
   - Enable state locking
   - Implement state backup strategies

## Best Practices

1. **Pipeline Structure**:
   - Validate changes early
   - Use parallel execution where possible
   - Implement proper error handling

2. **Deployment Strategy**:
   - Follow progressive deployment pattern
   - Implement proper rollback procedures
   - Use environment promotion strategy

3. **Testing**:
   - Run comprehensive tests before deployment
   - Include infrastructure validation tests
   - Test rollback procedures

4. **Monitoring**:
   - Implement deployment monitoring
   - Set up alerts for pipeline failures
   - Track deployment metrics

## Conclusion

This completes our AWS infrastructure series using Terraform CDK. We've covered:

1. Project setup and structure
2. VPC and networking
3. EKS cluster configuration
4. RDS database setup
5. S3 storage management
6. CI/CD pipeline implementation

The infrastructure is now ready for production use with proper security, scalability, and maintainability considerations in place.
