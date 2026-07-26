#!/usr/bin/env bash
# commit-data.sh "<commit message>" <file> [file...]
#
# Commits regenerated data files to master from a scheduled workflow, surviving
# the fact that a dozen cron jobs push to the same branch all day.
#
# The pattern this replaces was:
#
#   for i in 1 2 3 4 5; do
#     git push origin master && exit 0
#     sleep ...
#     git pull --rebase origin master || true
#   done
#
# which looks like a retry loop but is not one. When the rebase hit a conflict —
# routine, since two jobs regenerate overlapping files — `|| true` swallowed the
# failure and left the tree with unmerged paths. Every later push then failed on
# the same conflict, the loop span out, and the job exited 1 having thrown away
# data it had already scraped. That is what froze coffee-prices-bolt.json at
# 2026-07-08: the Bolt scan succeeded on 13 and 20 July and was discarded both
# times.
#
# These files are derived output, not authored content: whatever this run just
# generated is by definition the newer truth, and there is nothing to merge.
# So instead of rebasing, each attempt re-reads the remote, replays our files on
# top of it verbatim, and commits that. No conflict is possible.
set -euo pipefail

MESSAGE="${1:?commit message required}"
shift
FILES=("$@")
[ ${#FILES[@]} -gt 0 ] || { echo "no files given"; exit 1; }

# Most jobs commit as the DealsHub Bot; a couple use the Actions bot identity.
git config user.name "${COMMIT_NAME:-DealsHub Bot}"
git config user.email "${COMMIT_EMAIL:-bot@dealshub.cy}"

STASH_DIR="$(mktemp -d)"
trap 'rm -rf "$STASH_DIR"' EXIT

# Snapshot what this run produced, before any git operation can disturb it.
for f in "${FILES[@]}"; do
  if [ -e "$f" ]; then
    mkdir -p "$STASH_DIR/$(dirname "$f")"
    cp "$f" "$STASH_DIR/$f"
  fi
done

for attempt in 1 2 3 4 5; do
  git fetch origin master
  # Discard any half-finished state from a previous attempt, then start from
  # exactly what is on the remote right now.
  git rebase --abort 2>/dev/null || true
  git reset --hard origin/master

  restored=0
  for f in "${FILES[@]}"; do
    if [ -e "$STASH_DIR/$f" ]; then
      mkdir -p "$(dirname "$f")"
      cp "$STASH_DIR/$f" "$f"
      restored=$((restored + 1))
    fi
  done
  [ "$restored" -gt 0 ] || { echo "none of the given files exist — nothing to commit"; exit 0; }

  git add -- "${FILES[@]}"
  if git diff --cached --quiet; then
    echo "No changes against origin/master — nothing to commit."
    exit 0
  fi

  git commit -m "$MESSAGE"
  if git push origin master; then
    echo "Pushed on attempt $attempt."
    exit 0
  fi

  echo "Push rejected (attempt $attempt) — someone else pushed first; retrying."
  sleep $((RANDOM % 8 + 2))
done

echo "::error::Could not push after 5 attempts."
exit 1
