# CLAUDE.md — PeakHQ

[PLACEHOLDER: one-line project description]

## Tech Stack

[PLACEHOLDER — fill in after tech stack decision]
- **Runtime:** TBD
- **Framework:** TBD
- **IaC:** AWS CDK (TypeScript)
- **Source Control:** GitHub
- **CI/CD:** GitHub Actions
- **Primary Region:** eu-south-1 (Milan); eu-west-1 (Ireland) as fallback if a service is unavailable

## Infrastructure Constraint

> **HARD RULE: All application infrastructure MUST use AWS services only.**

Never suggest Vercel, Netlify, Heroku, Render, Railway, Fly.io, or any non-AWS hosting.

**Approved non-AWS exceptions (these two only):**
- **GitHub** — source control (required: AWS CodeCommit and CodeCatalyst are both deprecated for new customers)
- **GitHub Actions** — CI/CD (same reason as above)

### Approved Free Tier Architecture

| Layer | Service | Free Tier Limit |
|---|---|---|
| Frontend | S3 + CloudFront | 5 GB S3 storage, 50 GB CloudFront egress/month |
| Backend | Lambda + API Gateway | 1M Lambda requests/month, 1M API Gateway calls/month |
| Database | DynamoDB | 25 GB storage, 25 RCU + 25 WCU provisioned |
| Auth | Cognito | 50,000 MAU |
| Secrets | Secrets Manager | 30-day trial, then $0.40/secret/month — use sparingly |
| Monitoring | CloudWatch | 10 custom metrics, 5 GB logs ingestion/month |
| IaC | AWS CDK | Free (synthesizes CloudFormation, which is also free) |

### Free Tier Guard Rails

Do NOT introduce these — they cost money regardless of usage:
- **NAT Gateway** — always paid (~$32/month minimum). Use VPC endpoints or public subnets where acceptable.
- **RDS** — free tier expires after 12 months. Use DynamoDB unless a relational model is explicitly justified.
- **CloudWatch Detailed Monitoring** — Basic is free; never enable Detailed Monitoring.
- **Lambda memory above 128 MB** — default all new functions to 128 MB; increase only when benchmarks show it's necessary.
- **S3 Requester Pays** — never enable.
- **Elastic IPs** — charged when not attached to a running instance. Release them immediately after use.
- **Secrets Manager secrets beyond the trial** — cache secret values in Lambda environment variables where the security trade-off is acceptable.

## Git Workflow

### Branch Strategy

```
main        ← production-ready only. NEVER commit directly.
develop     ← integration branch. NEVER commit directly.
feature/x   ← one feature per branch, cut from develop
fix/x       ← bug fix, cut from develop
chore/x     ← maintenance (deps, config, tooling), cut from develop
release/x   ← cut from develop when ready to promote; merges into main
```

Rules:
- Always branch from `develop`, not `main`.
- All changes reach `main` only via a PR from a `release/*` branch.
- Delete branches after they are merged.

### Conventional Commits

Format: `<type>(<scope>): <subject>`

| Type | When to use |
|---|---|
| `feat` | New feature for the user |
| `fix` | Bug fix |
| `test` | Adding or correcting tests |
| `refactor` | Code change that is neither a bug fix nor a feature |
| `chore` | Maintenance: deps, config, tooling |
| `docs` | Documentation only |
| `build` | Build system changes |
| `ci` | CI/CD workflow changes |
| `perf` | Performance improvement |
| `style` | Formatting, no logic change |

Rules:
- Scope is optional, lowercase (e.g., `auth`, `api`, `infra`, `frontend`)
- Subject: imperative mood, lowercase, no trailing period, ≤72 chars
- Breaking changes: add `!` after type — `feat(api)!: change response shape`
- Breaking change footer: `BREAKING CHANGE: <description>` on its own line

Examples:
```
feat(auth): add Cognito user pool stack
fix(api): handle Lambda timeout on cold start
test(auth): add unit tests for token validation
chore(infra): update CDK to v2.150.0
ci: add CDK synth check to PR workflow
```

### Pull Requests

- Every branch merges via a GitHub PR — even when working solo (enforces self-review).
- PR title follows the same Conventional Commits format as the commit subject.
- CI pipeline must be green before merging.
- **Squash merge** for `feature/*`, `fix/*`, `chore/*` branches.
- **Merge commit** for `release/*` branches (preserves history).
- Delete branch after merge.

## Test-Driven Development (MANDATORY)

TDD cycle for EVERY new feature and bug fix:

1. **RED** — Write a failing test that describes the desired behavior. Run it; confirm it fails for the right reason (assertion failure, not a syntax/import error).
2. **GREEN** — Write the minimum code to make the test pass. Nothing more.
3. **REFACTOR** — Clean up the implementation while keeping tests green.

Rules:
- Never write implementation code before a corresponding test exists.
- Test file must be committed in the same commit as, or before, the implementation.
- If the user says "skip the test", remind them of this rule and ask for explicit confirmation before proceeding.
- Coverage target: **80% line coverage minimum**. [Update with actual command after stack decision]

Test structure [PLACEHOLDER — update after tech stack decision]:
```
tests/
  unit/          ← fast, isolated, no external dependencies
  integration/   ← hits real AWS services or DB
  e2e/           ← full end-to-end against a deployed environment
infra/test/      ← CDK snapshot tests (mandatory for every Stack)
```

## Infrastructure as Code

- All AWS resources are defined in `infra/` using **AWS CDK (TypeScript)**.
- Zero ClickOps in the AWS Console for anything that must persist.
- The Console is read-only for debugging; every permanent resource change goes through CDK.
- CDK stacks follow the naming convention: `PeakHQ<Name>Stack` (e.g., `PeakHQApiStack`, `PeakHQFrontendStack`)
- Every CDK Stack change requires a CDK snapshot test update in `infra/test/`.
- CDK deploys run via GitHub Actions using AWS OIDC — no long-lived credentials stored anywhere.

## Code Quality

- No `TODO` / `FIXME` / `HACK` comments in committed code — open a GitHub Issue instead.
- No commented-out code.
- No hardcoded secrets, keys, or credentials — use AWS Secrets Manager (runtime) or GitHub Secrets (CI).
- Environment config is loaded from environment variables only; no config files committed to git.
- [PLACEHOLDER: linting command] — run before every commit.
- [PLACEHOLDER: formatting command] — run before every commit.

## File Structure

```
infra/                 ← AWS CDK TypeScript project
  bin/                 ← CDK app entry point
  lib/                 ← Stack definitions
  test/                ← CDK snapshot tests
src/                   ← Application source [structure TBD by stack]
tests/                 ← Test suites [structure TBD by stack]
docs/
  adr/                 ← Architecture Decision Records (MADR format)
.github/
  workflows/
    ci.yml             ← Runs on every push and PR
    deploy.yml         ← Deploys to AWS on merge to main
scripts/               ← Local developer utility scripts
```

## Architecture Decision Records

Major architectural decisions are recorded in `docs/adr/` using [MADR format](https://adr.github.io/madr/).
At the end of any session where a major architectural decision is made, propose writing a new ADR.

Existing ADRs:
- [0001](docs/adr/0001-use-aws-cdk-for-iac.md) — Use AWS CDK for infrastructure as code
- [0002](docs/adr/0002-github-for-source-control.md) — Use GitHub and GitHub Actions for source control and CI/CD
