---
description: Start a new feature using the PeakHQ branch strategy and TDD workflow
argument-hint: "<feature-description>"
allowed-tools: Bash, Read, Write, Edit
---

Follow the PeakHQ new-feature workflow for: $ARGUMENTS

## Step 1 — Branch

Create a feature branch from develop:
```
git checkout develop
git pull origin develop
git checkout -b feature/<kebab-case-description>
```
Confirm we are NOT on main, master, or develop before continuing.

## Step 2 — Clarify Scope

Before writing any code, state:
1. What this feature does in one sentence.
2. The acceptance criteria — what must be true when this is done (3-5 bullet points max).
3. Which AWS services this feature touches (if any).

Ask me to confirm the acceptance criteria before proceeding to Step 3.

## Step 3 — RED Phase (TDD)

Write the test file(s) that express the acceptance criteria.
- Test names follow: `"should <behavior>"` or `"given <context> when <action> then <outcome>"`
- Tests must be runnable and FAILING at this point.
- Run the test suite and show the output confirming the new tests fail.
- Do NOT write any implementation code yet.

## Step 4 — GREEN Phase (TDD)

Write the minimum implementation code to make the failing tests pass.
- Do not over-engineer. Make it green first.
- Run the test suite and confirm: new tests pass AND no existing tests regressed.
- Show the passing test output.

## Step 5 — REFACTOR

Review the implementation for:
- Duplication
- Naming clarity
- Alignment with CLAUDE.md code quality rules (no TODOs, no hardcoded secrets, etc.)

Apply any cleanup and confirm tests remain green.

## Step 6 — Commit

Stage and commit in this order (test files first):
```
git add tests/... (or wherever the test files are)
git add src/...   (implementation)
git commit -m "feat(<scope>): <description>"
```
Commit message must follow Conventional Commits format from CLAUDE.md.

## Step 7 — Push and Open PR

```
git push origin feature/<name>
gh pr create --base develop --title "feat(<scope>): <description>" --body "..."
```

PR body should include:
- What this PR does (one sentence)
- The acceptance criteria from Step 2
- How to test it manually
- Any AWS resources added or modified
