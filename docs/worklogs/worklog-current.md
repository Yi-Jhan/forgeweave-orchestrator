# Worklog Current

## Active Focus

- Phase：Phase 3 — Feature Delivery MVP
- Task：FW-P3B-003 / FW-P3B-004 / FW-P3B-005 / FW-P3B-006 / FW-P3B-007（完成）
- Validation Mode：fixture

## Task Execution Plan — FW-P3B-003 / FW-P3B-004 / FW-P3B-005 / FW-P3B-006 / FW-P3B-007

- 目標：完成 Phase 3B small new-feature / enhancement 交付閉環，包含 `generic.new-feature` workflow、controlled new-file + modify-file patch mode、ACC fixture E2E、第二專案 fixture E2E 與 P2/P3 regression suite。
- Acceptance criteria：`generic.new-feature` 可產生 requirement-brief、feature-spec、implementation-plan、file-change-set、command-summary、review-findings、delivery-summary；新增檔案與修改檔案都通過 allowlist；過大需求被 small-scope guard 阻擋；ACC fixture CLI E2E 可跑到 review gate；minimal-project bug-fix / new-feature E2E 可跑；regression suite 確認 generic.review / generic.bug-fix / generic.new-feature 均可跑。
- 預期修改檔案：`packages/core/src/workflow-runner.ts`、`packages/core/src/index.ts`、`apps/cli/src/cli.ts`、`apps/cli/src/cli.test.ts`、`docs/worklogs/worklog-current.md`、`docs/tasks/active-task.md`、`docs/tasks/task-list.md`、`docs/tasks/phase-gates.md`、`docs/planning/current-focus.md`。
- 預期新增檔案：`packages/core/src/workflows/generic-new-feature.ts`、`packages/core/src/generic-new-feature-workflow.test.ts`、`packages/core/src/workflow-regression.test.ts`。
- Non-goals：不做大型 feature、多模組重構、ACC single-page migration、Phase 4 context-slice hardening 或 checkpoint resume。
- Checks / tests：`pnpm --filter @forgeweave/core test`；`pnpm --filter @forgeweave/cli test`；`pnpm --filter @forgeweave/core build`；`pnpm --filter @forgeweave/cli build`；`pnpm build`；`pnpm test`；`pnpm test:smoke`；`git diff --check`。
- 風險與避免方式：new-feature patch 僅寫入 output root controlled workdir；fixture command 缺 package.json 時以 skipped command-summary 記錄；regression 使用 temp output roots 避免污染 repo。

## Task Execution Plan — FW-P3B-001 / FW-P3B-002

- 目標：建立 small new-feature / enhancement 的 contracts 與 small-scope guard，作為 `generic.new-feature` workflow 的前置安全邊界。
- Acceptance criteria：requirement-brief、feature-spec、implementation-plan schema 有基本 validation tests；small-scope guard 可接受小範圍需求，阻擋描述過大、多檔案過多、migration / refactor / redesign 等大型需求；新檔與修改檔仍受 file allowlist / denylist policy 控制。
- 預期修改檔案：`packages/contracts/src/schemas/phase-3-contracts.ts`、`packages/contracts/src/schemas/phase-3-contracts.test.ts`、`packages/contracts/src/index.ts`、`packages/core/src/index.ts`、`docs/worklogs/worklog-current.md`、`docs/tasks/active-task.md`、`docs/tasks/task-list.md`。
- 預期新增檔案：`packages/core/src/small-scope-guard.ts`、`packages/core/src/small-scope-guard.test.ts`。
- Non-goals：不實作 `generic.new-feature` workflow；不新增 CLI E2E；不做多模組 feature；不進入 Phase 4 migration scope。
- Checks / tests：`pnpm --filter @forgeweave/contracts test`；`pnpm --filter @forgeweave/contracts build`；`pnpm --filter @forgeweave/core test`；`pnpm --filter @forgeweave/core build`；`git diff --check`。
- 風險與避免方式：guard 的關鍵字只作 Phase 3 MVP coarse filter，不宣稱完整需求理解；實際 patch 仍由 file policy 與 review gate 收斂。

## Task Execution Plan — FW-P3A-010 / FW-P3A-011 / FW-P3A-012

- 目標：完成 Phase 3A patch-first bug-fix 收尾，讓 reject reason 能傳遞到指定 step rerun，CLI 能顯示 failure / recovery 建議，並以 ACC fixture 跑通小 bug-fix patch-run E2E。
- Acceptance criteria：review reject reason 可保存並被 rerun 使用；可不重跑整個 run 而 rerun `validate` step 並產生新的 command-summary / rerun-summary artifacts；CLI status 顯示 failed step、reject reason、artifacts 與 rerun 建議；CLI `run generic.bug-fix` 可在 ACC fixture 產生 diff、command-summary、review gate、delivery summary；CLI smoke / tests 覆蓋此流程。
- 預期修改檔案：`apps/cli/src/cli.ts`、`apps/cli/src/cli.test.ts`、`packages/core/src/index.ts`、`packages/core/src/review-decision.ts`、`docs/worklogs/worklog-current.md`、`docs/tasks/active-task.md`、`docs/tasks/task-list.md`、`docs/tasks/phase-gates.md`。
- 預期新增檔案：`packages/core/src/rerun.ts`、`packages/core/src/rerun.test.ts`、`examples/acc/fixtures/modern-target/status-card.ts`。
- Non-goals：不實作 Phase 4 checkpoint / full resume state machine；不自動 approve review；不寫入真實 ACC repo；不做 ACC migration。
- Checks / tests：`pnpm --filter @forgeweave/core test`；`pnpm --filter @forgeweave/cli test`；`pnpm --filter @forgeweave/core build`；`pnpm --filter @forgeweave/cli build`；`pnpm test:smoke`；`git diff --check`。
- 風險與避免方式：rerun 僅在 rejected run 上開放，並要求既有 workdir-provenance artifact；CLI 僅操作 outputRoot artifacts，不回寫 source fixture。

## Task Execution Plan — FW-P3A-004 / FW-P3A-005 / FW-P3A-006 / FW-P3A-007 / FW-P3A-008 / FW-P3A-009

- 目標：建立 patch-first bug-fix delivery 的最小閉環，包含 manifest-approved command runner、command-summary artifact、bug-brief / patch-plan / file-change-set contracts、diff capture 與 `generic.bug-fix` workflow。
- Acceptance criteria：allowed / blocked / skipped / failed command 都可被 command-summary 捕捉；只允許 manifest 內的 lint/test/build command；bug-brief、patch-plan、file-change-set schema 有基本 validation test；diff capture 可產生 changed files 與 unified diff；`generic.bug-fix` 可在 controlled workdir 產生 patch、validation summary、review findings、delivery summary。
- 預期修改檔案：`packages/contracts/src/index.ts`、`packages/contracts/src/schemas/workflow-definition.ts`、`packages/contracts/src/schemas/phase-2-contracts.test.ts`、`packages/core/src/index.ts`、`packages/core/src/workflow-runner.ts`、`docs/worklogs/worklog-current.md`、`docs/tasks/active-task.md`、`docs/tasks/task-list.md`、`docs/tasks/phase-gates.md`。
- 預期新增檔案：`packages/contracts/src/schemas/phase-3-contracts.ts`、`packages/contracts/src/schemas/phase-3-contracts.test.ts`、`packages/core/src/command-runner.ts`、`packages/core/src/command-runner.test.ts`、`packages/core/src/diff-capture.ts`、`packages/core/src/diff-capture.test.ts`、`packages/core/src/workflows/generic-bug-fix.ts`、`packages/core/src/generic-bug-fix-workflow.test.ts`。
- Non-goals：不實作 reject-rerun CLI；不實作 new-feature workflow；不做 ACC single-page migration；不對真實 ACC source 寫入。
- Checks / tests：`pnpm --filter @forgeweave/contracts test`；`pnpm --filter @forgeweave/contracts build`；`pnpm --filter @forgeweave/core test`；`pnpm --filter @forgeweave/core build`；`git diff --check`。
- 風險與避免方式：fixture manifest 內 command 可能不可實際執行；缺少 package.json 時以 skipped command-summary 記錄，不視為 workflow failure。patch 寫入 output root controlled workdir，不碰 source fixture。

## Task Execution Plan — FW-P3A-001 / FW-P3A-002 / FW-P3A-003

- 目標：建立 Phase 3 workspace-write 的安全底座，包含 controlled workdir provenance、branch / dirty-state guard，以及 file allowlist / denylist policy。
- Acceptance criteria：可建立隔離 controlled workdir；可記錄 source root、workdir root、branch / head / dirty-state provenance；live-patch dirty state 會阻擋，fixture dirty state 只記錄 warning；越界、denylist、path traversal、未 allowlist 的檔案變更會被阻擋且回傳 reject reason。
- 預期修改檔案：`packages/core/src/index.ts`、`docs/worklogs/worklog-current.md`、`docs/tasks/active-task.md`、`docs/tasks/task-list.md`。
- 預期新增檔案：`packages/core/src/workdir-manager.ts`、`packages/core/src/write-safety.ts`、`packages/core/src/write-safety.test.ts`。
- Non-goals：不實作 patch/diff capture；不執行 lint/test/build command；不定義 bug-fix workflow；不寫入真實 ACC repo。
- Checks / tests：`pnpm --filter @forgeweave/core test`；`pnpm --filter @forgeweave/core build`；`git diff --check`。
- 風險與避免方式：測試使用 temp directory，避免在 fixture source 旁產生 artifacts；branch dirty 檢查對 fixture mode 只警告，避免 repo 本身施工中的 dirty state 阻擋 fixture tests。

## Phase 2 Final Gate

- [x] `generic.review` workflow 可在 ACC fixture 跑完。
- [x] `generic.review` workflow 可在 minimal-project fixture 跑完。
- [x] review workflow 不允許寫檔，runner 會阻擋非 read-only step 與 workspace-write policy。
- [x] review-findings / delivery-summary 符合 schema。
- [x] approve / reject / reject reason 可保存。
- [x] run / step / artifact / event / review decision 可持久化。

## Task Execution Plan — FW-P2-011 / FW-P2-012 / FW-P2-014 / FW-P2-015

- 目標：提供 CLI `run generic.review`、`status`、`artifacts`、`review approve`、`review reject --reason`，並以 ACC fixture 與 minimal-project fixture 驗證 read-only review E2E。
- Acceptance criteria：CLI 可啟動 `generic.review` 並產出 run / artifacts；status 可查 run、steps、review decision；artifacts 可列出 persisted artifacts；approve / reject / reject reason 可保存；ACC fixture 與 minimal-project fixture 都可跑，不依賴 ACC-specific runner logic。
- 預期修改檔案：`apps/cli/src/cli.ts`、`apps/cli/src/main.ts`、`apps/cli/src/cli.test.ts`、`packages/core/src/index.ts`、`docs/worklogs/worklog-current.md`、`docs/tasks/active-task.md`、`docs/tasks/task-list.md`。
- 預期新增檔案：`packages/core/src/review-decision.ts`、`packages/core/src/review-decision.test.ts`。
- Non-goals：不實作 Phase 3 patch mode；不支援 workspace-write；不建立 TUI/WebUI；不自動修改外部 ACC repo。
- Checks / tests：`pnpm --filter @forgeweave/core test`；`pnpm --filter @forgeweave/cli test`；`pnpm --filter @forgeweave/core build`；`pnpm --filter @forgeweave/cli build`；`pnpm test:smoke`；`pnpm build`。
- 風險與避免方式：避免 CLI 預設寫入 fixture project；Phase 2 run command 必須明確提供 `--output-root`，測試使用 temp output root。

## Task Execution Plan — FW-P2-007 / FW-P2-009 / FW-P2-010 / FW-P2-013

- 目標：建立 deterministic MockRuntimeProvider、workflow runner skeleton、`generic.review` workflow，並在 runner 層強制 Phase 2 read-only isolation。
- Acceptance criteria：mock runtime 產生 deterministic review findings；runner 可處理 system / agent / human-review step lifecycle；`generic.review` 可執行 load project → context → review-findings → review gate；read-only guard 可阻擋非 read-only workflow；ACC fixture 與 minimal-project fixture 不依賴 ACC-specific runner logic。
- 預期修改檔案：`packages/core/src/index.ts`、`docs/worklogs/worklog-current.md`、`docs/tasks/active-task.md`、`docs/tasks/task-list.md`。
- 預期新增檔案：`packages/core/src/workflows/generic-review.ts`、`packages/core/src/mock-runtime-provider.ts`、`packages/core/src/workflow-runner.ts`、`packages/core/src/workflow-runner.test.ts`。
- Non-goals：不實作 CLI approve/reject；不實作 Phase 3 patch/write mode；不寫入 reference project source；不實作 resume/retry。
- Checks / tests：`pnpm --filter @forgeweave/core test`；`pnpm --filter @forgeweave/core build`。
- 風險與避免方式：避免 runner 對 fixture project 產生 `.forgeweave` source-side output；測試使用 temp output root 並確認 fixture root 沒有 `.forgeweave`。

## Task Execution Plan — FW-P2-005

- 目標：建立 Phase 2 local workflow store，讓 run、step、artifact、event、review decision metadata 可以以 JSON / JSONL 保存並讀回。
- Acceptance criteria：可保存並讀回 run state；可保存並讀回 step state；workflow artifact 可保存 / 列出 / 讀回；event envelope 以 JSONL append 並讀回；review decision 含 reject reason 可保存。
- 預期修改檔案：`packages/core/src/index.ts`、`docs/worklogs/worklog-current.md`、`docs/tasks/active-task.md`、`docs/tasks/task-list.md`。
- 預期新增檔案：`packages/core/src/local-store.ts`、`packages/core/src/local-store.test.ts`。
- Non-goals：不實作 workflow runner；不建立 workspace-write；不實作 migration/patch storage；不設計 replay/resume v1。
- Checks / tests：`pnpm --filter @forgeweave/core test`；`pnpm --filter @forgeweave/core build`。
- 風險與避免方式：避免 storage 寫進真實 reference project source；測試使用本機 temp directory，Phase 2 runner 後續以 output root 管理 artifacts。

## Task Execution Plan — FW-P2-001 / FW-P2-002 / FW-P2-003 / FW-P2-004 / FW-P2-006 / FW-P2-008

- 目標：建立 Phase 2 review-first workflow 的最小 contracts 與核心狀態基礎，讓後續 storage、runner、CLI 可以共用一致資料形狀。
- Acceptance criteria：workflow definition 可驗證 step kind、inputs、outputs、review policy、runtime policy；workflow artifact 可驗證 status、refs、payload、producedBy；run/step legal/illegal transitions 有測試；event envelope 支援 run/step/artifact/review lifecycle；AgentRuntimeProvider contract 包含 createSession、runStep、optional resume/close；review-findings / delivery-summary schema 可驗證 findings、severity、risks、next actions。
- 預期修改檔案：`packages/contracts/src/index.ts`、`packages/core/src/index.ts`、`docs/worklogs/worklog-current.md`、`docs/tasks/active-task.md`、`docs/tasks/task-list.md`、`docs/planning/current-focus.md`。
- 預期新增檔案：`packages/contracts/src/schemas/workflow-definition.ts`、`packages/contracts/src/schemas/workflow-artifact.ts`、`packages/contracts/src/schemas/workflow-event.ts`、`packages/contracts/src/schemas/review-artifacts.ts`、`packages/contracts/src/schemas/phase-2-contracts.test.ts`、`packages/core/src/state-machine.ts`、`packages/core/src/runtime-provider.ts`、`packages/core/src/state-machine.test.ts`。
- Non-goals：不實作 storage；不實作 workflow runner；不加入 CLI command；不寫入 project workspace；不實作 Phase 3 patch / command runner。
- Checks / tests：`pnpm --filter @forgeweave/contracts test`；`pnpm --filter @forgeweave/core test`；`pnpm --filter @forgeweave/contracts build`；`pnpm --filter @forgeweave/core build`。
- 風險與避免方式：避免 workflow schema 允許 workspace-write；runtime policy 僅接受 `workspaceWrite: disallowed`，狀態機維持 Phase 2 最小轉換，不提前實作 resume/retry。

## Task Execution Plan — FW-P1-001 / FW-P1-006 / FW-P1-009

- 目標：定義 Phase 1 onboarding 所需的 project manifest、provider asset profile、provider preflight report contracts，並提供基本 validation helpers。
- Acceptance criteria：manifest valid/invalid fixture 可驗證；github_copilot / generic_agent 類型 asset profile shape 可驗證；provider-preflight-report 能捕捉 capabilities、missing features、degraded modes。
- 預期修改檔案：`packages/contracts/src/index.ts`、`packages/contracts/package.json`、`docs/worklogs/worklog-current.md`、`docs/tasks/active-task.md`、`docs/tasks/task-list.md`、`docs/tasks/phase-gates.md`。
- 預期新增檔案：`packages/contracts/src/schemas/project-manifest.ts`、`packages/contracts/src/schemas/provider-asset-profile.ts`、`packages/contracts/src/schemas/provider-preflight-report.ts`、`packages/contracts/src/schemas/phase-1-contracts.test.ts`。
- Non-goals：不實作 manifest loader；不實作 CLI init；不建立 workflow runner 或 Phase 2 artifact/state contracts。
- Checks / tests：`pnpm --filter @forgeweave/contracts test`；`pnpm --filter @forgeweave/contracts build`。
- 風險與避免方式：避免 schema 過度承諾未來 Phase；只納入 Phase 1 gate 明確要求的欄位與 deterministic validation。

## Task Execution Plan — FW-P1-002 / FW-P1-004 / FW-P1-005 / FW-P1-007 / FW-P1-008 / FW-P1-010 / FW-P1-011 / FW-P1-012

- 目標：建立 Phase 1 onboarding core pipeline，從 manifest 載入與 normalize 到 project signals、adapter recommendation、asset gaps、context packet、mock preflight、capability matrix 與 onboarding report。
- Acceptance criteria：fixture manifests 可被載入並套 defaults；ACC 與 minimal-project 可產出 signals / adapter recommendation / asset gap / context packet / preflight / matrix / report；mock preflight 有 deterministic pass/degraded/fail。
- 預期修改檔案：`packages/core/package.json`、`packages/core/tsconfig.json`、`packages/core/src/index.ts`、`pnpm-lock.yaml`、`docs/worklogs/worklog-current.md`、`docs/tasks/active-task.md`、`docs/tasks/task-list.md`、`docs/tasks/phase-gates.md`。
- 預期新增檔案：`packages/core/src/manifest.ts`、`packages/core/src/project-detector.ts`、`packages/core/src/adapter-recommendation.ts`、`packages/core/src/provider-assets.ts`、`packages/core/src/context-packet.ts`、`packages/core/src/provider-preflight.ts`、`packages/core/src/onboarding-report.ts`、`packages/core/src/phase-1-onboarding.test.ts`。
- Non-goals：不實作 `generic.review` workflow；不做 workspace-write；不寫入真實 ACC repo；不實作完整 runtime provider。
- Checks / tests：`pnpm install`；`pnpm --filter @forgeweave/core test`；`pnpm --filter @forgeweave/core build`。
- 風險與避免方式：避免 onboarding core 綁死 ACC；minimal-project smoke test 驗證 GenericProjectAdapter path，ACC path 僅用 fixture profile 推薦 ProjectSpecificAdapter。

## Task Execution Plan — FW-P1-003 / FW-P1-013 / FW-P1-014 / FW-P1-LIVE-001

- 目標：接上 `forgeweave init` CLI onboarding flow，讓 ACC fixture 與 minimal-project fixture 都能 dry-run 產出 onboarding summary；確認未設定 `FORGEWEAVE_ACC_ROOT` 時 live ACC validation 標為 `Blocked External`。
- Acceptance criteria：`forgeweave init --project-root examples/acc --dry-run` 可跑；`examples/minimal-project` 可跑；dry-run 不覆蓋或建立 fixture artifacts；live ACC validation 未設定外部 root 時不阻擋 implementation gate。
- 預期修改檔案：`apps/cli/src/cli.ts`、`apps/cli/src/cli.test.ts`、`apps/cli/package.json`、`packages/core/src/onboarding-report.ts`、`package.json`、`pnpm-lock.yaml`、`docs/worklogs/worklog-current.md`、`docs/tasks/active-task.md`、`docs/tasks/task-list.md`、`docs/tasks/phase-gates.md`、`docs/planning/current-focus.md`。
- 預期新增檔案：無。
- Non-goals：不寫入真實 ACC repo；不實作 Phase 2 review workflow；不導入 TUI/WebUI；不實作 live-patch。
- Checks / tests：`pnpm install`；`pnpm build`；`pnpm test`；`pnpm test:contract`；`pnpm test:cli`；`pnpm test:smoke`；`pnpm --filter @forgeweave/contracts test`；`pnpm --filter @forgeweave/core test`；`pnpm --filter @forgeweave/cli test`；`pnpm --filter @forgeweave/cli smoke`。
- 風險與避免方式：避免 dry-run 對 fixture 產生 committed artifact；實測 `examples/acc/.forgeweave` 與 `examples/minimal-project/.forgeweave` 不存在。

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

## Task Execution Plan — FW-P0-006

- 目標：建立可被測試引用的 `.forgeweave` runtime fixture layout，作為後續 run/artifact/event storage 的安全殼。
- Acceptance criteria：fixture 中存在 `.forgeweave/runs`、`.forgeweave/artifacts`、`.forgeweave/events`；root test 可驗證 layout；fixture 不依賴真實 ACC repo。
- 預期修改檔案：`docs/worklogs/worklog-current.md`、`docs/tasks/active-task.md`、`docs/tasks/task-list.md`。
- 預期新增檔案：`tests/fixtures/runtime/basic-project/README.md`、`tests/fixtures/runtime/basic-project/.forgeweave/README.md`、`.forgeweave/runs/.gitkeep`、`.forgeweave/artifacts/.gitkeep`、`.forgeweave/events/.gitkeep`、`tests/fixtures/runtime-layout.test.ts`。
- Non-goals：不實作 storage API；不建立真實 runtime output；不寫入 repo root `.forgeweave`；不加入 Phase 2 state machine。
- Checks / tests：`pnpm build`；`pnpm test`；`pnpm test:smoke`；fixture layout test。
- 風險與避免方式：避免 fixture 被誤認為 live output；README 明確標示 sanitized fixture，且放在 `tests/fixtures`。

## Task Execution Plan — FW-P0-007

- 目標：建立最小 task status flow 文件，讓 worklog、active task、task list、phase gate 的更新方式一致。
- Acceptance criteria：worklog template 包含 Task Execution Plan 欄位；status flow 文件說明狀態與更新順序；phase gate 可反映 docs/status 已更新。
- 預期修改檔案：`docs/worklogs/README.md`、`docs/worklogs/worklog-template.md`、`docs/worklogs/worklog-current.md`、`docs/tasks/active-task.md`、`docs/tasks/task-list.md`、`docs/tasks/phase-gates.md`。
- 預期新增檔案：`docs/tasks/status-flow.md`。
- Non-goals：不建立 `.xlsx`；不更改 Phase 1+ scope；不導入自動文件產生工具。
- Checks / tests：`pnpm build`；`pnpm test`；lint N/A。
- 風險與避免方式：避免文件流程和 runner prompt 衝突；沿用 `workflow-cycle.md` 與 Phase runner 既有順序。

## Task Execution Plan — FW-P0-008

- 目標：建立或確認 ACC 與 minimal-project fixture shell，並以 smoke test 確認不依賴真實 ACC repo。
- Acceptance criteria：`examples/acc` 與 `examples/minimal-project` 有 fixture manifest / README / placeholder shell；測試確認 fixture mode 與外部 root env 設定；不包含真實 ACC source。
- 預期修改檔案：`docs/worklogs/worklog-current.md`、`docs/tasks/active-task.md`、`docs/tasks/task-list.md`、`docs/tasks/phase-gates.md`、`docs/planning/current-focus.md`。
- 預期新增檔案：`examples/acc/fixtures/README.md`、`examples/acc/fixtures/legacy-page/.gitkeep`、`examples/acc/fixtures/modern-target/.gitkeep`、`examples/minimal-project/src/.gitkeep`、`examples/minimal-project/tests/.gitkeep`、`tests/fixtures/reference-projects.test.ts`。
- Non-goals：不讀取真實 ACC repo；不建立 onboarding loader；不實作 migration workflow；不加入真實 route / API / private URL。
- Checks / tests：`pnpm build`；`pnpm test`；`pnpm test:contract`；`pnpm test:cli`；`pnpm test:smoke`。
- 風險與避免方式：避免 fixture 混入 private data；只新增 placeholder 目錄與 synthetic README，測試僅檢查 fixture shell。

## Completed

- FW-P3B-003：新增 `generic.new-feature` workflow，產出 requirement-brief、feature-spec、implementation-plan、file-change-set、command-summary、review-findings、delivery-summary。
- FW-P3B-004：`generic.new-feature` 支援 controlled new-file + README modify patch mode，新增/修改檔案皆走 allowlist。
- FW-P3B-005：ACC fixture `generic.new-feature` CLI E2E 通過。
- FW-P3B-006：minimal-project fixture bug-fix / new-feature E2E 通過，驗證 core 不綁 ACC/Angular。
- FW-P3B-007：新增 P2/P3 workflow regression suite，確認 review / bug-fix / new-feature 均可跑。
- FW-P3B-001：新增 requirement-brief、feature-spec、implementation-plan contracts 與 validation tests。
- FW-P3B-002：新增 small-scope guard，可阻擋過大、多檔、denylist 與 migration/refactor/redesign 類需求。
- FW-P3A-010：新增 rejected run 的 targeted validate rerun，會帶入 reject reason 並產出新的 command-summary / rerun-summary artifacts。
- FW-P3A-011：CLI `status` 顯示 artifacts、failed step、reject reason 與 rerun 建議；新增 CLI `rerun` command。
- FW-P3A-012：ACC fixture `generic.bug-fix` CLI E2E 通過，可產生 diff、command-summary、review gate 與 delivery summary。
- FW-P3A-004：新增 command runner skeleton，可捕捉 passed / failed / blocked / skipped / timed-out command records。
- FW-P3A-005：新增 command allowlist policy，只允許 manifest-approved lint / test / build；其他 command 會被 blocked。
- FW-P3A-006：新增 bug-brief、patch-plan、file-change-set、command-summary contracts 與 validation tests。
- FW-P3A-007：新增 diff capture，產出 changedFiles metadata 與 unified diff。
- FW-P3A-008：新增 `generic.bug-fix` workflow，支援 brief → plan → patch → validate → review gate。
- FW-P3A-009：`generic.bug-fix` validation step 會產生 command-summary artifact；fixture 缺少 package.json 時記錄 skipped，不視為 workflow failure。
- FW-P3A-001：新增 controlled workdir manager，會複製到 output root 下的隔離 workdir，並記錄 source/workdir/provenance。
- FW-P3A-002：新增 branch / dirty-state guard；live-patch dirty state 會阻擋，fixture dirty state 會記錄 warning。
- FW-P3A-003：新增 file allowlist / denylist policy，阻擋越界、denylist、未 allowlist 與未允許的新檔。
- FW-P2-001：新增 workflow definition schema、type 與 validation helper。
- FW-P2-002：新增 workflow artifact schema、type 與 validation helper。
- FW-P2-003：新增最小 run/step state machine，含 legal / illegal transition tests。
- FW-P2-004：新增 workflow event envelope schema、type 與 validation helper。
- FW-P2-005：新增 local JSON/JSONL workflow store，可保存 run、step、artifact、event 與 review decision metadata。
- FW-P2-006：新增 AgentRuntimeProvider contract v0，支援 createSession、runStep、optional resume/close。
- FW-P2-007：新增 deterministic MockRuntimeProvider review fixture。
- FW-P2-008：新增 review-findings 與 delivery-summary schema、type 與 validation helper。
- FW-P2-009：新增 workflow runner skeleton，支援 system、agent、human-review step lifecycle。
- FW-P2-010：新增 `generic.review` workflow definition，串接 project context、review findings 與 manual review gate。
- FW-P2-011：新增 CLI `review approve` / `review reject --reason`，可保存 review decision 並更新 run status。
- FW-P2-012：新增 CLI `run generic.review`、`status`、`artifacts` inspect commands。
- FW-P2-013：新增 Phase 2 read-only guard，阻擋 workspace-write policy 或非 read-only step。
- FW-P2-014：ACC fixture `generic.review` CLI E2E 通過，產出 artifacts 與 pending review decision。
- FW-P2-015：minimal-project fixture `generic.review` CLI / review decision E2E 通過，不依賴 ACC-specific logic。
- FW-P1-001：新增 project manifest schema、type 與 validation helper。
- FW-P1-002：新增 manifest finder / loader / normalizer，支援 fixture YAML manifest。
- FW-P1-003：新增 `forgeweave init` CLI onboarding flow，支援 `--project-root`、`--dry-run`、`--write`。
- FW-P1-004：新增 generic project detector，產出 language、framework、package manager、source/test roots 與 command signals。
- FW-P1-005：新增 adapter recommendation report，含推薦 adapter、理由與缺口。
- FW-P1-006：新增 provider asset profile schema、type 與 validation helper。
- FW-P1-007：新增 provider asset resolver 與 gap report。
- FW-P1-008：新增 simple context packet generator。
- FW-P1-009：新增 provider-preflight-report schema、type 與 validation helper。
- FW-P1-010：新增 deterministic mock provider preflight。
- FW-P1-011：新增 provider capability matrix v0。
- FW-P1-012：新增 onboarding report artifact builder。
- FW-P1-013：ACC fixture onboarding smoke test 通過。
- FW-P1-014：minimal-project onboarding smoke test 通過。
- FW-P1-LIVE-001：`.env.local` 已提供 `FORGEWEAVE_ACC_ROOT`，live-readonly dry-run onboarding 通過；未記錄本機路徑且未寫入外部 ACC artifacts。
- FW-P0-001：建立 root `package.json`、`pnpm-workspace.yaml`、`apps/cli`、`packages/contracts`、`packages/core` 最小骨架。
- FW-P0-002：加入 TypeScript / Vitest baseline，建立 `@forgeweave/core` 最小可編譯 package。
- FW-P0-003：建立 `@forgeweave/contracts` package skeleton、placeholder schema 與 validation test。
- FW-P0-004：建立 `@forgeweave/cli` skeleton，支援 help/version 與 CLI smoke check。
- FW-P0-005：建立 root Vitest config 與 unit / contract / CLI / smoke test scripts。
- FW-P0-006：建立 `.forgeweave` runtime fixture layout 與 fixture layout test。
- FW-P0-007：建立 task status flow 文件，補齊 worklog template 與 phase gate 狀態串接。
- FW-P0-008：建立 / 確認 ACC 與 minimal-project fixture shell，加入 reference fixture smoke test。

## Changed Files

- `packages/contracts/src/schemas/project-manifest.ts`
- `packages/contracts/src/schemas/provider-asset-profile.ts`
- `packages/contracts/src/schemas/provider-preflight-report.ts`
- `packages/contracts/src/schemas/phase-1-contracts.test.ts`
- `packages/contracts/src/index.ts`
- `packages/contracts/package.json`
- `packages/core/src/manifest.ts`
- `packages/core/src/project-detector.ts`
- `packages/core/src/adapter-recommendation.ts`
- `packages/core/src/provider-assets.ts`
- `packages/core/src/context-packet.ts`
- `packages/core/src/provider-preflight.ts`
- `packages/core/src/onboarding-report.ts`
- `packages/core/src/phase-1-onboarding.test.ts`
- `packages/core/src/index.ts`
- `packages/core/package.json`
- `packages/core/tsconfig.json`
- `pnpm-lock.yaml`
- `apps/cli/src/cli.ts`
- `apps/cli/src/cli.test.ts`
- `apps/cli/package.json`
- `package.json`
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
- `tests/fixtures/runtime/basic-project/README.md`
- `tests/fixtures/runtime/basic-project/.forgeweave/README.md`
- `tests/fixtures/runtime/basic-project/.forgeweave/runs/.gitkeep`
- `tests/fixtures/runtime/basic-project/.forgeweave/artifacts/.gitkeep`
- `tests/fixtures/runtime/basic-project/.forgeweave/events/.gitkeep`
- `tests/fixtures/runtime-layout.test.ts`
- `docs/tasks/status-flow.md`
- `docs/worklogs/README.md`
- `docs/worklogs/worklog-template.md`
- `examples/acc/fixtures/README.md`
- `examples/acc/fixtures/legacy-page/.gitkeep`
- `examples/acc/fixtures/modern-target/.gitkeep`
- `examples/minimal-project/src/.gitkeep`
- `examples/minimal-project/tests/.gitkeep`
- `tests/fixtures/reference-projects.test.ts`
- `docs/planning/current-focus.md`

## Commands / Checks

| Command | Result | Notes |
| --- | --- | --- |
| `pnpm build` | Pass | contracts、core、CLI workspace build 通過。 |
| `pnpm test` | Pass | 20 test files / 53 tests 通過，包含 P2/P3 regression suite。 |
| `pnpm test:contract` | Pass | 4 contract test files / 12 tests 通過。 |
| `pnpm test:cli` | Pass | 1 CLI test file / 9 tests 通過，包含 ACC/minimal Phase 3 E2E。 |
| `pnpm test:smoke` | Pass | CLI help/version/init smoke 通過。 |
| lint | N/A | root `package.json` 尚未定義 lint script。 |
| `pnpm --filter @forgeweave/core test` | Pass | `generic.new-feature` 與 P2/P3 regression tests 通過。 |
| `pnpm --filter @forgeweave/cli test` | Pass | core build 完成後重跑，ACC/minimal `generic.new-feature` CLI E2E 通過。 |
| `pnpm --filter @forgeweave/core build` | Pass | generic new-feature workflow export build 通過。 |
| `pnpm --filter @forgeweave/cli build` | Pass | core build 完成後重跑 CLI build 通過。 |
| `pnpm --filter @forgeweave/contracts test` | Pass | Phase 3B feature contracts validation tests 通過。 |
| `pnpm --filter @forgeweave/contracts build` | Pass | feature contracts exports build 通過。 |
| `pnpm --filter @forgeweave/core test` | Pass | small-scope guard tests 通過。 |
| `pnpm --filter @forgeweave/core build` | Pass | contracts build 完成後重跑 core build 通過。 |
| `pnpm --filter @forgeweave/core test` | Pass | reject reason rerun tests 通過。 |
| `pnpm --filter @forgeweave/cli test` | Pass | ACC fixture `generic.bug-fix` + reject/rerun CLI E2E 通過。 |
| `pnpm --filter @forgeweave/core build` | Pass | rerun export build 通過。 |
| `pnpm --filter @forgeweave/cli build` | Pass | core build 完成後重跑 CLI build 通過。 |
| `pnpm test:smoke` | Pass | CLI help/version/init smoke 通過，help 已列出 rerun command。 |
| build CLI `generic.bug-fix` ACC fixture smoke | Pass | temp output root 產生 8 個 artifacts：context、workdir、bug-brief、patch-plan、file-change-set、command-summary、review-findings、delivery-summary。 |
| `pnpm --filter @forgeweave/contracts test` | Pass | Phase 3 patch / command contracts tests 通過。 |
| `pnpm --filter @forgeweave/contracts build` | Pass | workflow definition controlled workspace-write type build 通過。 |
| `pnpm --filter @forgeweave/core test` | Pass | command runner、diff capture、generic.bug-fix workflow tests 通過。 |
| `pnpm --filter @forgeweave/core build` | Pass | contracts build 完成後重跑 core build 通過。 |
| `pnpm --filter @forgeweave/core test` | Pass | Phase 3A write safety guard tests 通過。 |
| `pnpm --filter @forgeweave/core build` | Pass | workdir manager / write-safety exports build 通過。 |
| `pnpm --filter @forgeweave/contracts test` | Pass | Phase 2 workflow/artifact/event/review artifact schema validation tests 通過。 |
| `pnpm --filter @forgeweave/core test` | Pass | Phase 2 state machine tests 通過。 |
| `pnpm --filter @forgeweave/contracts build` | Pass | contracts 新 export build 通過。 |
| `pnpm --filter @forgeweave/core build` | Pass | core state/runtime contract export build 通過。 |
| `pnpm --filter @forgeweave/core test` | Pass | local workflow store persistence test 通過。 |
| `pnpm --filter @forgeweave/core build` | Pass | local store export build 通過。 |
| `pnpm --filter @forgeweave/core test` | Pass | `generic.review` ACC/minimal fixture runner tests 與 read-only guard test 通過。 |
| `pnpm --filter @forgeweave/core build` | Pass | mock runtime、runner、workflow exports build 通過。 |
| `pnpm --filter @forgeweave/core test` | Pass | review decision approve/reject/reject reason tests 通過。 |
| `pnpm --filter @forgeweave/cli test` | Pass | CLI run/status/artifacts/review gate fixture tests 通過。 |
| `pnpm --filter @forgeweave/core build` | Pass | review decision export build 通過。 |
| `pnpm --filter @forgeweave/cli build` | Pass | async CLI entrypoint build 通過。 |
| `pnpm test:smoke` | Pass | CLI help/version/init smoke checks 通過，help 已列出 Phase 2 commands。 |
| `pnpm build` | Pass | contracts、core、CLI workspace build 通過。 |
| `pnpm build` | Pass | Phase 2 final gate workspace build 通過。 |
| `pnpm test` | Pass | 11 test files / 32 tests 通過。 |
| `pnpm test:contract` | Pass | 3 contract test files / 8 tests 通過。 |
| `pnpm test:cli` | Pass | 1 CLI test file / 7 tests 通過。 |
| `pnpm test:smoke` | Pass | CLI help/version/init smoke checks 通過。 |
| lint | N/A | root `package.json` 尚未定義 lint script。 |
| `pnpm --filter @forgeweave/contracts test` | Pass | Phase 1 schema validation tests 通過。 |
| `pnpm --filter @forgeweave/contracts build` | Pass | Phase 1 contracts type export build 通過。 |
| `pnpm install` | Pass | 建立 `@forgeweave/core` → `@forgeweave/contracts` workspace dependency link。 |
| `pnpm --filter @forgeweave/core test` | Pass | ACC / minimal-project onboarding core fixture tests 通過。 |
| `pnpm --filter @forgeweave/core build` | Pass | core onboarding API TypeScript build 通過。 |
| `pnpm build` | Pass | contracts、core、CLI workspace build 通過。 |
| `pnpm test` | Pass | 6 個 test files / 17 tests 通過。 |
| `pnpm test:contract` | Pass | Phase 0 + Phase 1 contract schema tests 通過。 |
| `pnpm test:cli` | Pass | CLI help/version/init unit tests 通過。 |
| `pnpm test:smoke` | Pass | CLI help/version 與 ACC/minimal `forgeweave init --dry-run` smoke checks 通過。 |
| `pnpm --filter @forgeweave/cli smoke` | Pass | fixture init summary 可產出；dry-run 未建立 `.forgeweave` artifacts。 |
| live-readonly `forgeweave init --dry-run` | Pass | 使用 `.env.local` 指定 ACC root；summary 可產出，外部 `.forgeweave` artifacts 未建立。 |
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
| `pnpm build` | Pass | workspace build 通過。 |
| `pnpm test` | Pass | 包含 runtime fixture layout test。 |
| `pnpm test:smoke` | Pass | CLI help/version smoke check 通過。 |
| `pnpm build` | Pass | docs-only task，確認 workspace build 未受影響。 |
| `pnpm test` | Pass | docs-only task，確認 test harness 未受影響。 |
| `pnpm build` | Pass | workspace build 通過。 |
| `pnpm test` | Pass | 包含 reference fixture shell smoke test。 |
| `pnpm test:contract` | Pass | contracts schema placeholder test 通過。 |
| `pnpm test:cli` | Pass | CLI help/version unit test 通過。 |
| `pnpm test:smoke` | Pass | CLI help/version smoke check 通過。 |

## Acceptance Criteria Status

- [x] FW-P2-001 acceptance criteria
- [x] FW-P2-002 acceptance criteria
- [x] FW-P2-003 acceptance criteria
- [x] FW-P2-004 acceptance criteria
- [x] FW-P2-005 acceptance criteria
- [x] FW-P2-006 acceptance criteria
- [x] FW-P2-007 acceptance criteria
- [x] FW-P2-008 acceptance criteria
- [x] FW-P2-009 acceptance criteria
- [x] FW-P2-010 acceptance criteria
- [x] FW-P2-011 acceptance criteria
- [x] FW-P2-012 acceptance criteria
- [x] FW-P2-013 acceptance criteria
- [x] FW-P2-014 acceptance criteria
- [x] FW-P2-015 acceptance criteria
- [x] FW-P3A-001 acceptance criteria
- [x] FW-P3A-002 acceptance criteria
- [x] FW-P3A-003 acceptance criteria
- [x] FW-P3A-004 acceptance criteria
- [x] FW-P3A-005 acceptance criteria
- [x] FW-P3A-006 acceptance criteria
- [x] FW-P3A-007 acceptance criteria
- [x] FW-P3A-008 acceptance criteria
- [x] FW-P3A-009 acceptance criteria
- [x] FW-P3A-010 acceptance criteria
- [x] FW-P3A-011 acceptance criteria
- [x] FW-P3A-012 acceptance criteria
- [x] FW-P3B-001 acceptance criteria
- [x] FW-P3B-002 acceptance criteria
- [x] FW-P3B-003 acceptance criteria
- [x] FW-P3B-004 acceptance criteria
- [x] FW-P3B-005 acceptance criteria
- [x] FW-P3B-006 acceptance criteria
- [x] FW-P3B-007 acceptance criteria
- [x] FW-P1-001 acceptance criteria
- [x] FW-P1-002 acceptance criteria
- [x] FW-P1-003 acceptance criteria
- [x] FW-P1-004 acceptance criteria
- [x] FW-P1-005 acceptance criteria
- [x] FW-P1-006 acceptance criteria
- [x] FW-P1-007 acceptance criteria
- [x] FW-P1-008 acceptance criteria
- [x] FW-P1-009 acceptance criteria
- [x] FW-P1-010 acceptance criteria
- [x] FW-P1-011 acceptance criteria
- [x] FW-P1-012 acceptance criteria
- [x] FW-P1-013 acceptance criteria
- [x] FW-P1-014 acceptance criteria
- [x] FW-P1-LIVE-001 acceptance criteria
- [x] FW-P0-001 acceptance criteria
- [x] FW-P0-002 acceptance criteria
- [x] FW-P0-003 acceptance criteria
- [x] FW-P0-004 acceptance criteria
- [x] FW-P0-005 acceptance criteria
- [x] FW-P0-006 acceptance criteria
- [x] FW-P0-007 acceptance criteria
- [x] FW-P0-008 acceptance criteria

## Blocking Items

- 無

## Parking Lot

- 無

## Next Task

- Phase 3 completed；停止，不自動進入 Phase 4

## Commit Message

```text
phase-2: complete review-first gate
phase-3: FW-P3A-001-003 add write safety guards
phase-3: FW-P3A-004-009 add bug-fix patch workflow
phase-3: FW-P3A-010-012 add bug-fix CLI recovery
phase-3: FW-P3B-001-002 add feature scope contracts
phase-3: FW-P3B-003-007 add new-feature workflow
phase-2: FW-P2-cli add review commands
phase-2: FW-P2-runner add generic review workflow
phase-2: FW-P2-005 add local workflow store
phase-2: FW-P2-contracts add review workflow contracts
phase-0: FW-P0-001 initialize monorepo baseline
phase-0: FW-P0-002 add typescript tooling baseline
phase-0: FW-P0-003 add contracts package skeleton
phase-0: FW-P0-004 add cli skeleton
phase-0: FW-P0-005 add test harness
phase-0: FW-P0-006 add runtime fixture layout
phase-0: FW-P0-007 add task status flow docs
phase-0: FW-P0-008 add reference fixture shells
phase-1: FW-P1-contracts add onboarding schemas
phase-1: FW-P1-core add onboarding pipeline
phase-1: FW-P1-cli add init fixture smoke
```
