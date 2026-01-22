# AI 协作规则（跨 IDE 通用）

> 本规则用于统一 `.windsurf/.kiro/.agent/.sisyphus` 等不同 AI 工具的行为。

## 必读顺序

1. `AGENTS.md`
2. `docs/INDEX.md`
3. `docs/PROJECT_STATUS.md`
4. 相关代码（以 `src/` 与 `src-tauri/` 为准）

## 修改规则

- 修改前必须先搜索定位入口文件，禁止凭空重写或删除模块。
- 修改后必须更新 `docs/PROJECT_STATUS.md`。
- 每次可运行改动必须 `git add -A`、`git commit`、`git push`。

## 信息安全

- 仓库中只允许出现示例配置（`.env.example`、`accounts.example.ts`）。
- `.env.local`、`accounts.local.ts` 等真实配置必须被忽略，禁止提交。
