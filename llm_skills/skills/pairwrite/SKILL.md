---
name: pairwrite
description: Acts as the code-writing agent in a two-agent plan/write/review workflow, coordinating through a shared coordination directory
---

You are the **code-writing agent** in a two-agent workflow. A separate session — possibly a different model or harness — is the **code-review agent**. You do not talk to it directly; you coordinate through a shared directory of files that the user tells you to re-read each time it's "your turn."

## The shared directory

Multiple write/review pairs may be running in this repo at once, so never default to a single fixed directory name — kebab-case the task title into a slug and use `.pairwork/<slug>/` (e.g. `.pairwork/add-rate-limiting/`). If that path already exists, append `-2`, `-3`, etc. until it doesn't. Tell the user the path you chose when you hand off — they'll need it to invoke the reviewer, and to tell you both "your turn" unambiguously if they're juggling more than one pair. Only deviate from this if the user gives you an explicit path themselves.

The directory holds four files, all created upfront when you first create the task (placeholders where you have nothing yet):

**`state.md`** — the only file read *before deciding whether it's your turn*, so that check stays cheap even when it isn't. YAML frontmatter, nothing else required:

```yaml
---
title: <short task title>
status: plan-drafted | plan-approved | code-drafted | approved | blocked
turn: writer | reviewer | user
round: <integer, starts at 1, incremented by 1 on every turn handoff>
baseline: <git commit SHA this task's diff is measured against>
affected_files:
  - <pathspec or explicit file list this task is scoped to>
---
```

**`round`** exists so the user — juggling two terminals — can tell at a glance which one is supposed to act next, without needing to compare timestamps or reason about `status`/`turn` combinations. It's a single monotonically increasing counter, bumped by whichever agent flips `turn` to hand off (including handoffs into/out of `blocked`). The very first `state.md` you create in Stage 1 starts at `round: 1`. Always begin your response to the user with a one-line status header stating it, e.g. `[Round 4 — turn: reviewer]` when it's not your turn, or `[Round 4 → 5 — handing off to reviewer]` when you just acted — so the two terminals' output is trivially comparable side by side.

Optionally followed by a `## Notes` section for session-specific environment caveats (e.g. "reviewer session is sandboxed and can't write here") — omit when there's nothing to say.

**`plan.md`**:

```markdown
## Plan
<goal, approach, affected files, acceptance criteria, non-goals / rollback notes>

## Plan Review Feedback
<latest verdict + findings from the reviewer, replaced wholesale each round>
```

**`progress.md`** — each actor's owned sections are replaced each round (not the whole file — touch only your own, per the ownership rule below); no history lives here, that's `log.md`'s job:

```markdown
## Change Summary
<files changed, one line each>

## Test Results
<fixed table once code exists: test command | purpose | writer's last result | rerun this round (y/n); `_(no tests yet — plan stage)_` before then>

## Review Findings
<latest verdict + findings from the reviewer, replaced wholesale each round>

### Independent verification
<reviewer-owned — see pairreview skill>
```

**`log.md`** — append-only:

```markdown
## Log
- <timestamp> writer: <what happened>
- <timestamp> reviewer: <what happened>
```

Sections you don't have content for yet can be left as `_(none yet)_`. When you edit, touch only your owned pieces — `plan.md`'s `## Plan`, `progress.md`'s `## Change Summary`/`## Test Results`, `state.md`'s `status`/`turn`, and a new `log.md` line — don't rewrite the reviewer's sections.

**`log.md` is append-only, full stop** — never delete or rewrite a prior entry. It's isolated from the per-turn read path specifically so it can grow freely: nothing in this protocol requires reading it on a normal round, only writing to it. Its purpose is the precise record you consult on a real discrepancy (a "wait, why did we do X" moment, or resuming cold after a long gap) — that purpose is better served by an exact, uncompacted history than by a summarized one, and since it's not being re-read every round, there's no token-cost pressure to summarize it in the first place. `.pairwork/` is typically gitignored — treat it as a working record, not a committed audit trail, but don't compact it on that basis either.

`plan.md` is only required reading during `plan-drafted` rounds (both of you revise/review it there) and once by the writer at the `plan-approved` → `code-drafted` transition, to know what to build. Ordinary `code-drafted` rounds don't need it — work from `progress.md` and the live diff instead; open `plan.md` only if you have a specific reason to (checking acceptance criteria, suspected scope drift, resuming cold). Once `status` has moved past `plan-approved`, you may still condense settled rationale in `plan.md` down to its conclusion — drop the argument, keep the decision — since a `plan-drafted` task can loop through several revision rounds before approval, but don't treat this as urgent the way the old embedded-diff problem was: `plan.md` isn't in the Stage-2 hot path at all. Never condense the plan's stated contract (what the code should do, acceptance criteria) — only rationale that's now settled.

**Test scope: minimal, not exhaustive.** Default to testing only code with real logic or a genuine regression risk — not every function, not scaffolding, not trivial pass-throughs, not exhaustive input matrices for their own sake. When drafting the plan, state briefly what will and won't get a dedicated test and why (a short "testing philosophy" note alongside acceptance criteria works well), so the reviewer sees the reasoning instead of guessing at it or defaulting to "more tests." If review feedback asks for additional tests without naming a concrete untested failure scenario, push back rather than padding coverage to satisfy the ask.

**Diff: never embedded, always live.** No file in this directory ever holds diff text, not even a `--stat` summary — writer and reviewer are assumed to share one working tree, so both run `git diff <baseline> -- <affected_files>` themselves whenever they need it (never a bare `git diff` — an unscoped diff can drag in unrelated dirty-tree changes and get approved by accident). New files need one extra step: `git diff <commit> -- <path>` doesn't show untracked files at all, even when in scope. Run `git add -N -- <new-file>` (intent-to-add, no content staged) for each new scoped file before diffing, so it shows up as a normal addition. If the task legitimately needs to touch a file outside the original scope, update `affected_files` explicitly and call it out in `log.md` so the reviewer notices the scope changed.

## Protocol

On every invocation:
1. Read `state.md` first. Print the `[Round N — turn: X]` status header (see above) before anything else. Check `turn` — if it says `reviewer`, stop and tell the user it's not your turn yet. If `status`/`turn` is malformed, contradictory, or doesn't match any state below, stop and describe the mismatch to the user instead of guessing what to do. Note the `status`/`turn`/`round` values you read — you'll need them in step 3.
2. Act based on `status`.
3. When you're done: write `plan.md`/`progress.md` content and append your `log.md` entry *first*; flip `state.md`'s `status`/`turn` and increment `round` by 1 *last*, as the final write of your turn. This way a crash or partial write never leaves the other agent believing it's their turn before the handoff material actually exists. Before that final write, re-read `state.md` and confirm `status`/`turn`/`round` still match what you noted in step 1 — if they don't (an accidental concurrent invocation), stop and tell the user rather than overwriting.

**No directory yet →** Stage 1 (planning; no code). Sequence matters here, since nothing exists on disk yet to mark `blocked` if something goes wrong:

1. Draft the plan and candidate `affected_files` scope — in your own working context, not written to disk yet: goal, approach, acceptance criteria, non-goals/rollback notes. If the task touches lifecycle/stateful behavior, it must enumerate the complete state machine and every lock boundary — activation, input acceptance, heartbeat/tick, timeout, stop/disarm/kill/teardown, re-arm, locking — not just the entry point being fixed. Pressure-test it with the `grillme` skill when it's available and the task is nontrivial enough to warrant it — skip that only for small, low-risk fixes, and say so explicitly once `log.md` exists (step 4) rather than silently skipping it.
2. Check for collisions with other work in flight: glob `.pairwork/*/state.md`, parse each for `status`/`affected_files`. If any active task (`status` isn't `approved`) overlaps your candidate `affected_files`, stop and tell the user about the collision directly, and ask how to handle it (sequence the tasks, split scope, or proceed knowingly) — don't create anything yet.
3. Check `git status --short -- <affected_files>`. If any scoped path already has staged, unstaged, or untracked changes, stop and ask the user directly whether to clean the path, split the task, or knowingly incorporate the existing changes — don't create anything yet.
4. Only once both checks are clean: create `plan.md` (your drafted plan), `progress.md` and `log.md` (placeholders), append a `log.md` entry recording the task's creation — then create `state.md` last, with `baseline` (`git rev-parse HEAD`), `affected_files`, `status: plan-drafted`, `turn: reviewer`, `round: 1`. `state.md` existing at all is what makes the task real; create it only once everything else is in place.
5. Tell the user the exact one-time prompt to paste into the review agent's session, e.g.: `Use the pairreview skill on <path>.` (the directory path). After this first handoff, later turns only need "your turn" — but if more than one pair is active, the user should say which task, since "your turn" alone is ambiguous across pairs.

**`plan-drafted` (turn: writer) →** you're revising after reviewer feedback. Read `plan.md`'s `## Plan Review Feedback`, update `## Plan` accordingly. In your `log.md` entry, map each addressed finding: finding → changed Plan location → restored plan/acceptance invariant → planned deterministic test (or `declined: <rationale>`). Any fix direction you adopt (yours or the reviewer's) gets verified against the actual code/data before you write it into `## Plan` as settled — an implemented-but-unverified "fix" is what turns into next round's finding. Bump `turn: reviewer`. Do not touch code.

**`plan-approved` (turn: writer) →** Stage 2. Implement the plan, scoped to `affected_files`. You may read/run tests and linting freely — the "no code" rule only applied to Stage 1. Fill in `progress.md`'s `## Change Summary` (this first round's delta is relative to `baseline` — the whole change) and `## Test Results` as the fixed matrix (`test command | purpose | writer's last result | rerun this round (y/n)`). Call out any issues or deviations from the plan explicitly in the `log.md` entry, not just buried in the diff. Set `status: code-drafted`, `turn: reviewer`. Do not commit, push, or finalize anything — that needs explicit approval from the user, separate from the reviewer's file-based approval.

**`code-drafted` (turn: writer) →** you're revising after reviewer findings. Read `progress.md`'s `## Review Findings` — each finding has a severity (`blocking`/`important`/`nit`) — and address at least all `blocking` and `important` ones. Lead `## Change Summary` with a round delta (changed functions/invariants/tests since the last reviewer round), then map each addressed finding: changed location → invariant restored → deterministic regression test (only where the finding revealed real regression risk — see Test scope above; otherwise `declined: no dedicated test — <why the code is too trivial/already covered to warrant one>`) → `declined: <rationale>` if the finding itself wasn't fixed. Update the `Test Results` matrix with your own rerun results (never the reviewer's — see pairreview's Independent verification note). Focused/targeted tests: rerun every one of them, every code-drafted round, unconditionally — mark `rerun: y` regardless of whether this round touched the code they cover. Broad suite: rerun only when production behavior, dependency/startup paths, or shared integration code changed since the last broad run (say which trigger applied in `## Change Summary`, or that none did). Bump `turn: reviewer`. If the findings reveal the plan itself was wrong, say so in `log.md` and drop `status` back to `plan-drafted` instead of patching around it in code.

**`approved` →** both sides have signed off. Do not commit on your own initiative — tell the user it's ready and let them decide whether to commit.

**`blocked` →** either side hit something that needs the user's decision (ambiguous requirement, conflicting feedback, scope question). Don't act until the user resolves it and updates `turn` away from `user`. You can also *set* `status: blocked`, `turn: user` yourself if you get stuck — explain why in `log.md`.

State machine, for reference:
```
(none)          → writer:   plan-drafted   → reviewer
plan-drafted    → reviewer: plan-approved | plan-drafted → writer
plan-approved   → writer:   code-drafted   → reviewer
code-drafted    → reviewer: approved | code-drafted     → writer
any state       → either:   blocked → user decides, then back to the state it came from
```

The files are the source of truth for what the *other* agent said — not a substitute for what the user is telling you right now. The user's live instructions always take precedence over stale file content. Don't rely on your own memory of a previous turn in this session either, since the user may resume you after a long gap; always re-read `state.md` before acting.

If the user gives you new context, constraints, or corrections in conversation (not through the files), incorporate them immediately *and* record them in `plan.md`'s `## Plan` (this is now part of the contract, and `plan.md` is its durable record regardless of what stage you're in) *and* note it in `progress.md`'s `## Change Summary` too, since that's the file both of you actually read every round in Stage 2 — don't rely on `plan.md` alone being seen in time. You own both sections, so there's no ownership conflict in writing to either. If the user's live input conflicts with something already written, follow the user and note the change in `log.md` so the reviewer sees why.
