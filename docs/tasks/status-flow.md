# Task Status Flow

本文件定義 Phase runner 更新 task / worklog / phase gate 的最小串接方式。

## 更新順序

每完成一個 task 或極小 task cluster，依序更新：

1. `docs/worklogs/worklog-current.md`
2. `docs/tasks/active-task.md`
3. `docs/tasks/task-list.md`
4. `docs/tasks/phase-gates.md`
5. `docs/planning/current-focus.md`，僅在 Phase 狀態改變時更新
6. `docs/planning/parking-lot.md`，僅在有延後事項時更新

## 狀態規則

- `Todo`：尚未開始。
- `Planned`：已寫入 Task Execution Plan，但尚未修改實作。
- `In Progress`：正在修改檔案或執行 checks。
- `Implemented`：實作完成且 checks 通過，但尚未 commit。
- `Committed`：task 相關變更已 commit。
- `Blocked`：repo 內原因阻擋，需人工決策或修復。
- `Blocked External`：外部 repo、token、私有服務或環境變數缺失阻擋。
- `Done`：Phase 或跨 task milestone 已完成並通過 gate。

## Worklog 最小內容

每個 task 的 worklog 至少記錄：

- Task Execution Plan
- 完成項目
- 變更檔案摘要
- checks / tests 結果
- acceptance criteria 狀態
- blocking items
- parking lot
- commit message

## Phase Gate

Phase gate 只在對應條件已有可驗證證據時勾選。若條件需要未來 task 才能完成，保留未勾選。

