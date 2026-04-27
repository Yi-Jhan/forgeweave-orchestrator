# ForgeWeave Orchestrator 簡化規格

## 1. 系統定位

ForgeWeave Orchestrator 是 runtime-agnostic 多 Agent 調度工具。第一階段以 CLI 為正式入口，先完成 project onboarding、review-first workflow、patch-first delivery、workspace hardening，再進入 ACC 單頁 legacy migration 驗證。

## 2. ACC repo 位置設定

真實 ACC repo 是外部驗證目標，不得放入本 repo。位置由環境變數提供：

```bash
FORGEWEAVE_ACC_ROOT=/path/to/acc
FORGEWEAVE_VALIDATION_MODE=fixture|live-readonly|live-patch
FORGEWEAVE_ALLOW_EXTERNAL_PATCH=false|true
```

解析優先順序：

1. CLI 參數：`--project-root /path/to/acc`
2. 環境變數：`FORGEWEAVE_ACC_ROOT`
3. `.env.local`
4. fixture fallback：`examples/acc`

## 3. Validation Modes

### fixture

預設模式，用於開發、CI、早期 Phase implementation gate。

來源：

- `examples/acc`
- `examples/minimal-project`
- `docs/projects/acc/project-profile.md`

不需要真實 ACC source code。

### live-readonly

用於真實 ACC onboarding / review 驗證。

規則：

- 可讀外部 ACC repo。
- 不可寫入外部 ACC repo。
- 不可 commit live scan output 或私有路徑。

### live-patch

用於 Phase 4 ACC 單頁 migration patch 驗證。

規則：

- 必須使用隔離 branch 或 worktree。
- 必須有 dirty-state guard。
- 必須產生 patch / diff artifact。
- 必須 human review gate。
- 不得 auto merge。

## 4. 核心需求

| ID | 名稱 | Phase | 摘要 |
| --- | --- | --- | --- |
| FR-001 | CLI bootstrap | P0 | repo 可 build/test，CLI skeleton 可跑 |
| FR-002 | Project init | P1 | `forgeweave init` 產生 manifest / onboarding report / context packet |
| FR-003 | Provider preflight | P1 | 產出 provider-preflight-report 與 capability matrix v0 |
| FR-004 | Asset discovery | P1 | 掃描 provider assets 並產出 gap report |
| FR-005 | Review workflow | P2 | `generic.review` read-only workflow 可跑 |
| FR-006 | Manual review gate | P2 | 支援 approve/reject/reject reason |
| FR-007 | Patch-first bug-fix | P3A | 受控產生 patch / diff / command-summary |
| FR-008 | Small new-feature | P3B | 小型 feature/enhancement 可交付並 review |
| FR-009 | Runtime hardening | P4A | provider registry / selector / capability matrix v1 |
| FR-010 | Resume / observability | P4B | checkpoint / resume / event replay |
| FR-011 | Workspace understanding | P4C | workspace scanner / context-slice / task-packet |
| FR-012 | ACC single-page migration | P4C | legacy page → modern Angular page patch mode gate |

## 5. External Reference Project Safety

- Core 不得寫死 ACC 路徑。
- Core 不得直接依賴 Angular / ACC 專案結構。
- ACC 專屬規則放在 project profile、adapter、assets 或 ACC extension。
- 真實 ACC code 不得 commit。
- 若沒有 `FORGEWEAVE_ACC_ROOT`，live validation task 標為 `Blocked External`。

## 6. Phase 4 ACC 單頁 migration 邊界

Phase 4 的 ACC migration 只承諾：

- 單一 legacy page。
- 明確指定 route/controller/template 或 migration brief。
- 明確指定 modern Angular target feature。
- patch mode。
- validation command summary。
- review gate。
- resume / reject rerun。

不承諾：

- 多頁 module migration。
- 大型 API contract 重構。
- 未指定的 design system 全面調整。
- 不經 review 的自動 merge。
