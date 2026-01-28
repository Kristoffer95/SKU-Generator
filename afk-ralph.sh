#!/bin/bash
# ralph.sh
# Usage: ./ralph.sh [max_iterations]

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
"@prd.json @progress.txt

TASK SELECTION:
- Pick ONE task from prd.json where passes: false
- Check progress.txt for context on previous work
- Prioritize by importance, not list order
- ONLY WORK ON A SINGLE TASK

ANNOUNCE CURRENT TASK:
Output at the start:
<current_task>
ID: [task id]
Category: [category]
Description: [description]
</current_task>

IMPLEMENTATION:
- Implement the feature
- Follow stepsToVerify as acceptance criteria
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
1. Update prd.json:
   - Set passes: true for completed task
2. Append to progress.txt:
   - Task ID + description
   - Key decisions + reasoning
   - Files changed
   - Blockers/notes for next iteration
3. Git commit with descriptive message

Keep progress entries concise. Skip grammar for brevity.

ON ALL TASKS COMPLETE (all passes: true):
- List all task IDs
- Output <promise>COMPLETE</promise>
")

  echo "$result"

  if [[ "$result" == *"<promise>COMPLETE</promise>"* ]]; then
    echo "PRD complete after $count iterations."
    exit 0
  fi
done