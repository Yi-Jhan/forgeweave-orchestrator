# 目前焦點

## Active Phase

Phase 3 — Feature Delivery MVP（Phase 3B in progress）

## Active Validation Mode

fixture

## ACC Live Configuration

| 設定 | 狀態 |
| --- | --- |
| `FORGEWEAVE_ACC_ROOT` | configured via `.env.local` |
| `FORGEWEAVE_SECOND_PROJECT_ROOT` | not configured |
| `FORGEWEAVE_VALIDATION_MODE` | live-readonly via `.env.local` |

真實 ACC repo path 由每個工作環境透過 `.env.local` 或 Codex environment variables 提供，不得寫入 committed 文件。

## 下一步

Phase 2 Review-first MVP 已完成。Phase 3A Controlled Bug-fix / Patch-first 已完成，目前進行 Phase 3B Small New-feature / Enhancement。

```text
FW-P3B-001：feature delivery contracts
```

Phase 3 完成後停止，不自動進入 Phase 4。
