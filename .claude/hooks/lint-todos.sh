#!/usr/bin/env bash
# Warns when TODO/FIXME/HACK comments are found in a file Claude just wrote or edited.
# Receives Claude Code tool input via stdin as JSON: {"file_path": "..."}
# Exit code 0 always (warning only — does not block the write).

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.file_path // .path // ""' 2>/dev/null)

if [ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# Skip binary files and documentation that legitimately mentions these words
case "$FILE_PATH" in
  *.png|*.jpg|*.jpeg|*.gif|*.ico|*.woff|*.woff2|*.ttf|*.eot|*.svg|*.pdf)
    exit 0
    ;;
  CLAUDE.md|*/adr/*.md|CHANGELOG.md|*.min.js|*.min.css)
    exit 0
    ;;
esac

MATCHES=$(grep -n "TODO\|FIXME\|HACK" "$FILE_PATH" 2>/dev/null)
if [ -n "$MATCHES" ]; then
  echo "WARNING [PeakHQ SOP]: Found TODO/FIXME/HACK in $FILE_PATH" >&2
  echo "Open a GitHub Issue instead of leaving in-code annotations:" >&2
  echo "$MATCHES" >&2
fi

exit 0
