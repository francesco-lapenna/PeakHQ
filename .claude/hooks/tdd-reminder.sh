#!/usr/bin/env bash
# After each Claude turn, warns if source files were modified but no test files were touched.
# Runs on the Stop event. Exit 0 always (informational only).

if ! git rev-parse --git-dir > /dev/null 2>&1; then
  exit 0
fi

# Files modified or added (staged or unstaged), filtering out non-source files
CHANGED_SOURCE=$(git status --porcelain 2>/dev/null | \
  grep -E "^.{0,2} .+\.(ts|tsx|js|jsx|py|go|java|rb|rs|cs|cpp|c)$" | \
  grep -vE "(test|spec|__tests__|\.test\.|\.spec\.)")

CHANGED_TESTS=$(git status --porcelain 2>/dev/null | \
  grep -E "(test|spec|__tests__|\.test\.|\.spec\.)")

if [ -n "$CHANGED_SOURCE" ] && [ -z "$CHANGED_TESTS" ]; then
  echo "" >&2
  echo "REMINDER [TDD]: Source files were modified this turn but no test files were touched." >&2
  echo "PeakHQ SOP: write or update the failing test BEFORE or ALONGSIDE the implementation." >&2
  echo "Run /tdd '<behavior>' to start a guided Red-Green-Refactor cycle." >&2
fi

exit 0
