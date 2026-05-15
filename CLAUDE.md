# CLAUDE.md — Bookly

## ⚠️ Read Before Writing a Single Line of Code

This project uses a **custom or recent build of Next.js** whose APIs, conventions, and file structure may differ from your training data. Before implementing anything:

```
cat node_modules/next/dist/docs/<relevant-guide>.md
```

Heed all deprecation notices. Do not assume. Verify first.

---

## Mandatory Reading Order

Before any implementation or architectural decision, read these files **in order**:

1. `DOCS/project-overview.md` — product definition, goals, features, scope
2. `DOCS/architecture.md` — system boundaries, storage model, invariants
3. `DOCS/ui-context.md` — theme, colors, typography, component conventions
4. `DOCS/code-standards.md` — implementation rules and conventions
5. `DOCS/ai-workflow-rules.md` — development workflow, scoping, delivery approach
6. `DOCS/progress-tracker.md` — current phase, completed work, open questions, next steps

**After every meaningful implementation change**, update `DOCS/progress-tracker.md`.  
**If your change affects architecture, scope, or standards**, update the relevant DOCS file before continuing.