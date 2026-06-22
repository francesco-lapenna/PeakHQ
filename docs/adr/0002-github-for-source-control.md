# 0002 — Use GitHub and GitHub Actions for Source Control and CI/CD

Date: 2026-06-20
Status: Accepted

## Context

PeakHQ's preferred policy is to use AWS services exclusively. However, source control and CI/CD tooling must be evaluated against the current state of the AWS ecosystem.

As of mid-2025:

- **AWS CodeCommit** — closed to new customers since July 2024.
- **AWS CodeCatalyst** — closed to new customers since November 7, 2025.

AWS's own recommendation for new projects is to use partner services such as GitHub.

## Decision

Use **GitHub** for source control and **GitHub Actions** for CI/CD.

These are the only approved non-AWS services in PeakHQ. All application infrastructure (compute, storage, database, auth, CDN) remains on AWS.

GitHub was chosen over other alternatives (GitLab, Bitbucket, self-hosted Gitea) because:

- It is the platform AWS itself recommends as a replacement for CodeCommit.
- GitHub Actions has a generous free tier (2,000 minutes/month for private repos).
- AWS provides first-party GitHub Actions for CDK deploy and OIDC authentication.
- `gh` CLI enables full PR and repo management from the terminal, integrating cleanly with the Claude Code workflow.

## Consequences

- Source control: GitHub repository at `github.com/<org>/PeakHQ`.
- CI/CD: GitHub Actions workflows in `.github/workflows/`.
  - `ci.yml` — runs on every push and PR (lint, test, CDK synth).
  - `deploy.yml` — runs on merge to main (CDK deploy to production).
- AWS authentication from GitHub Actions uses **OIDC** (OpenID Connect): GitHub assumes an IAM role via a trust policy. No long-lived AWS credentials are stored in GitHub Secrets.
- Branch protection rules are configured in GitHub: direct pushes to `main` and `develop` are blocked; CI must pass before merge.
- The `gh` CLI is used for PR creation in the `/new-feature` and `/release` skills.
