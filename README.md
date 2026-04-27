# ForgeWeave Orchestrator 初始工作包

這是一包乾淨、最小化的 ForgeWeave Orchestrator 初始資料夾結構。它的目的不是預先實作工具，而是提供：

1. 可讓 Codex 反覆執行 Phase 0～4 的工作流程文件。
2. ACC repo 外部位置設定規則。
3. Phase Gate、Task List、Spec、Blueprint 的最小可執行版本。
4. Sanitized ACC fixture 與 minimal project fixture。

## 重要原則

ForgeWeave Orchestrator 是工具本體。ACC 是外部參考專案與驗證目標，不是這個 repo 的內建原始碼。

真實 ACC repo 位置由每個工作環境自行設定：

```bash
cp .env.example .env.local
# 編輯 .env.local
FORGEWEAVE_ACC_ROOT=/path/to/your/acc
```

不得將真實 ACC 原始碼、本機路徑、token 或私有服務資訊 commit 進本 repo。

## 最小目錄

```text
config/                 # 外部 reference project 設定範例
docs/planning/          # 執行章程、目前焦點、循環規則
docs/tasks/             # Phase Gate、任務清單、active task
docs/prompts/           # Phase 0～4 自動執行 prompts
docs/specs/             # 簡化規格
docs/roadmap/           # 簡化藍圖
docs/projects/acc/      # ACC project profile，無真實原始碼
examples/acc/           # Sanitized ACC fixture
examples/minimal-project/# 第二專案 fixture
```

Phase 0 會由 Codex 建立實際工程骨架，例如 root `package.json`、workspace config、`apps/cli`、`packages/contracts`、測試框架等。這些不預先放入初始包，避免結構一開始就過度膨脹。

## 使用方式

1. 解壓縮到新 repo root。
2. 建立 `.env.local`，視需要填入 `FORGEWEAVE_ACC_ROOT`。
3. 在 Codex app 建立新 task。
4. 先貼：

```text
請讀取並執行 docs/prompts/run-phase-0-autonomous.md。
Phase 0 完成後停止，不要進入 Phase 1。
```

5. Phase 0 完成且 git status clean 後，再依序執行：

```text
docs/prompts/run-phase-1-autonomous.md
docs/prompts/run-phase-2-autonomous.md
docs/prompts/run-phase-3-autonomous.md
docs/prompts/run-phase-4-autonomous.md
```

每個 Phase runner 都會要求 Codex：自動選下一個 task、實作、跑 checks、自我審查、更新 worklog、更新 task status、commit，直到該 Phase gate 完成或遇到 blocker。

## ACC 驗證模式

| 模式 | 是否需要真實 ACC repo | 是否允許寫入 ACC | 用途 |
| --- | --- | --- | --- |
| `fixture` | 否 | 否 | 使用 `examples/acc` 開發與 CI |
| `live-readonly` | 是 | 否 | 對真實 ACC 做 onboarding / review 驗證 |
| `live-patch` | 是 | 是，必須隔離 branch/worktree | Phase 4 單頁 legacy migration patch 驗證 |

若沒有設定 `FORGEWEAVE_ACC_ROOT`，Phase 1 的 fixture implementation gate 仍可完成；live ACC validation 只會標記為 `blocked-external`，不視為實作失敗。
