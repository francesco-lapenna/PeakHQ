---
description: Cut a release from develop and promote to main via GitHub PR
argument-hint: '<major|minor|patch> or <explicit version e.g. 1.2.0>'
allowed-tools: Bash, Read, Write, Edit
---

Cut a PeakHQ release: $ARGUMENTS

## Step 1 — Verify State

```bash
git status          # must be clean
git branch          # must be on develop
```

Also run the full test suite and confirm all tests pass before continuing:

```bash
[PLACEHOLDER: test command — fill in after stack decision]
```

If anything is failing, stop and fix it before proceeding.

## Step 2 — Determine Version

- If $ARGUMENTS is `major`, `minor`, or `patch`:
  - Find the latest git tag: `git tag --sort=-v:refname | head -1`
  - Calculate the next semver accordingly
- Otherwise treat $ARGUMENTS as the explicit version number (format: `MAJOR.MINOR.PATCH`)
- Confirm the version with me before creating the branch.

## Step 3 — Release Branch

```bash
git checkout -b release/<version>
```

## Step 4 — Update CHANGELOG.md

Read the git log from the previous tag to HEAD:

```bash
git log $(git describe --tags --abbrev=0)..HEAD --oneline
```

Group commits by type (feat, fix, chore, etc.) and append to CHANGELOG.md:

```markdown
## [<version>] - <YYYY-MM-DD>

### Added

- ...

### Fixed

- ...

### Changed

- ...
```

Follow [Keep a Changelog](https://keepachangelog.com) format.

## Step 5 — Version Bump

Update the version number in:

- [PLACEHOLDER: version file — e.g. package.json, pyproject.toml — fill in after stack decision]

## Step 6 — Commit and Tag

```bash
git add CHANGELOG.md <version-file>
git commit -m "chore(release): bump version to <version>"
git tag -a v<version> -m "Release v<version>"
```

## Step 7 — Push and Open PR

```bash
git push origin release/<version>
git push origin v<version>
gh pr create \
  --base main \
  --title "chore(release): v<version>" \
  --body "Release v<version> — see CHANGELOG.md for details."
```

## Step 8 — After Merge

Once the PR is merged to main:

1. GitHub Actions `deploy.yml` triggers automatically and deploys to production.
2. Remind me to monitor the deployment in CloudWatch.
3. Backmerge main into develop:
   ```bash
   git checkout develop
   git merge main
   git push origin develop
   ```
4. Delete the release branch:
   ```bash
   git push origin --delete release/<version>
   ```
