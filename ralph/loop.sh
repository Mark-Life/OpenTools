#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_DIR"

MAX_ITERATIONS=25
MAX_ATTEMPTS=3
BUDGET_PER_ITERATION=10

# Create logs dir
mkdir -p ralph/logs

# Create build branch from current HEAD
BRANCH="ralph/build"
if ! git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git checkout -b "$BRANCH"
else
  git checkout "$BRANCH"
fi

echo "=== Ralph Loop Starting ==="
echo "Branch: $BRANCH"
echo "Max iterations: $MAX_ITERATIONS"
echo "Max attempts per story: $MAX_ATTEMPTS"
echo ""

for ((i=1; i<=MAX_ITERATIONS; i++)); do
  echo "--- Iteration $i / $MAX_ITERATIONS ---"

  # Get next story
  STORY_ID=$(bun ralph/helpers.ts next-story)

  if [ "$STORY_ID" = "NONE" ]; then
    echo "All stories complete! Exiting."
    exit 0
  fi

  echo "Next story: $STORY_ID"

  # Check attempts
  ATTEMPTS=$(bun ralph/helpers.ts get-attempts "$STORY_ID")
  if [ "$ATTEMPTS" -ge "$MAX_ATTEMPTS" ]; then
    echo "Story $STORY_ID has $ATTEMPTS attempts (max $MAX_ATTEMPTS). Skipping."
    bun ralph/helpers.ts mark-skipped "$STORY_ID"
    continue
  fi

  # Increment attempts
  bun ralph/helpers.ts increment-attempts "$STORY_ID"

  LOG_FILE="ralph/logs/iteration-${i}-${STORY_ID}.log"
  echo "Log: $LOG_FILE"

  # Run claude
  claude -p \
    --system-prompt "$(cat ralph/prompt.md)" \
    --allowedTools "Edit,Write,Bash,Read,Glob,Grep" \
    --dangerously-skip-permissions \
    --max-budget-usd "$BUDGET_PER_ITERATION" \
    "Execute story $STORY_ID from ralph/prd.json. Read the prd.json file first to understand the acceptance criteria, then implement the story." \
    2>&1 | tee "$LOG_FILE"

  # Check for completion signal
  if grep -q "<result>COMPLETE</result>" "$LOG_FILE"; then
    echo "Story $STORY_ID: COMPLETE"
  elif grep -q "<result>FAILED</result>" "$LOG_FILE"; then
    echo "Story $STORY_ID: FAILED (attempt $((ATTEMPTS + 1)))"
  else
    echo "Story $STORY_ID: No clear signal (treating as failed)"
  fi

  echo ""
  sleep 2
done

echo "=== Ralph Loop finished after $MAX_ITERATIONS iterations ==="
