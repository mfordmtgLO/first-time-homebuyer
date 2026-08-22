# Development Completion Workflow

This project uses two validation lanes so routine dashboard refinements remain responsive while each published version still receives complete verification.

| When | Command | Purpose |
| --- | --- | --- |
| During implementation | `pnpm validate:fast` | Runs typechecking plus all local deterministic tests. It excludes only the network-dependent Oregon direct-sync probe. |
| Before one final checkpoint | `pnpm verify:release` | Runs typechecking plus the complete test suite, including the Oregon direct-sync probe. |

## Completion rule

After a source change, run the focused relevant test and then `pnpm validate:fast` while iterating. Once the implementation is ready, run `pnpm verify:release` **once**, visually inspect the changed surface, and create **one** checkpoint. Do not repeat release verification or checkpointing unless source, configuration, migration, or test files change after the successful run.

## External-test handling

The Oregon direct-sync test makes a live authenticated network request. It remains part of `pnpm verify:release`, but it is intentionally outside `pnpm validate:fast` so temporary remote latency does not block normal local dashboard iteration.

## Scope of this workflow

These commands improve application-level validation efficiency. They cannot control platform-side task orchestration, publishing queues, or chat-level retry behavior. When repeated completion messages occur with no source changes and a clean working tree, that is an orchestration issue rather than an application-code failure.
