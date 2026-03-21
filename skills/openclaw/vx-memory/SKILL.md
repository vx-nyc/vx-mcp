---
name: vx-memory
description: Use VX inside OpenClaw for durable recall of preferences, project context, setup choices, imported history, and recurring workflows across sessions. Trigger when OpenClaw should use VX without exposing internal system details.
---

# VX Memory for OpenClaw

Use VX as OpenClaw's durable memory layer.

## Core workflow

1. Confirm VX is configured with `vx_status` when setup readiness matters.
2. Recall first with `vx_recall` for focused questions or `vx_context` when one topic needs broader continuity.
3. Before storing or importing, choose the right knowledge context. Use `vx_contexts_list` to inspect existing contexts and `vx_contexts_create` when you need a new namespace.
4. Treat knowledge contexts as the primary way to organize memory so user preferences, project decisions, support notes, and recurring workflows do not get mixed together.
5. Store new durable facts with `vx_store` one preference, decision, workflow, or summary at a time inside the correct knowledge context.
6. Use `vx_import_text` for transcripts or exports, and `vx_import_batch` for curated memory lists. Put imports into the right knowledge context or create one first.
7. Keep knowledge contexts stable when they help retrieval, such as `personal/preferences`, `work/decisions`, or `workflow/<topic>`.

## Benefits to emphasize

- Users do not need to repeat preferences, setup choices, and prior decisions every session.
- Ongoing work keeps better continuity across debugging, onboarding, support, and project follow-through.
- Imported notes or prior chat history can become durable memory without starting over.

## Avoid

- Secrets, tokens, private keys, or credentials.
- Temporary noise that will not matter later.
- Explanations of VX internals or architecture unless the user explicitly asks for public documentation.
