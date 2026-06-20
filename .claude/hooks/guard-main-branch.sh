#!/usr/bin/env bash
# Blocks git commit commands when on main or develop branch.
# Receives Claude Code tool input via stdin as JSON: {"command": "..."}
# Exit code 2 blocks the tool call.

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.command // ""' 2>/dev/null)

# Only act on git commit commands
if ! echo "$COMMAND" | grep -qE "^git commit|git commit "; then
  exit 0
fi

CURRENT_BRANCH=$(git -C "$(git rev-parse --show-toplevel 2>/dev/null || pwd)" rev-parse --abbrev-ref HEAD 2>/dev/null)

if [ "$CURRENT_BRANCH" = "main" ] || [ "$CURRENT_BRANCH" = "master" ] || [ "$CURRENT_BRANCH" = "develop" ]; then
  echo "ERROR: Direct commits to '$CURRENT_BRANCH' are forbidden by PeakHQ SOPs." >&2
  echo "Create a branch first: git checkout -b feature/<description>" >&2
  echo "Branch strategy: feature/* | fix/* | chore/* | release/* — all branched from develop" >&2
  exit 2
fi

exit 0
