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
    # -r so a directory argument (e.g. history/) works as well as a file
    cp -r "$f" "$STASH_DIR/$f"
  fi
done

# Ten sharded jobs share one 25-minute fetch timeout, so they reach this push
# within seconds of each other and contend for the same ref lock. Five attempts
# spaced a flat 2-9s apart is not enough headroom for that: the losers all wake
# inside the same narrow window and collide again, and shard 5 exhausted its five
# attempts in 13 seconds on 2026-08-04 having scraped its products for 25 minutes.
# So retry more times, and back off exponentially with full jitter — the point of
# the widening random window is to decorrelate the contenders rather than to wait
# longer. An uncontended push still exits on attempt 1 and never sleeps at all.
ATTEMPTS=12

for (( attempt = 1; attempt <= ATTEMPTS; attempt++ )); do
  git fetch origin master
  # Discard any half-finished state from a previous attempt, then start from
  # exactly what is on the remote right now.
  git rebase --abort 2>/dev/null || true
  git reset --hard origin/master

  restored=0
  for f in "${FILES[@]}"; do
    if [ -e "$STASH_DIR/$f" ]; then
      if [ -d "$STASH_DIR/$f" ]; then
        # Merge our contents into whatever the remote has, rather than `cp -r`
        # onto an existing directory (which nests it) or replacing it wholesale
        # (which would delete snapshots another run added meanwhile).
        mkdir -p "$f"
        cp -r "$STASH_DIR/$f/." "$f/"
      else
        mkdir -p "$(dirname "$f")"
        cp "$STASH_DIR/$f" "$f"
      fi
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

  echo "Push rejected (attempt $attempt/$ATTEMPTS) — someone else pushed first; retrying."
  # Window doubles per attempt (4s, 8s, 16s...) and caps at 64s, so a heavily
  # contended branch keeps retrying for ~10 minutes at worst instead of ~30s.
  if [ "$attempt" -lt 5 ]; then
    window=$(( 2 ** (attempt + 1) ))
  else
    window=64
  fi
  sleep $(( RANDOM % window + 2 ))
done

echo "::error::Could not push after $ATTEMPTS attempts."
exit 1
