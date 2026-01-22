# SmartiCafe 协作入口（AI/人类必读）

本仓库面向“从零二次开发/学习参考”，不包含任何真实业务数据、账号、密钥。

## 事实来源（必须遵守）

- 以 `src/` 与 `src-tauri/` 代码为准。
- 文档的“唯一真源”在 `docs/INDEX.md`，除 `docs/` 指定的活文档外，其它内容不得作为现状依据。

## 开发与修改的硬性流程

- 改代码前：先全局搜索定位真实入口文件，禁止凭空重写模块。
- 改代码后：必须同时更新 `docs/PROJECT_STATUS.md`（写清本次改动范围与验证方式）。
- 每次可运行的改动都必须提交并推送：`git add -A` → `git commit -m "..."` → `git push`。

## 配置与敏感信息

- 公开仓库只提供示例配置：`.env.example` 与 `src/config/accounts.example.ts`。
- 真实配置只能放本机并被忽略：`.env.local`、`src/config/accounts.local.ts`。

## 入口

请从 `docs/INDEX.md` 开始阅读。
