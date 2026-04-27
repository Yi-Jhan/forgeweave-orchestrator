# Phase Gates

## Gate 語意

每個 Phase 可分成兩種完成狀態：

1. **Implementation Gate**：使用 unit tests、fixtures、sanitized examples 通過。
2. **Live Reference Validation Gate**：使用外部真實專案，例如 ACC，完成 read-only 或 patch-mode 驗證。

除非特別標明，Phase 0～1 不需要真實 ACC repo 即可通過 implementation gate。

## Phase 0 — Foundation / Repo Scaffold

通過條件：

- [x] root `package.json` 存在。
- [x] workspace config 存在，例如 `pnpm-workspace.yaml` 或等價配置。
- [x] CLI skeleton 可執行 help/version 或等價 smoke check。
- [x] contracts package skeleton 存在。
- [x] core package skeleton 或 Phase 0 指定的最小核心骨架存在。
- [x] build / test baseline 可執行。
- [x] worklog 與 task status 已更新。
- [x] fixture shell 不依賴真實 ACC source。

## Phase 1 — Project Onboarding MVP

### Implementation Gate

- [x] `forgeweave init` 可對 `examples/acc` 執行。
- [x] `forgeweave init` 可對 `examples/minimal-project` 執行。
- [x] project manifest schema 可驗證 fixture manifests。
- [x] manifest loader / normalizer 可用。
- [x] GenericProjectAdapter / project detector 可產出 project signals。
- [x] provider asset discovery / gap analysis 可用。
- [x] provider preflight report 可產出。
- [x] provider capability matrix v0 可產出。
- [x] simple context packet 可產出。
- [x] onboarding report 可產出。

### Optional Live ACC Validation Gate

需要 `FORGEWEAVE_ACC_ROOT`。

若未設定，標記為 `blocked-external`，不阻擋 Phase 1 implementation gate。

- [x] 真實 ACC repo 可被偵測。（透過 `.env.local`，未記錄本機路徑）
- [x] live-readonly onboarding dry-run 完成。
- [x] asset gap report 可產出且已 sanitized。
- [x] 不複製真實 ACC source 進 ForgeWeave repo。

## Phase 2 — Review-first MVP

- [x] `generic.review` workflow 可在 ACC fixture 跑完。
- [x] `generic.review` workflow 可在第二專案 fixture 跑完。
- [x] review workflow 不允許寫檔。
- [x] review-findings 與 delivery-summary artifact 符合 schema。
- [x] manual review gate 可 approve / reject / reject with reason。
- [x] run / step / artifact / event / review decision 可保存。

## Phase 3 — Feature Delivery MVP

Phase 3 分成 3A 與 3B。

### Phase 3A — Controlled Bug-fix / Patch-first

- [x] workdir manager、branch guard、dirty-state guard 可用。
- [x] file allowlist / denylist 可阻擋越界寫入。
- [x] command runner 與 command allowlist 可用。
- [x] `generic.bug-fix` 可產生 patch / diff / file-change-set。
- [x] validation command 產生 command-summary。
- [ ] reject reason 可重跑 implementation 或 validation step。

### Phase 3B — Small New-feature / Enhancement

- [ ] `generic.new-feature` 或 enhancement workflow 可完成小型功能。
- [ ] small-scope guard 可阻擋過大的 feature request。
- [ ] 可產出 requirement-brief、feature-spec、implementation-plan。
- [ ] 新增或修改檔案必須在 allowlist 內。
- [ ] ACC fixture 與第二專案 fixture 至少各有一個 E2E 驗證。

## Phase 4 — Runtime / State / Workspace Hardening + ACC Migration Gate

### Implementation Gate

- [ ] runtime registry v1 與 provider selector 可用。
- [ ] provider capability matrix v1 可產出。
- [ ] checkpoint / resume 可用。
- [ ] execution message schema 與 event replay baseline 可用。
- [ ] generic workspace scanner baseline 可用。
- [ ] context-slice 與 task-packet 可用。
- [ ] Angular route map / relation / related test discovery baseline 可用。
- [ ] ACC legacy mapping extractor fixture 可用。
- [ ] `acc.single-page-legacy-migration` dry-run fixture 可產出 analysis / plan / diff preview。

### ACC Live Migration Gate

需要真實 ACC repo，且必須使用隔離 branch/worktree。

若沒有 `FORGEWEAVE_ACC_ROOT`，此 gate 標記為 `blocked-external`，不得宣稱 ACC migration live-validated。

- [ ] `FORGEWEAVE_ACC_ROOT` 指向可讀取的真實 ACC checkout。
- [ ] `FORGEWEAVE_VALIDATION_MODE=live-patch`。
- [ ] `FORGEWEAVE_ALLOW_EXTERNAL_PATCH=true`。
- [ ] 單頁 legacy page → modern Angular page migration 以 patch mode 執行。
- [ ] 產出 migration-analysis。
- [ ] 產出 legacy-modern-mapping。
- [ ] 產出 implementation-plan。
- [ ] 產出 context-slice / task-packet。
- [ ] 產出 file-change-set / generated-files-manifest。
- [ ] 產出 command-summary。
- [ ] 產出 review-findings / migration-checklist-result。
- [ ] 產出 delivery-summary。
- [ ] 不自動 merge。
- [ ] review gate 必須 approve 後才視為交付完成。
- [ ] reject reason 可重跑。
- [ ] 中斷後可 resume。
