# 0001 — Use AWS CDK for Infrastructure as Code

Date: 2026-06-20
Status: Accepted

## Context

PeakHQ deploys application infrastructure on AWS. All AWS resources must be version-controlled, reproducible, and deployable without manual steps in the AWS Console.

The main options evaluated:

| Option                        | Pros                                                                                                    | Cons                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| AWS CDK (TypeScript)          | Type-safe, high-level constructs, generates CloudFormation, first-party AWS support, active development | Requires Node.js toolchain                  |
| Terraform                     | Multi-cloud, large ecosystem, declarative                                                               | External tool (non-AWS), HCL learning curve |
| AWS CloudFormation (raw YAML) | Native AWS, no extra toolchain                                                                          | Verbose, no type safety, slow to write      |
| AWS SAM                       | Optimised for Lambda/serverless                                                                         | Limited to serverless patterns              |

## Decision

Use **AWS CDK (TypeScript)** as the sole IaC tool.

Rationale:

- TypeScript provides type safety and IDE completion for all resource definitions.
- CDK synthesizes to CloudFormation, so we get the reliability of CloudFormation without writing YAML by hand.
- CDK Constructs allow reusable, testable infrastructure components.
- CDK snapshot tests (`@aws-cdk/assert` / `aws-cdk-lib/assertions`) let us test infrastructure changes in CI the same way we test application code.
- First-party AWS support means CDK constructs are updated alongside new AWS service features.

## Consequences

- All AWS resources live in `infra/` and are deployed via `npx cdk deploy`.
- Zero ClickOps: no resource is created manually in the AWS Console for anything that must persist.
- CDK snapshot tests are mandatory for every Stack — they run in CI and must pass before merging.
- The CDK project uses TypeScript regardless of the application language chosen later.
- Developers need Node.js and the AWS CDK CLI installed locally (`npm i -g aws-cdk`).
