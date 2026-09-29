---
name: handoff
description: Prepares to continue work in a new session by summarizing current state, committed work, remaining tasks, important constraints, and a high-quality continuation prompt. Use when the user says /handoff, asks to hand off, or says they are ending this session and starting a fresh one.
---

# Handoff

The user is going to close this session and start a fresh session.

Prepare a concise but complete handoff for the next session.

## Workflow

1. Inspect the current repo state when relevant:
   - `git status --short --branch`
   - recent commits with `git log --oneline -8`
   - any active test/verification status from the conversation

2. Summarize:
   - current objective
   - completed work
   - latest commits
   - current worktree state
   - important constraints
   - known issues or validation results
   - recommended next steps

3. If memory tools are available, update memory only with durable, cross-session facts. Do not store transient logs or noisy implementation details.

4. Provide a continuation prompt the user can paste into a new session.

## Output Requirements

Output the continuation prompt in plain/raw Markdown.

Do not wrap the continuation prompt in a fenced code block.

Make the prompt self-contained enough that a new agent can continue without this conversation.

Include exact paths, branch name, current commits, verification status, and next recommended actions when known.
