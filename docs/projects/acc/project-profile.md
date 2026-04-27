# ACC Project Profile

ACC 是 ForgeWeave Orchestrator 的第一參考專案與外部驗證目標。

本文件描述 ACC expectations、workflow assumptions、migration rules 與 validation policy；不包含真實 ACC source code。

## ACC repo 位置

每個工作環境自行設定：

```bash
FORGEWEAVE_ACC_ROOT=/path/to/acc
```

不要把真實本機 path、private URL、token 或 ACC source commit 進 ForgeWeave repo。

## 驗證模式

| 模式 | 用途 |
| --- | --- |
| fixture | 使用 `examples/acc` 做 onboarding / review / migration fixture |
| live-readonly | 讀真實 ACC 做 onboarding 或 review validation |
| live-patch | 在真實 ACC 隔離 branch/worktree 做 patch-mode migration |

## ACC migration 目標

Phase 4 必須能支援：

```text
單頁 legacy page
→ modern Angular page
→ patch mode
→ validation
→ review gate
→ delivery summary
```

## 必要輸入

- legacy route 或 legacy page path。
- legacy controller/template/service hints。
- target modern Angular feature path。
- migration brief。
- acceptance criteria。
- optional：permission / API / UI convention constraints。

## 必要 artifacts

- migration-analysis
- legacy-modern-mapping
- implementation-plan
- context-slice
- task-packet
- file-change-set
- generated-files-manifest
- command-summary
- review-findings
- migration-checklist-result
- delivery-summary

## 非目標

- 不做多頁 module migration。
- 不做大型 API contract 重構。
- 不做未指定的 design system 全面調整。
- 不允許不經 review 的 auto merge。
