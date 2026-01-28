#!/bin/bash
# afk-ralph.sh
# Usage: ./afk-ralph.sh [max_iterations]

set -e

MAX_ITERATIONS=${1:-50}
count=0

while true; do
  ((count++))
  echo "=== Iteration $count ==="

  if [ $count -gt $MAX_ITERATIONS ]; then
    echo "Hit max iterations ($MAX_ITERATIONS), exiting."
    exit 1
  fi

  result=$(docker sandbox run claude -p \
"@prd.md @progress.txt

TASK SELECTION:
- Pick ONE incomplete task from prd.md
- Check progress.txt to see what's already done
- Prioritize by importance, not list order
- ONLY WORK ON A SINGLE TASK

IMPLEMENTATION:
- Implement the feature
- Create new test files when appropriate (preferred)

FEEDBACK LOOPS (run during development as needed):
- vitest: Unit/integration tests, run frequently
- storybook: Component development and visual verification
- playwright: ONLY for UI-related tasks (user flows, interactions, visual regression)
  Skip playwright for backend, utils, hooks, or non-visual logic

PRE-COMMIT CHECKLIST (ALL must pass):
- npm run typecheck
- npm run test (vitest)
- npm run lint
- npm run storybook:build (if components changed)
- playwright tests ONLY if task involves UI changes
Do NOT commit if any check fails. Fix issues first.

ON TASK COMPLETE:
1. Append to progress.txt:
   - Task completed + PRD reference
   - Key decisions + reasoning
   - Files changed
   - Blockers/notes for next iteration
2. Git commit with descriptive message

Keep progress entries concise. Skip grammar for brevity.

ON ALL TASKS COMPLETE:
- List remaining tickets in output
- Output <promise>COMPLETE</promise>
")

  echo "$result"

  if [[ "$result" == *"<promise>COMPLETE</promise>"* ]]; then
    echo "PRD complete after $count iterations."
    exit 0
  fi
done