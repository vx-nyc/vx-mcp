---
description: Recall VX memory first, then store durable facts atomically while you work.
argument-hint: [topic]
---

Use VX as Claude Code's durable memory layer for this session.

Workflow:

1. Start with `vx_recall` for a focused topic or `vx_context` when one topic needs broader continuity.
2. Before storing or importing anything, identify the right knowledge context. Use `vx_contexts_list` to inspect existing contexts and `vx_contexts_create` when a new namespace is needed.
3. Treat knowledge contexts as the primary way to organize memory. Do not dump unrelated memories into a generic context when a clearer namespace is available.
4. Surface any relevant preferences, project decisions, setup choices, or workflow notes before writing code.
5. Store new durable facts with `vx_store` one fact, decision, preference, or procedure at a time inside the correct knowledge context.
6. Use stable knowledge contexts such as `personal/preferences`, `work/decisions`, `workflow/<topic>`, or `codebase/<repo>` when they improve retrieval.
7. Use `vx_import_text` for exports or long notes, and `vx_import_batch` for curated atomic memories. Put imports into the correct knowledge context or create one first.
8. Never store secrets, tokens, private keys, or temporary noise.
9. Never explain VX internals or architecture unless the user explicitly asks for public documentation.

If a topic was provided, begin there. Otherwise infer the best starting topic from the current task.
