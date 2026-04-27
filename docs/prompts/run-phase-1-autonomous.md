# Autonomous Phase 1 Runner — Project Onboarding MVP


# 使用方式

請在 Codex app 或 Codex CLI 中要求：

```text
請讀取並執行 docs/prompts/run-phase-1-autonomous.md。
```

本 prompt 是受控自動執行流程。Codex 必須依文件與 task list 逐步執行，不得自由發揮。


## 0. 本次任務

只允許完成：

```text
Phase 1 — Project Onboarding MVP
```

Phase 1 完成後停止，不要自動進入下一個 Phase。

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

若文件不存在，請記錄在 worklog；只有在缺失會造成 Phase 1 scope 無法判定時才停止。

如需查詢完整架構背景，可閱讀 `docs/reference/original-blueprint.md`，但該文件只作參考，不得覆蓋本 Phase 的 scope、non-goals、task list 與 phase gate。


## Phase 1 Preflight

開始 Phase 1 前必須驗證 Phase 0 Gate：

- root package 存在。
- workspace config 存在。
- CLI skeleton 存在。
- contracts package skeleton 存在。
- build/test baseline 存在。
- `docs/tasks/phase-gates.md` 顯示 Phase 0 passed 或所有 Phase 0 gate 條件已實際滿足。

若 Phase 0 未完成，停止並回報：請先執行 `docs/prompts/run-phase-0-autonomous.md`。

## ACC Reference Project Preflight

預設 validation mode 為 `fixture`。

若 `FORGEWEAVE_ACC_ROOT` 未設定：

- 不要停止 Phase 1。
- 使用 `examples/acc` 與 `examples/minimal-project`。
- 將 live ACC validation task 標記為 `Blocked External`。
- 不要自行 clone 或建立 ACC repo。
- 不要複製真實 ACC code。

若 `FORGEWEAVE_ACC_ROOT` 已設定：

- 只允許 live-readonly。
- 不得寫入外部 ACC repo。


## 2. 合法範圍


- project manifest schema。
- manifest loader / normalizer。
- `forgeweave init` CLI onboarding flow。
- generic project detector。
- adapter recommendation report。
- provider asset profile schema。
- provider asset resolver 與 gap report。
- simple context packet generator。
- provider-preflight-report schema。
- mock provider preflight。
- provider capability matrix v0。
- onboarding report artifact。
- ACC fixture onboarding smoke test。
- minimal-project onboarding smoke test。
- optional live-readonly ACC validation。


## 3. 硬性 Non-goals


- 不實作 `generic.review` workflow。
- 不實作 manual review gate。
- 不實作 artifact store 的完整 workflow persistence。
- 不實作 bug-fix / new-feature / patch mode。
- 不實作 migration workflow。
- 不寫入真實 ACC repo。
- 不實作 TUI / WebUI。
- 不實作完整 Copilot SDK runtime provider。


## 4. 自動循環

重複以下循環，直到 Phase 1 Gate 完成或遇到 blocker。

### A. Inspect Current State

1. 執行 `git status --short`。
2. 執行 `git branch --show-current`。
3. 確認 working tree 是否乾淨。
4. 讀取 `docs/tasks/task-list.md` 與 `docs/tasks/phase-gates.md`。
5. 找出 Phase 1 下一個 `Todo`、未 blocked、依賴已滿足的 task。

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
- 是否超出 Phase 1？
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
phase-1: <task-id> <short description>
```

### H. Check Phase Gate

檢查 Phase 1 gate：


- `forgeweave init` 可對 fixtures 執行。
- manifest schema / loader / normalizer 可用。
- adapter recommendation 可產出。
- provider asset discovery / gap analysis 可用。
- provider preflight 與 capability matrix v0 可產出。
- simple context packet 可產出。
- onboarding report 可產出。
- ACC fixture 與 minimal-project fixture smoke tests 通過。
- live ACC validation 若無 `FORGEWEAVE_ACC_ROOT`，標記 `Blocked External`。


若未完成，回到 A。若完成，做 final cleanup。

## 5. Stop Conditions

遇到以下情況必須停止：

1. Phase 1 scope 不明確。
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

- Phase 1 status：completed 或 blocked
- completed tasks
- commit list
- changed files summary
- checks / tests summary
- Phase 1 gate checklist
- remaining risks
- parking lot
- next recommended phase
- current git status
