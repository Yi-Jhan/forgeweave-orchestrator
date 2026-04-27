# ForgeWeave Orchestrator 簡化藍圖

## 目標

建立一套 CLI-first、runtime-agnostic、可追蹤、可 review、可恢復的多 Agent 調度工具。ACC 是第一個 reference project，用來驗證真實前端 workflow 與單頁 legacy migration。

## Roadmap

```text
Stage 1：CLI Functional Delivery
  Phase 0：Foundation / Repo Scaffold
  Phase 1：Project Onboarding MVP
  Phase 2：Review-first MVP
  Phase 3：Feature Delivery MVP
  Phase 4：Runtime / State / Workspace Hardening + ACC Migration Gate

Stage 2：TUI / WebUI Experience
  本初始包不展開 Stage 2，避免過早複雜化。
```

## Phase 原則

### Phase 0

建立 repo / contracts / CLI / test baseline，不依賴 ACC。

### Phase 1

建立 onboarding 能力。預設用 fixture；若有 `FORGEWEAVE_ACC_ROOT`，可做 optional live-readonly validation。

### Phase 2

Review-first，read-only，不自動改檔。

### Phase 3

先 bug-fix / patch-first，再 small new-feature。workspace-write 前必須有 safety guard。

### Phase 4

補 runtime/state/workspace hardening，並驗證 bounded single-page legacy page → modern Angular page migration。沒有真實 ACC repo 時，只能完成 fixture implementation gate，不可宣稱 ACC live migration passed。

## Core / ACC 分工

```text
ForgeWeave Core：workflow、state、artifact、runtime contract、policy、storage。
Generic Layer：manifest、adapter recommendation、provider asset profile、context packet。
ACC Extension：legacy mapping、migration rules、Angular route/relation extraction、ACC checklist。
```
