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

1. `Docs/context/project-overview.md` — product definition, goals, features, scope
2. `Docs/context/architecture.md` — system boundaries, storage model, invariants
3. `Docs/context/ui-context.md` — theme, colors, typography, component conventions
4. `Docs/context/ui-feature-detail.md` — every button, component, and interactive element mapped with exact colors, sizing, and behavior
5. `Docs/context/code-standards.md` — implementation rules and conventions
6. `Docs/context/ai-workflow-rules.md` — development workflow, scoping, delivery approach
7. `Docs/context/progress-tracker.md` — current phase, completed work, open questions, next steps

**After every meaningful implementation change**, update `Docs/context/progress-tracker.md`.  
**If your change affects architecture, scope, or standards**, update the relevant `Docs/context/` file before continuing.