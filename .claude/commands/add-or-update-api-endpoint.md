---
name: add-or-update-api-endpoint
description: Workflow command scaffold for add-or-update-api-endpoint in aw-exp-finanzas.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /add-or-update-api-endpoint

Use this workflow when working on **add-or-update-api-endpoint** in `aw-exp-finanzas`.

## Goal

Adds or updates an API endpoint in the NestJS backend, including controller, service, DTOs, and corresponding tests.

## Common Files

- `apps/api/src/*/*.controller.ts`
- `apps/api/src/*/*.service.ts`
- `apps/api/src/*/dto/*.ts`
- `apps/api/src/*/*.module.ts`
- `apps/api/src/*/*.service.spec.ts`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Create or update controller file in apps/api/src/<resource>/<resource>.controller.ts
- Create or update service file in apps/api/src/<resource>/<resource>.service.ts
- Create or update DTO files in apps/api/src/<resource>/dto/
- Update module file in apps/api/src/<resource>/<resource>.module.ts if needed
- Write or update unit tests in apps/api/src/<resource>/<resource>.service.spec.ts

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.