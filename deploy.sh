#!/bin/bash
set -e

OFFICE_PAT="${OFFICE_PAT:?Set OFFICE_PAT env var before running}"
REPO="pritesh-yaas/Weekly-Performance-Tracker"
FILE="deploy-trigger.txt"

read -p "Commit message: " MSG
git add -A
git diff --cached --quiet || git commit -m "$MSG"

echo "→ Pushing commits as Priteshmewada..."
git pull --rebase origin main
git push origin main

echo "→ Triggering Vercel deploy via pritesh-yaas..."

# Get current file SHA (empty if file doesn't exist yet)
SHA=$(curl -s \
  -H "Authorization: token $OFFICE_PAT" \
  "https://api.github.com/repos/$REPO/contents/$FILE" | \
  node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).sha||'')}catch(e){console.log('')}})")

CONTENT=$(node -e "console.log(Buffer.from(new Date().toISOString()).toString('base64'))")

if [ -z "$SHA" ]; then
  DATA="{\"message\":\"$MSG\",\"content\":\"$CONTENT\"}"
else
  DATA="{\"message\":\"$MSG\",\"content\":\"$CONTENT\",\"sha\":\"$SHA\"}"
fi

curl -s -X PUT \
  -H "Authorization: token $OFFICE_PAT" \
  -H "Content-Type: application/json" \
  "https://api.github.com/repos/$REPO/contents/$FILE" \
  -d "$DATA" > /dev/null

echo "✓ Done! Commits from Priteshmewada, Vercel deploy triggered as pritesh-yaas"
