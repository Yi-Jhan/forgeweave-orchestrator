# 反覆工作流程

每個 Phase runner 使用同一套循環：

```text
Inspect current state
→ Select next task
→ Plan one task
→ Implement one task
→ Run checks
→ Self-review
→ Update records
→ Commit
→ Check phase gate
→ Repeat or stop
```

## Codex 應更新的紀錄

每個 task 完成後，至少更新：

- `docs/worklogs/worklog-current.md` 或當日 worklog
- `docs/tasks/active-task.md`
- `docs/tasks/task-list.md`
- `docs/tasks/phase-gates.md`
- `docs/planning/parking-lot.md`，若有延後事項

## 不可做的事

- 不可跳過前置 Phase。
- 不可將多個 Phase 的工作塞進同一個 commit。
- 不可在 Phase 2 前做 workspace-write。
- 不可在沒有 review gate 的情況下自動 merge。
- 不可改寫 git history。
- 不可複製真實 ACC 原始碼到 fixture。
