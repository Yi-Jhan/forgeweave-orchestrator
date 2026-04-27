# 原始完整藍圖

> 本文件是 ForgeWeave Orchestrator 的原始完整設計藍圖，保留完整架構脈絡、長期設計方向、歷史決策與參考內容。
>
> 本文件不是 Codex 自動執行的主要依據。
>
> 實作時請優先遵守：
>
> 1. `docs/planning/execution-charter.md`
> 2. `docs/tasks/phase-gates.md`
> 3. `docs/tasks/task-list.md`
> 4. `docs/specs/spec.md`
> 5. `docs/roadmap/blueprint.md`
>
> 若本文件與目前 task、phase gate、spec 或簡化版 blueprint 衝突，以目前執行文件為準。
>
> Codex 不得因為本文件提到 Stage 2、TUI、WebUI、完整 runtime provider、完整 workspace-map、migration workflow 等長期能力，就提前實作目前 Phase 未要求的內容。

# ForgeWeave Orchestrator Runtime-Agnostic 多 Agent 調度工具規劃藍圖

版本：v2.17
日期：2026-04-27
第一參考專案：ACC
第一參考 Runtime：GitHub Copilot SDK
主要交付策略：對外維持 Stage 1 CLI Functional Delivery / Stage 2 TUI / WebUI Experience；對內以 Phase 0～6 Gate 管理實作與驗收（Phase 0 Foundation 起步，Phase 2 Review-first MVP，Phase 3A bug-fix / patch-first，Phase 3B small new-feature，Phase 4 runtime / state / workspace hardening 分線強化，並新增 ACC 單頁 legacy → modern Angular migration 驗收 gate）
定位：先建立一套 **任何專案都可透過 manifest / adapter / provider asset profile / onboarding 接入，且具備 repo understanding / deterministic context pipeline** 的 runtime-agnostic 多 Agent 調度工具；GitHub Copilot SDK 作為第一個 reference runtime / provider，ACC 作為第一個 reference project 驗證其實戰可行性。第一階段以 CLI 為核心，先用 Review-first MVP 驗證安全、可追蹤、可審核的最小 workflow，再以 bug-fix / patch-first 驗證受控改檔與 command runner，最後才進入小型 new-feature；Phase 4 完成標準新增 ACC bounded single-page legacy migration CLI patch-run；第二階段先以 read-only / review-first 的 TUI / WebUI 放大已驗證 workflow，再逐步加入 steering、replay、metrics 與 drift monitoring。

---

## 1. 文件目的

這份藍圖不是在再做一套「更大、更炫」的 Agent 架構，而是要把專案中的 AI 資產（agents、skills、instructions、workflow presets、domain docs）整理成可被 orchestrator 載入、驗證、重用的 project asset package。對 GitHub Copilot provider 來說，這些資產可以放在 `.github/`、`AGENTS.md` 或 provider 支援的位置；但 `.github/` 只是 GitHub Copilot Provider Asset Profile 的一種檔案佈局，不是 runtime-agnostic core 的通用前提。

v2.17 延續 v2.16 的兩層 roadmap，並把 ACC reference project 的 Phase 4 完成標準具體化：**Phase 4 不只完成 runtime / state / workspace hardening，還必須證明 ACC 可透過 CLI patch mode 完成一個單頁 legacy page → modern Angular page 的 bounded migration，且經 validation、review gate、resume / reject rerun 驗證。**

v2.16 延續 v2.15 的兩層 roadmap，但把高風險能力重新排序：**對外 roadmap 仍維持 Stage 1 / Stage 2；對內 Phase Gate 變得更尖，Phase 3 先 patch-first，Phase 4 拆成 runtime / state / workspace 三條 hardening 線，Stage 2 採 read-only first。**

```text
對外 Roadmap：
  Stage 1：CLI Functional Delivery
    先用 CLI 跑通專案接入、provider reality check、simple context packet、
    review-only workflow、structured artifact、manual review gate 與 minimal state/event。
    Review-first MVP 通過後，先做 bug-fix / patch-first，再做 small new-feature。

  Stage 2：TUI / WebUI Experience
    在 CLI 工作流穩定後，先補 read-only / review-first 的 TUI、WebUI、團隊可視化，
    再補 steering、replay、metrics 與 workspace drift monitoring。

對內工程 Phase Gate：
  Phase 0：Foundation / Repo Scaffold
  Phase 1：Project Onboarding + Provider Reality Check MVP
  Phase 2：Review-first MVP
  Phase 3：Feature Delivery MVP
    Phase 3A：Controlled Bug-fix / Patch-first
    Phase 3B：Small New-feature / Enhancement
  Phase 4：Runtime / State / Workspace Hardening
    Phase 4A：Runtime / Provider / Capability Hardening
    Phase 4B：State / Resume / Observability Hardening
    Phase 4C：Workspace Understanding Hardening
    ACC Phase 4 Gate：Bounded Single-page Legacy Migration
  Phase 5：TUI Experience
    Phase 5A：Inspect + Review
    Phase 5B：Control + Steering
  Phase 6：WebUI / Replay / Metrics
    Phase 6A：Read-only Run History
    Phase 6B：Replay / Metrics / Drift
```

這個工具的目標是：

1. 建立 **runtime-agnostic Orchestrator Core**，並以 **GitHub Copilot SDK** 作為第一個 reference runtime / provider。
2. 第一階段優先做 **CLI-first functional delivery**，但第一個 MVP 採用 **Review-first**，先驗證專案讀取、context、artifact、manual review gate、minimal state 與 event，再以 bug-fix / patch-first 驗證受控改檔，最後擴展到 small new-feature。
3. 先做可套用於任何專案的最小通用入口（manifest、adapter、provider asset profile、onboarding、generic workflow）。
4. 以 ACC 作為第一個 reference project 驗證真實前端工作流，並以第二專案驗證 core 不被 ACC 綁死；Phase 4 完成時，ACC 必須可完成一個 bounded single-page legacy migration CLI patch-run。
5. 用 **結構化資訊** 而不是自然語言做 agent handoff。
6. 保持 **KISS、可讀、可測、可擴充**。
7. 把 **workspace understanding layer** 納入正式架構，而不是把 repo 理解責任隱含塞進 agent prompt。
8. 第二階段才補 **TUI / WebUI**，避免在 CLI 還沒能穩定完成工作前就把資源分散到介面工程。

### 1.1 閱讀提示：白話名詞對照

- `orchestrator`：調度工具，也就是安排哪個 agent 在哪一步做什麼事的主控程式。
- `workflow`：工作流程，把一件事拆成固定步驟，依序執行。
- `artifact`：正式交接資料，是可被下一步直接讀取的結構化結果，不只是聊天文字。
- `runtime`：agent 實際執行的底層環境，例如 GitHub Copilot SDK、OpenAI API、Claude、local runtime 或 mock runtime。
- `execution run`：某個 step 被真正執行的一次記錄，可理解成「這一步實際跑了一次」。
- `execution message`：執行過程中的訊息與遙測資料，例如串流回覆、工具輸出、usage；它不是正式交接物。
- `adapter`：專案轉接層，負責把不同專案特性接到通用核心。
- `review gate`：人工審核關卡，系統在這裡停下來等人批准或退回。
- `replay`：重播執行過程，用來回看系統當時怎麼跑。
- `observability`：可觀測性，也就是能不能看清楚狀態、事件、錯誤、耗時與執行細節。

---

### 1.2 版本演進摘要

本版本 v2.17 的重點是把前述討論中的 ACC 目標收斂成正式驗收條件：**Phase 4 不得只以抽象 hardening 視為完成，必須加入 ACC Single-page Legacy Migration Acceptance Gate。**

新增要求：

1. **ACC 單頁 migration 成為 Phase 4 的硬性 reference gate**
   Phase 4 完成後，ACC 必須可用 CLI 將一個明確指定的 legacy page 前移到 modern Angular page，採 bounded scope、patch mode、validation command summary、review gate 與 delivery-summary。

2. **Migration workflow 必須被明確命名與限縮**
   新增 `acc.single-page-legacy-migration` / `acc.angularjs-to-angular-page-migration` 作為 ACC-specific workflow。它不是大型 module migration，也不是無人審核的一鍵改造系統。

3. **Phase 4C workspace understanding 必須支援 migration 所需的 Angular / ACC extension**
   必須包含 legacy page locator、modern target locator、route map、component / template / style / service relation、related test discovery、legacy-modern-mapping 與 context-slice / task-packet。

4. **Review gate、resume 與 reject rerun 必須在 migration E2E 中被證明**
   至少一次 migration workflow 需驗證中斷後可 resume；至少一次 review gate reject 後可帶 reject reason 回到 implementation 或 validation step 重跑。

本版本 v2.16 的重點不是加大範圍，而是把 v2.15 的 Phase Gate 重新排成更安全、更可驗證的實作順序。
核心調整是：**Phase 3 降風險、Phase 4 拆包、Phase 1 / 2 / 3 前移必要治理骨架，Stage 2 先觀察再控制**。

1. **Phase 1 新增 Provider Reality Check / Capability Matrix v0**
   在真正依賴 GitHub Copilot SDK 執行 workflow 前，先做 provider preflight：確認 SDK 版本、streaming events、session persistence / resume、hooks、tool events、custom skills / agents 注入方式、CLI / SDK 可用性差異，以及 degraded mode。這份結果產出 `provider-preflight-report` 與 `provider-capability-matrix` v0，避免 Phase 2 / 3 寫到一半才發現 provider 假設不成立。

2. **Phase 2 前移 minimal state machine、event envelope 與 artifact store**
   Review-first MVP 不只是「跑一條 review workflow」，還要建立最小 run / step state、event log envelope、artifact store 與 review decision metadata。Phase 4 仍負責正式化與補齊覆蓋率，但這些能力不能等到 Phase 4 才第一次出現。

3. **Phase 3 拆成 3A bug-fix / patch-first 與 3B small new-feature**
   自動改檔的第一個 gate 不再直接從完整 `generic.new-feature` 開始，而是先跑受控 `generic.bug-fix` / small patch。通過後才進入小型 `generic.new-feature` 或 enhancement。進入 workspace-write 前，必須已有 command runner skeleton、workdir / branch / dirty-state guard、patch / diff mode、command allowlist、review gate reject rerun 與 failure visibility。

4. **Phase 4 改為 formal hardening，而不是第一次補治理能力**
   Phase 4 拆成三條內部線：`4A Runtime / Provider / Capability hardening`、`4B State / Resume / Observability hardening`、`4C Workspace Understanding hardening`。Phase 4 的責任是正式化、補完整、補測試與防退化，而不是讓 Phase 2 / 3 在鬆散狀態下先跑。

5. **Workspace understanding 分成 generic baseline 與 framework-specific extension**
   Generic boundary 只要求 source roots、test roots、command map、changed files、dependency / import graph baseline、related test discovery baseline、高風險檔案與 context-slice fixture。Angular / ACC 的 route map、component / template / service relation、migration mapping 等放到 framework / project extension，避免 core 被 Angular 或 ACC 綁死。

6. **Stage 2 採 read-only first**
   Phase 5 TUI 先做 `5A inspect + review gate`，再做 `5B retry / steer / queueing`。Phase 6 WebUI 先做 `6A read-only run history + artifact / diff viewer`，再做 `6B replay / metrics / comparison / drift`。UI 先觀察與審核，再介入與改變流程。

7. **文件一致性修正**
   統一使用 `ForgeWeave Orchestrator` 與 `forgeweave-orchestrator/`，修正結論中的舊版本說法，並新增 ADR-021 / ADR-022 來記錄 patch-first delivery 與 read-only-first experience 的決策。

本文件仍保留 v2.15 的主要方向：

1. 對外只維持 Stage 1 / Stage 2，不把 roadmap 膨脹成一堆主階段。
2. 對內使用 Phase 0～6 Gate 控制順序與驗收。
3. Phase 2 仍是 `generic.review` / `review-only` 的 Review-first MVP。
4. GitHub Copilot SDK 仍是第一個 reference runtime / provider，但 provider 能力必須先被驗證與文件化。
5. TUI / WebUI 仍放在 Stage 2，且先做 read-only / review-first 的放大體驗。

完整版本演進記錄請見附錄 B：版本演進歷史.

---

## 2. 設計原則

### 2.1 核心原則

- **不要為了 Agent 而 Agent**。
- **先把高頻、固定流程工作流化，再把高不確定工作 agent 化**。
- **不要讓所有 agent 共用同一大坨上下文**。
- **agent 間交接盡量使用結構化 artifact**。
- **先做最小可行 orchestrator，再逐步擴充**。
- **能用 skill 解決的，不急著拆 sub-agent**。
- **從第一天就保留 logging、trace、review、replay 能力**。
- **Deterministic before Semantic**：先用 parser / scanner / schema 把 repo 壓成結構化事實，再把推論交給 agent。
- **Workspace Understanding is First-Class**：repo 理解層不是附屬腳本，而是 orchestrator 的正式前置層。
- **Large Context Belongs Outside the Prompt**：大型 spec、程式碼、掃描結果應外部化成 artifact / reference，而不是反覆塞進 session。

### 2.2 工程原則

- KISS：優先簡單可懂的模組邊界。
- Convention over configuration：常用規則內建，專案差異交給 project adapter。
- Structured over prose：狀態、handoff、任務輸出優先用 JSON / schema。
- Explicit over implicit：每個 workflow step 都要有清楚輸入、輸出、完成條件。
- Human override：人可以在任一關卡介入、修正、重跑。
- Artifact 與 Execution Message 分離：正式交接物與執行遙測不可混為一談。
- Runtime-aware：workflow 定義、runtime 能力、execution environment 應明確分層。
- Capability-aware：不要假設不同 provider 在 resume、skills、streaming、sandbox 上完全等價。
- Incremental over full re-scan：能增量更新就不要每次重掃整個 repo。
- Context slicing over context dumping：給 agent 的應是切片後的上下文，而不是無限制堆疊歷史訊息。

## 3. Platform Scope and Non-Goals

### 3.1 Platform Scope

本平台目標是建立一個：

- runtime-agnostic 的 orchestration core，並以 GitHub Copilot SDK 作為第一個 reference runtime / provider
- 可透過 Runtime Provider Contract / Runtime Bridge 替換或新增 provider
- 可透過 Provider Asset Profile 載入不同 provider 的 agents / skills / instructions / workflow assets
- 可調度多個 agent 以完成 workflow
- 可保存 structured artifact 供下一輪 workflow 使用
- **第一階段以 CLI 作為唯一正式操作入口**，先完成 Review-first MVP，再逐步擴展到專案功能開發需求
- **第二階段再補 TUI / WebUI**，提供長任務互動、團隊可視化、歷史 run 管理與 metrics；WebUI 技術選型需通過 Tech Selection Gate，不預設一定使用 Angular
- 可透過 project adapter 適配不同 repo / framework / workflow
- 具備 **workspace scanner / deterministic extractor / workspace map / task packet builder**
- 能把 repo understanding 納入正式 execution pipeline，而不是只靠 agent 臨場理解

### 3.2 Stage 1 Scope：CLI Functional Delivery

第一階段的正式範圍是：

- `project init` / onboarding CLI
- manifest / adapter / assets 載入
- simple context packet 與最小 workspace understanding boundary
- Phase 2 至少 1 條 Review-first MVP workflow：`generic.review` / `review-only`
- Phase 3A 至少 1 條受控 `generic.bug-fix` / patch-first CLI workflow，先驗證小範圍改檔、diff、command summary 與 review gate
- Phase 3B 至少 1 條小型 `generic.new-feature` 或 enhancement workflow，且必須在 Phase 3A 通過後才進入
- structured handoff artifact、manual review gate、delivery summary
- 最小 state machine、event log envelope、artifact store 與 local JSON / JSONL persistence
- workspace-write 前的 command runner skeleton、workdir / branch / dirty-state guard、patch / diff mode 與 command allowlist
- `AgentRuntimeProvider` contract
- `CopilotSdkRuntimeProvider` reference provider
- `MockRuntimeProvider` for tests / smoke tests
- ACC 與至少 1 個第二專案的 CLI E2E 驗證

### 3.3 Stage 2 Scope：TUI / WebUI Experience

第二階段才處理：

- TUI timeline / step tree / live logs / retry / approve / reject / steer
- WebUI run history / artifact viewer / diff review / replay panel / metrics board
- team-shared run inspection
- workspace-map / context-slice viewer
- 更完整的 replay / comparison / metrics dashboard
- 第三專案以上與更多 runtime routing 驗證

### 3.4 Non-Goals

第一階段刻意不追求：

- 超通用 DSL
- 一開始就支援過多 framework
- 分散式多機執行
- 過度複雜的 memory 抽象
- plugin marketplace 生態系
- TUI / WebUI 的正式產品化
- OpenAI / Claude / local provider 的完整實作；Stage 1 只要求 Copilot SDK reference provider + MockRuntimeProvider
- Phase 2 MVP 不要求自動修改檔案、不要求完整 `new-feature`、不要求完整 workspace understanding
- 沒有完成 generic onboarding、ACC 與第二專案 CLI 驗證前就自稱成熟通用平台
- 一開始就導入圖資料庫、視覺化 knowledge graph 編輯器、分群演算法平台
- 把所有 repo 理解工作都交給 LLM 以換取看似靈活但不可重現的黑盒流程
- 過多 agent graph 視覺編排器
- 自動學習型 rule mutation

### 3.5 為什麼要定義 Non-Goals

多 Agent 工具很容易因為「什麼都想支援」而失控。明確定義不做什麼，才能守住 KISS。
最重要的界線是：

- **要有 repo understanding layer，但不要一開始就做成大型知識圖平台**
- **要有結構化上下文，但不要過早上複雜 graph database**
- **要先把 CLI Review-first MVP 跑通，再擴展到功能開發，最後才補 TUI / WebUI**
- **要先用 ACC 與第二專案驗證 generic onboarding，而不是預設任何抽象都已經通用**

## 4. 為什麼 GitHub Copilot SDK 適合作為第一個 Reference Runtime

第一階段選擇 GitHub Copilot SDK 作為 reference runtime，是因為它已具備以下適合 agent orchestration 起步的能力：

- **streaming responses / streaming events**
- **hooks**
- **session persistence**
- **MCP servers**
- **steering and queueing**
- **custom agents / sub-agent orchestration**
- **custom skills**

這代表本工具第一階段不需要自己重造一整套 agent runtime（代理執行引擎），而應該把重點放在 provider 通常不會替 orchestrator 治理好的機制：

- **workflow model（工作流模型）**：安排多個步驟如何串接
- **structured handoff（結構化交接）**：規範各個步驟或 AI 之間該怎麼傳遞資訊
- **artifact schema（產出物結構規格）**：定義 AI 的輸出必須符合什麼嚴謹格式
- **project adapter（專案適配器）**：讓這個流程大腦能無縫接軌不同專案的機制
- **UI / observability（介面與可觀測性）**：讓人類能隨時掌握、監視系統現在到底在做什麼
- **governance（治理邊界）**：包含權限、安全、執行策略的全面管控

但這裡要補一個重要澄清：

**Copilot SDK 適合作為第一個底層 agent runtime provider（代理執行介面），但不代表在其之上的 Orchestration 層（任務調度層）就不需要自己打造相關的控制樞紐。** 我們依然需要建立自己的 runtime registry（可用引擎清單）、execution run log（執行軌跡紀錄）、provider capability matrix（模型能力對照表）、與 execution environment policy（執行環境管理政策）。

Reference runtime 解決的是最基層的連線問題，如 session（連線階段）、tool（工具呼叫）、hook（攔截器）、streaming（串流回覆）；
但 orchestrator（調度系統）還是要親自負責：

- **runtime 可用性與能力宣告**：確認大腦目前能動用哪些資源與權限
- **每次 execution run 的持久化**：把每一趟執行的詳細紀錄都保存下來
- **artifact 與 execution messages 分離**：將「正式交付物」跟「除錯用的對話紀錄」分開存放
- **workdir / context file / sandbox policy**：管理 AI 在什麼資料夾工作、能讀到什麼檔案、是否被關在沙盒裡
- **provider 差異治理**：抹平不同底層 AI 提供者（如 Claude、GPT 等）的能力落差

### 4.1 Reference Runtime 能力與 Orchestrator 需求對映

| SDK 能力              | 適合用於                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| hooks                 | tool 前審核、tool 後驗證、logging / audit、專案規則注入、危險操作攔截                            |
| session persistence   | 長任務中斷續跑、TUI / WebUI 重連、同一任務多輪接續、失敗後從 checkpoint 恢復                     |
| streaming events      | TUI 即時進度、WebUI 任務時間軸、顯示 agent 動態、顯示 tool 調用 / review / handoff               |
| steering and queueing | 使用者中途修正方向、將後續任務排入 queue、互動式長任務控制                                       |
| MCP servers           | filesystem / repo 工具、GitHub / PR / issue context、設計文件 / 規格資料來源、外部知識與內部服務 |

### 4.2 SDK 依賴風險與降級策略

採用 GitHub Copilot SDK 作為第一個 reference runtime，能大幅降低自建 agent runtime 的成本；但這也代表 orchestrator 必須正面承擔 SDK 版本演進、能力差異、限制變動與授權條件調整帶來的風險。

以下風險不應被隱含假設，而應作為正式治理邊界的一部分。

#### 風險 1：SDK Breaking Change

對策：

- 所有 SDK 呼叫應集中於 `runtime-bridge/providers/copilot-sdk` 邊界，不讓 core 直接耦合 provider-specific API
- 升級 SDK 前，至少執行 `runtime-bridge` 與 `copilot-sdk` provider 的整合測試與最小 workflow smoke test
- 文件中應明確記錄目前依賴的 SDK capability 與對應版本假設

治理原則：

- SDK provider 是 runtime dependency，不是 core contract
- core 與 workflow schema 不應直接依賴 SDK 的瞬時介面形狀

#### 風險 2：SDK Capability 缺失、退化或移除

例如：session persistence、tool event、usage metrics、native skills 等能力，在不同版本或不同 provider 條件下可能不可用。

對策：

- runtime registry 或 adapter 必須顯式宣告 capability，而不是隱含假設
- 若 provider session resume 不可用，系統仍必須能退回 workflow checkpoint resume
- 若某能力不存在，應以 degraded mode 執行，而不是讓 workflow 直接失效

治理原則：

- provider session resume 是加速能力，不是唯一恢復能力
- workflow resume 仍以 artifact + checkpoint 為正式基礎

#### 風險 3：Rate Limit、Token Ceiling 與長任務中斷

長任務可能因 token ceiling、rate limit、background execution 限制或 session timeout 而失敗。

對策：

- 長任務應可切分為多個 execution run，而非假設單次 session 可完整承載
- 每個 major step 完成後都應產生 checkpoint artifact
- 429、quota、timeout 類錯誤應進入正式錯誤分類，而不是只留在 provider log 中

治理原則：

- orchestrator 應優先保證可恢復與可追查
- 不以「單一 session 撐完整流程」作為成功前提

#### 風險 4：授權模式、平台限制或產品策略變動

若未來 SDK 的可用平台、授權條件、付費模式或功能開放策略改變，orchestrator 不應因此被整體綁死。

對策：

- Core / Adapter / Runtime Bridge 維持清楚分層
- project workflow、artifact schema、state model 不應綁定單一 SDK 專屬概念
- 文件中應保留 runtime replacement 的治理空間

一句話原則：

> Copilot SDK 可以是第一優先 runtime provider，但不應成為唯一不可替代的系統前提。

### 4.3 Runtime Abstraction and Replacement Strategy

本平台應被設計為 **runtime-agnostic core**，而不是 Copilot SDK 專用工具。Copilot SDK 是第一個 reference provider；Core 只依賴 `AgentRuntimeProvider` contract、capability matrix 與 execution policy。

建議的最小 runtime contract：

```ts
interface AgentRuntimeProvider {
  providerId: string;
  displayName: string;
  capabilities: RuntimeCapability[];
  createSession(input: RuntimeSessionInput): Promise<RuntimeSessionRef>;
  runStep(input: RuntimeStepInput): AsyncIterable<RuntimeEvent>;
  resumeSession?(sessionRef: RuntimeSessionRef): Promise<RuntimeSessionRef>;
  closeSession?(sessionRef: RuntimeSessionRef): Promise<void>;
}
```

#### Stage 1 Runtime 邊界

Stage 1 不應嘗試一次完成所有 provider。正式必交只包含：

- `AgentRuntimeProvider` contract
- `CopilotSdkRuntimeProvider`：第一個 reference provider
- `MockRuntimeProvider`：測試、fixture、CI smoke test、無 provider 環境下的 workflow 驗證

以下 provider 只保留設計空間，不列為 Stage 1 必交：

- `OpenAIRuntimeProvider`：未來替代或補充 provider
- `ClaudeRuntimeProvider`：未來替代或補充 provider
- `LocalRuntimeProvider`：本地模型或本地工具鏈

Runtime replacement 的治理原則：

1. Core 只認 capability，不直接認 provider-specific API。
2. Workflow / artifact / state / review / replay schema 不可綁定單一 SDK 概念。
3. Provider 差異應落在 Runtime Bridge 與 capability matrix，而不是散落到 workflow step。
4. `preferred_provider` 只是偏好，不是硬性成功條件；真正的選擇依據應是 `capabilities_required` 與 execution policy。
5. 若 reference provider 不可用，系統應能切換到 mock / degraded mode 做測試或 dry-run；正式替代 provider 可留到 Stage 2 或後續版本再實作。

一句話定位：

> GitHub Copilot SDK 是第一個 reference runtime；Orchestrator Core 是 runtime-agnostic 的流程、狀態、artifact 與治理核心。Stage 1 先把 Copilot SDK reference provider 跑穩，不急著同時做多個正式 provider。

### 4.4 Provider Reality Check Gate

在 Phase 1 或最晚 Phase 2 開始前，必須執行 **Provider Reality Check Gate**。這不是新增產品功能，而是把 reference provider 的真實能力先量清楚，避免 workflow、state、resume 與 hook 設計建立在錯誤假設上。

Provider Reality Check 最少要驗證：

- 目前鎖定的 SDK / provider 版本與可用平台。
- streaming events 是否可訂閱、是否能轉成 orchestrator event envelope。
- session persistence / resume 的真實行為，以及失敗時是否能退回 workflow checkpoint resume。
- hooks / tool events 能否攔截 tool call、permission、command execution 與 review gate。
- custom agents / sub-agent orchestration / custom skills 的注入方式與限制。
- CLI 功能與 SDK programmatic API 的差異，哪些能力只能 degraded mode。
- usage、error、timeout、rate limit、quota 等 metadata 是否可取得。
- provider 不可用時，MockRuntimeProvider 是否能讓 workflow fixture、contract test 與 dry-run 繼續運作。

最小輸出：

| 輸出 | 說明 |
| --- | --- |
| `provider-preflight-report` | 記錄實測結果、版本、缺口、風險與降級策略 |
| `provider-capability-matrix` v0 | 以 capability-first 方式宣告 provider 能力，而不是在 workflow 中硬寫假設 |
| `provider-gap-decision` | 決定哪些能力可用、哪些降級、哪些阻擋進入下一 phase |

阻擋條件：

```text
不得進入 Phase 2 Review-first MVP，除非：
- Copilot SDK reference provider 或 MockRuntimeProvider 至少一者可執行 workflow fixture。
- provider capability matrix v0 已完成。
- streaming / event / artifact / review gate 的最低資料邊界已確認。

不得進入 Phase 3 workspace-write，除非：
- command runner skeleton 與 execution policy skeleton 已可攔截危險操作。
- provider 或 orchestrator 至少一層可落實 workdir / permission / command allowlist。
```

Phase 4 可以正式化 runtime registry、capability matrix 與 execution policy，但 Phase 1 / 2 必須先有 v0。

---
## 5. Workflow vs Agent 判準

### 5.1 為什麼需要判準

如果沒有明確判準，系統很容易一路膨脹成「所有事都交給 agent」的黑盒。以下規則應在設計新功能時強制參考：

- API Call 能解，就不要做 Agent
- 多步驟不等於 Agent
- 固定流程應優先 workflow 化
- 高不確定、高互動、高策略切換才適合 agent 化

### 5.2 優先用 Workflow 的情況

- 輸入明確
- 步驟固定
- 輸出格式固定
- 不需要動態決策
- 不需要反覆向使用者澄清

### 5.3 優先用 Agent 的情況

- 規格模糊
- 需要策略選擇
- 需要檢索額外上下文
- 需要人類批准點
- 需要多輪交互
- 需要根據中間結果改變路徑

### 5.4 這章的效果

這會直接保護平台不被做成一隻很胖的大總管 agent 或什麼都靠 prompt 解的黑盒。

---

## 6. Project Asset Inventory and Workspace Baseline

每個接入平台的專案都應先盤點自己的 AI 資產與 workspace baseline，但不應假設所有專案都使用 `.github/`。
`.github/` 是 GitHub Copilot / GitHub 生態常見的 provider-specific asset layout；它可以是第一個 reference provider 的預設掃描位置，但不應成為 runtime-agnostic core 的通用前提。

本章將盤點分成三層：

1. **Provider Asset Profile**：定義某個 runtime / provider 的 agents、skills、instructions、workflow assets 要從哪些檔案或資料夾讀取。
2. **Generic Workspace Baseline**：所有專案都應具備的最小 repo understanding baseline。
3. **Framework / Project Extension**：框架或專案專屬的補充理解，例如 Angular、ACC、migration mapping 或 domain glossary。

### 6.1 Provider Asset Profile

Provider Asset Profile 負責描述「某個 provider 的 AI 資產放在哪裡、如何被載入、如何映射到 orchestrator 的執行單元」。

這不是 Project Adapter 的硬編碼責任，也不是 Core 的責任。Core 只知道：

```text
Project Asset Resolver
  -> Provider Asset Profile
  -> Project Assets
  -> normalized agent / skill / instruction / workflow definitions
```

GitHub Copilot provider 可以定義為第一個 reference profile：

```yaml
asset_profiles:
  github_copilot:
    instructions:
      - .github/copilot-instructions.md
      - .github/instructions/**/*.instructions.md
      - AGENTS.md
    agents:
      - .github/agents/*.md
    skills:
      - .github/skills/*
      - .agents/skills/*
    workflows:
      - .github/workflows/agent/*.yml
      - .orchestrator/workflows/*.yml
```

Generic / provider-neutral profile 則可以更簡單：

```yaml
asset_profiles:
  generic_agent:
    instructions:
      - AGENTS.md
      - docs/ai/**/*.md
    skills:
      - .agents/skills/*
    workflows:
      - .orchestrator/workflows/*.yml
```

盤點內容應包含：

- provider profile 名稱與版本
- 已存在的 agent 清單與各自職責
- 已存在的 skill 類型與分類
- 已存在的 instruction 與生效範圍
- workflow preset / template 清單
- domain docs / glossary / templates 清單
- provider-specific assets 缺口分析
- assets 是否能被 normalization 成 orchestrator 的通用 contract

### 6.2 Generic Workspace Understanding Baseline

所有專案至少應建立一份 generic baseline，避免 agent 每次臨場猜 repo 結構。

最小 baseline 應包含：

- project type / language / framework signals
- package manager / build tool
- source roots / test roots / config files
- install / lint / test / build commands
- changed files / target files / manually supplied files
- dependency entrypoints
- existing provider assets
- domain docs / glossary / templates
- high-risk files / frequently changed files
- basic include / exclude scan rules
- basic review policy 與 safety profile

這些內容可先輸出為 simple context packet；Phase 4 再逐步演進為 `workspace-map`、`context-slice` 與 `task-packet`。

### 6.3 Framework-Specific Workspace Baseline

當專案使用常見框架時，可由 FrameworkProjectAdapter 補充框架語意。

例如 Angular 專案可額外盤點：

- route map
- component / template / style / service 關聯
- related test discovery
- API service → endpoint 對映
- store / signal / computed / methods 對映
- shared / core / feature 依賴關係
- i18n / design token / Angular Material 使用分布

React / Node / Java / Python 等專案應各自定義自己的 framework baseline；不應把 Angular baseline 寫成所有專案的共同要求。

### 6.4 ACC Reference Project Extension

ACC 是第一個 reference project，因此可以有專屬 extension，但這些內容不應污染 generic baseline。

ACC extension 可包含：

- AngularJS legacy 頁面 → 現代 Angular feature 對映
- 單頁 legacy page → modern Angular page 的 bounded migration gate
- ACC domain glossary
- data center / rack / POD / firmware / telemetry domain model
- ACC migration-specific rules
- enterprise UI / permission / routing rules
- ACC 專用 review checklist
- ACC 專用 artifact schema 擴充

具體盤點結果應記錄在各專案的 **Project Profile** 文件中，而非本藍圖主文。

> ℹ️ 第一參考專案 ACC 的資產盤點請參考：[ACC Project Profile](docs/projects/acc/project-profile.md) §2

## 7. 工具總體定位

本文件以下暫稱此工具為 **ForgeWeave Orchestrator**。

### 7.1 產品定位

它不是一個只會單打獨鬥的 AI 助理（單一 agent），而是一個可讀取專案自有資源（agent / skill / instruction 資產）、可安排執行步驟流程（workflow）、可分派多個 AI 進行合作（多個 agent）、可保存中途執行進度（中間狀態）、可產出格式統一的報告與交付物（結構化 artifact），並能透過不同介面（CLI / TUI / WebUI）操作的 **Agent Harness（AI 核心運作框架） / Orchestration Runtime（流程排程執行環境）**。

### 7.2 使用情境

每個接入的專案透過其 **Project Profile** 定義可用的 workflow、agent、skill，orchestrator 根據 profile 動態載入能力。

典型使用模式：

- 透過 Provider Asset Profile 讀取專案的 agents、skills、instructions 與 workflow 設定
- 替換 project adapter
- 仍沿用同一套 orchestrator core

> ℹ️ 第一參考專案 ACC 的使用情境請參考：[ACC Project Profile](docs/projects/acc/project-profile.md) §8

---

## 8. 系統總體架構

```text
                           [ User ]
                              │
                              ▼
        [ (A) Interface Apps: Stage 1 CLI / Stage 2 TUI + WebUI ]
                              │
                              ▼
+-------------------------------------------------------------------------+
|                         (B) Orchestrator Core                           |
|                                                                         |
|  Workflow Engine  ── Run State Manager ── Review Gate                   |
|        │                    │                 │                         |
|        ├── Artifact Manager │                 ├── Human Review Gate     |
|        ├── Event / Trace Bus│                 └── Delivery Summary      |
|        └── Execution Policy Engine                                      |
+-------------------------------------------------------------------------+
        │
        ├──────────────► (C) Runtime Layer
        │                  ├─ Runtime Registry
        │                  ├─ Provider Selector
        │                  ├─ Runtime Bridge
        │                  └─ Providers
        │                     ├─ Copilot SDK Provider       # Stage 1 reference provider
        │                     ├─ Mock Provider              # Stage 1 test / fixture provider
        │                     └─ Future Providers           # OpenAI / Claude / local...
        │
        ├──────────────► (D) Project Layer
        │                  ├─ Project Manifest
        │                  ├─ Project Adapter
        │                  ├─ Project Asset Resolver
        │                  └─ Provider Asset Profiles
        │                     ├─ github_copilot             # .github / AGENTS.md / skills
        │                     ├─ generic_agent              # provider-neutral assets
        │                     └─ future profiles
        │
        ├──────────────► (E) Workspace Understanding Layer
        │                  ├─ Workspace Scanner
        │                  ├─ Deterministic Extractor
        │                  ├─ Workspace Map / Context Index
        │                  ├─ Context Slicer
        │                  └─ Task Packet Builder
        │
        ├──────────────► (F) Persistence Layer
        │                  ├─ Run / Step State
        │                  ├─ Structured Artifacts
        │                  ├─ Execution Messages
        │                  └─ Logs / Events
        │
        └──────────────► (G) Execution Environment
                           ├─ Workdir Manager
                           ├─ Sandbox / Permission Gate
                           ├─ Command Runner
                           └─ External Network Policy
```

### 8.1 各層責任

#### A. Interface Apps

提供分階段操作入口：Stage 1 只把 CLI 作為正式入口；Stage 2 再補 TUI（文字介面視窗）與 WebUI（網頁面板）。

#### B. Orchestrator Core

大腦中樞，負責建立 run、載入 workflow、分派 step、管理 run / step state、產出與驗證 artifact、觸發 review gate、接受使用者 steering / override、保存 delivery summary，並決定何時先跑 deterministic context pipeline。

Core 不應知道 `.github/`、`CLAUDE.md`、`.agents/skills/` 等 provider-specific file layout；這些由 Project Asset Resolver + Provider Asset Profile 處理。

#### C. Runtime Layer

負責 runtime-agnostic provider 管理：

- `Runtime Registry`：記錄可用 provider、capability、safety profile、concurrency 與 heartbeat。
- `Provider Selector`：根據 workflow step 的 capability requirement 選擇 provider。
- `Runtime Bridge`：隔離 provider-specific SDK / API。
- `Providers`：例如 `CopilotSdkRuntimeProvider`、`MockRuntimeProvider`、future OpenAI / Claude / local provider。

#### D. Project Layer

負責把 repo 變成 orchestrator 可理解的專案能力包：

- `Project Manifest`：描述 project type、commands、workflow、policy、repo understanding、runtime preference。
- `Project Adapter`：處理需要程式邏輯的 repo / framework / domain 差異。
- `Project Asset Resolver`：依 Provider Asset Profile 掃描、載入、正規化 agents / skills / instructions / workflow presets。
- `Provider Asset Profiles`：定義 provider-specific 檔案位置與映射規則，例如 GitHub Copilot profile 才會知道 `.github/`。

#### E. Workspace Understanding Layer

負責掃描 workspace、萃取 deterministic metadata、建立 workspace map / context index、依任務切出 context slice、產生 task packet，並支援 incremental update / re-scan policy。

#### F. Persistence Layer

保存 workflow state、structured artifacts、execution messages、logs、events、command results 與 review decisions。

分工原則：

- artifact 用於 handoff、review、resume、replay
- execution message 用於 debug、UI timeline、usage accounting、追查
- run / step state 用於 resume 與狀態機治理

#### G. Execution Environment

負責 workdir、sandbox、command execution、network policy 與 permission gate。
任何檔案寫入、command 執行、外部網路使用，都不應只靠 agent 自律，而應由 execution policy 明確約束。

### 8.2 Core / Adapter / Asset Profile / Project Assets 四層分工

如果沒有這層分工，工具很容易表面上通用，實際上卻綁死在 ACC、Angular 或 GitHub Copilot 的 `.github` 檔案佈局。

#### Core（與專案與 provider 無關，所有專案共用）

Core 提供各子系統的 framework 骨架與預設實作：

- Workflow Engine
- Run / Session 管理
- Event / Trace Bus
- Artifact Manager
- Runtime Registry / Provider Selector
- Runtime Provider Contract
- Execution Run / Message Store
- Execution Environment Manager
- Hook Pipeline
- Review Gate
- Logging / Replay
- CLI / TUI / WebUI shell
- Workspace Scanner framework
- Deterministic Extractor framework
- Context Slicer / Task Packet Builder

#### Provider Asset Profile（負責 provider-specific file layout）

Provider Asset Profile 定義某個 provider 的 assets 在哪裡，以及如何正規化為 orchestrator 的通用 contract：

- instruction file patterns
- agent definition patterns
- skill directory patterns
- workflow preset patterns
- provider-specific injection / loading rules
- normalization rules

例如 `.github/agents/`、`.github/skills/`、`.github/copilot-instructions.md` 應只存在於 GitHub Copilot Provider Asset Profile，而不是寫死在 Core 或 GenericProjectAdapter。

#### Adapter（負責把 core 接到某個 repo / framework / project）

Adapter 只需 override 專案或框架特有的部分，其餘沿用 Core 預設行為：

- repo 結構辨識
- workflow / agent / skill allowlist
- build / test / lint 指令映射
- review policy
- artifact schema 擴充
- runtime safety profile
- provider capability mapping
- execution environment policy
- scan rules（override Core 預設）
- extraction rules（override Core 預設）
- context slicing policy
- repo facts normalization

#### Project Assets（由專案本身提供）

Project Assets 是專案能力包，不限定檔案位置：

- provider-specific agents / skills / instructions
- `AGENTS.md` / AI guidance docs
- templates / glossary / domain docs
- project workflow presets
- route / feature / design system conventions
- migration mapping rules
- review checklist
- project profile

**一句話定位：Core 是產品，Provider Asset Profile 是 provider file layout，Adapter 是 strategy override 層，Project Assets 是專案能力包。**

新增專案時不應預設一開始就建立專用 adapter。預設路徑應是：

```text
GenericProjectAdapter
  → FrameworkProjectAdapter
  → ProjectSpecificAdapter
```

如果差異能用 Manifest、Provider Asset Profile 或 Project Assets 表達，就不要建立專用 adapter；只有當差異需要程式邏輯才能正確理解 repo、切 context、套 policy 或產生 artifact 時，才建立 project-specific adapter。

### 8.3 前置理解層 Pipeline

高層順序為：

```text
resolve provider assets
-> scan workspace
-> extract deterministic metadata
-> build / refresh workspace map
-> slice context for current workflow
-> build task packet
-> select runtime provider
-> dispatch specialized agents
-> review and persist artifacts
```

這條 pipeline 的價值在於：

- 讓 provider-specific assets 先被正規化，不污染 core
- 讓 agent 看到的是「已經整理過的上下文」
- 讓 resume / replay / cache 有正式依據
- 讓不同 provider 即使能力不同，也能共用同一批結構化前置資料
- 讓 Review-first MVP 可以先驗證 context、artifact、review gate 與 persistence，再進入自動改檔與 feature delivery

## 9. Project Manifest / Project Profile Specification

### 9.1 為什麼一定要有 Manifest

未來若要支援不同專案，不能靠程式內部寫死 if-else 判斷。Workflow 可用性、agent 可用性、skill 可用性、build 指令、review 規則、repo 掃描方式、extractor 組合、context slice 策略等，都應該由一份專案描述檔（Manifest）決定。

### 9.2 建議最小欄位

以下以 ACC 作為 reference project 示範；其他專案可保留 generic 欄位，並依自己的 framework / provider asset profile 覆寫。

```yaml
project:
  id: acc
  name: ACC
  type: angular-enterprise
  framework: angular
  language: typescript

asset_profiles:
  active:
    - github_copilot
    - generic_agent
  github_copilot:
    instructions:
      - .github/copilot-instructions.md
      - .github/instructions/**/*.instructions.md
      - AGENTS.md
    agents:
      - .github/agents/*.md
    skills:
      - .github/skills/*
      - .agents/skills/*
    workflows:
      - .orchestrator/workflows/*.yml
  generic_agent:
    instructions:
      - AGENTS.md
      - docs/ai/**/*.md
    skills:
      - .agents/skills/*
    workflows:
      - .orchestrator/workflows/*.yml

capabilities:
  workflows:
    - review
    - bug-fix
    - new-feature
    - migration
    - refactor
    - optimization
  agents:
    - requirement-analyst
    - frontend-spec-architect
    - angular-implementer
    - frontend-reviewer
    - delivery-qa
    - angularjs-to-angular-migrator
  skills:
    - angular-standalone
    - angular-signals-store
    - angular-material-design-system
    - angularjs-migration

repo_understanding:
  baseline:
    mode: generic-first
    include:
      - project-signals
      - command-map
      - source-roots
      - test-roots
      - changed-files
      - provider-assets
  scanner_profile: angular-workspace
  extractors:
    - generic-project-signals
    - ts-morph-angular-metadata
    - angular-template-parser
    - style-token-usage-scanner
    - route-map-extractor
    - signal-store-extractor
    - legacy-mapping-extractor
  workspace_map:
    enabled: true
    refresh_mode: incremental
    artifact_type: workspace-map
  context_slicing:
    default_mode: task-scoped
    max_files: 40 # 初始值，依 token budget 與實測調整
    max_total_tokens: 120000
    max_large_file_bytes: 200000
    max_artifact_refs: 20
    fallback_when_over_budget: ask-user-or-manual-targets
    include_related_tests: true
    include_design_constraints: true
  task_packet:
    required: true
    artifact_type: task-packet

runtime:
  preferred_provider: copilot-sdk
  fallback_providers:
    - mock # Stage 1 僅作測試、fixture 與 dry-run fallback；正式替代 provider 延後
  selection_mode: capability-first
  safety_profile: workspace-write
  allow_workdir_reuse: conditional
  capabilities_required:
    - streaming-events
    - session-persistence
    - native-skills
  provider_preflight:
    required: true
    output_artifact_type: provider-preflight-report
    required_checks:
      - sdk-version
      - streaming-events
      - session-persistence
      - hooks
      - tool-events
      - custom-skills
      - cli-sdk-compatibility
      - degraded-mode

commands:
  install: npm ci
  lint: npm run lint
  test: npm run test
  build: npm run build

policies:
  jsdoc_locale: zh-TW
  coding_style: kiss
  structured_handoff_required: true
  execution_message_persistence: required
  external_network_default: blocked
  human_review_required_for:
    - migration
    - refactor
    - optimization
```

### 9.3 Safety Model 統一定義

文件中多處出現安全相關概念，此節統一定義其語意與關係：

#### safety_profile — 專案層級安全約束

| 值                       | 說明                                               |
| ------------------------ | -------------------------------------------------- |
| `read-only`              | Agent 只能讀取 workspace，不可寫入任何檔案         |
| `workspace-write`        | Agent 可在 workspace 範圍內讀寫，但不可推送至遠端  |
| `repo-write-with-review` | Agent 可讀寫並推送，但所有寫入必須經過 review gate |

#### isolationMode — step / runtime 層級隔離

`isolationMode`（定義於 `RuntimeExecutionPolicy`）與 `safety_profile`（定義於 Manifest）的關係：

- `safety_profile` 是專案層級的 **上限**
- `isolationMode` 是 step 層級的 **實際策略**，不可超過 `safety_profile`
- 例如：`safety_profile: workspace-write` 時，step 可設為 `read-only` 或 `workspace-write`，但不可設為 `repo-write-with-review`

#### external_network_default

由 Orchestrator 的 **execution environment manager** 在建立 execution environment 時強制執行，不依賴 agent 或 provider 自行遵守。

### 9.4 Manifest 的角色

有了 Manifest，orchestrator 才能真正做到：

- 讀設定工作
- 換專案不改核心
- 同一個工具支援多個 repo
- 在 agent 執行前，先用一致規則把 repo 壓成結構化上下文
- 以 capability 選擇 runtime provider，而不是把 workflow 綁死在單一 SDK 名稱上

### 9.5 Context Budget 與 Over-Budget Policy

Context slicing 不能只靠 `max_files` 控制，否則大型 repo 很容易看似有切片、實際上仍然塞爆 prompt 或讓 agent 看到不穩定的上下文。

建議所有 project manifest 都明確宣告 context budget：

```yaml
context_budget:
  max_files: 40
  max_total_tokens: 120000
  max_large_file_bytes: 200000
  max_artifact_refs: 20
  fallback_when_over_budget: ask-user-or-manual-targets
```

最低治理規則：

- 超過 budget 時，不應靜默截斷重要檔案。
- context slicer 必須輸出被納入、被排除與被降級的理由。
- large file 應以摘要、symbol slice、line range 或 artifact reference 取代整檔注入。
- 使用者手動指定 target files 時，manual targets 優先於自動推測。
- Phase 2 可以只做 simple context packet budget；Phase 4 再 formalize `context-slice` / `task-packet` 的完整 budget schema。

---

## 10. 核心能力清單

### 10.1 Stage 1 CLI Functional Delivery 必須有

Stage 1 的最終目標仍然是讓工具在 CLI 裡真正完成可審查的專案交付。
但 v2.16 將 Stage 1 的風險順序重新排列：**先 onboarding + provider reality check，再 review-only，再 bug-fix / patch-first，最後才 small new-feature**。

Stage 1 的核心能力，應集中在以下十類：

1. 可啟動的 CLI 執行入口與 `project init` / onboarding flow。
2. 可描述專案的最小 manifest、profile、generic adapter 與 config normalization。
3. Provider Reality Check / Capability Matrix v0，用於確認 Copilot SDK reference provider 與 MockRuntimeProvider 的真實能力。
4. 可重複執行的 simple context packet / onboarding report baseline，且具備最小 context budget。
5. 最小可用的 generic workflow、structured handoff、manual review gate 與 local artifact store。
6. Phase 2 必須有 minimal run / step state machine、event log envelope、review decision metadata 與 local JSON / JSONL persistence。
7. Phase 2 先跑通 `generic.review` / `review-only` CLI MVP，產出 `review-findings` 與 `delivery-summary`。
8. Phase 3 workspace-write 前必須具備 command runner skeleton、workdir / branch / dirty-state guard、patch / diff mode、command allowlist 與 failure visibility。
9. Phase 3A 先跑通 `generic.bug-fix` / patch-first；Phase 3B 再跑通小型 `generic.new-feature` 或 enhancement。
10. Stage 1 runtime 最小組合：`AgentRuntimeProvider` contract + `CopilotSdkRuntimeProvider` + `MockRuntimeProvider`。

完整必交項請以 `§32.1～§32.5 Phase 0～4 必交` 為唯一真相來源。

### 10.2 內部 Phase Gate 模型

Stage 1 / Stage 2 是對外 roadmap；Phase 0～6 是對內工程管理與驗收單位。
v2.16 不新增對外 Stage，只在 Phase 3 / 4 / 5 / 6 內部新增 sub-gate，讓風險更好落地。

| Phase / Sub-gate | 對應 Stage | 名稱 | 目的 | Gate 判準 |
| --- | --- | --- | --- | --- |
| Phase 0 | Stage 1 | Foundation / Repo Scaffold | 建立 monorepo、contracts、CLI skeleton、測試框架與最小文件骨架 | repo 可安裝、可測、可執行 CLI skeleton |
| Phase 1 | Stage 1 | Project Onboarding + Provider Reality Check MVP | 讓任意專案可 `forgeweave init`，並確認 reference provider 真實能力 | ACC 與第二專案都能 onboarding；provider capability matrix v0 完成 |
| Phase 2 | Stage 1 | Review-first MVP | 跑通 `generic.review` / `review-only`，驗證 artifact、review gate、minimal state / event / persistence | ACC 與第二專案都能跑完同一條 review workflow |
| Phase 3A | Stage 1 | Controlled Bug-fix / Patch-first MVP | 先用小型 bug-fix 驗證受控改檔、diff、command summary 與 reject rerun | ACC 完成 1 個小型 bug-fix CLI E2E；所有寫入受 workdir / patch policy 約束 |
| Phase 3B | Stage 1 | Small New-feature / Enhancement MVP | 在 3A 通過後，才做小型 new-feature 或 enhancement | ACC 完成 1 個小型 new-feature CLI E2E；第二專案完成 bug-fix 或 enhancement 驗證 |
| Phase 4A | Stage 1 | Runtime / Provider / Capability Hardening | 正式化 runtime registry、provider selector、capability matrix 與 degraded mode | provider 能力不再散落於 workflow 或 provider-specific code |
| Phase 4B | Stage 1 | State / Resume / Observability Hardening | 正式化 checkpoint / resume、execution run / message schema、hook taxonomy、event replay | workflow 可恢復、可追蹤、可重播基本事件 |
| Phase 4C | Stage 1 | Workspace Understanding Hardening | 正式化 generic workspace baseline，並把 Angular / ACC 放到 extension | generic baseline 與 framework extension 分開驗收，既有 workflow 不退化；ACC 單頁 legacy migration gate 可跑通 |
| Phase 5A | Stage 2 | TUI Inspect + Review | TUI 先觀察既有 run、logs、artifacts，操作 review gate | TUI 可 read-only 檢視並 approve / reject，不改變 state 語意 |
| Phase 5B | Stage 2 | TUI Control + Steering | 再加入 retry from step、steering、queueing | 所有操作都回寫正式 run state / review metadata |
| Phase 6A | Stage 2 | WebUI Read-only Run History | WebUI 先提供 run history、artifact viewer、diff viewer | WebUI 可檢視 CLI / TUI run，不引入新的 workflow engine |
| Phase 6B | Stage 2 | WebUI Replay / Metrics / Drift | 再加入 replay inspector、run comparison、metrics、workspace drift | replay / metrics 與 CLI/TUI run 資料模型一致 |

這些 Phase 是實作與驗收用的內部 gate，不代表要把對外 roadmap 膨脹成七個大型階段。
一句話原則：

```text
對外只講 Stage 1 / Stage 2。
對內用 Phase 0～6 控制風險、順序與完成標準。
Phase 3 / 4 / 5 / 6 可用 sub-gate 管控高風險能力，但不升級成新的主 Stage。
```

### 10.3 Stage 2 TUI / WebUI Experience 必須有

Stage 2 的目標是在 CLI workflow 已經穩定後，補上互動體驗與團隊可視化能力。
v2.16 採 **read-only first**：先觀察、審核、檢視，再介入、重跑、steer、比較與監控。

Stage 2 的核心能力，應集中在以下六類：

1. TUI read-only timeline、step tree、live logs、agent status、artifact / diff 摘要。
2. TUI review gate 操作：approve / reject。
3. TUI control extension：retry from step、steering / queueing、runtime status view。
4. WebUI read-only run history、execution history、artifact viewer、diff / review panel。
5. WebUI replay inspector、run comparison、metrics dashboard。
6. workspace-map / context-slice viewer 與 workspace understanding drift monitoring。

完整必交項請以 `§32.6～§32.7 Phase 5～6 必交` 為準。

### 10.4 第一階段不提前做的能力

以下能力有價值，但不應擠進 Stage 1；其中 Phase 2 MVP 尤其需要更嚴格收斂：

1. 完整 WebUI。
2. 完整 TUI。
3. plugin system。
4. remote execution profile。
5. 多正式 provider 實作。
6. 完整 graph database / knowledge graph 編輯器。
7. 過細的 agent graph editor。
8. Phase 2 MVP 的自動改檔與完整 `new-feature` 開發流程。
9. Phase 3A 之前的 workspace-write。
10. Phase 4 之前把 Angular / ACC workspace understanding 寫成 generic core 要求。

## 11. 建議的專案目錄結構

為了同時滿足「跨專案可重用」與「不要過度設計」，建議採用 **apps + packages + project adapters** 的輕量 monorepo。

```text
forgeweave-orchestrator/
├─ apps/
│  ├─ cli/                       # Stage 1 正式入口：功能開發 workflow 必須先在 CLI 跑通
│  ├─ tui/                       # Stage 2：互動 TUI
│  └─ web/                       # Stage 2：WebUI
│
├─ packages/
│  ├─ core/                      # Orchestrator 核心
│  │  ├─ workflow/
│  │  ├─ runtime/
│  │  ├─ handoff/
│  │  ├─ review/
│  │  └─ state/
│  │
│  ├─ contracts/                 # Zod / JSON Schema / TypeScript types
│  │  ├─ workflow/
│  │  ├─ artifact/
│  │  ├─ event/
│  │  └─ agent/
│  │
│  ├─ runtime-bridge/            # Runtime provider contract 與 provider 實作
│  │  ├─ providers/
│  │  │  ├─ copilot-sdk/          # Stage 1：第一個 reference provider
│  │  │  ├─ mock/                # Stage 1：測試與 smoke test
│  │  │  ├─ openai/              # Stage 2+ / future provider
│  │  │  └─ claude/              # Stage 2+ / future provider
│  │  ├─ capability/
│  │  ├─ session/
│  │  ├─ hooks/
│  │  └─ streaming/
│  │
│  ├─ asset-resolver/             # Provider Asset Profile 與 project assets 正規化
│  │  ├─ profiles/
│  │  │  ├─ github-copilot/
│  │  │  └─ generic-agent/
│  │  ├─ normalize/
│  │  └─ discovery/
│  │
│  ├─ scanner/                   # workspace 掃描框架
│  │  ├─ filesystem/
│  │  ├─ dependency/
│  │  └─ changed-files/
│  │
│  ├─ extractor/                 # deterministic metadata 抽取
│  │  ├─ angular/
│  │  ├─ template/
│  │  ├─ styles/
│  │  └─ legacy/
│  │
│  ├─ workspace-map/             # workspace map / context index
│  │  ├─ builder/
│  │  ├─ slicer/
│  │  └─ cache/
│  │
│  ├─ storage/                   # session / artifact / log persistence
│  │  ├─ fs/
│  │  ├─ sqlite/
│  │  └─ cache/
│  │
│  ├─ project-adapter/           # 專案適配層
│  │  ├─ base/                   # interface + shared utilities
│  │  ├─ generic/                # manifest-driven 預設 adapter
│  │  ├─ frameworks/             # angular / react / node-ts / spring...
│  │  ├─ projects/               # acc 等專案專用 adapter
│  │  ├─ recommender/            # adapter recommendation / decision report
│  │  └─ loader/
│  │
│  ├─ presenters/                # CLI/TUI/Web 共用 view model
│  └─ utils/
│
├─ examples/
│  ├─ acc/
│  └─ minimal-project/
│
├─ docs/
│  ├─ architecture/
│  ├─ workflows/
│  ├─ contracts/
│  ├─ projects/
│  │  └─ acc/
│  │     └─ project-profile.md
│  └─ decisions/
│
├─ templates/
│  └─ project-adapter-template/
│
└─ package.json
```

### 11.1 為什麼這樣切

- `apps/`：只負責 interaction layer；Stage 1 只實作 CLI，TUI / WebUI 留到 Stage 2
- `packages/core/`：只負責 workflow orchestration
- `packages/contracts/`：集中所有結構化 schema
- `packages/runtime-bridge/`：定義 Runtime Provider Contract，並隔離 GitHub Copilot SDK 與其他 provider 的實作細節
- `packages/asset-resolver/`：依 Provider Asset Profile 掃描與正規化 agents / skills / instructions / workflow assets
- `packages/scanner/`：負責 repo 檔案範圍、依賴、變更面掃描
- `packages/extractor/`：負責 deterministic metadata 萃取
- `packages/workspace-map/`：負責 context index、slice、task packet 產生
- `packages/storage/`：隔離 persistence implementation
- `packages/project-adapter/`：隔離不同專案差異

這樣的切法已經夠清楚，同時不至於重型到變成 over-engineering。

## 12. 工作流模型

### 12.1 workflow 基本概念

一個 workflow 是：

- 有明確 step 順序
- 每一步都有 input schema / output schema
- 每一步都指定執行 agent
- 每一步都可以有 review gate / human gate
- 每一步輸出都可以被下一步直接引用
- 在進入 agent step 前，可先執行 `prepare-context` 類型的 system step
- `workspace-map`、`context-slice`、`task-packet` 可作為正式輸入 artifact，而不是臨時補充訊息

### 12.2 workflow 定義範例

```ts
interface WorkflowDefinition {
  id: string;
  name: string;
  version: string;
  steps: WorkflowStepDefinition[];
}

type RuntimeCapability =
  | "streaming-events"
  | "session-persistence"
  | "native-skills"
  | "tool-events"
  | "usage-metrics"
  | "approval-override";

interface RuntimeExecutionPolicy {
  provider?: string;
  capabilitiesRequired?: RuntimeCapability[];
  isolationMode?: "read-only" | "workspace-write" | "repo-write-with-review";
  reuseWorkdir?: "never" | "conditional" | "always";
  allowBackground?: boolean;
}

interface WorkflowStepDefinition {
  id: string;
  name: string;
  kind: "agent" | "system" | "human-review";
  agent?: string;
  systemAction?:
    | "scan-workspace"
    | "extract-metadata"
    | "build-workspace-map"
    | "slice-context"
    | "build-task-packet";
  skills?: string[];
  inputArtifactTypes?: string[];
  outputArtifactType?: string;
  dependsOn?: string[];
  reviewPolicy?: "none" | "required" | "conditional";
  retryPolicy?: "none" | "auto" | "manual";
  maxRetries?: number;
  timeoutSeconds?: number;
  runtimePolicy?: RuntimeExecutionPolicy;
  skipWhen?: {
    artifactType: string;
    field: string;
    equals: string | boolean;
  };
}
```

欄位說明：

- `name`：步驟顯示名稱，供 CLI / TUI / WebUI 顯示。
- `systemAction`：當步驟不是 agent 執行，而是系統前置流程時使用。
- `skills`：此步驟啟用的 skill 列表，由 orchestrator 注入給 agent。
- `inputArtifactTypes` / `outputArtifactType`：引用 artifact type ID，取代原先的 schema 字串。
- `retryPolicy`：重試策略。`"none"` 不重試（忽略 `maxRetries`）；`"auto"` 依 `maxRetries` 自動重試；`"manual"` 等待人工介入（忽略 `maxRetries`）。
- `maxRetries`：僅在 `retryPolicy: "auto"` 時生效，預設為 1。
- `timeoutSeconds`：步驟超時設定，超時後進入 `blocked` 狀態。
- `runtimePolicy`：描述此步驟對 provider、capabilities、sandbox、workdir reuse 的需求。其中 `isolationMode` 不可超過 Manifest 定義的 `safety_profile`（參見 §9.3）。
- `skipWhen`：條件跳過機制，檢查指定 artifact 的欄位值，符合時自動跳過此步驟。

### 12.3 建議支援的通用 workflow 類型

以下為平台建議支援的通用 workflow 類型，各專案可透過 manifest 選擇啟用哪些：

1. `new-feature` — 新功能開發
2. `migration` — 框架或技術遷移
3. `review-only` — 純程式碼審查
4. `refactor` — 重構
5. `optimization` — 效能優化
6. `bug-fix` — 修復問題
7. `incident-triage` — 事件分流
8. `release-readiness` — 發布準備度檢查
9. `test-hardening` — 測試補強
10. `docs-handoff` — 文件交接

建議在所有與 codebase 強相關的 workflow 中，預留以下標準前置步驟：

1. `scan-workspace`
2. `extract-metadata`
3. `build-workspace-map`
4. `slice-context`
5. `build-task-packet`

各專案的具體 workflow 步驟定義應記錄在其 **Project Profile** 中，包含每個 workflow 的步驟流程圖、每個 step 的 agent / skills / artifact type 對應、各 step 的 review policy 與 retry policy。

> ℹ️ ACC 的 workflow 定義請參考：[ACC Project Profile](docs/projects/acc/project-profile.md) §3

### 12.4 通用 Workflow Template 與專案覆寫模型

建立通用 workflow 是可行的，但應分成兩層：

```text
Generic Workflow Template
  + Project Manifest / Project Profile Override
  + Project Adapter Step Hooks
```

通用 workflow 負責定義流程骨架，專案 manifest 負責決定是否啟用與基本路由，adapter 則負責每個 step 的專案差異，例如 context slicing、命令執行、framework metadata 解讀、review policy 與 artifact schema 擴充。

例如 `bug-fix` 可作為通用 workflow：

```text
1. understand-issue
2. inspect-related-code
3. propose-fix
4. implement-fix
5. run-tests
6. review-diff
7. produce-summary
```

不同專案只覆寫細節：

| Step | Angular 專案 | Node / TypeScript 工具專案 | Java Spring 專案 |
| ---- | ------------ | -------------------------- | ---------------- |
| `inspect-related-code` | component / template / service / spec | source / tests / package scripts | controller / service / repository / tests |
| `run-tests` | `npm test` / `ng test` | `npm test` | `mvn test` / `gradle test` |
| `review-diff` | Angular style / template binding | API / CLI behavior | transaction / DI / API contract |

因此平台應維護 **Generic Workflow Catalog**，例如：

- `generic.review`
- `generic.bug-fix`
- `generic.new-feature`
- `generic.refactor`
- `generic.test-generation`
- `generic.migration`

專案再以 profile 覆寫：

```yaml
workflow:
  id: bug-fix
  uses: generic.bug-fix

  overrides:
    agents:
      implement-fix: angular-implementer
      review-diff: frontend-reviewer

    commands:
      test: npm run test
      lint: npm run lint

    context:
      include_related_tests: true
      include_templates: true
      include_styles: true
```

原則是：

```text
通用流程管順序
專案設定管啟用
Adapter 管差異
Assets 管知識
```

也就是 **workflow 可以通用，step implementation 不應完全通用**。

### 12.5 Stage 1 CLI Review-first MVP 與 Feature Delivery 演進範例

Stage 1 的最終目標是 CLI 能完成可審查的真實交付，但第一個 MVP 應先跑通 `generic.review` / `review-only`。
理由是 Review workflow 不必直接修改檔案，卻能驗證 orchestrator 的核心能力：project loading、context packet、agent routing、structured artifact、manual review gate、minimal state / event / persistence 與 failure visibility。

#### Phase 2 MVP：CLI Review-first

```text
forgeweave run review --project acc --target src/app/foo

1. project / manifest / adapter / provider capability matrix 載入
2. 建立 simple context packet，並檢查 context budget
3. analyze input / changed files / target files
4. inspect related files
5. produce review-findings
6. manual review gate
7. produce delivery-summary
8. persist run / step state、events、artifacts、logs / checkpoints
```

Review-first MVP 最少應產出：

| Step | 產出 artifact / record |
| --- | --- |
| provider preflight | `provider-preflight-report` / `provider-capability-matrix` v0 |
| prepare context | `context-slice` 或 simple context packet |
| analyze input | `requirement-brief` 或 review input summary |
| review analysis | `review-findings` |
| review gate | review decision metadata |
| delivery | `delivery-summary` / `workflow-result` |
| persistence | minimal run / step state、event envelope、artifact refs |

Review-first MVP 必須驗證：

- CLI 能讀取專案 manifest / adapter / assets。
- CLI 能讀取 provider capability matrix v0。
- CLI 能建立 simple context packet，且不超出 context budget。
- Review agent 能產出符合 schema 的 `review-findings`。
- 系統能停在 manual review gate，並支援 approve / reject。
- run / step / artifact / logs / events 能保存到本機。
- ACC 與至少一個 minimal second project 能跑通同一條 review workflow。
- MVP 不要求自動改檔、不要求完整 workspace-map、不要求完整 `new-feature`。

#### Phase 3A：Controlled Bug-fix / Patch-first

Review-first MVP 穩定後，不應直接跳到完整 `new-feature`。第一個 workspace-write gate 應先選擇受控 bug-fix 或小型 patch：

```text
forgeweave run bug-fix --project acc --input issue.md --mode patch

1. project / manifest / adapter / provider capability matrix 載入
2. 建立 simple context packet / related test slice
3. bug triage / reproduction hypothesis
4. propose minimal patch plan
5. apply changes in controlled workdir / patch mode
6. run targeted lint / test command
7. produce review diff
8. human review gate
9. delivery summary
10. persist artifacts / command summary / logs / checkpoints
```

Phase 3A 最少應產出：

| Step | 產出 artifact / record |
| --- | --- |
| bug triage | `bug-brief` 或 `requirement-brief` |
| patch planning | `patch-plan` 或 `implementation-plan` |
| implementation | `file-change-set` / `generated-files-manifest` |
| validation | `command-summary` / `test-report` |
| review | `review-findings` / review diff |
| delivery | `delivery-summary` / `workflow-result` |

Phase 3A 進入條件：

- command runner skeleton 已存在。
- workdir / branch / dirty-state guard 已存在。
- file allowlist / denylist 與 command allowlist 已存在。
- patch preview / diff artifact 已存在。
- external network 預設 blocked。
- secret redaction 至少用於 command logs 與 artifacts。
- review gate reject 後可帶 reject reason 重跑 implementation 或 validation step。

#### Phase 3B：Small New-feature / Enhancement

Phase 3A 通過後，才擴展到小型 `generic.new-feature` 或 enhancement workflow。此時的 new-feature 不應是大型產品功能，而是範圍明確、檔案數可控、測試指令可跑的功能切片。

```text
forgeweave run new-feature --project acc --input feature-request.md --scope small

1. project / manifest / adapter / provider capability matrix 載入
2. 建立 simple context packet / context-slice
3. requirement analysis
4. feature spec / implementation plan
5. implement changes in controlled workdir
6. run lint / test / build
7. review diff
8. human review gate
9. delivery summary
10. persist artifacts / logs / checkpoints
```

Phase 3B 最少應產出：

| Step | 產出 artifact |
| --- | --- |
| requirement analysis | `requirement-brief` |
| feature design | `feature-spec` 或 `implementation-plan` |
| implementation | `file-change-set` / `generated-files-manifest` |
| validation | `test-report` 或 `command-summary` |
| review | `review-findings` |
| delivery | `delivery-summary` / `workflow-result` |

Stage 1 不要求一開始就有完整 workspace-map，但必須有 simple context packet，且至少能描述：

- 使用者需求、issue 或 review target。
- target files / changed files。
- 相關指令：lint / test / build。
- 可用 agent / skills。
- provider capability matrix v0。
- 相關 project instructions。
- 已知限制、風險與 context budget。
- review gate 要求。

這條演進路線的核心判準是：**先能安全看懂與審查，再允許受控 bug-fix / patch，最後才要求小型 feature delivery。**

---

## 13. Agent 設計原則

### 13.1 Agent 的通用設計原則

- 先以現有專案 agent 為主，不追求數量
- 只補真正有缺口的 agent（3-4 個）
- 優先 skill routing 而不是 agent 爆增
- 每個 agent 應有明確的輸入 / 輸出 artifact type
- agent 不應重複塑滿規則細節，那是 skill 的責任

### 13.2 Agent 分類標準

建議將 agent 依职責分為以下幾類：

- **分析型**：負責輸入解析、問題定義、範圍判斷（如 requirement-analyst、bug-triage-agent）
- **設計型**：負責規格、架構、方案制定（如 spec-architect、refactor-architect）
- **實作型**：負責程式碼生成與修改（如 implementer、migrator）
- **審查型**：負責評審、測試、品質把關（如 reviewer、qa）
- **整理型**：負責結果匯總、文件產出（如 docs-handoff-agent）

各專案的具體 agent 清單與新增建議應記錄在其 **Project Profile** 中。

> ℹ️ ACC 的 agent 清單請參考：[ACC Project Profile](docs/projects/acc/project-profile.md) §4

### 13.3 Agent Metadata 最小建議

除了角色描述外，每個 agent 也建議有最小 runtime metadata：

- `id`
- `role`
- `preferredProvider`
- `requiredCapabilities`
- `allowedWorkflows`
- `allowedSkills`
- `defaultSafetyProfile`
- `defaultReviewPolicy`

這樣 agent selection 才能同時考慮角色與執行能力，不會把 agent 當成單純 prompt 名稱。

---

## 14. Agent 與 Skill 的關係

### 14.1 核心原則

- **Agent 負責角色與決策**
- **Skill 負責方法、規則、模板、腳本、參考資料**

### 14.2 不要做的事

- 不要讓 agent 檔案重複塞滿規則細節
- 不要把 repo facts 複製到每個 agent
- 不要讓 workflow 靠自然語言硬傳遞長篇上下文

### 14.3 Skill Routing 機制

由 orchestrator 根據 `WorkflowStepDefinition.skills` 欄位決定啟用哪些 skill。具體的 step → skill 對應關係由各專案在其 workflow 定義檔或 **Project Profile** 中定義。

orchestrator 的責任是：

1. 根據 step 定義讀取 skills 清單
2. 透過 adapter 載入對應的 skill 檔案
3. 優先透過 runtime adapter 以 provider-native 方式注入（例如 `AGENTS.md`、`CLAUDE.md`）
4. 必要時再退回 session context 注入

> ℹ️ ACC 的 skill routing 對應表請參考：[ACC Project Profile](docs/projects/acc/project-profile.md) §5

---

## 15. Structured Artifact Schema Strategy

### 15.1 通用 handoff 原則

agent 與 agent 之間不要用「一大段自由文字」交接，而是至少要輸出：

- summary
- facts
- assumptions
- risks
- decisions
- required next actions
- artifact references

在 v2.3 中，這個原則延伸到 repo understanding layer：

- scan 結果要有正式 artifact
- extract 結果要有正式 artifact
- workspace map 要能 versioned / replayed
- task packet 要是 agent 接手前的正式邊界

### 15.2 Artifact Status 統一枚舉

所有 artifact 共用同一套 status 定義：

```ts
type ArtifactStatus = "draft" | "reviewed" | "approved" | "rejected" | "final";
```

流程為：`draft` → `reviewed` → `approved` / `rejected` → `final`（歸檔）。

### 15.3 Base Artifact Schema

每種 Artifact 最少要有的欄位：

```ts
interface BaseArtifact {
  artifactId: string;
  artifactType: string;
  schemaVersion: string;
  workflowId: string;
  runId: string;
  stepId: string;
  createdAt: string;
  producedBy: string;
  consumedBy?: string[];
  status: ArtifactStatus;
  summary: string;
}
```

### 15.4 通用 handoff schema

`WorkflowArtifact` 繼承 `BaseArtifact`，並擴充 handoff 所需的結構化欄位：

```ts
interface WorkflowArtifact<TPayload = unknown> extends BaseArtifact {
  payload: TPayload;
  references: ArtifactReference[];
  assumptions: string[];
  risks: string[];
  nextActions: string[];
}

interface ArtifactReference {
  type: "file" | "diff" | "log" | "schema" | "step-output" | "workspace-node";
  ref: string;
  note?: string;
}
```

### 15.5 WorkspaceMap Schema

`WorkspaceMap` 是 repo understanding pipeline 的核心 artifact，以下為最小建議 schema：

```ts
interface WorkspaceMap extends BaseArtifact {
  artifactType: "workspace-map";
  payload: {
    projectId: string;
    generatedAt: string;
    refreshMode: "full" | "incremental";
    nodes: WorkspaceNode[];
    edges: WorkspaceEdge[];
    stats: {
      totalFiles: number;
      totalComponents: number;
      totalRoutes: number;
      coveragePercent: number;
    };
  };
}

interface WorkspaceNode {
  id: string;
  kind:
    | "component"
    | "service"
    | "route"
    | "store"
    | "template"
    | "style"
    | "test"
    | "config"
    | "legacy";
  path: string;
  metadata: Record<string, unknown>;
}

interface WorkspaceEdge {
  from: string;
  to: string;
  relation:
    | "imports"
    | "injects"
    | "routes-to"
    | "extends"
    | "uses-template"
    | "uses-style"
    | "tests";
}
```

### 15.6 建議先定義的 Artifact 類型

統一使用 kebab-case 作為 `artifactType` 識別碼，TypeScript interface 名稱作為型別名稱：

| artifactType (ID) | TypeScript Interface | 說明 | 首次要求 |
| --- | --- | --- | --- |
| `provider-preflight-report` | `ProviderPreflightReport` | provider 版本、能力、缺口與降級策略 | Phase 1 |
| `provider-capability-matrix` | `ProviderCapabilityMatrix` | provider capability v0 / v1 | Phase 1 / Phase 4A |
| `onboarding-report` | `OnboardingReport` | 專案接入、asset gap、adapter 建議 | Phase 1 |
| `context-packet` | `ContextPacket` | simple context packet，Phase 2/3 的最小上下文 | Phase 1 |
| `workspace-scan` | `WorkspaceScan` | workspace 掃描結果 | Phase 4C |
| `extracted-metadata` | `ExtractedMetadata` | deterministic 抽取結果 | Phase 4C |
| `workspace-map` | `WorkspaceMap` | 專案結構地圖 / context index | Phase 4C |
| `context-slice` | `ContextSlice` | 某任務實際可見的上下文切片 | Phase 4C |
| `task-packet` | `TaskPacket` | 給 agent 的正式任務交接包 | Phase 4C |
| `requirement-brief` | `RequirementBrief` | 需求、review target 或 issue 摘要 | Phase 2 |
| `bug-brief` | `BugBrief` | bug 重現假設、影響範圍與修復目標 | Phase 3A |
| `patch-plan` | `PatchPlan` | 小型 patch 計畫與預期 diff | Phase 3A |
| `feature-spec` | `FeatureSpec` | 小型功能規格 | Phase 3B |
| `implementation-plan` | `ImplementationPlan` | 實作計畫 | Phase 3A / 3B |
| `file-change-set` | `FileChangeSet` | 檔案變更集 | Phase 3A |
| `generated-files-manifest` | `GeneratedFilesManifest` | 產出檔案清單與說明 | Phase 3A |
| `command-summary` | `CommandSummary` | lint / test / build / command runner 摘要 | Phase 3A |
| `test-report` | `TestReport` | 測試報告 | Phase 3A / 3B |
| `review-findings` | `ReviewFindings` | 審查發現 | Phase 2 |
| `decision-log` | `DecisionLog` | 執行中的設計與取捨決策 | Phase 2 |
| `delivery-summary` | `DeliverySummary` | 交付摘要 | Phase 2 |
| `workflow-result` | `WorkflowResult` | 工作流最終結果 | Phase 2 |
| `qa-report` | `QaReport` | QA 測試報告 | Phase 3B+ |
| `reuse-audit-report` | `ReuseAuditReport` | 重用審計報告 | Phase 4C+ |
| `ux-brief` | `UxBrief` | UX 設計摘要 | Phase 3B+ |
| `api-contract-map` | `ApiContractMap` | API 契約對應 | Phase 3B+ |
| `migration-analysis` | `MigrationAnalysis` | 遷移分析報告 | Phase 4C+ |

每個 artifact 類型都應定義各自的 payload interface 繼承 `WorkflowArtifact<TPayload>`。
專案可在 adapter 中擴充自己的 artifact 類型，只需遵循 `BaseArtifact` schema。

### 15.7 Artifact 設計原則

- **Artifact 不等於聊天紀錄**
- **Artifact 是 workflow 的正式交接物**
- **Artifact 要能 versioned**
- **Artifact 要能持久化**
- **Artifact 要能被下游 workflow 直接引用**
- **workspace-map 與 task-packet 是一等 artifact，不是暫存資料**

### 15.8 Artifact 與 Execution Message 分離

Artifact 是正式交接物；Execution Message 是執行過程遙測。兩者要分開設計。

```ts
interface ExecutionRun {
  executionRunId: string;
  runId: string;
  stepId: string;
  agentId: string;
  runtimeId: string;
  provider: string;
  providerSessionId?: string;
  priorExecutionRunId?: string;
  startedAt: string;
  completedAt?: string;
  status: "pending" | "running" | "cancelled" | "failed" | "completed";
  workdirRef?: string;
}

interface ExecutionMessage {
  messageId: string;
  executionRunId: string;
  sequence: number;
  timestamp: string;
  level: "info" | "warn" | "error";
  kind: "assistant" | "tool" | "system" | "usage" | "status";
  text: string;
}
```

原則：

- artifact 用於 handoff、review、resume、replay
- execution message 用於 debug、UI timeline、usage accounting、追查
- message log 可以引用 artifact，但不能取代 artifact

## 16. Workflow State Machine and Resume Model

### 16.1 為什麼需要狀態機

如果沒有明確狀態機，session persistence、long-running tasks、resume、streaming event 這些能力最後就會變成：

- 狀態散落在記憶體
- 只能靠對話紀錄硬續跑
- 失敗後不知道從哪裡恢復

落地順序：Phase 2 必須先有 minimal run / step state；Phase 4B 再正式化 checkpoint、resume、illegal transition test 與 replay 所需的完整狀態治理。

### 16.2 建議最小狀態集

- `pending`
- `planning`
- `awaiting_input`
- `executing`
- `reviewing`
- `blocked`
- `failed`
- `completed`
- `archived`

```text
           [ 開始 (Start) ]
                  │
                  ▼
            ( pending ) 初建/等待中
                  │
                  ▼
            ( planning ) 任務規劃分析
                  │
   ┌──────────────┴──────────────┐ 需要補充資訊
   │                             ▼
   │                      ( awaiting_input ) 等待人類/外部輸入
   │                             │
   ▼                             │ 輸入完成
( executing ) ◄──────────────────┘
   │      ▲
   │      │ 重做 (rejected / retry)
   ▼      │
( reviewing ) 審查中
   │
   ├───────────────────────────────┐
   │ 審查通過                      │ 放棄/失敗 (failed)
   ▼                               ▼
( completed ) 任務完成           ( failed ) 任務失敗
   │                               │
   │                               │
   └─────────► ( archived ) ◄──────┘
                    歸檔

* 其他邊界狀態轉移：
- executing -> blocked (卡關)
- executing -> failed (失敗)
- blocked -> executing (手動恢復 manual resume)
- failed -> executing (重試 retry)
```

### 16.3 狀態治理規則

每個狀態都要定義：

- 可否重試
- 可否人工介入
- 是否需要 checkpoint
- 能否直接 resume
- 失敗後進入哪個 fallback 狀態

### 16.4 Resume 統一模型

Resume 分為三種粒度，優先級由高到低：

| 粒度               | 說明                                           | 優先級         |
| ------------------ | ---------------------------------------------- | -------------- |
| **Session Resume** | 回到 provider session，保留對話上下文          | 最高（最輕量） |
| **Step Resume**    | 從目前 step 重新接續，載入 checkpoint artifact | 中             |
| **Run Resume**     | 整個 workflow 從最近 checkpoint 恢復           | 最低（最重量） |

可用性判斷順序：先嘗試 Session Resume；若失敗則退回 Step Resume；若仍失敗則執行 Run Resume。

原則：

- 只從「明確 checkpoint」恢復
- 恢復時優先載入 structured artifact，不靠模型自行猜測上下文
- 恢復後第一步應產生 `RunRestatementArtifact`
- 長任務應在每個 major step 完成後產生 checkpoint

### 16.5 錯誤處理策略

針對不同錯誤類型，定義具體的處理方式：

| 錯誤類型                           | 處理策略                                                     | 最終狀態                        |
| ---------------------------------- | ------------------------------------------------------------ | ------------------------------- |
| Agent 回傳不符 artifact schema     | 自動 retry 一次，附加格式提示；仍失敗則標記錯誤通知使用者    | `failed`                        |
| provider session 斷線              | 自動從最近 checkpoint resume；若 resume 也失敗則進入 blocked | `blocked`                       |
| Tool call 報錯                     | 根據 `retryPolicy` 決定重試或停止                            | `failed` 或 `blocked`           |
| Step 超時（超過 `timeoutSeconds`） | 停止目前 step，保存 checkpoint                               | `blocked`                       |
| Agent 拒絕執行（安全理由）         | 記錄原因，跳過或等待人工介入                                 | `blocked`                       |
| Review gate 被 reject              | 根據 step 設定決定重試或結束                                 | `reviewing` → retry 或 `failed` |
| Artifact validation 失敗           | 觸發 `onArtifactValidationFail` hook，記錄後重試             | `executing` → retry             |

### 16.6 錯誤情境演練範例

以下範例不是額外功能，而是用來說明狀態機、retryPolicy、checkpoint 與 resume model 在真實執行時如何協作。

#### 範例 1：Artifact Schema Validation Fail

```text
Step: implement-fix
狀態：executing

1. agent 產出 artifact draft
2. orchestrator 進行 schema validation
3. 發現缺少必要欄位 assumptions
4. 觸發 artifact.validation.failed event
5. 若 retryPolicy = auto，附加格式提示後重試一次
6. 若第二次仍失敗，step -> failed
7. run 視 workflow policy 轉為 blocked 或 failed
```

治理重點：

- schema validation failure 不等於 provider failure
- 補救順序應先重試格式，再決定是否中止流程

#### 範例 2：Review Gate Reject 後重做

```text
Step: review-diff
狀態：reviewing

1. reviewer 產出 ReviewFindings
2. human review verdict = rejected
3. orchestrator 記錄 reject reason 與 review metadata
4. 若 retryPolicy = manual，run 保持可恢復狀態
5. 使用者選擇 retry from step
6. implement step 重新執行，並附上 reject reason
7. 新產出再次進入 review gate
```

治理重點：

- reject 不是單純失敗，而是帶理由的可追蹤回退
- 重做時必須把 reject reason 納入下一次輸入上下文

#### 範例 3：Session Resume 失敗後退回 Step Resume

```text
Step: new-feature / implement
狀態：executing

1. provider session 中斷
2. orchestrator 先嘗試 Session Resume
3. provider 回覆 session expired
4. orchestrator 改用 Step Resume
5. 載入最近 checkpoint artifact
6. 建立新的 execution run
7. 產生 RunRestatementArtifact
8. step 回到 executing，繼續後續流程
```

治理重點：

- Session Resume 失敗時，不應直接宣告整個 run 失敗
- 正式恢復能力仍以 checkpoint 與 artifact 為主

### 16.7 Workflow Resume 與 Provider Resume 的關係

這兩件事不能混為一談：

- **workflow resume**：從 orchestrator checkpoint 繼續
- **provider session resume**：從特定 runtime / provider 的 session 接續

治理原則：

- workflow resume 才是正式恢復能力
- provider session resume 是可選加速能力
- 若某 provider 不支援 session resume，仍必須能透過 artifact + checkpoint 重新建立新的 execution run
- workdir reuse 也必須經過 policy 判斷，不能假設永遠安全

---

## 17. Session Persistence 設計

### 17.1 要保存什麼

不是只保存聊天紀錄，而是保存整個 run context：

- workflowRunId
- workflowId
- currentStep
- completedSteps
- step outputs
- linked sessionId
- runtimeId
- executionRunIds
- providerSessionId
- workdir references
- review decisions
- queued user instructions
- retry metadata
- artifact references

### 17.2 Resume 粒度

Resume 統一模型定義於 §16.4。Session persistence 負責儲存足夔的狀態以支持三種粒度的 resume。

### 17.3 checkpoint 策略

每個 step 完成就 checkpoint。

如果 step 很長，則在：

- plan 完成後
- tool 執行後
- review 前
- handoff 後

做子 checkpoint。

### 17.4 Workdir Reuse 與恢復策略

建議將 workdir reuse 做成顯式 policy，而不是隱含行為：

- `never`
- `conditional`
- `always`

預設建議為 `conditional`，並至少檢查：

- 是否為同一 workflow / step / agent 類型
- 是否存在未清理的高風險輸出
- 是否仍指向正確 branch / repo 狀態
- 是否需要先通過人工審核

---

## 18. Streaming Events 設計

### 18.1 事件來源

- Runtime provider session events（包含 Copilot SDK session events）
- workflow engine events
- project adapter events
- review gate events
- UI control events
- workspace scanner events
- deterministic extractor events
- workspace map / context slicing events

### 18.2 系統內部事件類型

Phase 2 只要求最小 event envelope，能支撐 CLI 顯示、local persistence、review gate 與失敗追查；Phase 4B 再補完整 execution message schema、event replay 與 metrics 所需欄位。

```ts
/** 所有事件共用的基礎欄位 */
interface BaseEvent {
  schemaVersion: string; // e.g. "1.0" — 便於未來 schema 演進時做向前相容檢查
  timestamp: string;
  projectId: string;
  runId: string;
}

type OrchestratorEvent =
  | (BaseEvent & { type: "run.started" })
  | (BaseEvent & {
      type: "runtime.selected";
      runtimeId: string;
      provider: string;
    })
  | (BaseEvent & { type: "runtime.heartbeat.missed"; runtimeId: string })
  | (BaseEvent & { type: "workspace.scan.started" })
  | (BaseEvent & { type: "workspace.scan.completed"; fileCount: number })
  | (BaseEvent & { type: "metadata.extract.started" })
  | (BaseEvent & { type: "metadata.extract.completed"; entityCount: number })
  | (BaseEvent & { type: "workspace-map.created"; artifactId: string })
  | (BaseEvent & { type: "context-slice.created"; artifactId: string })
  | (BaseEvent & { type: "task-packet.created"; artifactId: string })
  | (BaseEvent & { type: "step.started"; stepId: string })
  | (BaseEvent & { type: "step.skipped"; stepId: string; reason: string })
  | (BaseEvent & {
      type: "execution.started";
      stepId: string;
      executionRunId: string;
      runtimeId: string;
    })
  | (BaseEvent & {
      type: "agent.session.started";
      agent: string;
      sessionId: string;
    })
  | (BaseEvent & { type: "agent.delta"; agent: string; contentDelta: string })
  | (BaseEvent & { type: "tool.called"; tool: string })
  | (BaseEvent & { type: "tool.error"; tool: string; error: string })
  | (BaseEvent & {
      type: "execution.message.persisted";
      executionRunId: string;
      messageId: string;
    })
  | (BaseEvent & {
      type: "execution.cancelled";
      executionRunId: string;
      reason: string;
    })
  | (BaseEvent & {
      type: "artifact.created";
      artifactType: string;
      artifactId: string;
    })
  | (BaseEvent & {
      type: "artifact.validation.failed";
      artifactType: string;
      error: string;
    })
  | (BaseEvent & { type: "review.required"; stepId: string })
  | (BaseEvent & { type: "review.completed"; stepId: string; verdict: string })
  | (BaseEvent & { type: "step.completed"; stepId: string })
  | (BaseEvent & { type: "step.failed"; stepId: string; error: string })
  | (BaseEvent & { type: "step.retried"; stepId: string; retryCount: number })
  | (BaseEvent & { type: "steering.applied"; instruction: string })
  | (BaseEvent & { type: "run.paused" })
  | (BaseEvent & { type: "run.resumed" })
  | (BaseEvent & { type: "run.completed" })
  | (BaseEvent & { type: "run.failed"; error: string });
```

### 18.3 UI 層如何用

#### CLI（Stage 1）

- Stage 1 的唯一正式入口
- 適合 script / automation
- 必須能顯示 workflow 狀態、目前 step、artifact 位置、review gate 狀態與錯誤原因
- Phase 2 必須先能完成 `generic.review` / `review-only` MVP，而不是只顯示分析結果
- Phase 3A 先要求完成 `bug-fix` / patch-first workflow；Phase 3B 再要求完成 small `new-feature` / enhancement workflow
- 可顯示目前正在掃描 / 抽取 / 建 map / dispatch 哪個步驟

#### TUI（Stage 2）

- 左側步驟樹
- 中間即時 log
- 右側 artifact / review 狀態
- approve / reject / retry / steer 等互動控制
- 可切換查看 workspace-map / context-slice 摘要

#### WebUI（Stage 2）

- timeline
- step detail panel
- artifact viewer
- diff viewer
- replay panel
- metrics dashboard
- workspace understanding 檢視面板

### 18.4 Event Bus 與 Execution Message Store 的分工

- Event Bus：用於即時分發與 UI 通知
- Execution Message Store：用於持久化執行歷史與增量讀取
- Artifact Store：用於正式交接物與 replay 依據

不要把同步 event bus 直接當成可 replay 的最終存證層。

## 19. Hook Taxonomy and Governance Rules

### 19.1 Hook 分類

#### Session Hooks

- onSessionStart
- onSessionResume
- onSessionClose

#### Workflow Hooks

- beforeWorkflowRun
- afterWorkflowRun
- onWorkflowStateChange

#### Agent Hooks

- beforeAgentRun
- afterAgentRun
- onAgentFailure

#### Runtime Hooks

- beforeRuntimeSelect
- afterRuntimeSelect
- onRuntimeHeartbeatMissed
- beforeExecutionEnvPrepare
- afterExecutionEnvPrepare

#### Tool Hooks

- beforeToolCall
- afterToolCall
- onToolError

#### Artifact Hooks

- beforeArtifactPersist
- afterArtifactPersist
- onArtifactValidationFail

#### Repo Understanding Hooks

- beforeWorkspaceScan
- afterWorkspaceScan
- beforeMetadataExtract
- afterMetadataExtract
- beforeContextSlice
- afterTaskPacketBuild

### 19.2 各分類建議用途

#### onSessionStart / onSessionResume

- 注入 repo facts
- 注入 workflow constraints
- 注入安全規則

#### beforeAgentRun

- 正規化使用者輸入
- 附加 workflow metadata
- 記錄審計資料

#### beforeToolCall

- 允許 / 拒絕工具
- 攔截高風險操作
- 追加保護規則

#### afterToolCall

- 驗證輸出
- 萃取結構化摘要
- 寫入 event log

#### onSessionClose

- flush logs
- finalize artifacts
- 更新 run status

#### beforeRuntimeSelect / afterRuntimeSelect

- 根據 capability matrix 選 runtime
- 附加 safety profile
- 決定是否允許 workdir reuse

#### beforeWorkspaceScan / beforeMetadataExtract / afterTaskPacketBuild

- 控制掃描範圍
- 決定哪些 extractor 啟用
- 驗證 workspace map completeness
- 在進入 agent 前檢查 task packet 是否足夠

### 19.3 治理規則

- hook 主要做治理、驗證、補充 context、觀測
- hook 不應埋入複雜業務邏輯
- hook 失敗時要能明確標記來源
- hook 的副作用要可追蹤
- repo understanding hooks 應優先影響「前置資料品質」，而不是偷偷改寫 agent 任務目標

### 19.4 專案特定的 Hook 設定

各專案可透過 adapter 註冊專案特定的 hook 行為。這些不是 core 的預設行為，而是由各專案自行定義。

典型場景：

- 禁止未經審核的危險操作
- 自動附加行為不變條件
- 自動啟用特定審查 skill
- 記錄專案特定的審計資料
- 控制 legacy migration 時的掃描邊界與 context slice 規則

> ℹ️ ACC 的 hook 設定請參考：[ACC Project Profile](docs/projects/acc/project-profile.md) §7

## 20. Observability / Replay / Evaluation

這是必做，不是加分題。

### 20.1 必須記錄的內容

- `workflowId`
- `runId`
- `sessionId`
- `projectId`
- `agentId`
- `runtimeId`
- `provider`
- `stepId`
- `inputArtifactIds`
- `outputArtifactIds`
- `executionRunIds`
- `executionMessageCount`
- `providerSessionId`
- `workdirRefs`
- `toolCalls`
- `duration`
- `retryCount`
- `failureReason`
- `humanInterventions`
- user input
- selected workflow
- selected agents
- selected skills
- step start / end
- provider session id
- tool outputs 摘要
- review verdict
- artifacts created
- runtime selection reason
- safety profile applied
- token / time / error summary（若可取得）
- workspace scan 範圍
- extractor 啟用清單
- workspace-map 版本與 refresh mode
- context slice 命中檔案清單
- task packet 產生時間與來源 artifact
- cache hit / cache miss 指標

### 20.2 Replay 目標

你之後要能做到：

- 重播某次 workflow
- 只重放某個 step
- 對照修改前後規則造成的差異
- 比對補 prompt / 改 skill / 改 hook 前後差異
- 看哪個 step 最容易失敗
- 看哪個 agent 最常需要人工介入
- 看哪個 extractor 最容易產生不完整 context
- 產生 failure taxonomy
- 做 regression replay

### 20.3 Evaluation 指標

#### Workflow / Runtime 指標

- workflow completion rate（workflow 成功率）
- first-pass acceptance rate（review 通過率）
- review rejection rate
- bug fix hit rate（bug fix 命中率）
- artifact completeness（artifact 完整度）
- average human interventions per run（human intervention ratio）
- average retries per run（平均重試次數）
- average steps per workflow
- average time per workflow
- artifact reuse rate
- workspace-map refresh cost
- context slice precision / recall（以人工抽查或基準集評估）
- latency / token / cost

#### Stage 1 Adoption Gate 指標

Stage 1 不只要「技術上能跑」，也要能被團隊採用。建議至少追蹤：

- 新使用者是否能在 15 分鐘內完成第一次 `project init` 與第一次 `generic.review` CLI run。
- 至少 2 位非作者使用者能不靠作者協助跑完同一條 Review-first MVP workflow。
- `review-only` workflow 是否能產出可信的 `review-findings` / `delivery-summary` artifact。
- Phase 3A 的 `bug-fix` / patch-first workflow 是否能產出可 review 的 diff / artifact / command summary；Phase 3B 的 small `new-feature` 是否能產出可 review 的 delivery summary。
- review-only 或 bug-fix workflow 是否比純手動流程更省事。
- 失敗時是否能從 CLI 看出卡在哪個 step、哪個 artifact 或哪個 provider capability。
- 連續兩週是否仍有人願意主動使用，而不是只剩作者自己在維護 demo。

這些 adoption 指標應被視為 Stage 1 是否成功的一部分，而不是 Stage 2 介面做好之後才補的 UX 指標。

## 21. Interface 設計：CLI First, TUI / WebUI Later

### 21.1 Stage 1：CLI

定位：

- Stage 1 的唯一正式操作入口。
- 最容易落地、最好 debug、最適合 CI / automation。
- Phase 2 必須先能完成 Review-first MVP，而不是只做初始化或分析報告。
- Phase 3A 先完成受控 bug-fix / patch-first；Phase 3B 再完成小型 new-feature / enhancement。

Stage 1 CLI 至少支援：

```bash
forgeweave init --root .
forgeweave provider preflight --project acc
forgeweave run review --project acc --target src/app/foo
forgeweave run bug-fix --project acc --input issue.md --mode patch
forgeweave run new-feature --project acc --input feature-request.md --scope small
forgeweave resume run_123
forgeweave review run_123 --step review-diff --approve
forgeweave review run_123 --step review-diff --reject "請補測試與錯誤處理"
forgeweave artifacts show run_123
forgeweave logs show run_123
```

Stage 1 CLI 輸出至少要讓使用者看懂：

- 現在跑到哪個 workflow step。
- 目前 agent / runtime 是誰。
- provider capability matrix v0 是否通過。
- simple context packet / context budget 是否通過。
- 產生了哪些 artifact。
- Review-first MVP 產出了哪些 review findings。
- 哪些檔案被改動（Phase 3A 起）。
- lint / test / build / command runner 結果（Phase 3A 起）。
- 哪個 review gate 正在等待人工決策。
- 若失敗，失敗原因、可恢復位置與是否可 retry / resume。

### 21.2 Stage 2：TUI

定位：

- 在 CLI workflow 穩定後，提供開發中途互動與控制。
- 比 CLI 更容易看長任務狀態，但不應早於 Stage 1 feature delivery gate。
- 採 read-only first：先 inspect + review，再 retry / steer / queue。

Phase 5A 功能：

- workflow step tree。
- live logs。
- event timeline。
- agent / runtime status。
- pending review gate。
- artifact / diff 摘要。
- keyboard actions：approve / reject。

Phase 5B 功能：

- retry from step。
- steering / queueing。
- runtime status view。
- workdir / execution run inspect。

治理要求：TUI 不應成為第二個 workflow engine；所有操作都必須回寫正式 run state、review metadata 或 steering event。

### 21.3 Stage 2：WebUI

WebUI 不在 Stage 1 決定技術棧。進入 Stage 2 時，應先通過 `WebUI Tech Selection Gate`，再決定使用 Angular、Vite + React / Preact、Svelte、Lit、HTMX 或其他方案。

定位：

- 團隊共用檢視。
- 管理歷史 run。
- 觀察系統穩定性。
- 支援 replay、metrics 與跨 run 比較。
- 採 read-only first：先檢視已存在 run，再做 replay / metrics / drift。

Phase 6A 功能：

- run list / run history。
- execution history。
- artifact viewer。
- diff / review panel。
- 可檢視 CLI / TUI run。

Phase 6B 功能：

- replay / timeline。
- run comparison。
- metrics board。
- workspace-map / context-slice viewer。
- workspace understanding drift monitoring。

治理要求：第一版 WebUI 不引入新的 workflow 執行語意；它先讀取與呈現 CLI / TUI 已產生的正式資料模型。

## 22. Project Adapter 設計

這是讓它能跨專案重用的關鍵。

### 22.1 Adapter 分層模型

Adapter 不應只有「有 / 沒有專案專用 adapter」兩種狀態。建議採用四層：

```text
BaseProjectAdapter
  ↓
GenericProjectAdapter
  ↓
FrameworkProjectAdapter
  ↓
ProjectSpecificAdapter
```

#### BaseProjectAdapter

BaseProjectAdapter 是 interface 與共用工具層，負責定義 adapter 合約，不一定能直接處理真實專案。

#### GenericProjectAdapter

GenericProjectAdapter 是所有新專案的預設入口。它不假設特定 framework，只提供通用 repo 能力：

- 讀取 `project-manifest.yml`
- 透過 Project Asset Resolver 讀取 Provider Asset Profile
- 正規化 provider-specific agents / skills / instructions
- 掃描檔案樹
- 讀取 `package.json`、`README.md`、`tsconfig.json`、`pyproject.toml`、`pom.xml` 等常見檔案
- 建立基本 workspace map
- 根據 changed files / target paths 做基本 context slicing
- 使用 manifest 中定義的 install / lint / test / build commands
- 產生基本 task packet

如果一個新專案沒有特殊 repo 理解需求，應先用 GenericProjectAdapter 跑起來。

#### FrameworkProjectAdapter

FrameworkProjectAdapter 用於常見框架或技術棧，例如：

- `AngularProjectAdapter`
- `ReactProjectAdapter`
- `NodeTsProjectAdapter`
- `JavaSpringProjectAdapter`
- `PythonProjectAdapter`

Framework adapter 比 generic 多理解框架語意，例如 Angular adapter 可理解 component / template / style / spec 關聯、route、service、store、guard、resolver、Angular Material 與 migration mapping。

#### ProjectSpecificAdapter

ProjectSpecificAdapter 只用於某個專案有強 domain 規則、特殊 repo 結構、特殊 migration 或特殊 review gate 時。

例如 ACC adapter 可包含：

- ACC 專案自己的 AngularJS to Angular migration mapping
- 特定 folder convention
- 特定 review policy
- 特定 enterprise UI / domain glossary
- 特定 API / permission / routing 規則
- 特定 artifact schema 擴充

預設選擇順序：

```text
新專案先用 GenericProjectAdapter
如果 framework 明確，升級到 FrameworkProjectAdapter
如果仍不夠，再建立 ProjectSpecificAdapter
```

### 22.2 Base Adapter 責任

```ts
/**
 * ProjectAdapter 拆分為 5 個職責明確的子 interface，
 * 遵循 Interface Segregation Principle（ISP），
 * 避免單一肥大 interface（原始 12 個方法）。
 */

/** 1. 專案偵測與辨識 */
interface ProjectDetector {
  id: string;
  detect(rootPath: string): Promise<boolean>;
  loadManifest(rootPath: string): Promise<ProjectManifest>;
}

/** 2. 專案資產載入 */
interface ProjectAssetLoader {
  loadAgents(rootPath: string): Promise<ProjectAgentDefinition[]>;
  loadSkills(rootPath: string): Promise<ProjectSkillDefinition[]>;
  loadInstructions(rootPath: string): Promise<ProjectInstructionSet>;
  loadWorkflows(rootPath: string): Promise<WorkflowDefinition[]>;
}

/** 3. 政策與事實提供者 */
interface ProjectPolicyProvider {
  getRepoFacts(rootPath: string): Promise<Record<string, unknown>>;
  getExecutionPolicies(rootPath: string): Promise<Record<string, unknown>>;
}

/** 4. Workspace 掃描與抽取 */
interface ProjectScanner {
  scanWorkspace(rootPath: string): Promise<WorkspaceScan>;
  extractMetadata(
    rootPath: string,
    scan: WorkspaceScan,
  ): Promise<ExtractedMetadata>;
  buildWorkspaceMap(
    rootPath: string,
    metadata: ExtractedMetadata,
  ): Promise<WorkspaceMap>;
}

/** 5. Context 切片與 Task Packet 組裝 */
interface ProjectContextProvider {
  sliceContext(input: {
    workflowId: string;
    stepId: string;
    workspaceMap: WorkspaceMap;
    repoFacts: Record<string, unknown>;
    changedFiles?: string[];
    targetPaths?: string[];
  }): Promise<ContextSlice>;
  buildTaskPacket(input: {
    workflowId: string;
    stepId: string;
    contextSlice: ContextSlice;
    inputArtifacts: BaseArtifact[];
  }): Promise<TaskPacket>;
}

/** 組合型 adapter，向後相容 */
type ProjectAdapter = ProjectDetector &
  ProjectAssetLoader &
  ProjectPolicyProvider &
  ProjectScanner &
  ProjectContextProvider;
```

### 22.3 專案 Adapter 實作指引

每個專案的 adapter 應負責：

- 透過 Provider Asset Profile 讀取專案的 agents、skills、instructions 與 workflow presets
- 讀取專案特定的 registry 檔案
- 補充專案特定的 repo facts
- 將專案的 workflow 映射為 orchestrator workflow
- 提供專案特定的 runtime / safety / execution environment policy
- 定義該專案的掃描規則
- 定義該專案的 deterministic extractor 組合
- 定義 workspace map 結構
- 定義 context slice 規則
- 定義 task packet 的最小必要欄位

具體的 adapter 設定應記錄在各專案的 **Project Profile** 中。

> ℹ️ ACC adapter 的詳細設定請參考：[ACC Project Profile](docs/projects/acc/project-profile.md) §6

### 22.4 何時需要建立專用 Adapter

判斷原則：

```text
如果差異可以用 manifest 或 project assets 表達，就不要建立專用 adapter。
如果差異需要程式邏輯才能正確處理，就建立專用 adapter。
```

| 情境 | 用 manifest / assets 即可 | 需要專用 adapter |
| ---- | ------------------------- | ---------------- |
| 改 build / test / lint 指令 | yes | no |
| 啟用或停用 workflow | yes | no |
| 指定 workflow step 使用哪個 agent | yes | no |
| 增加 provider-specific skills | yes | no |
| 增加 coding rules / review checklist | yes | no |
| 增加 domain glossary | yes | no |
| 調整掃描 include / exclude 目錄 | yes | maybe |
| 需要解析 framework metadata | maybe | yes |
| 需要建立 component-template-service 關聯 | no | yes |
| 需要特殊 context slicing 邏輯 | no | yes |
| 需要客製 repo facts normalization | no | yes |
| 需要特殊 migration mapping | no | yes |
| 需要特殊 artifact schema | maybe | yes |
| 需要特殊 safety / execution policy | maybe | yes |
| 需要依 AST / template / config 解析專案結構 | no | yes |

實務判斷流程：

```text
Step 1: Generic adapter 能不能跑？
  可以 → 先不要建專用 adapter

Step 2: 只靠 manifest 能不能補足？
  可以 → 不要建專用 adapter

Step 3: 只靠 Provider Asset Profile 載入的 instructions / agents / skills 能不能補足？
  可以 → 不要建專用 adapter

Step 4: 是否需要寫程式來理解 repo？
  需要 → 建 framework adapter 或專用 adapter

Step 5: 這個邏輯是否能被同類專案重用？
  能 → 建 framework adapter
  不能 → 建 project-specific adapter
```

一定要考慮專用 adapter 的情況：

- 專案結構不是標準框架慣例
- context slicing 不能靠檔案鄰近、changed files 或 import graph 解決
- 有大型 migration 規則，例如 AngularJS to Angular、Vue 2 to Vue 3、Java 8 to Java 17
- review policy 有 domain-specific gate，例如權限、稽核、交易一致性、資安規則、資料遮罩
- 需要專案特定 artifact，例如 migration report、screen mapping report、API compatibility matrix
- command orchestration 需要依變更範圍動態選擇測試、內部工具或報告

不要因為以下原因建立專用 adapter：

- 只是 build 指令不同
- 只是資料夾名稱不同
- 只是 coding style 不同
- 只是多幾個 agents
- 只是多幾個 skills
- 只是 workflow 順序略有不同
- 只是加入 README、domain docs、glossary
- 只是 review checklist 不同

這些應優先用 `project-manifest.yml`、Provider Asset Profile、Project Assets 與 Project Profile 解決。

### 22.5 Adapter Selection Rule

建議將以下規則寫成正式工程規範：

```text
Default:
  All projects start with GenericProjectAdapter.

Use FrameworkProjectAdapter when:
  The project follows a common framework and framework semantics improve scan,
  extraction, workspace map quality, or context slicing.

Create ProjectSpecificAdapter only when:
  The project requires custom code to detect relationships, normalize repo facts,
  slice context, enforce policy, orchestrate commands, or produce project-specific artifacts.

Do not create ProjectSpecificAdapter for:
  commands, enabled workflows, agent routing, skill routing, coding rules,
  glossary, or review checklist only.
```

### 22.6 Adapter Recommendation 機制

平台應提供輕量級的 Adapter Recommendation / Adapter Decision 機制，用於回答：

> 這個新專案用 GenericProjectAdapter 就夠了，還是應該升級到 framework adapter，甚至建立 project-specific adapter？

它的目標是避免兩種失衡：

- 太早建立專用 adapter，造成 adapter 數量膨脹
- 太晚建立專用 adapter，導致特殊規則被塞進 manifest、instructions 或 workflow，形成隱性複雜度

建議 CLI：

```bash
forgeweave adapter recommend --project ./some-repo
forgeweave init --root . --recommend-adapter
```

最小可行流程：

```text
1. Detect project type
2. Evaluate generic / framework adapter fit
3. Recommend whether project-specific adapter is needed
4. Produce AdapterDecisionReport artifact
```

偵測訊號包含：

- `package.json`
- `angular.json`
- `vite.config.ts`
- `next.config.js`
- `pom.xml`
- `build.gradle`
- `pyproject.toml`
- `requirements.txt`
- provider asset profile signals
- provider-specific agent / skill directories
- folder convention
- dependency list
- test framework
- route / module / component patterns

推薦結果應用 scoring，而不是只回傳 yes / no：

```text
0 - 30: Generic adapter
31 - 60: Framework adapter
61 - 100: Project-specific adapter likely needed
```

分數只作為診斷，不應過度精密；重點是理由透明。

```ts
interface AdapterDecisionReport {
  projectId?: string;
  detectedProjectTypes: DetectedProjectType[];
  recommendedAdapter:
    | "generic"
    | "angular"
    | "react"
    | "node-ts"
    | "java-spring"
    | "python"
    | "project-specific";
  confidence: number;
  projectSpecificAdapterNeeded: boolean;
  reasons: string[];
  risks: string[];
  manifestOnlyFit: boolean;
  frameworkAdapterFit: boolean;
  missingSignals: string[];
  suggestedOverrides: string[];
}
```

範例輸出：

```text
Recommendation: Use AngularProjectAdapter
Confidence: 0.82

Reasons:
- package.json includes @angular/core
- angular.json exists
- tsconfig.app.json exists
- src/app contains components and routes
- project-manifest.yml does not define custom context slicing

No project-specific adapter needed yet.

Suggested next step:
- Use AngularProjectAdapter
- Add project-manifest.yml
- Run forgeweave scan
```

另一種範例：

```text
Recommendation: Create ProjectSpecificAdapter
Confidence: 0.76

Reasons:
- Multiple framework patterns detected: AngularJS + Angular
- Legacy mapping files found
- Context requires cross-linking controller/template/component files
- Migration workflow requires custom artifact schema
- Manifest alone cannot express relationship extraction

Suggested adapter base:
- Extend AngularProjectAdapter
```

邊界：

```text
建立 Adapter Recommendation 機制
不要建立 Adapter Auto-Generation 機制
```

這個機制可以推薦使用 generic、framework 或 project-specific adapter，但不應自動產生大量客製 adapter，也不應自動修改 workflow 或 core。

### 22.7 為什麼這樣可重用

未來換別的專案時，只要：

- 先使用 GenericProjectAdapter 或 FrameworkProjectAdapter
- 僅在需要程式邏輯時實作新的 ProjectSpecificAdapter
- 提供該專案自己的 workflows / agents / skills
- 提供該專案自己的 scan / extract / slice policy

就不需要重寫 orchestrator core。

## 23. Agent 工程與 Harness 設計實踐原則

本章整合 Context Engineering、Skill 化、Harness Engineering 等外部實踐分析的核心結論。

### 23.1 必須吸收的核心概念

1. **任務分級**：先區分 API Call / Workflow / Agent 三種工作型態，不是所有事都需要靈活但昂貴的 AI Agent 去解決。
2. **Context Engineering 是核心（情境工程：控制 AI 該看什麼、不該看什麼的技術）**：真正影響系統穩定度的，往往不是提示詞（Prompt）寫得多好，而是上下文怎麼被組裝——給什麼資料、不給什麼、什麼時候給、用什麼形式給。
3. **Context Isolation（上下文隔離邊界）**：不一次把所有無關的檔案丟給 AI。控制讓模型「只看見當下這一步最需要的資訊片斷」，避免背景雜音干擾規則與程式生成。
4. **Skill 化高頻任務（封裝專屬技能）**：把可重用的能力拆成獨立的 Skill，比塞進一份超級冗長的提示詞裡還要更好維護、可測試、可共享。
5. **Sub-agent 只在需要上下文隔離時才拆（避免過度分工）**：不要為了讓系統看起來有很多「代理人」而硬拆（不是為了多 agent 而多 agent），只有在需要切換不同資訊視角時才進行分頭作業。
6. **Memory 不是資料垃圾桶（這不單純只是聊天紀錄）**：重點是關聯引用、權限檢查、保留策略；如果是大型內容（例如整份專案架構），應用外部記憶體或檔案系統傳遞，只丟給 AI 「檔案路徑與 ID」。
7. **長任務必須有 Restatement（中途重申防偏航）**：每做完一步，就命令 AI 重新陳述目前進度、下一步與關鍵約束，藉以控制模型的注意力不要在漫長對話中飄移。
8. **Review 機制是長任務必備件（審查卡控）**：外掛工具查出來的結果不一定對，必須要有查證關卡去驗證。
9. **Logging / Eval / Replay 從第一天就做（記錄、評估與重播機制）**：留存 AI 每一段的思考軌跡以便除錯，這不是等系統成熟後才補的功能。
10. **KV Cache 思維安排 prompt（快取友善的提示詞設計）**：固定的系統規則放前面，變動的內容放後段；這樣能提高底層語言模型的快取命中率，提升算力效率。
11. **AI 工程重心遷移**：Prompt Engineering（專注寫神級提示詞） → Context Engineering（專注餵對資料） → Harness Engineering（打造穩固的 AI 基礎設施）。本工具的定位就是在做基礎設施（Harness 層級）。
12. **Agent 表現 = 模型能力 × Harness 設計**：不只一味去換更強的模型（如 GPT-4 / Claude 3.5），更要把執行框架顧好才能發揮其上限。
13. **Runtime（執行環境）不只是 prompt 容器**：而是包含工具調用、狀態管理、記憶與壓縮、規劃與分工、錯誤處理、重試與恢復、觀測與評估、人類介入點、安全邊界的完整底層執行框架。
14. **工具定義越清楚，agent 越穩**：提供給 AI 的 tool schema（工具使用規格書）設計精確與否，是整個基礎設施的關鍵一環。
15. **評估不只看最終答案**：還要看任務成功率、工具誤用率、重試次數、思路路徑穩定性、成本效能比。

### 23.2 套用到本工具的具體結果

- 核心抽象應該是 **workflow run（紀錄整趟工作流）** 而不僅僅是 chat session（聊天視窗對談）。
- workflow step（流程步驟）必須清楚定義，每步的輸入與輸出規格（input / output schema）要明確。
- Agent 之間不得裸傳大段自然語言作溝通，要用 **structured artifact handoff（具有標準規格的產出物交接單）**。
- **review gate（審查關卡）** 與 **artifact storage（產出物保存空間）** 是系統的一等公民，它們是核心，不是順便做的附加功能。
- Orchestrator 應優先選擇呼叫 skill（使用既有技能）、rule（遵守規則）或 workflow（循規蹈矩走流程），而不是盲目擴充花俏的 agent 數量。
- 長任務每步完成後產生 Restatement（重申進度），防止模型聊到偏航。
- 大型內容（如系統規格 spec / 資料庫 schema / 原始碼 code）用 **artifact reference（檔案位置指標）** 傳遞，不用提示詞硬塞。
- 系統 prompt 結構要考慮 KV Cache（快取機制）的命中率。
- **state（狀態）** 與 **artifact（產出物）** 應該明確地保存在大腦外部，不依賴模型自己脆弱的回溯記憶。
- **hooks（執行前後攔截器）** / **review（審查）** / **human override（人類中斷介入）** 必須是正式支援的功能。
- **event bus（事件廣播匯流排）** / **tracing（路徑追蹤）** 從第一天就必須有，確保整座系統無時無刻具有可觀測性。
- session persistence（連線持久化）要與 workflow state（任務狀態）一起設計，支援中斷建立 checkpoint 與隨時恢復。
- **runtime registry（可用引擎註冊表）** 與 **execution run / message store（執行與對話歷史紀錄庫）** 應當成正式的系統核心模型建置。
- tool schema（提供給 AI 的工具說明書）設計應納入嚴謹的 contracts 層級，確保交給 AI 的工具定義清晰不含糊。
- **memory lifecycle（記憶生命週期）** 要有明確策略：什麼對話該保留、什麼對話該壓縮精簡、什麼廢話該丟棄。
- 安全邊界（guardrails）要納入 hook 與 review gate 中防堵。
- **execution environment（執行環境）** 如 workdir（工作資料夾）、context files（被允許看見的檔案）、sandbox（防護沙盒）、reuse policy（目錄重複利用政策）都要被顯式地治理，而非放生狀態。

---

## 24. JSDoc 繁體中文規範

你要求必要時加上 JSDoc，且必須使用統一句型與標註規則。

### 24.1 原則

- 只為「公共函式、核心流程、重要型別、跨模組介面」寫 JSDoc
- 不為顯而易見的一行小工具寫長註解
- 重點是說明 **責任、輸入、輸出、限制、錯誤情境**
- 用字統一、繁體中文、句型固定
- 僅在公開 API、核心流程、複雜邏輯處強制要求
- 簡單 getter / setter / 一行函式不強制補 JSDoc

### 24.2 建議句型

#### 函式

```ts
/**
 * 說明此函式的主要責任。
 *
 * @param input 說明此參數的用途與限制。
 * @param context 說明此參數的用途與限制。
 * @returns 回傳值的意義與使用時機。
 * @throws 當發生何種情況時會拋出錯誤。
 */
```

#### 類別

```ts
/**
 * 說明此類別在系統中的角色與責任。
 *
 * 此類別負責：
 * - 職責一
 * - 職責二
 * - 職責三
 */
```

#### 型別

```ts
/**
 * 表示某個 artifact / event / workflow step 的結構。
 */
```

### 24.3 建議標註規則

- 第一行一定是「主要責任」
- `@param` 一律描述用途與限制
- `@param` 句型固定為「表示……」
- `@returns` 一律描述語意，不只描述型別
- `@returns` 句型固定為「回傳……」
- `@throws` 只在真的可能拋錯時寫
- `@throws` 句型固定為「當……時拋出」
- 不寫口語化、情緒化註解
- 不中英混雜亂切

### 24.4 建議範例

```ts
/**
 * 說明建立工作流程執行上下文的主要用途。
 * @param projectAdapter 表示目前專案所使用的適配器。
 * @param workflowDefinition 表示本次要執行的工作流程定義。
 * @returns 回傳可供後續步驟共用的執行上下文。
 * @throws 當工作流程定義無效時拋出錯誤。
 */
```

---

## 25. 技術選型建議

### 25.1 語言

- TypeScript

理由：

- 與 ACC / Angular 生態一致
- 與 Runtime Provider Contract、GitHub Copilot SDK reference provider 與前端 tooling 的 TypeScript 使用體驗最直接
- schema / contracts / CLI / TUI / WebUI 型別共用方便

### 25.2 契約驗證

- Zod + TypeScript types

理由：

- handoff 與 artifact 非常適合 runtime schema validation
- `workspace-map`、`context-slice`、`task-packet` 都需要明確 contract

### 25.3 persistence

Stage 1 建議：

- file system + JSONL / JSON（run、step、artifact、events）
- 暫不引入 SQLite 作為必要條件
- 暫不做完整 execution message store
- 但必須保留 run / step / artifact / command result 可追查

理由：

- 先求簡單可 debug
- CLI 階段最重要的是「能跑完、能看懂、能恢復」
- 之後再抽 storage adapter

Phase 4或 Stage 2 再加入：

- execution message persistence
- SQLite 作為推薦索引層（run、execution、runtime、usage）

### 25.4 WebUI Tech Selection Gate

WebUI 屬於 Stage 2，不應成為 Stage 1 CLI functional delivery 的前置條件，也不應在 Stage 1 就寫死技術棧。

進入 Stage 2 前，應先做一個小型 spike，根據以下條件決定 WebUI 技術：

| 評估條件 | 問題 |
| -------- | ---- |
| UI 複雜度 | 只是 run list / artifact viewer，還是會有複雜 dashboard、diff review、workspace-map viewer？ |
| 團隊能力 | 團隊是否已熟 Angular？是否需要用 WebUI 作為 Angular agent team 的展示平台？ |
| 開發速度 | 第一版 WebUI 是否需要非常快做出來？ |
| 維護成本 | 是否願意承擔完整 SPA framework、routing、state、component library 的成本？ |
| 嵌入需求 | WebUI 是否要嵌入其他工具、文件站或不同 framework 的 shell？ |
| 長期產品化 | WebUI 是短期內部工具，還是長期團隊平台？ |

候選方案：

| 方案 | 適合情境 | 評估 |
| ---- | -------- | ---- |
| Angular | 長期團隊 dashboard、複雜表單、企業 UI、想展示 Angular agent team 實戰能力 | 功能完整，但第一版成本較高 |
| Vite + React / Preact | 想快速做 SPA dashboard，生態成熟，UI 彈性高 | 比 Angular 輕，適合快速 spike |
| Svelte / SvelteKit | 想用較少樣板碼做互動 UI | 中小型工具 UI 很適合 |
| Lit | 想做 framework-neutral web components，方便嵌入不同 shell | 適合可嵌入元件與跨框架使用 |
| HTMX + server-rendered UI | 只是內部工具、互動簡單、偏 server-driven | 最輕，但不適合複雜前端互動 |

建議決策：

```text
如果 WebUI 是企業級長期 dashboard，Angular 可以作為 default candidate。
如果第一版只需要 run history / artifact viewer / review panel，先用 Vite + Preact / React 或 Svelte 做 spike。
如果 WebUI 需要嵌入多種框架或文件站，優先評估 Lit。
如果只是極簡內部管理頁，HTMX 也可以列入候選。
```

原則：

- Angular 是候選方案，不是 Stage 1 的固定承諾。
- WebUI 技術選型應在 Stage 2 依實際 UI 複雜度決定。
- Stage 1 只能要求 presenters / view model 保持可被未來 WebUI 重用。

### 25.5 TUI

- Node.js TUI library（依開發偏好選一套輕量方案）

原則：

- 不追求華麗
- 只追求步驟、事件、審核狀態清楚
- TUI 屬於 Stage 2，不應早於 Review-first MVP、patch-first gate 與 small feature delivery gate

### 25.6 Runtime Process Model

建議分階段：

- Phase 1：Copilot SDK reference provider + MockRuntimeProvider + local execution env，並完成 Provider Reality Check / Capability Matrix v0。
- Phase 2：最小 runtime event adapter、minimal run / step state、event envelope、artifact store 與 review gate persistence。
- Phase 3A：command runner skeleton、workdir / branch / dirty-state guard、patch / diff mode、command allowlist、external network blocked default。
- Phase 3B：在 3A 通過後，允許小型 new-feature / enhancement workflow 使用 workspace-write。
- Phase 4A：正式化 runtime registry、provider selector、provider capability matrix v1、degraded mode 與 provider replacement boundary。
- Phase 4B：正式化 execution run schema、execution message schema、checkpoint / resume 與 observability logging。
- Stage 2：補背景執行骨架、TUI 操作能力與可視化 runtime inspection。
- Stage 2 後段：視需要加入 local daemon / shared runtime / additional provider。

### 25.7 Repo Understanding Layer 技術建議

Stage 1 前段只做最小上下文包裝：

- manifest + target files + changed files。
- 檔案系統掃描的最小範圍。
- Git diff 作為變更範圍判定。
- 手動指定相關檔案。
- context budget / over-budget fallback。
- 產出簡化版 context packet，不要求完整 `workspace-map` / `context-slice` / `task-packet` artifact。

Phase 4C 再優先考慮正式 workspace understanding baseline：

- `ts-morph`：TypeScript / Angular 程式結構抽取。
- TypeScript Compiler API：更底層的 AST 與型別資訊。
- Angular template parser：模板關聯抽取。
- ESLint parser：規則與靜態分析整合。

### 25.8 Workspace Understanding Coverage Boundary

為避免 workspace understanding 變成最大成本黑洞，Phase 4C 必須把 generic baseline 與 framework-specific extension 分開。

#### Generic Workspace Boundary

所有專案共用的 generic baseline 先限制在：

- project signals。
- source roots / test roots。
- package manager / build tool / command map。
- target files / changed files。
- dependency / import graph baseline。
- related test discovery baseline。
- changed files dependency slice。
- high-risk file detection。
- context-slice correctness fixture。

#### Angular / ACC Extension Boundary

Angular / ACC 相關項目只屬於 framework / project extension，不得寫成 generic core 要求：

- route map。
- component / template / style / service relation。
- Angular related spec discovery。
- signal / store / service relation。
- migration mapping。
- ACC domain glossary / enterprise UI / permission / routing rules。

以下能力延後到 Stage 2 或後續版本：

- 完整 legacy mapping。
- 完整 style token graph。
- 完整 store graph。
- 大型 workspace-map visual editor。
- drift detector dashboard。

原則：

- 優先 deterministic。
- 優先可重現。
- 優先能增量。
- 不在 Stage 1 就追求完整 semantic graph。
- 不讓 Angular / ACC extension 污染 runtime-agnostic core。

## 26. KISS 對應的落地規則

為了避免系統長成一個很難維護的怪物，建議強制這些規則：

### 26.1 Stage 1 禁止事項

詳見 §3.4 Non-Goals。此處只補充工程實踐層面的禁止事項：

- 不要一次實作 6 個 workflow。
- 不要把單一 workflow 拆成十幾個 agent。
- 不要在 Stage 1 就做完整 semantic graph。
- 不要在 Phase 1 / 2 就做完整 runtime registry；但必須有 capability matrix v0。
- 不要在 Phase 2 就自動修改檔案。
- 不要在 Phase 3A 前允許 workspace-write。
- 不要在 workspace-write 前缺少 command runner、workdir guard、dirty-state check、patch / diff mode 與 command allowlist。
- 不要在 Stage 1 前段就做完整 execution message store。
- 不要在 Stage 1 前段就做完整 workspace-map / context-slice / task-packet artifact 鏈。
- 不要在 Stage 1 做正式 TUI / WebUI 產品化。
- 不要把 Angular / ACC workspace understanding 寫成 generic core 要求。
- 不要為了「通用」而提早抽象化未經第二專案驗證的模組。

### 26.2 Stage 1 允許事項

Stage 1 允許的重點不是「功能越多越好」，而是：

- 允許以同一條高價值 workflow 類型在至少 2 個專案做端到端垂直切片驗證。
- 允許把 Provider Reality Check / Capability Matrix v0 放進 Phase 1，因為它會影響後續 runtime、event、resume 與 hook 設計。
- 允許把 `generic.review` / `review-only` 作為 Phase 2 MVP，因為它能安全驗證 context、artifact、review gate、state 與 persistence。
- 允許把 `generic.bug-fix` / patch-first 作為 Phase 3A 核心目標，因為它能用較低風險驗證自動改檔。
- 允許把小型 `generic.new-feature` / enhancement 作為 Phase 3B 目標，但不得早於 Phase 3A。
- 允許使用少量高價值 agent，但不鼓勵 agent 數量膨脹。
- 允許最小可用的 artifact、state、review、logging、event envelope 與 context packet 骨架。
- 允許用 GitHub Copilot SDK reference provider 先證明方向。
- 允許用 MockRuntimeProvider 做測試、fixture 與 smoke test。
- 允許 CLI 優先，暫不追求完整互動介面。

完整 Stage 1 必交項仍以 `§32.1～§32.5 Phase 0～4 必交` 為準。

### 26.3 Stage 1 的最小可行核心

Stage 1 的工程原則是：先保留能證明「CLI 能安全完成 Review-first MVP，且同一條 onboarding / workflow 路徑能在至少兩個專案跑得起來」的最小子集；通過後再擴展到「CLI 能先完成受控 bug-fix / patch，再完成小型功能交付」。

完整必交項請以 `§32.1～§32.5 Phase 0～4 必交` 為唯一真相來源；本章不重複列出 checklist。

### 26.4 Stage 2 的擴充範圍

Stage 1 Review-first MVP、CLI patch-first gate 與 small feature delivery gate 都通過後，Stage 2 再補 TUI / WebUI。Stage 2 同樣採 read-only first：Phase 5A / 6A 先檢視與審核，Phase 5B / 6B 再介入、重跑、steer、replay、metrics 與 drift monitoring。

完整必交項請以 `§32.6～§32.7 Phase 5～6 必交` 為準。

---

## 27. 風險與對策

### 27.1 風險：過度設計

對策：

- Stage 1 不做 plugin system
- Stage 1 不做過細的 agent graph editor
- Stage 1 前段僅保留 1 到 2 個 workflow 與必要 artifacts
- Phase 2 的核心 gate 是 `generic.review` / `review-only`，Phase 3A 才是 `generic.bug-fix` / patch-first，Phase 3B 才是 small `generic.new-feature`；不要一口氣補齊所有 workflow
- Stage 2 再評估 migration / refactor / optimization 等更多 workflow 與體驗層能力

### 27.2 風險：agent 太多導致管理成本高

對策：

- 先以現有 ACC agent 為主
- 只補 3 到 4 個真正缺口 agent
- 優先 skill routing 而不是 agent 爆增

### 27.3 風險：上下文污染

對策：

- 每個 step 僅拿需要的 artifact
- 不共享完整歷史對話
- 使用結構化 handoff
- 由 context slicer 控制 agent 可見範圍，而不是靠 prompt 自律

### 27.4 風險：長任務中斷後無法恢復

對策：

- session persistence + workflow checkpoint 雙層保存
- 明確 Resume Model（參見第 17 章）
- 恢復時優先載入 workspace-map / context-slice / task-packet

### 27.5 風險：成果不可驗證

對策：

- review gate
- QA gate
- artifact status
- replay log

### 27.6 風險：provider capability 不一致

對策：

- 建立 capability matrix
- runtime 選擇以前先驗證 provider 能力
- resume、skills、usage、sandbox 不做隱含假設

### 27.7 風險：workdir reuse 造成狀態污染

對策：

- 預設 `conditional`
- reuse 前檢查 repo / branch / dirty state
- 高風險流程強制 fresh workdir

### 27.8 風險：workspace map 過期或切片不準

對策：

- 預設 incremental refresh
- 對高風險工作流強制 refresh 相關區塊
- 記錄 context slice 命中率與人工修正情況
- 對 migration / review / refactor 類流程加入人工抽查點

### 27.9 風險：缺乏測試策略導致 stage 完成但不可驗證

對策：

系統不只需要「能跑」，還需要在每個 stage 都有最低可驗證門檻。以下測試策略應與交付清單綁定，而不是等實作完成後再補。

#### 測試分層

| 層級 | 目標 | 典型內容 |
| --- | --- | --- |
| Unit | 驗證單一模組邏輯 | schema、state transition、step runner、policy 判斷 |
| Contract | 驗證結構契約穩定 | artifact schema、event schema、provider capability matrix、task-packet contract |
| Integration | 驗證模組協作 | runtime-bridge、copilot-sdk provider、artifact store、hook pipeline、resume flow、command runner |
| Workflow E2E | 驗證端到端流程 | CLI 啟動 workflow、產出 artifact、通過 review gate、受控 diff |
| Regression | 驗證變更不使既有流程退化 | phase 升級後重跑既有 workflow fixture |
| Evaluation Fixture | 驗證輸出品質與邊界 | golden review input、fake repo bug、expected context-slice、bad artifact schema、provider failure fixture |

#### Phase 0 Foundation / Repo Scaffold 最低測試要求

- monorepo skeleton 可安裝、可 build、可執行基本測試。
- `contracts` package 至少有 schema parse / reject 測試。
- CLI skeleton 至少有一條 smoke test。
- local fixture / mock runtime 測試資料可以被載入。
- CI 或本機 test command 能驗證最小骨架沒有破裂。

#### Phase 1 Project Onboarding + Provider Reality Check MVP 最低測試要求

- `project init` / manifest normalization / adapter recommendation 至少有一組基本整合測試。
- Provider Asset Profile gap analysis 與 simple context packet 產出至少有 fixture-based 測試。
- Provider Reality Check 至少有 mock-based test，能產出 `provider-preflight-report` 與 `provider-capability-matrix` v0。
- ACC reference project 可完成 onboarding smoke test。
- 第二個 minimal project 可完成同一路徑 onboarding smoke test。
- onboarding report 必須能指出缺失資產、建議 adapter、provider gap 與下一步 workflow。

#### Phase 2 Review-first MVP 最低測試要求

- `generic.review` / `review-only` 至少在 ACC 與 1 個第二專案完成 CLI E2E 驗證。
- `review-findings`、`delivery-summary`、review decision metadata 必須有 schema 測試。
- `workflow-runner` 至少覆蓋正常、retry、fail 三類案例。
- minimal run / step state machine 至少覆蓋合法轉移與基本非法轉移。
- minimal event envelope 至少能保存 run.started、step.started、artifact.created、review.requested、review.decided、run.completed / failed。
- manual review gate 至少覆蓋 approve / reject / reject with reason。
- local JSON / JSONL persistence 至少能保存 run、step、artifact、logs、events。
- MVP 明確不要求自動改檔、不要求完整 `new-feature`、不要求完整 workspace-map。

#### Phase 3A Controlled Bug-fix / Patch-first 最低測試要求

- `generic.bug-fix` / patch-first workflow 至少在 ACC 完成 1 個小型 bug-fix CLI E2E。
- command runner skeleton 至少覆蓋 allowed command、blocked command、failed command、timeout command。
- workdir / branch / dirty-state guard 至少有測試。
- file allowlist / denylist 與 patch / diff artifact 至少有 contract test。
- bug-brief、patch-plan、file-change-set、command-summary、review-findings、delivery-summary 都必須通過 schema 驗證。
- review gate 被 reject 後，可帶 reject reason 重跑 implementation 或 validation step。
- 失敗時 CLI 能顯示失敗 step、原因與可恢復位置。

#### Phase 3B Small New-feature / Enhancement 最低測試要求

- `generic.new-feature` 或 enhancement workflow 至少在 ACC 完成 1 個小型 CLI E2E 驗證。
- 第二專案至少完成簡化版 `generic.bug-fix` 或小型 enhancement workflow 驗證。
- requirement-brief、feature-spec / implementation-plan、file-change-set、test-report / command summary 都必須通過 schema 驗證。
- lint / test / build command summary 必須被記錄為 artifact 或 command result。
- 產出的 diff / artifact / command summary 可供人工 review。

#### Phase 4 Runtime / State / Workspace Hardening 最低測試要求

- Runtime Provider Contract、CopilotSdkRuntimeProvider、MockRuntimeProvider 至少有 mock-based integration test。
- runtime registry、provider selector 與 provider capability matrix v1 有 contract test。
- workflow state machine 的合法轉移與非法轉移皆有測試。
- checkpoint / resume 至少有一組 round-trip test。
- execution run schema、execution message schema 與 event replay 至少有 fixture-based 測試。
- hook ordering 與 side effect 邊界有測試。
- GenericProjectAdapter / FrameworkProjectAdapter 的選擇與覆寫邊界有測試。
- generic workspace scanner / extractor baseline 至少有 fixture-based 測試。
- Angular / ACC extension 測試不得成為 generic core test 的必要條件。
- context-slice correctness 有可比對輸出。
- workspace understanding pipeline 升級後，不應讓既有 CLI workflow 品質退化。
- ACC single-page legacy migration 至少完成 dry-run 與 patch-run E2E；必須驗證 migration-analysis、legacy-modern-mapping、file-change-set、command-summary、review-findings 與 delivery-summary。

#### Phase 5 TUI Experience 最低測試要求

- Phase 5A 至少一條 TUI read-only inspect + review gate 操作路徑具備 smoke test。
- timeline / step tree / live logs 能讀取既有 CLI run。
- approve / reject 至少有操作層測試或 fixture 驗證。
- Phase 5B 的 retry / steer / queueing 必須證明不會繞過 workflow state machine。
- TUI 不應改變 workflow state machine 的正式語意。

#### Phase 6 WebUI / Replay / Metrics 最低測試要求

- WebUI Tech Selection Gate 必須完成並留下 decision record。
- Phase 6A 至少一個 WebUI run history / artifact viewer / diff viewer 路徑具備 smoke test。
- replay consistency test。
- run comparison / metrics board 至少有 fixture-based 驗證。
- workspace drift monitoring 不得影響 CLI / TUI 的正式 run state。

## 28. 分階段落地路線與優先順序

### 28.1 Roadmap 分層原則

為了守住 KISS，對外主 roadmap 仍只分成兩個主要 Stage：

```text
Stage 1：CLI Functional Delivery
  目標：先用 CLI 跑通專案接入、provider reality check、Review-first MVP、
        patch-first feature delivery、artifact、review gate、runtime/state/persistence
        與 bounded workspace understanding 基線。

Stage 2：TUI / WebUI Experience
  目標：在 CLI workflow 已經穩定後，先補 read-only / review-first 體驗，
        再補互動控制、replay、metrics 與 drift monitoring。
```

但為了讓實作可管理，對內工程推進改採 Phase 0～6 Gate，並在高風險 phase 內使用 sub-gate：

```text
Stage 1 CLI Functional Delivery
  Phase 0：Foundation / Repo Scaffold
  Phase 1：Project Onboarding + Provider Reality Check MVP
  Phase 2：Review-first MVP
  Phase 3：Feature Delivery MVP
    Phase 3A：Controlled Bug-fix / Patch-first
    Phase 3B：Small New-feature / Enhancement
  Phase 4：Runtime / State / Workspace Hardening
    Phase 4A：Runtime / Provider / Capability Hardening
    Phase 4B：State / Resume / Observability Hardening
    Phase 4C：Workspace Understanding Hardening

Stage 2 TUI / WebUI Experience
  Phase 5：TUI Experience
    Phase 5A：Inspect + Review
    Phase 5B：Control + Steering
  Phase 6：WebUI / Replay / Metrics
    Phase 6A：Read-only Run History
    Phase 6B：Replay / Metrics / Drift
```

這份藍圖不再把 M1～M6 當成主要管理單位。
若需要簡短稱呼，應優先使用 `Phase 0`～`Phase 6`，並用 `3A / 3B`、`4A / 4B / 4C` 表示內部 sub-gate，避免 `Stage`、`Milestone`、`MVP` 混用造成管理混亂。

### 28.2 區間估算前提

以下路線圖採用**區間估算**，不是單點承諾。

估算前提：

- 以 1 人全職開發為基準。
- 已具備 TypeScript / Node.js 基礎能力。
- 可持續投入，不以零碎兼職時段為主要模式。
- 對第一個 reference runtime（GitHub Copilot SDK）為可學習但非完全陌生狀態。
- Provider Reality Check 結果未出現阻擋性缺口。

若需同步摸索 runtime provider、補齊 ACC domain knowledge，或以兼職模式推進，實際工期可合理放大到 1.5x 至 2x。

### 28.3 Phase Gate Timeline

```text
=========================================================================================================
Two-Layer Roadmap / Internal Phase Gate Timeline
=========================================================================================================

[ Stage 1：CLI Functional Delivery ]                                             (16-25 weeks)

Phase 0   Foundation / Repo Scaffold                      ███                    (1-2 weeks)
Phase 1   Onboarding + Provider Reality Check             █████                  (2-3 weeks)
Phase 2   Review-first MVP                                ██████                 (3-4 weeks)
Phase 3A  Controlled Bug-fix / Patch-first                █████                  (2-4 weeks)
Phase 3B  Small New-feature / Enhancement                 █████                  (2-4 weeks)
Phase 4A  Runtime / Provider / Capability Hardening       ████                   (2-3 weeks)
Phase 4B  State / Resume / Observability Hardening        ████                   (2-3 weeks)
Phase 4C  Workspace Understanding Hardening               █████                  (3-5 weeks)

[ Stage 2：TUI / WebUI Experience ]                                               (8-13 weeks)

Phase 5A  TUI Inspect + Review                            ███                    (1-2 weeks)
Phase 5B  TUI Control + Steering                          ███                    (2-3 weeks)
Phase 6A  WebUI Read-only Run History                     ████                   (2-3 weeks)
Phase 6B  WebUI Replay / Metrics / Drift                  █████                  (3-5 weeks)

───────────────────────────────────────────────────────────────────────────────────────────────────────►
                                                                                                  時間軸
```

### 28.4 Phase 0：Foundation / Repo Scaffold

目標：先建立可長期維護的 repo 骨架，不要一開始就跳進完整 agent workflow。

主要輸出：

- monorepo skeleton。
- `apps/cli` skeleton。
- `packages/contracts` skeleton。
- `packages/core` skeleton。
- `packages/runtime-bridge` skeleton。
- `packages/project-adapter` skeleton。
- 基本 lint / test / build command。
- 最小 fixture / mock data。
- 初版 CONTRIBUTING / development notes。

Exit criteria：

- repo 可安裝、可測、可 build。
- CLI skeleton 可執行。
- contracts package 可驗證 schema。
- mock runtime fixture 可被測試讀取。

### 28.5 Phase 1：Project Onboarding + Provider Reality Check MVP

目標：讓任一專案可先被接入，並在進入 workflow 之前確認 provider 的真實能力。

主要輸出：

- `forgeweave init`。
- `forgeweave provider preflight`。
- project manifest schema。
- config normalization baseline。
- GenericProjectAdapter。
- adapter recommendation baseline。
- Provider Asset Profile discovery / gap analysis。
- provider-preflight-report。
- provider-capability-matrix v0。
- simple context packet baseline。
- context budget baseline。
- onboarding report schema 初版。
- ACC reference profile inventory。
- ACC + 1 個第二專案的 baseline config / asset gap / provider gap report。

Exit criteria：

- ACC 可完成 `project init`。
- 第二個 minimal project 可完成 `project init`。
- 兩者都能產出 manifest、context packet、onboarding report。
- provider preflight 可產出 capability matrix v0。
- onboarding report 能指出缺失資產、建議 adapter、provider gap 與下一步 workflow。

### 28.6 Phase 2：Review-first MVP

目標：先驗證 orchestrator 是否能安全看懂、審查、產出 artifact，並停在 manual review gate。

主要輸出：

- `generic.review` / `review-only`。
- WorkflowDefinition / WorkflowStepDefinition schema。
- workflow runner / step runner baseline。
- minimal run / step state machine。
- minimal event envelope。
- structured handoff artifact。
- `review-findings` artifact。
- `delivery-summary` / `workflow-result` artifact。
- manual review gate。
- approve / reject decision metadata。
- local JSON / JSONL outputs。
- Copilot SDK reference provider 初版。
- MockRuntimeProvider for tests / smoke tests。

Exit criteria：

- ACC 可用 CLI 跑完第一條 review workflow。
- 第二專案可用同一條 review workflow 跑完。
- artifact 可被下一步讀取。
- review gate 可 approve / reject。
- run / step / artifact / logs / events 可本機保存。
- MVP 明確不要求自動改檔、不要求完整 `new-feature`、不要求完整 workspace-map。

### 28.7 Phase 3：Feature Delivery MVP

目標：在 Review-first MVP 穩定後，才允許 workspace-write。Phase 3 先 3A bug-fix / patch-first，再 3B small new-feature。

#### Phase 3A：Controlled Bug-fix / Patch-first

主要輸出：

- `generic.bug-fix` 最小 workflow。
- bug-brief / requirement-brief。
- patch-plan / implementation-plan。
- command runner skeleton。
- workdir / branch / dirty-state guard。
- file allowlist / denylist。
- command allowlist。
- patch / diff mode。
- file-change-set / generated-files-manifest。
- lint / test command summary。
- review-findings。
- delivery-summary / workflow-result。
- reject 後可重跑相關 step 的最小機制。

Exit criteria：

- ACC 至少 1 個小型 bug-fix 完成 CLI E2E。
- 所有寫入只發生在 controlled workdir / branch / patch mode。
- 產出的 diff / artifact / command summary 可供人工 review。
- review gate 被 reject 後，可帶 reject reason 重跑 implementation 或 validation step。
- 失敗時 CLI 能顯示失敗 step、原因與可恢復位置。

#### Phase 3B：Small New-feature / Enhancement

主要輸出：

- `generic.new-feature` 小型 workflow。
- requirement-brief。
- feature-spec / implementation-plan。
- file-change-set / generated-files-manifest。
- lint / test / build command summary。
- review-findings。
- delivery-summary / workflow-result。

Exit criteria：

- ACC 至少 1 個小型真實功能需求完成 CLI E2E。
- 第二專案至少完成簡化 feature workflow 或 bug-fix workflow。
- workspace-write 仍受 Phase 3A 的 safety guard 約束。
- 產出的 diff / artifact / command summary 可供人工 review。

### 28.8 Phase 4：Runtime / State / Workspace Hardening

目標：把已跑通的 CLI workflow 補成可恢復、可追蹤、可重播、可擴充的可靠系統。Phase 4 是 formal hardening，不是治理能力第一次出現的地方。

#### Phase 4A：Runtime / Provider / Capability Hardening

主要輸出：

- Runtime Provider Contract 正式化。
- runtime registry minimal。
- provider selector。
- provider capability matrix v1。
- degraded mode。
- provider replacement boundary。

Exit criteria：

- runtime capability 不再散落於 workflow 或 provider-specific code。
- Copilot SDK provider 與 MockRuntimeProvider 都符合 contract test。

#### Phase 4B：State / Resume / Observability Hardening

主要輸出：

- workflow state machine 正式化。
- checkpoint / resume minimal。
- execution run schema。
- execution message schema。
- hook taxonomy。
- observability logging。
- event replay baseline。
- execution environment policy 正式化。

Exit criteria：

- workflow 可 checkpoint / resume。
- execution run / execution message / artifact 邊界清楚。
- hook ordering、error taxonomy、failure recovery 有 fixture 驗證。

#### Phase 4C：Workspace Understanding Hardening

主要輸出：

- workspace scanner baseline。
- deterministic extractor baseline。
- generic workspace baseline。
- context-slice / task-packet 漸進升級。
- Angular / ACC extension boundary。

Generic coverage boundary：

- source roots / test roots。
- package manager / command map。
- changed files。
- dependency / import graph baseline。
- related test discovery baseline。
- high-risk file detection。
- context-slice correctness fixture。

Framework / ACC extension coverage boundary：

- route map。
- component / template / style / service relation。
- Angular related spec discovery。
- migration mapping。
- ACC domain glossary / enterprise UI / permission / routing rules。

Exit criteria：

- workspace understanding 升級不破壞 Phase 2 / Phase 3 既有 workflow。
- Generic baseline 與 Angular / ACC extension 分開驗收。
- Core / Adapter / Assets 分層至少經 2 個專案驗證。

#### ACC Phase 4 Gate：Bounded Single-page Legacy Migration

目標：把 ACC reference project 的 Phase 4 成熟度定義成可驗證成果，而不是只完成底層 hardening。Phase 4 不視為完成，除非 ACC 至少有一個單頁 legacy page 可透過 CLI patch mode 前移到 modern Angular page，並產出可審查 artifacts。

範圍：

- 僅限單一 legacy page。
- 必須明確指定 legacy route / controller / template 或 migration brief。
- 必須明確指定 target modern Angular feature path 或 route convention。
- 不包含多頁 module migration。
- 不包含大型 API contract 重構。
- 不包含未指定的 design system 全面調整。
- 不允許無 review 自動 merge。

建議 CLI：

```bash
forgeweave run migration \
  --project acc \
  --input docs/migrations/<page>.md \
  --scope single-page \
  --mode patch
```

必要 workflow steps：

1. `load-project`：讀取 ACC manifest、adapter、provider assets。
2. `locate-legacy-page`：定位 legacy route / controller / template / related service。
3. `locate-modern-target`：定位 modern Angular feature root / route convention。
4. `build-workspace-map`：建立 route map、component/service relation、dependency slice。
5. `build-migration-analysis`：產出 mapping、風險、缺口、假設。
6. `build-implementation-plan`：決定新增/修改的 component、template、style、service、store、spec。
7. `implement-patch`：在 controlled workdir / patch mode 產生 file-change-set。
8. `run-validation`：至少執行 lint / test / build 其中一種，優先 lint + targeted test。
9. `review-diff`：產出 review-findings 與 migration checklist result。
10. `human-review-gate`：人工 approve / reject。
11. `delivery-summary`：彙總變更、風險、未完成項與後續手動事項。

必要 artifacts：

- `migration-analysis`
- `legacy-modern-mapping`
- `implementation-plan`
- `context-slice` / `task-packet`
- `file-change-set`
- `generated-files-manifest`
- `command-summary`
- `review-findings`
- `migration-checklist-result`
- `delivery-summary`

Exit criteria：

- ACC 至少 1 個 bounded single-page legacy migration CLI dry-run 通過。
- ACC 至少 1 個 bounded single-page legacy migration CLI patch-run 通過。
- 產出的 patch / diff 可供人工 review，且不得自動 merge。
- lint / test / build 至少一種 validation command 有 command summary。
- review gate 可 approve / reject。
- reject 後可帶 reject reason 回到 implementation 或 validation step 重跑。
- workflow 中斷後可從 checkpoint resume。
- migration 使用 context-slice / task-packet，不得只把整個 repo dump 給 agent。

### 28.9 Phase 5：TUI Experience

目標：把已驗證的 CLI workflow 變成可互動、可觀察、可中途介入的文字介面體驗；先觀察和審核，再控制和 steering。

#### Phase 5A：TUI Inspect + Review

主要輸出：

- TUI shell。
- step tree。
- live logs。
- event timeline。
- agent / runtime status。
- pending review gate view。
- artifact / diff 摘要。
- keyboard actions：approve / reject。

Exit criteria：

- TUI 可 read-only 檢視至少一條 Phase 2 或 Phase 3 既有 workflow。
- TUI 可操作 approve / reject。
- TUI 操作不改變 workflow state machine 語意。

#### Phase 5B：TUI Control + Steering

主要輸出：

- retry from step。
- steering / queueing。
- runtime status view。
- workdir / execution run inspect。

Exit criteria：

- retry / steer / queueing 可回寫正式 run state / review metadata / steering event。
- TUI 不形成第二套 workflow engine。

### 28.10 Phase 6：WebUI / Replay / Metrics

目標：提供團隊共用的歷史檢視、artifact 檢視、replay、比較與 metrics 能力；先 read-only，再 replay / metrics / drift。

#### Phase 6A：WebUI Read-only Run History

主要輸出：

- WebUI Tech Selection Gate / decision record。
- run history。
- execution history。
- artifact viewer。
- diff / review panel。

Exit criteria：

- WebUI 可檢視既有 CLI / TUI run。
- artifact viewer 能支援 review 與交接。
- WebUI 不引入新的 workflow 執行語意。

#### Phase 6B：WebUI Replay / Metrics / Drift

主要輸出：

- replay inspector。
- run comparison。
- metrics board。
- workspace-map / context-slice viewer。
- workspace understanding drift monitoring。

Exit criteria：

- replay inspector 能重播至少一條 Phase 2 / Phase 3 workflow。
- metrics board 能顯示 runtime utilization / execution message volume / workflow success rate 等基礎指標。
- workspace drift monitoring 不改變 CLI / TUI 的正式 run state。

### 28.11 橫向驗收：Cross-Project Validation

跨專案驗收不獨立佔用一個主 phase，而是貫穿 Phase 1～6 的橫向驗收軸：

| 橫向驗收項 | 進入時機 |
| --- | --- |
| ACC reference project | Phase 1 起 |
| 第二專案 onboarding | Phase 1 |
| 第二專案 review workflow | Phase 2 |
| 第二專案 bug-fix / patch-first workflow | Phase 3A |
| 第二專案 small feature / enhancement workflow | Phase 3B |
| Core / Adapter / Assets 分層驗證 | Phase 4C |
| 第三專案與更多 framework 驗證 | Phase 4 後段或 Phase 5+ |
| 多 runtime routing 驗證 | Phase 6+ 或後續版本 |

### 28.12 交付清單引用原則

`§28` 只保留 roadmap、優先順序與 phase gate 摘要；每個 Phase 的完整 checklist 以 `§32 Phase Gate 交付清單與橫向驗收` 為唯一真相來源。

若 `§28` 需要提及交付內容，應以摘要或引用方式表達，不重貼完整 checklist。

---

## 29. Project Onboarding Process

### 29.1 為什麼需要 Onboarding 流程

如果未來真的要接不同專案，藍圖應該先回答：

**一個新專案要如何被接進平台？**

### 29.2 Phase 1 CLI Onboarding 流程

在 generic-first 路線下，新增專案的 onboarding 不是附屬便利功能，而是正式核心能力；它應產品化成 CLI wizard，而不是要求使用者一開始就理解完整 adapter 架構。

簡化心智模型：

```text
新增專案 Phase 1 onboarding
= 填 manifest
+ 設定 Provider Asset Profile / Project Assets
+ 選 adapter
+ provider reality check / capability matrix v0
+ simple context packet + context budget
+ 先跑通 Phase 2 Review-first MVP
+ 再跑通 Phase 3A bug-fix / patch-first
+ 最後才跑 Phase 3B small new-feature
```

#### Step 1：描述這個專案

建立 `project-manifest.yml`，定義：

- 這是什麼專案：Angular、React、Node、Java、Python 等。
- 常用指令：install / lint / test / build。
- 支援哪些 workflow：review、bug-fix、new-feature、migration 等。
- 允許哪些 agent / skill。
- 掃描專案時要看哪些檔案、排除哪些目錄。
- simple context packet 的基本規則。
- context budget 與 over-budget fallback。

#### Step 2：設定 Provider Asset Profile 與 Project Assets

掛載 Project Assets 時，先選擇 provider profile，再由 resolver 掃描對應檔案位置。

GitHub Copilot provider 可包含：

- `.github/copilot-instructions.md`
- `.github/instructions/**/*.instructions.md`
- `.github/agents/`
- `.github/skills/`
- `AGENTS.md`

Generic project assets 可包含：

- 專案慣例文件。
- domain docs。
- templates。
- glossary。
- `.orchestrator/workflows/*.yml`。

#### Step 3：選擇 Adapter

不要預設要建立專用 adapter。選擇順序如下：

```text
1. 先用 GenericProjectAdapter
2. 如果 framework 明確，改用 FrameworkProjectAdapter
3. 如果仍不夠，再建立 ProjectSpecificAdapter
```

常見 framework adapter 範例：

- `AngularProjectAdapter`
- `ReactProjectAdapter`
- `NodeTsProjectAdapter`
- `JavaSpringProjectAdapter`
- `PythonProjectAdapter`

只有在需要程式邏輯理解 repo 關係、特殊 context slicing、特殊 artifact schema、特殊 migration mapping 或特殊 command orchestration 時，才建立專用 adapter。

#### Step 4：Provider Reality Check

在正式跑 workflow 前，先執行：

```bash
forgeweave provider preflight --project my-project
```

至少確認：

- provider / SDK 版本。
- streaming events。
- session persistence / resume。
- hooks / tool events。
- custom skills / agents 注入。
- CLI / SDK compatibility gap。
- degraded mode / MockRuntimeProvider fallback。

輸出：

- `provider-preflight-report`
- `provider-capability-matrix` v0
- provider gap decision

#### Step 5：建立 Simple Context Packet

至少完成：

- target files。
- changed files。
- manifest 摘要。
- 相關 instructions / skills。
- 手動指定的補充檔案。
- lint / test / build 指令。
- review policy。
- context budget 檢查結果。
- 已知限制與風險。

#### Step 6：驗證最小工作流

應以同一條 generic workflow 完成至少 2 個專案的 onboarding 驗證，建議優先選擇 ACC + 1 個簡單第二專案；workflow 類型優先順序：

1. `generic.review` / `review-only`
2. `generic.bug-fix` / patch-first
3. small `generic.new-feature` / enhancement

這一步的目的是確認 generic onboarding 已具備最小可操作性，而不是在 onboarding 章節重複定義交付清單。

#### Step 7：驗證 Phase 3A / 3B 功能交付 workflow

Review-first MVP 通過後，Phase 3 的重要 gate 才是功能交付。先在 ACC 跑通一條 bug-fix / patch-first workflow：

```bash
forgeweave run bug-fix --project acc --input issue.md --mode patch
```

確認輸出包含：

- bug brief / requirement brief。
- patch plan / implementation plan。
- file change set。
- command summary。
- review findings。
- delivery summary。

Phase 3A 通過後，再跑小型 new-feature：

```bash
forgeweave run new-feature --project acc --input feature-request.md --scope small
```

完整 Phase 0～3 必交項請以 `§32.1～§32.4` 為準。

### 29.3 Phase 4 Onboarding 強化

當雙專案 CLI onboarding、Provider Reality Check、Review-first MVP 與 patch-first gate 通過後，再補正式 workspace understanding、resume 與 replay 基礎。這仍屬於 Phase 4，但不應阻塞前段 CLI Review-first MVP。

#### Step 1：建立 Workspace Understanding Baseline

建立可持續更新的 repo understanding baseline，讓後續 workflow 不再只依賴人工指定檔案與臨時補充上下文。

Phase 4C generic workspace understanding coverage boundary 先限制在：

- source roots / test roots。
- package manager / command map。
- changed files。
- dependency / import graph baseline。
- related test discovery baseline。
- high-risk file detection。
- context-slice correctness fixture。

Angular / ACC extension 另行驗收：

- route map。
- component / template / style / service relation。
- Angular related spec discovery。
- migration mapping。
- ACC domain glossary / enterprise UI / permission / routing rules。

#### Step 2：驗證多工作流

確認 onboarding 後的 project profile、adapter 與 context pipeline，已足以支撐不只一條 workflow。

建議至少涵蓋：

- review。
- bug fix / patch-first。
- small new feature / enhancement。

#### Step 3：驗證持久化與 replay 基礎

確認新專案接入後，執行歷史、artifact handoff 與恢復能力都能被後續流程重用與追查。

完整 runtime / state / persistence 相關交付要求請以 `§32.5 Phase 4 Runtime / State / Workspace Hardening 必交` 為準。

### 29.4 建議 CLI 體驗

新專案 onboarding 應以初始化指令引導：

```bash
forgeweave init --root .
```

初始化流程可包含：

1. 掃描 repo 訊號。
2. 呼叫 adapter recommendation。
3. 產生初始 `project-manifest.yml`。
4. 提示需要補齊的 provider-specific assets。
5. 執行 provider preflight。
6. 建立 simple context packet。
7. 產生 onboarding report。

範例：

```text
Detected project type: react-typescript
Recommended adapter: ReactProjectAdapter
Project-specific adapter needed: no
Provider preflight: passed with degraded mode for session resume

Generated:
- project-manifest.yml
- provider-preflight-report
- provider-capability-matrix v0
- simple context packet
- onboarding report

Next:
- Add provider instructions if missing, e.g. `.github/copilot-instructions.md` for GitHub Copilot profile
- Run forgeweave run review --project my-react-app --target src/foo
- After Review-first passes, run forgeweave run bug-fix --project my-react-app --input issue.md --mode patch
```

### 29.5 第二專案與後續專案接入驗證重點

接入第二專案與後續專案時，不只要驗證「能不能跑」，也要驗證分層是否正確：

- 新專案是否主要只需補 manifest / assets。
- GenericProjectAdapter 是否能完成最小 workflow。
- FrameworkProjectAdapter 是否明顯改善 workspace map 與 context slicing。
- 是否有足夠理由建立 ProjectSpecificAdapter。
- 是否有特殊邏輯被錯誤塞進 core。
- workflow template 是否能被專案 profile 覆寫，而不需要複製整份 workflow。
- CLI `bug-fix` / patch-first 是否能在不修改 core 的情況下運作。
- CLI small `new-feature` 是否只在 patch-first gate 通過後啟用。
- Angular / ACC extension 是否沒有污染 generic workspace baseline。

確認 run、artifact、resume、review 結果都能重放。

## 30. Cross-Project Validation Plan

### 30.1 為什麼這章要寫進藍圖

很多架構圖都會說自己「可擴充」，但如果 generic onboarding 只能服務一個 reference project，這句話其實還只是設計假設。

### 30.2 建議驗證節點

#### Validation Step 1：建立 Generic Onboarding Path（以 ACC 為第一參考專案）

目標：把 manifest、adapter、onboarding、generic workflow 做成共用入口，並先用 ACC 驗證它能跑通。

#### Validation Step 2：驗證第二專案可沿用同一路徑

目標：確認第二專案主要只需補 manifest / assets / adapter 選擇，而不需修改 core。

第二專案建議不要選另一個與 ACC 太相似的 Angular repo；若資源允許，優先選 Node / TypeScript 工具、React app 或其他小型 TypeScript 專案，提升 generic core 驗證力。

#### Validation Step 3：驗證 Provider Reality Check

目標：確認不同專案能產出 provider preflight 與 capability matrix，而不是把 provider 假設寫死在 ACC 或某個 workflow。

最低驗收：

- ACC 可產出 `provider-preflight-report` 與 `provider-capability-matrix` v0。
- 第二專案可產出同格式報告。
- MockRuntimeProvider 可支援 workflow fixture 與 degraded mode 測試。

#### Validation Step 4：驗證 CLI Functional Delivery

目標：確認 CLI 不只會初始化與分析，而是能先完成 Review-first MVP，接著擴展到受控改檔與小型需求交付。

最低驗收：

- ACC 可先跑通 `generic.review` / `review-only` MVP。
- 第二專案可跑通同一條 `generic.review` / `review-only` workflow。
- ACC 可在 Phase 3A 跑通 `generic.bug-fix` / patch-first。
- ACC 可在 Phase 3B 跑通小型 `generic.new-feature` 或 enhancement。
- 第二專案可在不修改 core 的前提下，跑通 `generic.review`、`generic.bug-fix` 或簡化版 enhancement。
- 產出 artifact、command summary、review findings 與 delivery summary。

#### Validation Step 5：抽出並補強 Core Interfaces

至少抽出：

- `WorkflowDefinition`
- `AgentDefinition`
- `SkillReference`
- `ArtifactSchema`
- `ProjectAdapter`
- `CommandProvider`
- `AgentRuntimeProvider`
- `ProviderCapabilityMatrix`
- `ExecutionPolicy`

#### Validation Step 6：接第三個相近或較不同的專案

建議先找：

- TypeScript internal tool。
- Node + TypeScript 工具型專案。
- React / frontend app。
- 另一個 Angular repo。

第三專案可放到 Stage 2 或 Phase 4C，不應阻塞 Stage 1 基本成功。

#### Validation Step 7：驗證抽象是否成立

檢查：

- 核心是否不用改或只需極小修改。
- 新專案是否主要只需補 adapter / assets / manifest。
- provider capability matrix 是否可沿用。
- artifact schema 是否可沿用。
- CLI workflow 是否可沿用。
- UI shell 是否可在 Stage 2 共用。
- runtime provider 是否仍隔離在 runtime-bridge。
- generic workspace baseline 是否沒有被 Angular / ACC 特例污染。

---

## 31. Stage / Core 最重要的 ADR（架構決策）

### ADR-001：以 workflow（工作流）為主體，不以 chat（聊天對話）為主體

理由：

- 使用者要的是「完成工作」，不是「持續跟 AI 聊天」

### ADR-002：agent handoff 必須結構化（AI 換手時必須填寫標準交接單）

理由：

- 降低訊息漂移（防範 AI 在無結構對話中越聊越偏）
- 方便下一輪 workflow 重用（因為是標準規格的檔案，下一關的 AI 能立刻看懂）

### ADR-003：先用少量高價值 agent，不追求 agent 數量

理由：

- 維持 KISS
- 先把 runtime 跑穩

### ADR-004：CLI 優先，TUI / WebUI 延後到 Stage 2

理由：

- 最快落地、最好 debug
- CLI 更適合驗證 workflow、artifact、runtime、adapter 與 command execution 是否真的可靠
- 在 CLI 不能完成真實功能開發前，不應投入大量 TUI / WebUI 產品化成本

### ADR-005：artifact 與 logs 從第一天就保存（歷史溯源）

理由：

- 沒有觀測就沒有可靠優化（不先留下紀錄，未來系統變慢或變笨時就不知道怎麼修）

### ADR-006：Core / Adapter / Project Assets 三層分離

理由：

- 確保核心不綁死特定專案
- 新專案只需補 adapter 與 assets，不改 core

### ADR-007：Workflow vs Agent 有明確判準

理由：

- 防止系統退化成「什麼都交給 agent」的黑盒
- 固定流程優先用 workflow，高不確定才用 agent

### ADR-008：Artifact 與 Execution Message 必須分離

理由：

- handoff（正式交接）與 telemetry（系統偵測數據）的責任不同
- debug 或 UI timeline（視覺時間軸）所需的囉嗦對話，不應污染下一個 AI 要看的正式交接契約

### ADR-009：Runtime Registry v0 前移，Formal Registry 留到 Phase 4A

理由：

- orchestrator 必須知道有哪些 runtime 可用、能力如何、是否可執行 workflow fixture。
- Phase 1 / 2 不需要完整 runtime registry，但必須有 provider preflight 與 capability matrix v0。
- Phase 4A 再正式化 runtime registry、provider selector、degraded mode 與 provider replacement boundary。

### ADR-010：Provider Capability Matrix 必須明文化，且 Phase 1 就要有 v0

理由：

- 不同 provider 在 resume、skills、sandbox、usage、hooks、tool events 上不完全對等。
- 抽象欄位若沒有能力宣告，最後只會變成錯誤假設。
- Phase 1 先以 Provider Reality Check 產出 v0；Phase 4A 再正式化為 v1 與 contract test。

### ADR-011：Execution Environment 由 Orchestrator 明確管理，workspace-write 前必須有 safety skeleton

理由：

- context file、workdir、sandbox、reuse policy 都會直接影響可靠性。
- 不能把 execution env 視為 provider 自己會處理好的黑盒。
- Phase 3A 之前必須有 command runner skeleton、workdir / branch / dirty-state guard、patch / diff mode、command allowlist 與 external network blocked default。
- Phase 4B 再正式化完整 execution environment policy。

### ADR-012：Deterministic Before Semantic

理由：

- 先用 scanner / parser / schema 抽出確實的程式碼邏輯與事實，才能把推論環節交給 agent 去想。
- 可以降低 token 成本、提高穩定度，並讓 replay / cache / evaluation 更有依據。
- Stage 1 前段可先使用 simple context packet；Phase 4C 再補 generic workspace baseline 與 framework extension。

### ADR-013：Workspace Map 是一等 Artifact，但 Generic Baseline 與 Framework Extension 必須分開

理由：

- repo understanding 不能只是某次對談內的暫時記憶。
- `workspace-map` 必須能被版本控制、重用、切小塊、審核與重新播放。
- Phase 4C generic baseline 只要求 source roots、test roots、command map、changed files、dependency / import graph baseline、related test discovery baseline、高風險檔案與 context-slice fixture。
- route map、component / template / service relation、Angular spec discovery、migration mapping 與 ACC domain rules 屬於 Angular / ACC extension，不得污染 generic core。

### ADR-014：Task Packet 是正式派工邊界，但可以由 simple context packet 漸進演進

理由：

- agent 接手前，應先收到經過裁切與檢查的正式任務包。
- 這可以避免直接把原始需求、整個龐大的 repo、零散 artifacts 無限制地倒給 agent。
- Stage 1 前段可先用 simple context packet 驗證方向；Phase 4C 再正式化 `context-slice` / `task-packet`。

### ADR-015：retryPolicy 語意統一與 Resume 模型歸一

理由（v2.4 新增）：

- `retryPolicy` 原始值 `"once"` 與 `maxRetries` 存在語意衝突，統一為 `"none"` | `"auto"` | `"manual"`，其中 `maxRetries` 僅在 `"auto"` 時生效。
- Resume 原有兩處定義（§16 與 §17），統一為三種粒度模型（Session > Step > Run）定義於 §16.4，§17 引用。

### ADR-016：Runtime-Agnostic Core + Reference Provider

理由（v2.11 新增）：

- GitHub Copilot SDK 是第一個 reference runtime provider，但不是 Orchestrator Core 的不可替代前提。
- Core 只應依賴 `AgentRuntimeProvider` contract、capability matrix、workflow state 與 artifact schema。
- Provider-specific API 應集中在 `runtime-bridge/providers/*`，避免 workflow、artifact、review、replay 與 project adapter 被單一 SDK 形狀污染。
- Runtime replacement 應透過 capability-first selection、fallback provider 與 degraded mode 管理，而不是推倒重寫 orchestrator。

### ADR-017：兩階段交付模型 — CLI Functional Delivery before TUI / WebUI

理由（v2.12 新增，v2.16 調整）：

- 第一階段的成敗應由 CLI 是否能安全完成 Review-first MVP，並逐步擴展到受控 bug-fix / patch 與小型功能交付判斷，而不是由介面完整度判斷。
- TUI / WebUI 是放大已驗證 workflow 的體驗層，不應成為早期成功的前置條件。
- 對外 roadmap 維持 `Stage 1 CLI Functional Delivery` 與 `Stage 2 TUI / WebUI Experience`，避免重新膨脹成過多主階段。
- Stage 1 內部改用 Phase 0～4 Gate 控制風險；Stage 2 內部改用 Phase 5～6 Gate 控制體驗層交付。

### ADR-018：Review-first MVP before Feature Delivery

理由（v2.13 新增，v2.16 調整）：

- MVP 的第一責任是驗證 orchestrator 是否安全、可追蹤、可審核，而不是一開始就自動修改檔案。
- Review workflow 可以驗證 project loading、context packet、agent routing、structured artifact、manual review gate、local persistence、minimal state 與 event envelope。
- `generic.review` / `review-only` 是 Phase 2 的 MVP gate；`generic.bug-fix` / patch-first 是 Phase 3A；small `generic.new-feature` / enhancement 是 Phase 3B。
- Review-first 不是放棄 feature delivery，而是把功能開發放到更穩定的 Phase 3，降低早期風險並避免 MVP 過重。

### ADR-019：Provider Asset Profiles over `.github` Assumption

理由（v2.14 新增）：

- `.github/`、`AGENTS.md`、provider-specific skills 目錄不應被描述成所有專案的通用前提。
- Core 不應知道 provider-specific file layout；這些責任應由 Project Asset Resolver + Provider Asset Profile 管理。
- GitHub Copilot profile 可以支援 `.github/copilot-instructions.md`、`.github/agents/`、`.github/skills/`，但 generic core 只吃 normalized agent / skill / instruction / workflow definitions。
- 這個決策可避免 Orchestrator Core 被 GitHub Copilot、ACC 或 Angular 假設污染。

### ADR-020：Two-Layer Roadmap with Internal Phase Gates

理由（v2.15 新增，v2.16 調整）：

- 單純保留兩大 Stage 雖然簡潔，但 Stage 1 會同時承載 onboarding、review MVP、feature delivery、runtime、state、persistence、workspace understanding，對實作管理來說風險密度太高。
- 若把 roadmap 改成過多主 Stage，又會破壞 v2.12 / v2.14 收斂後的 KISS 原則。
- 因此採用兩層模型：對外維持 Stage 1 / Stage 2；對內使用 Phase 0～6 Gate 管理實作順序與驗收。
- Phase 3 / 4 / 5 / 6 可使用 sub-gate 管理高風險能力，但不升級成新的主 Stage。
- Cross-project validation 是橫向驗收軸，不獨立佔用一個主 Stage；它應穿過 Phase 1～6 持續驗證 core 不被 ACC 綁死。

### ADR-021：Patch-first Feature Delivery before New-feature

理由（v2.16 新增）：

- 一旦 workflow 開始寫檔，系統風險會從「審查品質」變成「能否安全改動、驗證、回復與審核」。
- `bug-fix` / small patch 的範圍通常比 `new-feature` 更窄，更適合驗證 command runner、workdir guard、diff artifact、review gate reject rerun 與 failure recovery。
- 因此 Phase 3 必須拆為 3A bug-fix / patch-first 與 3B small new-feature / enhancement。
- `new-feature` 只有在 patch-first gate 通過後才進入，且第一版必須限制為小型功能切片。

### ADR-022：Read-only Experience before Interactive Control

理由（v2.16 新增）：

- TUI / WebUI 若一開始就加入 steering、queueing、retry、replay、metrics，容易變成第二套 workflow engine。
- Phase 5A / 6A 先做 read-only inspect、artifact viewer、diff viewer 與 review gate 操作，能驗證 UI 是否正確讀取正式資料模型。
- Phase 5B / 6B 再加入 retry、steer、queueing、replay、comparison、metrics 與 drift monitoring。
- UI 操作必須回寫正式 run state、review metadata 或 steering event，不得創造平行狀態語意。

## 32. Phase Gate 交付清單與橫向驗收

### 32.1 Phase 0 Foundation / Repo Scaffold 必交

- [ ] monorepo skeleton
- [ ] `apps/cli` skeleton
- [ ] `packages/contracts` skeleton
- [ ] `packages/core` skeleton
- [ ] `packages/runtime-bridge` skeleton
- [ ] `packages/project-adapter` skeleton
- [ ] basic lint / test / build commands
- [ ] 最小 fixture / mock data
- [ ] CLI skeleton smoke test
- [ ] contracts schema parse / reject 測試
- [ ] CONTRIBUTING / development notes 初版
- [ ] repo 可安裝、可測、可 build

### 32.2 Phase 1 Project Onboarding + Provider Reality Check MVP 必交

- [ ] `forgeweave init`
- [ ] `forgeweave provider preflight`
- [ ] Project Manifest schema（最小可用版）
- [ ] config normalization baseline
- [ ] GenericProjectAdapter（最小可用版）
- [ ] Adapter Recommendation baseline
- [ ] Provider Asset Profile discovery / gap analysis
- [ ] `provider-preflight-report` artifact
- [ ] `provider-capability-matrix` v0
- [ ] simple context packet baseline
- [ ] context budget baseline
- [ ] onboarding report schema 初版
- [ ] ACC reference profile inventory
- [ ] ACC + 1 個簡單第二專案的 baseline config / asset gap / provider gap report
- [ ] Core / Adapter / Assets 架構文件
- [ ] Project Manifest / config normalization 規格
- [ ] Artifact Schema 初版
- [ ] Workflow State Model 初版
- [ ] ACC 可完成 `project init`
- [ ] 第二個 minimal project 可完成 `project init`
- [ ] 兩者都能產出 manifest、context packet、onboarding report
- [ ] 兩者都能產出 provider capability matrix v0

### 32.3 Phase 2 Review-first MVP 必交

- [ ] 1 個 generic review workflow（`generic.review` / `review-only`）
- [ ] workflow 能從 target / changed files / input brief 建立 simple context packet
- [ ] WorkflowDefinition / WorkflowStepDefinition schema
- [ ] workflow runner / step runner baseline
- [ ] structured handoff
- [ ] minimal run / step state machine
- [ ] minimal event envelope
- [ ] basic artifact store
- [ ] `review-findings` artifact
- [ ] `delivery-summary` / `workflow-result` artifact
- [ ] manual review gate
- [ ] approve / reject decision metadata
- [ ] local JSON / JSONL outputs（run、step、artifact、logs、events）
- [ ] Runtime Provider Contract 初版
- [ ] CopilotSdkRuntimeProvider implementation 初版
- [ ] MockRuntimeProvider for tests / smoke tests
- [ ] ACC 通過 CLI Review-first MVP
- [ ] 第二專案通過同一條 CLI Review-first MVP
- [ ] 第二專案可在不修改 core 的前提下完成同類型 review workflow 驗證
- [ ] MVP 明確不要求自動修改檔案、不要求完整 `new-feature`、不要求完整 workspace-map

### 32.4 Phase 3 Feature Delivery MVP 必交

#### Phase 3A Controlled Bug-fix / Patch-first 必交

- [ ] `generic.bug-fix` 最小 workflow
- [ ] bug-brief / requirement-brief artifact
- [ ] patch-plan / implementation-plan artifact
- [ ] command runner skeleton
- [ ] workdir / branch / dirty-state guard
- [ ] file allowlist / denylist
- [ ] command allowlist
- [ ] patch / diff mode
- [ ] file-change-set / generated-files-manifest artifact
- [ ] lint / test command summary
- [ ] review-findings artifact
- [ ] delivery-summary / workflow-result artifact
- [ ] ACC 至少 1 個小型 bug-fix 完成 CLI E2E 驗證
- [ ] 所有寫入只發生在 controlled workdir / branch / patch mode
- [ ] review gate 被 reject 後，可帶 reject reason 重跑 implementation 或 validation step
- [ ] 失敗時 CLI 能顯示失敗 step、原因與可恢復位置
- [ ] 產出的 diff / artifact / command summary 可供人工 review

#### Phase 3B Small New-feature / Enhancement 必交

- [ ] `generic.new-feature` 小型 workflow
- [ ] `new-feature` workflow 可從需求輸入走到 delivery summary
- [ ] requirement-brief artifact
- [ ] feature-spec 或 implementation-plan artifact
- [ ] file-change-set / generated-files-manifest artifact
- [ ] lint / test / build command summary
- [ ] review-findings artifact
- [ ] delivery-summary / workflow-result artifact
- [ ] ACC 至少 1 個小型真實功能需求完成 CLI E2E 驗證
- [ ] 第二專案至少完成簡化 feature workflow 或 bug-fix workflow 驗證
- [ ] Phase 3A safety guard 對 Phase 3B 仍然生效
- [ ] 產出的 diff / artifact / command summary 可供人工 review

### 32.5 Phase 4 Runtime / State / Workspace Hardening 必交

#### Phase 4A Runtime / Provider / Capability Hardening 必交

- [ ] Runtime Provider Contract 正式化
- [ ] runtime registry（最小可用版）
- [ ] provider selector
- [ ] provider capability matrix v1
- [ ] degraded mode
- [ ] provider replacement boundary
- [ ] CopilotSdkRuntimeProvider / MockRuntimeProvider contract test

#### Phase 4B State / Resume / Observability Hardening 必交

- [ ] execution environment policy 正式化
- [ ] workflow state machine（含最小狀態集與非法轉移測試）
- [ ] checkpoint / resume minimal
- [ ] execution run schema
- [ ] execution message schema
- [ ] session persistence baseline
- [ ] hook taxonomy（至少 session / workflow / tool hooks）
- [ ] observability logging（含最小記錄欄位）
- [ ] event replay baseline

#### Phase 4C Workspace Understanding Hardening 必交

- [ ] workspace scanner baseline
- [ ] deterministic extractor baseline
- [ ] generic workspace understanding coverage boundary：
  - [ ] source roots / test roots
  - [ ] package manager / command map
  - [ ] changed files
  - [ ] dependency / import graph baseline
  - [ ] related test discovery baseline
  - [ ] high-risk file detection
  - [ ] context-slice correctness fixture
- [ ] Angular / ACC extension coverage boundary：
  - [ ] route map
  - [ ] component / template / style / service relation
  - [ ] Angular related spec discovery
  - [ ] migration mapping
  - [ ] ACC domain glossary / enterprise UI / permission / routing rules
- [ ] context-slice / task-packet 可由 simple context packet 漸進升級
- [ ] Core / Adapter / Assets 分層驗證（至少 2 個專案）
- [ ] Phase 2 / Phase 3 workflow 不因 workspace understanding 升級而退化

### 32.6 Phase 5 TUI Experience 必交

#### Phase 5A TUI Inspect + Review 必交

- [ ] TUI shell
- [ ] workflow step tree
- [ ] live logs
- [ ] event timeline
- [ ] agent / runtime status
- [ ] pending review gate view
- [ ] artifact / diff 摘要
- [ ] keyboard actions（approve / reject）
- [ ] TUI 可 read-only 檢視至少一條 Phase 2 或 Phase 3 既有 workflow
- [ ] TUI 可操作 approve / reject
- [ ] TUI 操作不改變 workflow state machine 語意

#### Phase 5B TUI Control + Steering 必交

- [ ] steering / queueing
- [ ] retry from step
- [ ] runtime status view
- [ ] workdir / execution run inspect
- [ ] retry / steer / queueing 可回寫正式 run state / review metadata / steering event
- [ ] TUI 不形成第二套 workflow engine

### 32.7 Phase 6 WebUI / Replay / Metrics 必交

#### Phase 6A WebUI Read-only Run History 必交

- [ ] WebUI Tech Selection Gate
- [ ] WebUI decision record
- [ ] run history
- [ ] execution history
- [ ] artifact viewer
- [ ] diff / review panel
- [ ] WebUI 可檢視既有 CLI / TUI run
- [ ] WebUI 不引入新的 workflow 執行語意

#### Phase 6B WebUI Replay / Metrics / Drift 必交

- [ ] replay inspector
- [ ] run comparison
- [ ] metrics board（含 runtime utilization / execution message volume / workflow success rate）
- [ ] workspace-map / context-slice viewer
- [ ] workspace understanding 檢視與 drift 監控
- [ ] replay inspector 能重播至少一條 Phase 2 / Phase 3 workflow
- [ ] workspace drift monitoring 不改變 CLI / TUI 的正式 run state

### 32.8 Phase 1～3 Adoption / Acceptance Gate

- [ ] 新使用者 15 分鐘內完成第一次 `project init`
- [ ] 新使用者 15 分鐘內完成 provider preflight 或 mock fallback preflight
- [ ] 新使用者 15 分鐘內能跑完第一次 `generic.review` / `review-only` CLI workflow smoke test
- [ ] 至少 2 位非作者使用者能不靠作者協助跑完同一條 Review-first MVP workflow
- [ ] `generic.review` / `review-only` 能產出可信的 `review-findings` / `delivery-summary` artifact
- [ ] `review-only` workflow 比純手動流程更省事
- [ ] Phase 3A 的 `generic.bug-fix` 至少能為 ACC 產出可 review 的 diff / artifact / command summary / delivery summary
- [ ] Phase 3B 的 small `generic.new-feature` 至少能為 ACC 產出可 review 的 diff / artifact / delivery summary
- [ ] 失敗時能清楚知道卡在哪個 step、哪個 artifact、哪個 command 或哪個 provider capability
- [ ] 連續兩週仍有人願意主動使用 CLI workflow
- [ ] 沒有出現「只剩作者會用」的狀況

### 32.9 Cross-Project Validation 進階驗收

- [ ] 第二專案 CLI Review-first MVP E2E 驗證不需修改 core
- [ ] 第二專案 CLI bug-fix / patch-first workflow E2E 驗證不需修改 core
- [ ] 第二專案 CLI small feature / enhancement workflow E2E 驗證不需修改 core
- [ ] 第三專案與更多專案接入驗證
- [ ] migration workflow
- [ ] refactor workflow
- [ ] optimization workflow
- [ ] docs-handoff-agent
- [ ] bug-triage-agent
- [ ] refactor-architect-agent
- [ ] performance-optimizer-agent
- [ ] base project adapter template
- [ ] additional FrameworkProjectAdapter / ProjectSpecificAdapter templates（視需要）
- [ ] Generic Workflow Catalog / workflow pack / generic docs
- [ ] UI shell 共用驗證（Phase 5 / Phase 6）
- [ ] 評估抽象是否過度
- [ ] 多 runtime routing 驗證（Phase 6+）

## 33. Implementation Backlog v2

這份 backlog 不是完整產品 backlog，而是 Phase 0～3 應優先開工的最小工程切片。它的目標是避免每個模組都做一點，最後卻沒有一條 workflow 真正跑完。v2.16 將 feature delivery 的第一個 slice 改成 bug-fix / patch-first。

### 33.1 Vertical Slice 1：CLI Bootstrap

- [ ] `apps/cli` 初始化
- [ ] `forgeweave init --root .`
- [ ] `project-manifest.yml` schema
- [ ] manifest normalization
- [ ] GenericProjectAdapter
- [ ] adapter recommendation baseline
- [ ] Provider Asset Profile gap analysis
- [ ] simple context packet
- [ ] context budget baseline
- [ ] onboarding report

Acceptance criteria：

- ACC 可完成 `project init`
- 第二個簡單專案可完成 `project init`
- 兩者都能產出 manifest、context packet、onboarding report

### 33.2 Vertical Slice 2：Provider Reality Check Minimum

- [ ] `forgeweave provider preflight`
- [ ] `provider-preflight-report` schema
- [ ] `provider-capability-matrix` v0 schema
- [ ] Copilot SDK capability probe skeleton
- [ ] MockRuntimeProvider fallback probe
- [ ] provider gap decision output
- [ ] degraded mode 記錄

Acceptance criteria：

- ACC 可產出 provider preflight report
- 第二專案可產出同格式 report
- MockRuntimeProvider 可支援 workflow fixture
- provider-specific API 不外洩到 core workflow schema

### 33.3 Vertical Slice 3：Review-first CLI Workflow

- [ ] `WorkflowDefinition` schema
- [ ] `WorkflowStepDefinition` schema
- [ ] workflow runner
- [ ] step runner
- [ ] minimal run / step state
- [ ] minimal event envelope
- [ ] structured handoff artifact
- [ ] `review-findings` artifact schema
- [ ] `delivery-summary` artifact schema
- [ ] manual review gate
- [ ] local artifact store
- [ ] local run / step / event logs
- [ ] `generic.review` / `review-only`

Acceptance criteria：

- ACC 可用 CLI 跑完第一條 review workflow
- 第二專案可用同一條 review workflow 跑完
- artifact 可被下一步讀取
- review gate 可 approve / reject
- MVP 不要求自動修改檔案

### 33.4 Vertical Slice 4：Runtime Provider Minimum

- [ ] `AgentRuntimeProvider` contract
- [ ] `CopilotSdkRuntimeProvider`
- [ ] `MockRuntimeProvider`
- [ ] runtime event adapter
- [ ] provider capability minimal declaration
- [ ] runtime error taxonomy baseline

Acceptance criteria：

- workflow 可透過 Copilot SDK reference provider 執行
- 測試可透過 MockRuntimeProvider 執行
- provider-specific API 不外洩到 core workflow schema

### 33.5 Vertical Slice 5：CLI Patch-first Feature Delivery

- [ ] `generic.bug-fix` workflow
- [ ] bug triage step
- [ ] patch plan / implementation plan step
- [ ] command runner skeleton
- [ ] workdir / branch / dirty-state guard
- [ ] file allowlist / denylist
- [ ] command allowlist
- [ ] patch / diff artifact
- [ ] targeted lint / test command step
- [ ] review-diff step
- [ ] delivery summary step
- [ ] failure / retry / reject reason propagation

Acceptance criteria：

- ACC 至少一個小型 bug-fix 可從 CLI 跑到 delivery summary
- 產出 bug brief、patch plan、file change set、command summary、review findings、delivery summary
- 所有寫入只發生在 controlled workdir / branch / patch mode
- 若 review reject，可帶原因重跑 implementation 或 validation step
- 這個 slice 必須在 Review-first MVP 通過後才進入

### 33.6 Vertical Slice 6：CLI Small New-feature Delivery

- [ ] `generic.new-feature` workflow
- [ ] requirement analysis step
- [ ] feature spec / implementation plan step
- [ ] implement step
- [ ] lint / test / build command step
- [ ] review-diff step
- [ ] delivery summary step

Acceptance criteria：

- ACC 至少一個小型真實功能需求可從 CLI 跑到 delivery summary
- 產出 requirement brief、implementation plan、file change set、review findings、delivery summary
- Phase 3A 的 safety guard 仍生效
- 這個 slice 必須在 patch-first gate 通過後才進入

### 33.7 Vertical Slice 7：Workspace Understanding Boundary

- [ ] workspace scanner baseline
- [ ] changed files scanner
- [ ] generic dependency / import graph baseline
- [ ] generic related test discovery baseline
- [ ] high-risk file detection
- [ ] context-slice correctness fixture
- [ ] Angular / ACC extension：route map baseline
- [ ] Angular / ACC extension：component / service relation baseline
- [ ] simple context packet → context-slice 漸進轉換

Acceptance criteria：

- Stage 1 不追求完整 workspace-map
- 但 review / bug-fix / small new-feature workflow 能拿到比人工檔案列表更穩定的 context
- workspace understanding 失敗時 workflow 能退回 manual context，而不是整個中止
- Angular / ACC extension 不污染 generic baseline

### 33.8 Vertical Slice 8：Adoption Gate

- [ ] CLI quickstart
- [ ] sample review input
- [ ] sample issue / bug-fix input
- [ ] sample feature request
- [ ] sample project fixture
- [ ] smoke test command
- [ ] failure troubleshooting output
- [ ] basic documentation

Acceptance criteria：

- 新使用者能在 15 分鐘內完成第一次 run
- 新使用者能看懂 `review-findings` 與 `delivery-summary`
- Review-first MVP 可由至少 2 位非作者使用者重複執行
- Patch-first workflow 可由至少 1 位非作者使用者重複執行

---

## 34. 最後結論

你要做的，不應該是一個「會幫我叫不同 prompt 的工具」。

v2.16 的目標更明確：**先做一個 CLI-first 的 Runtime-Agnostic Agent Harness，但第一個 MVP 採用 Review-first；先證明它能安全讀專案、產出可信 review artifact、停在 manual review gate，再用 bug-fix / patch-first 驗證受控改檔，最後才擴展到小型 new-feature；等 CLI workflow 穩定後，再進入 read-only-first 的 TUI / WebUI。**

Phase 1 Onboarding + Provider Reality Check 的成功標準是：

- 能 project init。
- 能讀 manifest / adapter / assets。
- 能產出 simple context packet 與 context budget 結果。
- 能產出 provider-preflight-report。
- 能產出 provider-capability-matrix v0。
- 能在 ACC 與第二專案驗證 generic onboarding 不被綁死。

Phase 2 Review-first MVP 的成功標準是：

- 能跑 `generic.review` / `review-only`。
- 能產生 `review-findings`。
- 能進 manual review gate。
- 能輸出 `delivery-summary`。
- 能保存 run / step / artifact / logs / events。
- 能以 minimal state machine 管理 approve / reject / fail / retry。
- 能在 ACC 與第二專案驗證 core 不被綁死。
- 不要求自動修改檔案。
- 不要求完整 `new-feature`。
- 不要求完整 workspace-map。

Phase 3A Patch-first 的成功標準是：

- 能跑 `generic.bug-fix` / small patch。
- 能產生 bug brief / patch plan / file change set。
- 能以 command runner 執行 targeted lint / test。
- 能產出 command summary。
- 能進 review-diff / manual review gate。
- 能在 reject 後帶原因重跑 implementation 或 validation step。
- 能限制寫入到 controlled workdir / branch / patch mode。

Phase 3B Small New-feature 的成功標準是：

- 能跑小型 `generic.new-feature` 或 enhancement。
- 能產生 requirement brief / feature spec / implementation plan。
- 能執行 lint / test / build。
- 能產出 file change set / generated files manifest。
- 能進 review-diff / manual review gate。
- 能輸出 delivery summary。
- 能在 ACC 與第二專案驗證 feature / bug-fix workflow。

Phase 4 的成功標準是：

- Runtime / Provider / Capability 被正式化。
- State / Resume / Observability 被正式化。
- Workspace Understanding 被正式化。
- Generic workspace baseline 與 Angular / ACC extension 分開。
- Phase 2 / 3 已跑通的 workflow 不因 hardening 而退化。

Stage 2 才處理：

- TUI timeline / step tree / live logs。
- TUI approve / reject，之後才 retry / steer / queueing。
- WebUI run history / artifact viewer / diff viewer。
- replay inspector。
- metrics dashboard。
- workspace-map viewer。
- workspace drift monitoring。
- 團隊可視化與長期營運體驗。

你真正要做的是一個：

- 有 workflow。
- 有 runtime。
- 有 provider capability matrix。
- 有結構化 handoff。
- 有 artifacts。
- 有 execution messages。
- 有 review gates。
- 有 session persistence。
- 有 streaming observability。
- 有明確的狀態機與 resume model。
- 有 hook taxonomy 與治理邊界。
- 有 command runner 與 execution policy。
- 有 Core / Adapter / Asset Profile / Project Assets 分層架構。
- 有 Project Manifest 驅動的配置。
- 能跨專案適配。
- 能持續觀測與評估。
- 能先把 repo 壓成可重用的結構化上下文。
- 能以 workspace-map / context-slice / task-packet 穩定餵給 agent。

的 **Runtime-Agnostic Agent Harness**。

對 ACC 來說，這個方向仍然是對的，因為你手上的 GitHub Copilot provider assets 已經不算少；真正值得投資的下一步，是把它們從「散落在 provider-specific 檔案佈局中的靜態規則與角色定義」升級成「可執行、可續跑、可驗證、可重用的 reference project 資產」，同時讓其他專案也能透過自己的 Provider Asset Profile 接入。

一句話總結：

> **Phase 1 先做 onboarding + provider reality check；Phase 2 用 CLI 跑通 Review-first MVP；Phase 3A 用 bug-fix / patch-first 驗證受控改檔；Phase 3B 再跑小型 feature delivery；Stage 2 最後才把已驗證的 workflow 放大成 read-only-first、再 interactive-control 的 TUI / WebUI 團隊操作體驗。**

## 附錄 A：建議的 Stage 1 / Stage 2 新增檔案骨架

Stage 1 不需要一次建立以下全部檔案。Stage 1 前段只需保留 CLI、最小 workflow runner、artifact JSON output、Copilot SDK reference provider、MockRuntimeProvider、Provider Asset Profile、Project Asset Resolver、`project-manifest` schema、GenericProjectAdapter、ACC reference profile 與第一條 `generic.review` / `review-only` workflow 定義。以下骨架是 Phase 4 到 Stage 2 的目標結構。

```text
forgeweave-orchestrator/
├─ apps/
│  ├─ cli/                       # Stage 1
│  │  └─ src/
│  │     └─ main.ts
│  ├─ tui/                       # Stage 2
│  └─ web/                       # Stage 2
│
├─ packages/
│  ├─ core/
│  │  └─ src/
│  │     ├─ workflow-runner.ts
│  │     ├─ step-runner.ts
│  │     ├─ artifact-service.ts
│  │     ├─ runtime-registry.ts
│  │     ├─ execution-run-service.ts
│  │     ├─ review-gate.ts
│  │     └─ event-bus.ts
│  │
│  ├─ contracts/
│  │  └─ src/
│  │     ├─ artifact.ts
│  │     ├─ execution.ts
│  │     ├─ workflow.ts
│  │     ├─ event.ts
│  │     └─ handoff.ts
│  │
│  ├─ runtime-bridge/
│  │  └─ src/
│  │     ├─ runtime-provider-contract.ts
│  │     ├─ capability-matrix.ts
│  │     ├─ session-manager.ts
│  │     ├─ hook-adapter.ts
│  │     ├─ stream-adapter.ts
│  │     └─ providers/
│  │        ├─ copilot-sdk-provider.ts
│  │        └─ mock-runtime-provider.ts
│  │
│  ├─ scanner/
│  │  └─ src/
│  │     ├─ workspace-scanner.ts
│  │     ├─ dependency-scanner.ts
│  │     └─ changed-files-scanner.ts
│  │
│  ├─ extractor/
│  │  └─ src/
│  │     ├─ angular-metadata-extractor.ts
│  │     ├─ template-relation-extractor.ts
│  │     ├─ style-token-extractor.ts
│  │     └─ legacy-mapping-extractor.ts
│  │
│  ├─ workspace-map/
│  │  └─ src/
│  │     ├─ workspace-map-builder.ts
│  │     ├─ context-slicer.ts
│  │     └─ task-packet-builder.ts
│  │
│  ├─ storage/
│  │  └─ src/
│  │     ├─ run-store.ts
│  │     ├─ runtime-store.ts
│  │     ├─ execution-store.ts
│  │     ├─ artifact-store.ts
│  │     └─ event-store.ts
│  │
│  └─ project-adapter/
│     └─ src/
│        ├─ base-adapter.ts
│        ├─ generic-adapter.ts
│        ├─ framework-adapter.ts
│        ├─ acc-adapter.ts
│        ├─ adapter-recommender.ts
│        ├─ adapter-decision-report.ts
│        └─ github-asset-loader.ts
│
└─ examples/
   ├─ acc/
   │  ├─ workflows/
   │  ├─ config/
   │  │  └─ project-manifest.yml
   │  └─ sample-inputs/
   └─ sample-react/
      ├─ workflows/
      ├─ config/
      │  └─ project-manifest.yml
      └─ sample-inputs/
```

這份骨架適合作為 Phase 4 與 Stage 2 的目標結構；Stage 1 前段應只取其中能跑通 onboarding、provider reality check 與 CLI Review-first MVP 的最小子集，patch-first / feature delivery 相關檔案在 Phase 3 再補。

## 附錄 B：版本演進歷史

### B.1 詳細版本演進摘要

#### v2.3 相對 v2.2 的核心升級

v2.3 在原有 orchestrator 骨架上補上一層正式的 **repo understanding / deterministic context pipeline**：

1. 新增 **Workspace Understanding Layer**（掃描、metadata 抽取、workspace map、task packet）。
2. 強化 **Deterministic before Semantic** 原則。
3. 將 `Repo Facts Manifest` 擴充為可持續生成的 **workspace map / context slice**。
4. 將 **task packet** 明文化為 agent orchestration 的正式交接邊界。
5. 補入 **Phase 0.5：workspace understanding baseline**。
6. 補強 `ProjectAdapter`、artifact schema、event taxonomy、ADR 與 deliverable。

#### v2.4 相對 v2.3 的核心升級

v2.4 是全文 consolidation 版本，不新增功能，而是解決 v2.3 多版融合後的衝突、冗餘與結構問題：

1. **解決 5 項衝突矛盾**：`retryPolicy` 語意統一、Hook 命名對齊、Core / Adapter 邊界釐清、Resume 模型統一、Phase 1 範圍歸一。
2. **合併 8 項重複冗餘**：§24/§25 合併為單一外部實踐章節、Phase 功能列表與交付清單歸一、Non-Goals 與 KISS 禁止事項去重。
3. **章節結構調整**：§9（Copilot SDK 選型理由）提前至 §4、舊 §13 併入 §12、全文重新編號。
4. **設計補強**：`ProjectAdapter` 拆分為 5 個子 interface、補入 `WorkspaceMap` schema、Artifact 類型表加入 Phase 欄、新增安全模型定義、補入 state machine 與 roadmap ASCII 視覺圖。
5. **唯一真相原則**：每個概念只在一處定義，其他地方引用。

> **v2.3 補上了 repo understanding；v2.4 確保整份藍圖自身的一致性與可維護性。**

#### v2.5 到 v2.7 的核心升級

v2.5 到 v2.7 主要補強跨專案接入與 MVP 邊界：

1. v2.5 補上 **Generic / Framework / Project-Specific Adapter** 分層、Adapter Selection Rule、Adapter Recommendation / Decision Report。
2. v2.5 補上 **Generic Workflow Template + Project Override** 模型，避免每個專案複製整份 workflow。
3. v2.6 新增 **Phase 0.75 MVP Vertical Slice**，將 MVP 收斂成 1 個 workflow 的端到端驗證。
4. v2.6 將 runtime registry、provider capability matrix、完整 execution message store、完整 workspace understanding artifact 鏈與 6 個 workflow 延後。
5. v2.7 將核心能力、onboarding、ADR、交付清單全部對齊 **MVP / Phase 1A / Phase 1B / Phase 2+**。

> **v2.7 的重點是讓「先跑起來」與「長成平台」分清楚：MVP 驗證垂直切片，Phase 1A 補 runtime/state，Phase 1B 補 workspace understanding。**

#### v2.8 到 v2.9 的核心調整

v2.8 到 v2.9 主要補強 phase 驗收與 generic-first 落地策略：

1. v2.8 補上 **SDK 依賴風險與降級策略、測試策略、phase 驗收標準、區間式時間估算**。
2. v2.9 將落地順序由 **ACC-first** 調整為 **generic-first + ACC reference validation**。
3. v2.9 將 `GenericProjectAdapter`、`project init / onboarding`、`Adapter Recommendation`、`Generic Workflow Template` 前移到 MVP / Phase 1A 的核心能力。
4. v2.9 將 `Phase 4` 由「第一次跨專案通用化」改為「跨專案強化驗收」，避免與前期 generic 能力重複。
5. v2.9 同步校正 `§3 / §10 / §28 / §29 / §30 / §32 / §33` 的敘事一致性。

> **v2.9 的重點不是把平台做得更大，而是把「任何專案可接入」從後期願景改成前期正式要求，同時保留 ACC 作為第一個高價值 reference project。**

#### v2.10 的核心調整

v2.10 主要補強 roadmap 的可管理性與 phase 邊界：

1. 將原本 8 段主 roadmap 融合為 5 段：`Bootstrap`、`MVP Gate`、`Core Runtime`、`Workspace Understanding`、`Experience & Scale`。
2. 將舊 `Phase 0 + 0.5` 融合為單一 `Phase 0 Bootstrap`，將舊 `Phase 2 + 3` 融合為單一 `Phase 4 Experience & Scale`。
3. 將原本獨立的跨專案強化驗收改為 **橫向驗收軸**，不再與主 roadmap 重複佔用一個 phase。
4. 同步校正 `§10 / §25 / §26 / §27 / §28 / §30 / §32 / §33 / 附錄 A` 的 phase 命名與引用。

> **v2.10 的重點不是增加新功能，而是把 roadmap 從細分子階段收斂成更好管理的主要階段，同時保留原本的能力邊界。**

#### v2.11 的核心調整

v2.11 主要補強 runtime abstraction，避免平台在命名與架構敘事上被 GitHub Copilot SDK 綁死：

1. 將文件定位調整為 **runtime-agnostic core + Copilot SDK reference provider**。
2. 新增 `Runtime Provider Contract`、`AgentRuntimeProvider` 與 replacement strategy。
3. 將 `sdk-bridge` 調整為 `runtime-bridge/providers/copilot-sdk`，為未來 provider 替換保留邊界。
4. 將 manifest runtime 區塊補上 `fallback_providers` 與 `selection_mode: capability-first`。
5. 新增 ADR-016，正式宣告 Core 不應依賴單一 provider-specific API。

> **v2.11 的重點不是放棄 Copilot SDK，而是把它從唯一前提降為第一個 reference provider，讓核心架構未來可替換 runtime。**

#### v2.12 的核心調整

v2.12 主要將 roadmap 從多 phase 收斂為兩個主要 stage，並把第一階段改成 CLI-first functional delivery：

1. 將主交付策略改為 **Stage 1 CLI Functional Delivery / Stage 2 TUI + WebUI Experience**。
2. 明確要求 Stage 1 CLI 必須能完成 `generic.new-feature` 功能開發端到端 workflow。
3. 將 TUI / WebUI 從早期 scope 移到 Stage 2，避免介面工程稀釋 CLI workflow 驗證。
4. 將 Stage 1 runtime 邊界收斂為 `AgentRuntimeProvider` + `CopilotSdkRuntimeProvider` + `MockRuntimeProvider`。
5. 補入 Stage 1 adoption gate、workspace understanding coverage boundary 與 Implementation Backlog v1。

> **v2.12 的重點是先把 CLI 做成能交付功能開發需求的工具，再把已驗證的流程放大成 TUI / WebUI。**

#### v2.13 的核心調整

v2.13 主要將 Stage 1 的第一個 MVP 從 feature-first 調整為 Review-first：

1. 將 Phase 2 定義為 **CLI Review-first MVP**，優先跑通 `generic.review` / `review-only`。
2. 將 `generic.new-feature` 從 MVP Gate 移到 Phase 3，作為 Review-first MVP 之後的 feature delivery gate。
3. 明確 MVP 不要求自動修改檔案、不要求完整 workspace-map、不要求完整 `new-feature`。
4. 補入 Review-first MVP 的最小 workflow、M2 checklist、adoption gate、Implementation Backlog 與 ADR-018。
5. 保留 Stage 1 的最終目標：CLI 能完成專案功能開發需求；只是實作順序改為先審查、再小範圍修改、最後完整功能交付。

> **v2.13 的重點是讓 MVP 更小、更安全、更容易驗證：先能看懂與審查，再進入功能開發。**

#### v2.14 的核心調整

v2.14 主要修正 provider-specific assets、generic workspace baseline 與 WebUI 技術選型邊界：

1. 新增 **Provider Asset Profile**，將 `.github/`、`AGENTS.md`、skills 目錄等 provider-specific file layout 從 Core / GenericProjectAdapter 中抽離。
2. 將第 6 章拆成 Generic Workspace Baseline、Framework-Specific Baseline 與 ACC Reference Project Extension，避免 ACC / Angular 項目污染通用 baseline。
3. 第 8 章架構新增 Project Asset Resolver、Provider Asset Profiles、Provider Selector、Execution Environment Manager / Permission Gate 與 Human Review Gate。
4. 將 ACC Project Profile 連結改為 `docs/projects/acc/project-profile.md`，並建立最小 ACC Project Profile skeleton。
5. 將 WebUI 從固定 Angular 選型改為 **WebUI Tech Selection Gate**，Angular 僅作為候選方案之一。
6. 新增 ADR-019：Provider Asset Profiles over `.github` Assumption。

> **v2.14 的重點是讓 runtime-agnostic core 不再被 `.github`、ACC 或 Angular 假設污染，同時把 WebUI 技術選型延後到 Stage 2 以實證決策。**

#### v2.15 的核心調整

v2.15 主要修正 roadmap 的實作管理粒度：保留 v2.14 的兩大 Stage，但把內部落地拆成 Phase 0～6 Gate。

1. 將對外 roadmap 與對內工程管理分層：`Stage 1 / Stage 2` 對外溝通，`Phase 0～6` 對內驗收。
2. 將 Stage 1 拆成 Phase 0 Foundation、Phase 1 Onboarding、Phase 2 Review-first MVP、Phase 3 Feature Delivery MVP、Phase 4 Runtime / State / Workspace Hardening。
3. 將 Stage 2 拆成 Phase 5 TUI Experience 與 Phase 6 WebUI / Replay / Metrics。
4. 將 `§10 / §27 / §28 / §32` 的 milestone、測試門檻與交付清單對齊 Phase Gate。
5. 補入 ADR-020，正式記錄 Two-Layer Roadmap with Internal Phase Gates 決策。
6. 補齊 v2.14 摘要中提到但主文缺漏的 ADR-019，明確宣告 Provider Asset Profiles over `.github` Assumption。

> **v2.15 的重點不是把藍圖切得更碎，而是讓每一段實作都有明確 gate：主 roadmap 維持簡潔，內部驗收變得可管理。**


#### v2.16 的核心調整

v2.16 主要把 v2.15 的 Phase Gate 做風險重排，而不是擴大功能範圍：

1. Phase 1 新增 **Provider Reality Check / Capability Matrix v0**，先驗證 Copilot SDK reference provider 與 MockRuntimeProvider 的真實能力。
2. Phase 2 前移 minimal state machine、event envelope、artifact store 與 review decision metadata，避免 Phase 4 才第一次補治理骨架。
3. Phase 3 拆成 `3A Controlled Bug-fix / Patch-first` 與 `3B Small New-feature / Enhancement`，先用小型 patch 驗證受控改檔，再做小型 new-feature。
4. Phase 4 拆成 `4A Runtime / Provider / Capability`、`4B State / Resume / Observability`、`4C Workspace Understanding` 三條 hardening 線。
5. Workspace understanding 明確分成 generic baseline 與 Angular / ACC extension，避免 route map、component relation、migration mapping 污染 generic core。
6. Phase 5 / 6 採 read-only first：TUI 先 inspect + review，WebUI 先 run history + artifact / diff viewer，再進 steering、replay、metrics 與 drift。
7. 新增 ADR-021 Patch-first Feature Delivery before New-feature 與 ADR-022 Read-only Experience before Interactive Control。

> **v2.16 的重點是讓藍圖更尖、更安全：治理骨架前移，自動改檔降風險，hardening 拆包，UI 先觀察再控制。**

### B.2 版本演進記錄表

| 版本 | 日期       | 說明                                                                                                                                                                                                                                                                                                                                |
| ---- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| v1.0 | 2026-04-11 | 初版藍圖，涵蓋 ACC 第一版多 Agent orchestration 工具的完整規劃                                                                                                                                                                                                                                                                      |
| v2.0 | 2026-04-11 | 整合補強版，新增 Platform Scope、Workflow vs Agent 判準、Core / Adapter / Assets 三層架構、Project Manifest、Artifact Schema Strategy、Workflow State Machine、Hook Taxonomy、Observability / Replay / Eval、Project Onboarding、Second Project Validation Plan 與落地優先順序                                                      |
| v2.1 | 2026-04-11 | 架構優化：補強 WorkflowStepDefinition、Artifact 繼承模型、ProjectAdapter 載入能力、OrchestratorEvent 基礎欄位、錯誤處理策略，並將 ACC 專案細節解耦至 Project Profile                                                                                                                                                                |
| v2.2 | 2026-04-12 | 補強 runtime-aware / capability-aware / execution run / execution message / hook taxonomy / observability / resume model 等核心治理骨架                                                                                                                                                                                             |
| v2.3 | 2026-04-13 | 融合 repo understanding / deterministic context pipeline，新增 Workspace Understanding Layer、workspace-map、context-slice、task-packet、Phase 0.5 與相關 ADR / deliverables                                                                                                                                                        |
| v2.4 | 2026-04-13 | 全文 consolidation：解決 5 項衝突（retryPolicy / Hook 命名 / Core-Adapter 邊界 / Resume 模型 / Phase 1 範圍），合併 8 項重複（§24+§25 融合、§13 併入 §12、Non-Goals 去重），章節重新編號，補入 Safety Model、WorkspaceMap schema、ProjectAdapter ISP 拆分、state machine 與 roadmap ASCII 視覺圖、event versioning、Artifact Phase 欄 |
| v2.5 | 2026-04-17 | 補強跨專案擴充模型：新增 Generic / Framework / Project-Specific Adapter 分層、Adapter Selection Rule、Adapter Recommendation / Decision Report、通用 workflow template + 專案覆寫模型，並簡化 Project Onboarding 流程 |
| v2.6 | 2026-04-17 | 收斂第一版範圍：新增 Phase 0.75 MVP Vertical Slice，將 runtime registry、provider capability matrix、完整 execution message store、完整 workspace understanding artifact 鏈與 6 個 workflow 延後到 Phase 1 Core / Phase 2，並更新交付清單與落地路線 |
| v2.7 | 2026-04-17 | 進一步對齊 phase 邊界：核心能力清單拆為 MVP / Phase 1A / Phase 1B / Phase 2+，onboarding 拆成 MVP 與 Full Onboarding，ADR 補上 phase 落地時點，Phase 1 拆為 Core Runtime & State 與 Workspace Understanding Core，並清理 MVP checklist 重複項 |
| v2.8 | 2026-04-17 | 補強 SDK 依賴風險與降級策略、測試策略與 phase 驗收標準、區間式時間估算，以及錯誤情境演練範例；並進一步強化 `§26` / `§28` / `§32` 的唯一真相分工，不改變 MVP / Phase 1A / Phase 1B 的既有邊界 |
| v2.9 | 2026-04-24 | 將落地策略由 ACC-first 調整為 generic-first + ACC reference validation：前移 GenericProjectAdapter、project init / onboarding、Adapter Recommendation、Generic Workflow Template 至 MVP / Phase 1A，並同步校正 roadmap、onboarding、deliverables 與結論的一致性 |
| v2.10 | 2026-04-24 | 將 8 段 roadmap 融合為 5 段主 phase：Bootstrap、MVP Gate、Core Runtime、Workspace Understanding、Experience & Scale；並將跨專案強化驗收改為橫向驗收軸，同步校正 phase 名稱、交付清單、驗收與附錄結構 |
| v2.11 | 2026-04-24 | 將平台定位調整為 runtime-agnostic core + Copilot SDK reference provider；新增 Runtime Provider Contract、runtime replacement strategy、fallback provider 設定、runtime-bridge 目錄結構與 ADR-016 |
| v2.12 | 2026-04-24 | 將 roadmap 收斂為 Stage 1 CLI Functional Delivery 與 Stage 2 TUI / WebUI Experience；明確要求第一階段用 CLI 完成 `generic.new-feature` 功能開發 workflow，並補入 adoption gate、workspace understanding coverage boundary 與 Implementation Backlog v1 |
| v2.13 | 2026-04-24 | 將 Stage 1 的第一個 MVP 調整為 Review-first：先跑通 `generic.review` / `review-only`、`review-findings`、manual review gate 與 local persistence，再把 `generic.new-feature` 移到 Phase 3 作為 feature delivery gate；新增 ADR-018 |
| v2.14 | 2026-04-24 | 新增 Provider Asset Profile 與 Project Asset Resolver，移除 `.github` 作為通用前提；拆分 Generic / Framework / ACC workspace baseline；建立 `docs/projects/acc/project-profile.md` skeleton；第 8 章補強 provider、asset、review、permission 邊界；WebUI 改為 Tech Selection Gate，Angular 僅作候選方案；新增 ADR-019 |
| v2.15 | 2026-04-25 | 保留 Stage 1 / Stage 2 對外 roadmap，但新增 Phase 0～6 Gate 作為內部工程驗收：Phase 0 Foundation、Phase 1 Onboarding、Phase 2 Review-first MVP、Phase 3 Feature Delivery MVP、Phase 4 Runtime / State / Workspace Hardening、Phase 5 TUI、Phase 6 WebUI / Replay / Metrics；同步校正測試策略、§28 roadmap、§32 交付清單與 ADR-020 |
| v2.16 | 2026-04-27 | 依實作風險重排 Phase：Phase 1 加 Provider Reality Check / Capability Matrix v0；Phase 2 前移 minimal state / event / artifact store；Phase 3 拆為 3A bug-fix / patch-first 與 3B small new-feature；Phase 4 拆為 runtime/state/workspace 三條 hardening 線；Workspace boundary 分 generic 與 Angular / ACC extension；Phase 5 / 6 採 read-only first；新增 ADR-021 / ADR-022 |


---

## v2.17 補充 ADR

### ADR-023：ACC Single-page Legacy Migration as Phase 4 Reference Gate

決策：Phase 4 完成標準新增 ACC-specific reference gate：至少一個單頁 legacy page 必須可透過 CLI patch mode 前移到 modern Angular page，並經 validation、review gate、resume 與 reject rerun 驗證。

理由：Phase 4 若只完成 runtime/state/workspace hardening，仍可能停留在架構完整但缺少實戰證明的狀態。ACC 是第一 reference project，因此需要一個能代表真實價值的 bounded migration gate。

邊界：此 ADR 不要求大型 module migration、不允許無 review 自動 merge、不要求跨多 domain 的 API contract 重構。
