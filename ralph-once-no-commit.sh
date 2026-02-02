#!/bin/bash

claude --permission-mode acceptEdits "@PRD.md @progress.txt \
1. Decide which task to work on next. \
This should be the one YOU decide has the highest priority, \
- not necessarily the first in the list. \
- Only work on task that are not complete and have the passes field set to false.
2. Check any feedback loops, such as types and tests. \
- run vitest, eslint, typecheck, agent-browser,playwright tests if needed \
- If a new test file is ideal to have, then create one (I would prefer) \
3. After completing each task, append to progress.txt: \
- Task completed and PRD item reference \
- Key decisions made and reasoning \
- Files changed \
- Update the passes field in the for each task in the prd.json file
- If the task is complete, set the passes field to true
- Any blockers or notes for next iteration \
4. Make a git commit message of that feature. \
- The commit message must be concise and to the point.
- The commit message must be in the following format:
  - feat: add new feature
  - fix: fix bug
  - chore: update documentation
  - refactor: refactor code
  - test: add test
  - style: update styles
  - perf: improve performance
  - docs: update documentation
  - build: update build
  - ci: update ci
  - chore: update chore
  - revert: revert commit
  - merge: merge commit
  - rebase: rebase commit
  - other: other commit type

ONLY WORK ON A SINGLE FEATURE. \

Keep entries concise. Sacrifice grammar for the sake of concision. This file helps future iterations skip exploration. \
If, while implementing the feature, you notice that all work \
is complete. And Show the remaining tickets to the output, output <promise>COMPLETE</promise>. \
"