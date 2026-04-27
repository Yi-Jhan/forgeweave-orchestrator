# ForgeWeave Orchestrator 執行章程

## 目前定位

ForgeWeave Orchestrator 是工具本體 repo。ACC 是第一參考專案與外部驗證目標，不是本 repo 的內建原始碼。

## 優先順序

若文件之間發生衝突，依照以下順序判斷：

```text
執行章程
> 當前 Phase Gate
> Active Task
> Task Acceptance Criteria
> Spec
> Blueprint
> Project Profile
```

## Reference Project Access Policy

真實 ACC repo 位置不得寫死在 committed 文件中。每個工作環境應透過以下方式提供：

```bash
FORGEWEAVE_ACC_ROOT=/path/to/acc
```

支援三種驗證模式：

| 模式 | 說明 | 需要真實 ACC repo | 允許寫入 |
| --- | --- | --- | --- |
| `fixture` | 使用 `examples/acc` 與 `examples/minimal-project` | 否 | 否 |
| `live-readonly` | 讀取真實 ACC checkout 做 onboarding / review 驗證 | 是 | 否 |
| `live-patch` | 在真實 ACC 隔離 branch/worktree 產生 patch | 是 | 是，但必須 review gate |

規則：

- 不得將真實 ACC 原始碼 commit 進 ForgeWeave repo。
- 不得將 live scan output、private path、token、私有 URL commit 進 ForgeWeave repo。
- Phase 0 不依賴 ACC。
- Phase 1 implementation gate 可以只用 fixture 通過。
- Phase 1 live ACC validation 若沒有 `FORGEWEAVE_ACC_ROOT`，標記為 `blocked-external`，不是 implementation failure。
- Phase 4 的 ACC 單頁 migration 不可在 fixture mode 宣稱 live-validated。

## 自動執行規則

每個 Phase runner 必須遵守：

1. 一次只處理一個 task 或一個極小 task cluster。
2. 先 plan，再改檔。
3. 每次修改後執行可用 checks。
4. 自我審查是否超出 Phase 範圍。
5. 更新 worklog、active task、task list、phase gate。
6. 每完成一個 task 或小 cluster 就 commit。
7. 遇到 blocker 立即停止，不硬做。
8. Phase 完成後停止，不自動進下一個 Phase。

## 文件語言

所有規劃文件、worklog、status update、review summary 原則上使用繁體中文。程式碼中的型別、CLI 參數、檔名與 schema key 可維持英文。
