# Task List

狀態枚舉：`Todo`、`Planned`、`In Progress`、`Blocked`、`Blocked External`、`Implemented`、`Reviewed`、`Committed`、`Done`。

## 使用規則

- 一次只處理一個 Phase / Slice / Task。
- Contract 先於實作。
- Phase 2 Review-first 不得寫檔。
- Phase 3A 以前不得 workspace-write。
- Phase 4 不可在沒有 ACC live gate 的情況下宣稱 ACC migration live-validated。
- 真實 ACC repo 不存在時，live ACC 任務標記為 `Blocked External`，不是 fixture implementation failure。

## Phase 0 — Foundation / Repo Scaffold

| ID | Slice | 任務 | 依賴 | 驗收重點 | 狀態 |
| --- | --- | --- | --- | --- | --- |
| FW-P0-001 | Repo Scaffold | 初始化 monorepo baseline | - | root package、workspace config、最小 apps/packages 結構 | Committed |
| FW-P0-002 | Tooling | 建立 TypeScript build / test baseline | FW-P0-001 | build/test 可跑，尚無 lint 可標 N/A | Committed |
| FW-P0-003 | Contracts | 建立 contracts package skeleton | FW-P0-001 | schema placeholder 與 type barrel 可匯出 | Committed |
| FW-P0-004 | CLI | 建立 CLI skeleton 與 help/version | FW-P0-001 | `forgeweave --help` 或等價 smoke check 可跑 | Committed |
| FW-P0-005 | Test Harness | 建立 unit / contract / smoke test harness | FW-P0-002, FW-P0-003 | 至少一個 smoke、schema、CLI test | Committed |
| FW-P0-006 | Storage Fixtures | 建立本機 run/artifact fixture 目錄 | FW-P0-001 | `.forgeweave` runtime layout 可被測試引用 | Committed |
| FW-P0-007 | Docs | 建立最小 docs/worklogs/task status 串接 | FW-P0-001 | worklog、active task、phase gate 可更新 | Committed |
| FW-P0-008 | Fixtures | 建立 ACC 與 minimal-project fixture shell | FW-P0-005 | 不依賴真實 ACC repo | Committed |

## Phase 1 — Project Onboarding MVP

| ID | Slice | 任務 | 依賴 | 驗收重點 | 狀態 |
| --- | --- | --- | --- | --- | --- |
| FW-P1-001 | Manifest | 定義 project manifest schema | FW-P0-003 | valid/invalid fixtures 可驗證 | Committed |
| FW-P1-002 | Manifest | 實作 manifest loader / normalizer | FW-P1-001 | 可找 manifest、套 defaults、輸出清楚錯誤 | Committed |
| FW-P1-003 | CLI Init | 實作 `forgeweave init` | FW-P0-004, FW-P1-001 | dry-run/fixture init 不覆蓋既有檔案 | Committed |
| FW-P1-004 | Detector | 實作 generic project detector | FW-P1-002 | 偵測語言、package manager、framework、source/test roots | Committed |
| FW-P1-005 | Adapter | 實作 adapter recommendation report | FW-P1-004 | 推薦 Generic/Framework/Project adapter 並說明缺口 | Committed |
| FW-P1-006 | Asset Profile | 定義 provider asset profile schema | FW-P1-001 | github_copilot / generic_agent fixtures 可驗證 | Committed |
| FW-P1-007 | Asset Resolver | 實作 provider asset resolver | FW-P1-006 | 掃描 instructions/agents/skills/workflows 與缺口 | Committed |
| FW-P1-008 | Context Packet | 建立 simple context packet generator | FW-P1-004, FW-P1-007 | 包含 signals、commands、target files、assets、risks、budget | Committed |
| FW-P1-009 | Preflight | 定義 provider-preflight-report schema | FW-P0-003 | 捕捉 capabilities、missing features、degraded modes | Committed |
| FW-P1-010 | Preflight | 實作 mock provider preflight | FW-P1-009 | deterministic pass/degraded/fail fixture | Committed |
| FW-P1-011 | Matrix | 建立 provider capability matrix v0 | FW-P1-009, FW-P1-010 | streaming/session/hooks/skills/tool-events support level | Committed |
| FW-P1-012 | Report | 產出 onboarding report artifact | FW-P1-005, FW-P1-008, FW-P1-011 | manifest、adapter、asset gaps、provider gaps、next workflows | Committed |
| FW-P1-013 | ACC Fixture | ACC fixture onboarding smoke test | FW-P1-012 | examples/acc 可產出 manifest/context/report/matrix | Committed |
| FW-P1-014 | Second Project | minimal-project onboarding smoke test | FW-P1-012 | 不依賴 ACC adapter | Committed |
| FW-P1-LIVE-001 | Live ACC | 真實 ACC live-readonly onboarding validation | FW-P1-012 | 需要 `FORGEWEAVE_ACC_ROOT`；未設定則 Blocked External | Committed |

## Phase 2 — Review-first MVP

| ID | Slice | 任務 | 依賴 | 驗收重點 | 狀態 |
| --- | --- | --- | --- | --- | --- |
| FW-P2-001 | Workflow Contract | 定義 workflow definition schema | FW-P1-001 | step kind、inputs、outputs、review policy、runtime policy | Committed |
| FW-P2-002 | Artifact Contract | 定義 base artifact / workflow artifact schema | FW-P0-003 | status、refs、payload、producedBy 可驗證 | Committed |
| FW-P2-003 | State | 實作最小 run/step state machine | FW-P2-001 | legal/illegal transitions 有測試 | Committed |
| FW-P2-004 | Event | 實作最小 event envelope | FW-P2-003 | run/step/artifact/review lifecycle events | Committed |
| FW-P2-005 | Storage | 實作 local JSON/JSONL artifact/event store | FW-P2-002, FW-P2-004 | 可保存並讀回 run/step/artifact/event/review metadata | Todo |
| FW-P2-006 | Runtime | 定義 AgentRuntimeProvider contract | FW-P1-011 | createSession、runStep、resume/close optional | Committed |
| FW-P2-007 | Mock Runtime | 實作 MockRuntimeProvider review fixtures | FW-P2-006 | deterministic review findings 與 runtime events | Todo |
| FW-P2-008 | Review Artifacts | 定義 review-findings / delivery-summary schema | FW-P2-002 | findings、severity、risks、next actions | Committed |
| FW-P2-009 | Runner | 實作 workflow runner skeleton | FW-P2-001, FW-P2-003, FW-P2-006 | system/agent/human-review steps lifecycle | Todo |
| FW-P2-010 | Workflow | 定義 `generic.review` workflow | FW-P2-008, FW-P2-009 | load project → context → review-findings → review gate | Todo |
| FW-P2-011 | Review Gate | 實作 CLI review approve/reject | FW-P2-009 | reject with reason 可保存 | Todo |
| FW-P2-012 | CLI Inspect | 實作 run/status/artifacts CLI | FW-P2-005, FW-P2-010 | 可查 run、artifact、failed step | Todo |
| FW-P2-013 | Safety | 強制 Phase 2 read-only isolation | FW-P2-009 | review workflow 不可寫檔 | Todo |
| FW-P2-014 | ACC Review | ACC fixture generic.review E2E | FW-P2-012, FW-P2-013 | artifacts + review decision | Todo |
| FW-P2-015 | Second Review | 第二專案 generic.review E2E | FW-P2-012, FW-P2-013 | 不依賴 ACC-specific logic | Todo |

## Phase 3 — Feature Delivery MVP

### Phase 3A — Controlled Bug-fix / Patch-first

| ID | Slice | 任務 | 依賴 | 驗收重點 | 狀態 |
| --- | --- | --- | --- | --- | --- |
| FW-P3A-001 | Write Safety | 實作 workdir manager | FW-P2-013 | controlled workdir/branch provenance | Todo |
| FW-P3A-002 | Write Safety | 實作 branch / dirty-state guard | FW-P3A-001 | dirty state 依 policy 阻擋或警告 | Todo |
| FW-P3A-003 | File Policy | 實作 file allowlist / denylist | FW-P3A-001 | 越界寫入被阻擋且記錄 | Todo |
| FW-P3A-004 | Command Runner | 實作 command runner skeleton | FW-P2-005 | allowed/blocked/timeout/fail captured as command-summary | Todo |
| FW-P3A-005 | Command Policy | 實作 command allowlist | FW-P3A-004 | 僅允許 manifest-approved lint/test/build | Todo |
| FW-P3A-006 | Patch Contracts | 定義 bug-brief / patch-plan / file-change-set schema | FW-P2-002 | changed files、hunks、rationale、risk | Todo |
| FW-P3A-007 | Diff | 實作 diff/patch capture | FW-P3A-001, FW-P3A-006 | unified diff 與 changed files 可 review | Todo |
| FW-P3A-008 | Workflow | 定義 `generic.bug-fix` workflow | FW-P3A-006, FW-P3A-007 | brief → plan → patch → validate → review → summary | Todo |
| FW-P3A-009 | Validation | 整合 lint/test/build command-summary | FW-P3A-004, FW-P3A-008 | stdout/stderr summary、exit code、duration | Todo |
| FW-P3A-010 | Reject Rerun | 實作 reject reason propagation | FW-P2-011, FW-P3A-008 | 不重跑整個 run 也能重跑指定 step | Todo |
| FW-P3A-011 | CLI Failure | 改善 CLI failure/recovery display | FW-P3A-010 | 顯示 failed step、reason、artifacts、resume/rerun 建議 | Todo |
| FW-P3A-012 | E2E | ACC small bug-fix patch-run E2E | FW-P3A-011 | diff、command-summary、review gate、summary | Todo |

### Phase 3B — Small New-feature / Enhancement

| ID | Slice | 任務 | 依賴 | 驗收重點 | 狀態 |
| --- | --- | --- | --- | --- | --- |
| FW-P3B-001 | Feature Contracts | 定義 requirement-brief / feature-spec / implementation-plan schema | FW-P3A-006 | small scope、assumptions、target files、acceptance criteria | Todo |
| FW-P3B-002 | Scope Control | 實作 small-scope guard | FW-P3A-003, FW-P3B-001 | 過大 / 多模組需求會被阻擋或標風險 | Todo |
| FW-P3B-003 | Workflow | 定義 `generic.new-feature` workflow | FW-P3B-001, FW-P3A-008 | requirement → spec/plan → patch → validate → review → summary | Todo |
| FW-P3B-004 | Patch Mode | 支援 controlled new file + modify file patch mode | FW-P3A-007, FW-P3B-002 | 新增/修改檔案都在 allowlist 內 | Todo |
| FW-P3B-005 | ACC Feature | ACC small new-feature CLI E2E | FW-P3B-003, FW-P3B-004 | validation + review gate | Todo |
| FW-P3B-006 | Second Project | 第二專案 bug-fix/enhancement E2E | FW-P3B-003 | 驗證 core 不綁 ACC/Angular | Todo |
| FW-P3B-007 | Regression | P2/P3 workflow regression suite | FW-P3B-005 | review / bug-fix / new-feature 均維持可跑 | Todo |

## Phase 4 — Runtime / State / Workspace Hardening + ACC Migration

| ID | Slice | 任務 | 依賴 | 驗收重點 | 狀態 |
| --- | --- | --- | --- | --- | --- |
| FW-P4A-001 | Runtime | formalize runtime registry v1 | FW-P2-006, FW-P3B-007 | provider capabilities、heartbeat、safety constraints | Todo |
| FW-P4A-002 | Runtime | 實作 capability-first provider selector | FW-P4A-001 | 依 required capabilities 與 degraded-mode 選 provider | Todo |
| FW-P4A-003 | Runtime | harden CopilotSdkRuntimeProvider reference | FW-P4A-001 | contract tests 或明確 degraded modes | Todo |
| FW-P4A-004 | Runtime | capability matrix v1 | FW-P4A-002, FW-P4A-003 | verified support、unavailable features、fallback behavior | Todo |
| FW-P4A-005 | Runtime | degraded-mode workflow decisions | FW-P4A-004 | continue / dry-run / block policy | Todo |
| FW-P4A-006 | Runtime | provider conformance test suite | FW-P4A-003 | Mock 與 Copilot provider 共用 contract tests | Todo |
| FW-P4B-001 | State | workflow state machine v1 | FW-P2-003, FW-P3A-010 | resume、blocked、cancelled、rejected、retry states | Todo |
| FW-P4B-002 | Checkpoint | checkpoint artifact model | FW-P4B-001 | major steps emit checkpoint refs | Todo |
| FW-P4B-003 | Resume | resume from failed/blocked step | FW-P4B-002 | 不重複 completed artifacts | Todo |
| FW-P4B-004 | Messages | execution message schema | FW-P2-004 | runtime events/tool outputs/usage 與 artifacts 分離 | Todo |
| FW-P4B-005 | Hooks | hook taxonomy and ordering | FW-P4B-004 | ordering 與 side-effect boundary 文件化 | Todo |
| FW-P4B-006 | Replay | event replay baseline | FW-P4B-004 | CLI 可 replay persisted events | Todo |
| FW-P4B-007 | Resume E2E | resume / reject-rerun E2E | FW-P4B-003, FW-P3A-010 | workflow interruption resume + reject rerun | Todo |
| FW-P4C-001 | Workspace | generic workspace scanner baseline | FW-P1-008 | source/test roots、command map、changed/high-risk files | Todo |
| FW-P4C-002 | Workspace | import/dependency graph baseline | FW-P4C-001 | changed-file dependency slice | Todo |
| FW-P4C-003 | Context | context-slice schema/builder | FW-P4C-001, FW-P4C-002 | bounded context + related tests + budget | Todo |
| FW-P4C-004 | Task Packet | task-packet schema/builder | FW-P4C-003 | goal、constraints、context refs、commands、review policy | Todo |
| FW-P4C-005 | Angular | Angular route map extractor baseline | FW-P4C-001 | route path → feature/components | Todo |
| FW-P4C-006 | Angular | component/template/style/service relation extractor | FW-P4C-005 | component TS/template/style/service/spec candidates | Todo |
| FW-P4C-007 | Angular | related test discovery baseline | FW-P4C-006 | 找出或建議 spec/test 位置 | Todo |
| FW-P4C-008 | ACC | ACC legacy mapping extractor baseline | FW-P4C-005 | legacy route/controller/template → modern target hints | Todo |
| FW-P4C-009 | ACC | ACC migration rules / checklist assets | FW-P4C-008 | routing、permission、UI convention、behavior parity | Todo |
| FW-P4C-010 | Migration | legacy-modern-mapping / migration-checklist-result schema | FW-P4C-008, FW-P4C-009 | legacy refs、modern targets、gaps、risks、checklist | Todo |
| FW-P4C-011 | Migration | migration-analysis schema | FW-P4C-010 | assumptions、missing info、risk、manual follow-ups | Todo |
| FW-P4C-012 | Workflow | 定義 `acc.single-page-legacy-migration` workflow | FW-P4C-004, FW-P4C-010, FW-P4C-011 | locate → analyze → plan → patch → validate → review → summary | Todo |
| FW-P4C-013 | Locator | legacy page locator step | FW-P4C-008, FW-P4C-012 | route/path/brief → controller/template/service + confidence | Todo |
| FW-P4C-014 | Locator | modern target locator step | FW-P4C-005, FW-P4C-012 | target path/route convention → feature root/files | Todo |
| FW-P4C-015 | Context | migration task-packet using context-slice | FW-P4C-003, FW-P4C-004, FW-P4C-013, FW-P4C-014 | 不 dump 整個 repo | Todo |
| FW-P4C-016 | Patch | migration patch generation step | FW-P4C-012, FW-P3B-004 | modern Angular page patch within target feature scope | Todo |
| FW-P4C-017 | Validation | migration validation step | FW-P4C-016, FW-P3A-009 | lint/test/build 至少一種 command-summary | Todo |
| FW-P4C-018 | Review | migration review-diff and human gate | FW-P4C-017, FW-P4C-010 | review findings + checklist before approve/reject | Todo |
| FW-P4C-019 | Fixture | ACC single-page migration fixture | FW-P4C-009 | legacy input、target、acceptance criteria | Todo |
| FW-P4C-020 | Dry-run | ACC migration dry-run E2E | FW-P4C-018, FW-P4C-019 | analysis/plan/diff preview，不寫 final workspace | Todo |
| FW-P4C-021 | Patch-run | ACC migration patch-run E2E | FW-P4C-020, FW-P4B-007 | reviewable patch、validation、review gate、summary | Todo |
| FW-P4C-022 | Gate | Phase 4 ACC acceptance checklist | FW-P4C-021 | dry-run、patch-run、validation、review、resume、reject-rerun | Todo |
