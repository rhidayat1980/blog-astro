---
title: "CI/CD for Terraform CDK Projects"
description: "Set up robust CI/CD pipelines for automated testing and deployment of Terraform CDK infrastructure"
publishDate: 2024-01-17
tags: ["terraform", "cdk", "typescript", "cicd", "devops", "infrastructure", "series:terraform-cdk:6"]
draft: false
---

## Series Navigation

- [Part 1: Getting Started with Terraform CDK](/posts/terraform-cdk/01-getting-started)
- [Part 2: Resource Management with CDK](/posts/terraform-cdk/02-resource-management)
- [Part 3: Advanced TypeScript Patterns](/posts/terraform-cdk/03-typescript-patterns)
- [Part 4: Custom Constructs and Components](/posts/terraform-cdk/04-custom-constructs)
- [Part 5: Testing CDK Applications](/posts/terraform-cdk/05-testing)
- **Part 6: CI/CD for CDK Projects** (Current)

## CI/CD for CDKTF Projects

Setting up proper CI/CD pipelines for your CDKTF projects ensures consistent, automated, and reliable infrastructure deployments.

## GitHub Actions Pipeline

### Basic Workflow

```yaml
# .github/workflows/cdktf.yml
name: CDKTF Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Type check
        run: npm run type-check
        
      - name: Run tests
        run: npm test
        
      - name: Synth and validate
        run: |
          npx cdktf synth
          npx cdktf diff

  deploy:
    needs: validate
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-west-2
          
      - name: Deploy infrastructure
        run: npx cdktf deploy --auto-approve
```

## GitLab CI Pipeline

### Multi-Environment Pipeline

```yaml
# .gitlab-ci.yml
image: node:18

stages:
  - validate
  - test
  - plan
  - deploy

variables:
  CDKTF_DISABLE_PLUGIN_CACHE_ENV: "true"

.base_job:
  cache:
    key: ${CI_COMMIT_REF_SLUG}
    paths:
      - node_modules/
  before_script:
    - npm ci

validate:
  extends: .base_job
  stage: validate
  script:
    - npm run type-check
    - npm run lint

test:
  extends: .base_job
  stage: test
  script:
    - npm test
  coverage: /All files[^|]*\|[^|]*\s+([\d\.]+)/

plan:staging:
  extends: .base_job
  stage: plan
  script:
    - npx cdktf diff
  environment:
    name: staging
  rules:
    - if: $CI_COMMIT_BRANCH == "develop"

deploy:staging:
  extends: .base_job
  stage: deploy
  script:
    - npx cdktf deploy --auto-approve
  environment:
    name: staging
  rules:
    - if: $CI_COMMIT_BRANCH == "develop"
  when: manual

plan:production:
  extends: .base_job
  stage: plan
  script:
    - npx cdktf diff
  environment:
    name: production
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

deploy:production:
  extends: .base_job
  stage: deploy
  script:
    - npx cdktf deploy --auto-approve
  environment:
    name: production
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
  when: manual
```

## Azure DevOps Pipeline

### Multi-Stage Pipeline

```yaml
# azure-pipelines.yml
trigger:
  - main
  - develop

variables:
  npm_config_cache: $(Pipeline.Workspace)/.npm

stages:
  - stage: Validate
    jobs:
      - job: ValidateAndTest
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '18.x'
          
          - task: Cache@2
            inputs:
              key: 'npm | "$(Agent.OS)" | package-lock.json'
              path: $(npm_config_cache)
          
          - script: npm ci
            displayName: 'Install dependencies'
          
          - script: |
              npm run type-check
              npm run lint
            displayName: 'Validate code'
          
          - script: npm test
            displayName: 'Run tests'

  - stage: Plan
    jobs:
      - job: PlanInfrastructure
        steps:
          - script: npx cdktf diff
            displayName: 'Generate plan'

  - stage: Deploy
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: DeployInfrastructure
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - script: npx cdktf deploy --auto-approve
                  displayName: 'Deploy infrastructure'
```

## Jenkins Pipeline

### Declarative Pipeline

```groovy
// Jenkinsfile
pipeline {
    agent any
    
    environment {
        NODE_VERSION = '18'
        AWS_CREDENTIALS = credentials('aws-credentials')
    }
    
    stages {
        stage('Setup') {
            steps {
                sh 'nvm install ${NODE_VERSION}'
                sh 'nvm use ${NODE_VERSION}'
                sh 'npm ci'
            }
        }
        
        stage('Validate') {
            parallel {
                stage('Type Check') {
                    steps {
                        sh 'npm run type-check'
                    }
                }
                stage('Lint') {
                    steps {
                        sh 'npm run lint'
                    }
                }
                stage('Test') {
                    steps {
                        sh 'npm test'
                    }
                }
            }
        }
        
        stage('Plan') {
            steps {
                withAWS(credentials: 'aws-credentials', region: 'us-west-2') {
                    sh 'npx cdktf diff'
                }
            }
        }
        
        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                withAWS(credentials: 'aws-credentials', region: 'us-west-2') {
                    sh 'npx cdktf deploy --auto-approve'
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

## Best Practices for CI/CD

### 1. Environment Management

```typescript
// config/environments.ts
interface EnvironmentConfig {
  readonly name: string;
  readonly region: string;
  readonly account: string;
  readonly tags: Record<string, string>;
}

export const environments: Record<string, EnvironmentConfig> = {
  development: {
    name: "development",
    region: "us-west-2",
    account: "123456789012",
    tags: {
      Environment: "development",
    },
  },
  production: {
    name: "production",
    region: "us-west-2",
    account: "987654321098",
    tags: {
      Environment: "production",
    },
  },
};
```

### 2. Secret Management

```typescript
// config/secrets.ts
import { SecretsManager } from "@aws-sdk/client-secrets-manager";

export async function getSecrets(secretName: string): Promise<any> {
  const client = new SecretsManager({
    region: process.env.AWS_REGION,
  });

  const response = await client.getSecretValue({
    SecretId: secretName,
  });

  return JSON.parse(response.SecretString || "{}");
}
```

### 3. Drift Detection

```typescript
// scripts/detect-drift.ts
import { execSync } from "child_process";

function detectDrift() {
  try {
    const output = execSync("cdktf diff", { encoding: "utf-8" });
    if (output.includes("Plan:")) {
      console.log("Infrastructure drift detected!");
      process.exit(1);
    }
  } catch (error) {
    console.error("Error detecting drift:", error);
    process.exit(1);
  }
}

detectDrift();
```

## Pipeline Security

### 1. OIDC Authentication

```yaml
# GitHub Actions OIDC Authentication
jobs:
  deploy:
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: aws-actions/configure-aws-credentials@v1
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-actions
          aws-region: us-west-2
```

### 2. Least Privilege Access

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": [
        "arn:aws:s3:::terraform-state-bucket",
        "arn:aws:s3:::terraform-state-bucket/*"
      ]
    }
  ]
}
```

## Monitoring and Alerting

### 1. Slack Notifications

```yaml
# GitHub Actions Slack notification
- name: Notify Slack
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    fields: repo,message,commit,author,action,eventName,ref,workflow
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
  if: always()
```

### 2. Error Tracking

```typescript
// monitoring/error-tracking.ts
import * as Sentry from "@sentry/node";

export function initializeErrorTracking() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.ENVIRONMENT,
    tracesSampleRate: 1.0,
  });
}
```

## Conclusion

This concludes our series on Terraform CDK with TypeScript. We've covered everything from basic setup to advanced patterns, testing, and CI/CD implementation. Remember to:

1. Implement proper testing at all levels
2. Use type-safe constructs and patterns
3. Automate deployments with proper safeguards
4. Monitor and track infrastructure changes
5. Follow security best practices

## Additional Resources

- [CDKTF CI/CD Best Practices](https://developer.hashicorp.com/terraform/cdktf/create-and-deploy/continuous-integration)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitLab CI Documentation](https://docs.gitlab.com/ee/ci/)
- [Azure DevOps Pipelines](https://docs.microsoft.com/en-us/azure/devops/pipelines/)
