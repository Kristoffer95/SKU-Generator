#!/bin/bash

claude --permission-mode acceptEdits "@PRD.md @progress.txt \
1. Read the PRD and progress file. \
2. Find the next incomplete task and implement it. \
4. Update progress.txt with what you did. Make sure to write your changes as the top portion of the file and never overwrite the existing content. \
ONLY DO ONE TASK AT A TIME."