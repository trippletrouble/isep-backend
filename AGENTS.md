## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.


## Project-Specific Guidelines

**Tech-Stack:**
- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL

**Project-Specific Guidelines:**
- Always use hex-arch pattern


## Issue Tracking

Whenever you encounter a bug, blocker, or unexpected behavior — **before continuing work** — add an entry to `Issues.md` in the project root.

Use this format:

```markdown
### [ISSUE-###] Title

- **Status:** Open | In Progress | Resolved
- **Severity:** Critical | High | Medium | Low
- **Reported:** YYYY-MM-DD
- **Resolved:** YYYY-MM-DD _(leave blank if unresolved)_
- **Component:** e.g. API / Auth / DB / Frontend / Infrastructure

**Description:**
What is broken, what is the unexpected behavior, and where does it occur?

**Steps to Reproduce:**
1. ...
2. ...

**Fix:**
Root cause and resolution. Include code snippets, config changes, or commands as needed.

- [ ] Resolved
```

**Rules:**
- Assign the next sequential `ISSUE-###` ID.
- Do not continue implementing past a blocker without logging it first.
- When you fix an issue yourself: check the checkbox, set `Status: Resolved`, and fill in `Resolved` date.
- Do not delete resolved entries — keep them for audit.
- Severity guide:
  - **Critical** — system won't start, data loss, security hole
  - **High** — core feature broken, no workaround
  - **Medium** — degraded behavior, workaround exists
  - **Low** — cosmetic, minor inconsistency