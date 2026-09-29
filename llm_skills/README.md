# llm_skills

A repo of the skills, memories, and configs I use with LLMs.

## Skills

Claude Code skills, mirrored from `~/.claude/skills/`. Each lives at
`skills/<name>/SKILL.md`.

| Skill | Description |
|---|---|
| [grillme](skills/grillme/SKILL.md) | Interviews me about a coding plan |
| [handoff](skills/handoff/SKILL.md) | Prepares to continue work in a new session |
| [pairwrite](skills/pairwrite/SKILL.md) | Code-writing agent in a two-agent plan/write/review workflow |
| [pairreview](skills/pairreview/SKILL.md) | Code-review agent in a two-agent plan/write/review workflow |
| [sidebar](skills/sidebar/SKILL.md) | Register a deferred request or guiding constraint without derailing current work |

`pairwrite` and `pairreview` are also used from Codex (`~/.codex/skills/`), symlinked
to the same `skills/<name>` directories as Claude Code — one shared version.

`grillme` and `handoff` have diverged between Claude Code and Codex (different
frontmatter/wording; Codex's `grillme` also carries an `agents/openai.yaml`). These
are kept as separate variants:

- `skills/<name>/SKILL.md` — Claude Code version, linked from `~/.claude/skills/<name>`
- `skills/<name>/codex/` — Codex version, linked from `~/.codex/skills/<name>`

### Installing

Symlink a skill into place so Claude Code picks it up:

```sh
ln -s ~/Projects/llm_skills/skills/<name> ~/.claude/skills/<name>
```

For the Codex-specific variants:

```sh
ln -s ~/Projects/llm_skills/skills/<name>/codex ~/.codex/skills/<name>
```

## Config

`config/settings.json` — global Claude Code settings (`effortLevel`, `tui`,
`editorMode`), symlinked from `~/.claude/settings.json`.

```sh
ln -s ~/Projects/llm_skills/config/settings.json ~/.claude/settings.json
```

Note: if Claude Code (or anything else) ever writes this file via a
temp-file-then-rename ("atomic write"), the rename will replace the symlink
with a plain file, silently breaking the link to this repo. Check
`~/.claude/settings.json` is still a symlink (`ls -la`) after changing
settings, and re-symlink if needed. A pre-symlink backup is kept at
`~/.claude/settings.json.bak` as a fallback.

`config/PREFERENCES.md` — global, cross-repo preferences (git conventions,
coding style, etc.) that should apply no matter which project I'm working in.
Claude Code and Codex each look for their own global instructions file
(`~/.claude/CLAUDE.md` and `~/.codex/AGENTS.md` respectively), and both are
symlinked to this single file, so there's one place to edit and both tools
stay in sync:

```sh
ln -s ~/Projects/llm_skills/config/PREFERENCES.md ~/.claude/CLAUDE.md
ln -s ~/Projects/llm_skills/config/PREFERENCES.md ~/.codex/AGENTS.md
```

This is separate from any per-repo `CLAUDE.md`/`AGENTS.md`, which should hold
project-specific instructions only — keep global, cross-repo preferences here
instead of repeating them in every project.
