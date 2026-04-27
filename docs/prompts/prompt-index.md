# Prompt Index

本資料夾包含 Phase 0～4 的階段性自動執行 prompt。

## 建議執行順序

```text
run-phase-0-autonomous.md
→ run-phase-1-autonomous.md
→ run-phase-2-autonomous.md
→ run-phase-3-autonomous.md
→ run-phase-4-autonomous.md
```

## Codex app 啟動語句範例

Phase 0：

```text
請讀取並執行 docs/prompts/run-phase-0-autonomous.md。
Phase 0 完成後停止，不要進入 Phase 1。
```

Phase 1：

```text
請讀取並執行 docs/prompts/run-phase-1-autonomous.md。
請先確認 Phase 0 Gate 已通過。Phase 1 完成後停止，不要進入 Phase 2。
```

Phase 2：

```text
請讀取並執行 docs/prompts/run-phase-2-autonomous.md。
請先確認 Phase 1 Implementation Gate 已通過。Phase 2 完成後停止，不要進入 Phase 3。
```

Phase 3：

```text
請讀取並執行 docs/prompts/run-phase-3-autonomous.md。
請先確認 Phase 2 Gate 已通過。Phase 3 完成後停止，不要進入 Phase 4。
```

Phase 4：

```text
請讀取並執行 docs/prompts/run-phase-4-autonomous.md。
請先確認 Phase 3 Gate 已通過。若沒有 FORGEWEAVE_ACC_ROOT，可完成 fixture implementation gate，但 ACC live migration gate 必須標記 blocked-external。
```

## 注意

- 每個 prompt 都要求 Codex 自動 commit。
- 如果 Codex sandbox 阻擋 git commit，runner 必須停止並回報。
- 不要讓任何 runner 自動進入下一個 Phase。
- 真實 ACC repo path 請用 `.env.local` 或 Codex environment variables，不要寫入文件。
