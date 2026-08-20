#!/usr/bin/env bash
# Push the current state of Device North Star to GitHub.
# Usage:  ./push.sh "your commit message"
#   (message is optional; defaults to a timestamp)
set -e

cd "$(dirname "$0")"

REMOTE_URL="https://github.com/evahan-hub/DeviceNorthStar.git"
MSG="${1:-update $(date '+%Y-%m-%d %H:%M')}"

# First run: initialise the repo and remote if needed.
if [ ! -d .git ]; then
  git init
  git branch -M main
fi
if ! git remote get-url origin >/dev/null 2>&1; then
  git remote add origin "$REMOTE_URL"
fi

git add -A
# Only commit if there is something to commit.
if git diff --cached --quiet; then
  echo "No changes to commit."
else
  git commit -m "$MSG"
fi

git push -u origin main
echo "Pushed to $REMOTE_URL"
