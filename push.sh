#!/bin/bash
set -e

cd "/Users/shankars/Documents/school-app-poc"

echo "=== Git Status ==="
git status --short

if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
    echo "Nothing to commit — skipping"
    exit 0
fi

git add .
TIMESTAMP=$(date '+%Y-%m-%d %H:%M')
git commit -m "update: $TIMESTAMP"
git push origin main

echo "✅ Pushed to GitHub"
