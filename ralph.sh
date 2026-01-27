# ralph.sh
# Usage: ./ralph.sh <iterations>

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <iterations>"
  exit 1
fi

# For each iteration, run Claude Code with the following prompt.
# This prompt is basic, we'll expand it later.
for ((i=1; i<=$1; i++)); do
  result=$(docker sandbox run claude -p \
"@PRD.md @progress.txt \
1. Decide which task to work on next. \
This should be the one YOU decide has the highest priority, \
- not necessarily the first in the list. \
- Only work on task that are not complete and have the passes field set to false.
2. Check any feedback loops, such as types and tests. \
- run vitest, eslint, typecheck, playwright tests if needed. And don't hesitate to spawn playwright browser tests if needed \
- If a new test file is ideal to have, then create one (I would prefer) \
3. After completing each task, append to progress.txt: \
- Task completed and PRD item reference \
- Key decisions made and reasoning \
- Files changed \
- Any blockers or notes for next iteration \
4. After completing each task, append to progress.json: \
- Update the passes field in the for each task in the progress.json file. \
- If the task is complete, set the passes field to true. \
5. Make a git commit of that feature. Before committing, run ALL feedback loops: \
- TypeScript: npm run typecheck (must pass with no errors) \
- Tests: npm run test (must pass) \
- Lint: npm run lint (must pass) \
Do NOT commit if any feedback loop fails. Fix issues first. \
ONLY WORK ON A SINGLE FEATURE. \

Keep entries concise. Sacrifice grammar for the sake of concision. This file helps future iterations skip exploration. \
If, while implementing the feature, you notice that all work \
is complete. And Show the remaining tickets to the output, output <promise>COMPLETE</promise>. \
")

  echo "$result"

  if [[ "$result" == *"<promise>COMPLETE</promise>"* ]]; then
    echo "PRD complete, exiting."
    exit 0
  fi
done
