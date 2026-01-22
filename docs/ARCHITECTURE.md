# 架构概览

> 本文档只描述“当前代码已经存在”的架构与数据流。任何扩展必须以代码为准。

## 技术栈

- 前端：Vue（`src/`）
- 桌面端：Tauri（`src-tauri/`）

## 运行模式（概念）

- 离线模式：不依赖云端即可使用核心功能（以当前代码实现为准）
- 云同步模式（可选）：通过 Supabase 等服务同步数据（由环境变量/配置决定）

## 配置与敏感信息

- 仓库只提供示例：`.env.example`、`src/config/accounts.example.ts`
- 本机真实配置：`.env.local`、`src/config/accounts.local.ts`（应被 `.gitignore` 忽略）

## 关键目录

- `src/`：前端应用代码
- `src-tauri/`：桌面端（Tauri）代码
- `src/utils/`：工具与解析逻辑
- `src/stores/`：状态管理
- `src/views/`：页面
- `src/components/`：可复用组件
