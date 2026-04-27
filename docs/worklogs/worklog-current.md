# Worklog Current

## Active Focus

- Phase：Phase 0 — Foundation / Repo Scaffold
- Task：FW-P0-005 — 建立 unit / contract / smoke test harness（完成）
- Validation Mode：fixture

## Task Execution Plan — FW-P0-001

- 目標：建立 root package、workspace config，以及最小 apps/packages 目錄，讓後續 Phase 0 task 可以在一致的 monorepo baseline 上展開。
- Acceptance criteria：root `package.json` 存在；workspace config 存在；`apps/cli`、`packages/contracts`、`packages/core` 最小結構存在。
- 預期修改檔案：`docs/worklogs/worklog-current.md`、`docs/tasks/active-task.md`、`docs/tasks/task-list.md`。
- 預期新增檔案：`package.json`、`pnpm-workspace.yaml`、`apps/cli/.gitkeep`、`packages/contracts/.gitkeep`、`packages/core/.gitkeep`。
- Non-goals：不加入 TypeScript toolchain；不實作 CLI command；不建立 contracts schema；不加入 Phase 1 onboarding 功能。
- Checks / tests：`pnpm install --lockfile-only`；`pnpm build`；`pnpm test`；`git diff --check`。
- 風險與避免方式：避免過早加入未來 Phase 功能；僅建立 workspace baseline 與 placeholder 目錄。

## Task Execution Plan — FW-P0-002

- 目標：建立 TypeScript 編譯與測試工具 baseline，讓 workspace package 可以用一致指令 build/test。
- Acceptance criteria：`pnpm build` 可執行；`pnpm test` 可執行；尚無 lint script 並標示 N/A。
- 預期修改檔案：`package.json`、`docs/worklogs/worklog-current.md`、`docs/tasks/active-task.md`、`docs/tasks/task-list.md`、`docs/tasks/phase-gates.md`。
- 預期新增檔案：`pnpm-lock.yaml`、`tsconfig.base.json`、`packages/core/package.json`、`packages/core/tsconfig.json`、`packages/core/src/index.ts`。
- Non-goals：不實作 CLI；不建立 contracts schema；不加入 Phase 1 onboarding / manifest loader。
- Checks / tests：`pnpm install --lockfile-only`；`pnpm build`；`pnpm test`；lint N/A；`git diff --check`。
- 風險與避免方式：避免測試工具要求尚不存在的測試檔；使用 `--passWithNoTests` 作為 Phase 0 baseline，後續 FW-P0-005 再加入具體 test harness。

## Task Execution Plan — FW-P0-003

- 目標：建立 `@forgeweave/contracts` package skeleton，提供 schema placeholder、type barrel 與基本 validation test。
- Acceptance criteria：contracts package 可 build；schema placeholder 可匯出；type barrel 可匯出；基本 validation test 通過。
- 預期修改檔案：`docs/worklogs/worklog-current.md`、`docs/tasks/active-task.md`、`docs/tasks/task-list.md`、`docs/tasks/phase-gates.md`。
- 預期新增檔案：`packages/contracts/package.json`、`packages/contracts/tsconfig.json`、`packages/contracts/src/index.ts`、`packages/contracts/src/schemas/base-contract.ts`、`packages/contracts/src/schemas/base-contract.test.ts`。
- Non-goals：不定義 Phase 1 project manifest schema；不實作 manifest loader；不加入 provider / workflow / artifact contracts。
- Checks / tests：`pnpm build`；`pnpm test`；`pnpm --filter @forgeweave/contracts test`；`git diff --check`。
- 風險與避免方式：避免 placeholder 被誤認為正式 schema；名稱與 `$id` 明確標記 placeholder，正式 contract 留到後續 Phase。

## Task Execution Plan — FW-P0-004

- 目標：建立 `@forgeweave/cli` skeleton，提供可編譯、可測試的 help/version 入口。
- Acceptance criteria：CLI package 可 build；`forgeweave --help` 或等價 smoke check 可跑；`--version` 可輸出版本。
- 預期修改檔案：`docs/worklogs/worklog-current.md`、`docs/tasks/active-task.md`、`docs/tasks/task-list.md`、`docs/tasks/phase-gates.md`。
- 預期新增檔案：`apps/cli/package.json`、`apps/cli/tsconfig.json`、`apps/cli/src/cli.ts`、`apps/cli/src/main.ts`、`apps/cli/src/index.ts`、`apps/cli/src/version.ts`、`apps/cli/src/cli.test.ts`。
- Non-goals：不實作 `forgeweave init`；不讀取 manifest；不加入 provider preflight、review workflow 或 workspace-write 行為。
- Checks / tests：`pnpm build`；`pnpm test`；`pnpm --filter @forgeweave/cli test`；`pnpm --filter @forgeweave/cli smoke`；lint N/A。
- 風險與避免方式：避免 CLI skeleton 被擴張成 Phase 1 onboarding；本 task 只接受 help/version 與 unknown command fallback。

## Task Execution Plan — FW-P0-005

- 目標：建立 Phase 0 測試 harness，讓 unit、contract、CLI 與 smoke checks 有明確入口。
- Acceptance criteria：至少一個 schema / contract test；至少一個 CLI test；至少一個 smoke check；root test 不重複執行 `dist` 內編譯產物。
- 預期修改檔案：`package.json`、`apps/cli/package.json`、`apps/cli/tsconfig.json`、`packages/contracts/package.json`、`packages/contracts/tsconfig.json`、`docs/worklogs/worklog-current.md`、`docs/tasks/active-task.md`、`docs/tasks/task-list.md`。
- 預期新增檔案：`vitest.config.ts`。
- Non-goals：不加入 coverage gate；不建立 E2E workflow runner；不實作 Phase 1 manifest fixtures validation。
- Checks / tests：`pnpm build`；`pnpm test`；`pnpm test:contract`；`pnpm test:cli`；`pnpm test:smoke`；lint N/A。
- 風險與避免方式：避免 glob 在 Windows script 中失效；使用明確 test file path 作為 Phase 0 baseline。

## Completed

- FW-P0-001：建立 root `package.json`、`pnpm-workspace.yaml`、`apps/cli`、`packages/contracts`、`packages/core` 最小骨架。
- FW-P0-002：加入 TypeScript / Vitest baseline，建立 `@forgeweave/core` 最小可編譯 package。
- FW-P0-003：建立 `@forgeweave/contracts` package skeleton、placeholder schema 與 validation test。
- FW-P0-004：建立 `@forgeweave/cli` skeleton，支援 help/version 與 CLI smoke check。
- FW-P0-005：建立 root Vitest config 與 unit / contract / CLI / smoke test scripts。

## Changed Files

- `package.json`
- `pnpm-workspace.yaml`
- `apps/cli/.gitkeep`
- `packages/contracts/.gitkeep`
- `packages/core/.gitkeep`
- `docs/tasks/active-task.md`
- `docs/tasks/task-list.md`
- `docs/worklogs/worklog-current.md`
- `pnpm-lock.yaml`
- `tsconfig.base.json`
- `packages/core/package.json`
- `packages/core/tsconfig.json`
- `packages/core/src/index.ts`
- `packages/contracts/package.json`
- `packages/contracts/tsconfig.json`
- `packages/contracts/src/index.ts`
- `packages/contracts/src/schemas/base-contract.ts`
- `packages/contracts/src/schemas/base-contract.test.ts`
- `apps/cli/package.json`
- `apps/cli/tsconfig.json`
- `apps/cli/src/cli.ts`
- `apps/cli/src/main.ts`
- `apps/cli/src/index.ts`
- `apps/cli/src/version.ts`
- `apps/cli/src/cli.test.ts`
- `vitest.config.ts`

## Commands / Checks

| Command | Result | Notes |
| --- | --- | --- |
| `pnpm install --lockfile-only` | Pass | 無 dependencies，未產生 lockfile。 |
| `pnpm build` | Pass | 目前尚無 workspace package manifest，`pnpm -r` 顯示 no projects matched。 |
| `pnpm test` | Pass | 目前尚無 workspace package manifest，`pnpm -r` 顯示 no projects matched。 |
| `pnpm install --lockfile-only` | Pass | 建立 pnpm lockfile。 |
| `pnpm build` | Pass | `@forgeweave/core` TypeScript build 通過。 |
| `pnpm test` | Pass | Phase 0 baseline 尚無測試，使用 `--passWithNoTests` 通過。 |
| lint | N/A | 尚未定義 lint script。 |
| `pnpm build` | Pass | `@forgeweave/contracts` 與 `@forgeweave/core` build 通過。 |
| `pnpm test` | Pass | contracts validation test 通過。 |
| `pnpm --filter @forgeweave/contracts test` | Pass | schema placeholder validation test 通過。 |
| `pnpm build` | Pass | `@forgeweave/cli`、contracts、core build 通過。 |
| `pnpm test` | Pass | CLI、contracts 測試通過。 |
| `pnpm --filter @forgeweave/cli test` | Pass | CLI help/version smoke 單元測試通過。 |
| `pnpm --filter @forgeweave/cli smoke` | Pass | `node dist/main.js --help` 與 `--version` 通過。 |
| lint | N/A | 尚未定義 lint script。 |
| `pnpm build` | Pass | 測試檔已排除在 package build 輸出之外。 |
| `pnpm test` | Pass | root Vitest config 排除 `dist`，只執行 source tests。 |
| `pnpm test:contract` | Pass | contracts schema placeholder test 通過。 |
| `pnpm test:cli` | Pass | CLI help/version unit test 通過。 |
| `pnpm test:smoke` | Pass | CLI build 後執行 help/version smoke check。 |
| lint | N/A | 尚未定義 lint script。 |

## Acceptance Criteria Status

- [x] FW-P0-001 acceptance criteria
- [x] FW-P0-002 acceptance criteria
- [x] FW-P0-003 acceptance criteria
- [x] FW-P0-004 acceptance criteria
- [x] FW-P0-005 acceptance criteria

## Blocking Items

- 無

## Parking Lot

- 無

## Next Task

- FW-P0-006 — 建立本機 run/artifact fixture 目錄

## Commit Message

```text
phase-0: FW-P0-001 initialize monorepo baseline
phase-0: FW-P0-002 add typescript tooling baseline
phase-0: FW-P0-003 add contracts package skeleton
phase-0: FW-P0-004 add cli skeleton
phase-0: FW-P0-005 add test harness
```
