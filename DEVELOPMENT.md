# Development Guidelines

## ⚠️ CRITICAL: Git Commit Policy

**NO AUTOMATIC COMMITS** — AI assistants must NEVER commit changes without explicit user permission.

### Rules

1. **Only create and edit files** — use `view`, `edit`, and `create` tools
2. **Never run `git commit`** — even after "successful" changes
3. **Always ask first** — if you think a commit is appropriate, ask the user before running it
4. **Exception**: User must explicitly say "commit this" or "commit the changes" in the current conversation

### Why

- Commits create permanent history that requires rebasing/reversing to undo
- Users need control over when and how changes are bundled
- Unintended commits can complicate workflow

### Example Violation (DON'T DO THIS)

```
❌ WRONG:
- Make changes
- Run tests
- git add -A
- git commit -m "..."
```

```
✅ CORRECT:
- Make changes
- Run tests
- Report results to user
- *Wait for user to say "commit"*
- Only then: git add -A; git commit -m "..."
```

## How AI Should Handle Git

1. When changes are complete, say: "Files are ready. Shall I commit this?"
2. Wait for explicit permission
3. If user says yes, ask for commit message guidance
4. Only commit if user approves the message

## Enforcement

- This file is checked at the start of each session
- Users should quote this rule when reminded
- No exceptions for "helpful" automated commits
