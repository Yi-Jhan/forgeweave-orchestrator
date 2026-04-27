# Autonomous Phase 4 Runner — Runtime / State / Workspace Hardening + ACC Migration Gate


# 使用方式

請在 Codex app 或 Codex CLI 中要求：

```text
請讀取並執行 docs/prompts/run-phase-4-autonomous.md。
```

本 prompt 是受控自動執行流程。Codex 必須依文件與 task list 逐步執行，不得自由發揮。


## 0. 本次任務

只允許完成：

```text
Phase 4 — Runtime / State / Workspace Hardening + ACC Migration Gate
```

Phase 4 完成後停止，不要自動進入下一個 Phase。

## 1. Source of Truth

請先閱讀：

1. `docs/planning/execution-charter.md`
2. `docs/planning/current-focus.md`
3. `docs/planning/workflow-cycle.md`
4. `docs/tasks/task-list.md`
5. `docs/tasks/active-task.md`
6. `docs/tasks/phase-gates.md`
7. `docs/specs/spec.md`
8. `docs/roadmap/blueprint.md`
9. `docs/projects/acc/project-profile.md`
10. `.env.example`
11. `config/reference-projects.example.yml`

若文件不存在，請記錄在 worklog；只有在缺失會造成 Phase 4 scope 無法判定時才停止。

如需查詢完整架構背景，可閱讀 `docs/reference/original-blueprint.md`，但該文件只作參考，不得覆蓋本 Phase 的 scope、non-goals、task list 與 phase gate。


## Phase 4 Preflight

開始 Phase 4 前必須驗證 Phase 3 Gate 已完成。

Phase 4 同時包含 implementation gate 與 ACC live migration gate：

- 沒有 `FORGEWEAVE_ACC_ROOT`：可完成 fixture implementation gate；ACC live migration gate 標記為 `Blocked External`。
- 有 `FORGEWEAVE_ACC_ROOT` 且 `FORGEWEAVE_VALIDATION_MODE=live-patch`：可嘗試 ACC live migration gate。
- live-patch 必須有 isolated branch/worktree、dirty-state guard、review gate，不得 auto merge。

若 `FORGEWEAVE_ACC_ROOT` 未設定，不要停止 Phase 4 implementation；但最終必須清楚標註「ACC live migration validation 尚未通過」。


## 2. 合法範圍


- runtime registry v1。
- capability-first provider selector。
- CopilotSdkRuntimeProvider reference hardening。
- provider capability matrix v1。
- degraded-mode workflow decisions。
- provider conformance tests。
- workflow state machine v1。
- checkpoint artifact model。
- resume from failed/blocked step。
- execution message schema。
- hook taxonomy and ordering。
- event replay baseline。
- resume / reject-rerun E2E。
- generic workspace scanner baseline。
- import/dependency graph baseline。
- context-slice schema/builder。
- task-packet schema/builder。
- Angular route map extractor baseline。
- component/template/style/service relation extractor。
- related test discovery baseline。
- ACC legacy mapping extractor baseline。
- ACC migration rules / checklist assets。
- legacy-modern-mapping / migration-checklist-result schema。
- migration-analysis schema。
- `acc.single-page-legacy-migration` workflow。
- legacy page locator / modern target locator。
- migration task-packet。
- migration patch generation / validation / review gate。
- ACC migration fixture dry-run E2E。
- optional ACC live-patch migration gate。


## 3. 硬性 Non-goals


- 不做多頁 module migration。
- 不做大型 API contract 重構。
- 不做未指定 design system 全面調整。
- 不做 auto merge。
- 不宣稱 fixture 等於 ACC live validation。
- 不實作 TUI / WebUI。
- 不把真實 ACC source 或 live scan outputs commit 進 ForgeWeave repo。


## 4. 自動循環

重複以下循環，直到 Phase 4 Gate 完成或遇到 blocker。

### A. Inspect Current State

1. 執行 `git status --short`。
2. 執行 `git branch --show-current`。
3. 確認 working tree 是否乾淨。
4. 讀取 `docs/tasks/task-list.md` 與 `docs/tasks/phase-gates.md`。
5. 找出 Phase 4 下一個 `Todo`、未 blocked、依賴已滿足的 task。

若 working tree 有非本次任務造成的未提交變更，停止並回報，不要覆蓋使用者變更。

### B. Plan One Task

針對選出的 task，建立 Task Execution Plan，寫入 worklog，內容包含：

- Task ID / title
- 目標
- Acceptance criteria
- 預期修改檔案
- 預期新增檔案
- Non-goals
- Checks / tests
- 風險與避免方式

除非 scope 不明確，否則不需要等待使用者確認。

### C. Implement One Task

只實作這一個 task 或一個極小 task cluster。

規則：

1. 使用最小可行變更。
2. 不做未來 Phase 功能。
3. 不做 unrelated cleanup。
4. 新增 contract/schema 時補基本 validation test。
5. 新增 CLI command 時補 help/smoke check。
6. 文件、contracts、implementation 必須一致。
7. 產出的文件與 worklog 儘量使用繁體中文。

### D. Run Checks

偵測可用 package manager 與 scripts，再執行可用 checks：

- install check，如適用
- build
- test
- lint
- CLI smoke checks
- task-specific fixture checks

若 check 不存在，標記 N/A 並說明。若 failure 是本次造成，修復後重跑。若無法判定，停止並回報 blocker。

### E. Self-review

檢查：

- 是否符合 acceptance criteria？
- 是否超出 Phase 4？
- 是否引入未來 Phase 功能？
- 是否修改 unrelated files？
- 是否漏測？
- 是否需要更新 worklog / active-task / task-list / phase-gates / parking-lot？
- 是否有真實 ACC source、本機 path、token 被不小心寫入？

Blocking item 必須修完才能 commit。

### F. Update Records

更新：

1. `docs/worklogs/worklog-current.md` 或當日 worklog
2. `docs/tasks/active-task.md`
3. `docs/tasks/task-list.md`
4. `docs/tasks/phase-gates.md`
5. `docs/planning/current-focus.md`，如 Phase 狀態改變
6. `docs/planning/parking-lot.md`，如有延後事項

若 `.xlsx` 不存在，不要建立；Markdown 是 source of truth。

### G. Commit

每完成一個 task 或小 task cluster 就 commit 一次。

Commit 前執行：

```bash
git diff --check
git status --short
git diff --stat
```

只 stage 相關檔案。不要 amend、不要 force push、不要 reset hard。

Commit message 格式：

```text
phase-4: <task-id> <short description>
```

### H. Check Phase Gate

檢查 Phase 4 gate：


Implementation Gate：

- runtime/provider/state/resume/observability hardening 完成。
- workspace scanner / context-slice / task-packet 完成。
- Angular / ACC extractor fixture 完成。
- `acc.single-page-legacy-migration` dry-run fixture 完成。
- migration artifacts 可產出並可 review。

ACC Live Migration Gate：

- 若 `FORGEWEAVE_ACC_ROOT` 未設定，標記 `Blocked External`，不得宣稱 live-validated。
- 若已設定，必須在 isolated branch/worktree 以 patch mode 完成一個 bounded single-page legacy page → modern Angular page migration。
- 必須產出 migration-analysis、legacy-modern-mapping、implementation-plan、context-slice/task-packet、file-change-set、command-summary、review-findings、migration-checklist-result、delivery-summary。
- 必須 review gate，且可 resume / reject rerun。


若未完成，回到 A。若完成，做 final cleanup。

## 5. Stop Conditions

遇到以下情況必須停止：

1. Phase 4 scope 不明確。
2. task list 與 spec / blueprint 明顯衝突。
3. working tree 有使用者既有未提交變更。
4. 完成本 Phase 需要進入下一 Phase。
5. build/test/lint fail 且無法判定是否由本 task 造成。
6. git commit 被 sandbox 或權限阻擋。
7. 需要外部 token、私有服務或不可用 credentials。
8. 需要危險操作，例如 `rm -rf`、`git reset --hard`、`git clean -fdx`、force push、改寫 git history。
9. 連續兩次修同一 failure 仍失敗。
10. 發現真實 ACC source 或本機 path 可能被 commit。

## 6. Final Output

完成或阻擋時輸出：

- Phase 4 status：implementation completed / live validation blocked / completed / blocked
- completed tasks
- commit list
- changed files summary
- checks / tests summary
- Phase 4 gate checklist
- remaining risks
- parking lot
- next recommended phase
- current git status
