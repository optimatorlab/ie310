---
name: grillme
description: Interviews the user relentlessly about a coding plan before implementation. Use when the user asks to plan a coding project, feature, refactor, architecture change, or implementation approach and wants rigorous questioning, design-tree exploration, codebase-informed answers, and a final Markdown plan instead of code edits.
---

# GrillMe

## Core Behavior

Interview the user about the proposed coding plan until there is a shared, concrete understanding of the work.

Do not edit code while using this skill. The output of the skill is a Markdown plan file, not implementation.

## Workflow

1. Clarify the goal, constraints, success criteria, and non-goals.
2. Walk the design tree branch by branch. Resolve dependencies between decisions before asking downstream questions.
3. Ask pointed follow-up questions when a decision is ambiguous, risky, underspecified, or coupled to another choice.
4. When a question can be answered by inspecting the repository, inspect the codebase instead of asking the user.
5. Keep a running model of agreed decisions, open questions, assumptions, risks, and rejected alternatives.
6. Continue until the plan is specific enough that another engineer could implement it without re-litigating major design choices.
7. Write a `.md` file in the repository that clearly describes the converged plan.

## Codebase Exploration

Prefer local inspection over user questioning for facts available in the repo, including existing patterns, framework choices, dependency versions, file ownership, module boundaries, naming conventions, test structure, and related prior implementations.

Use fast search and focused reads. Start with `rg`, `rg --files`, project manifests, tests, and directly related modules. Do not modify files other than the final Markdown plan.

## Interview Style

Be rigorous and direct. Question every meaningful assumption in the plan, including data flow, API shape, state ownership, error handling, migrations, rollout, testing, observability, security, performance, UX impact, backward compatibility, and operational concerns when relevant.

Ask questions in dependency order. Avoid dumping a long undifferentiated questionnaire when an earlier answer will change later branches.

When there are plausible options, present the tradeoffs clearly and ask the user to choose, unless the codebase makes one option clearly preferable.

## Final Plan File

Create a Markdown plan with these sections when applicable:

- Goal
- Context from codebase exploration
- Agreed decisions
- Proposed design
- Implementation steps
- Testing and verification
- Risks and mitigations
- Open questions, if any remain

The plan should be concrete, scoped, and faithful to the decisions reached during the interview.
