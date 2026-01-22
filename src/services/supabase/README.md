# Supabase 模块

本目录提供与 Supabase 相关的客户端封装与数据适配层，用于在启用云同步时与后端交互。

## 目录结构

```
src/services/supabase/
├── client.ts      # Supabase 客户端配置与连接管理
├── adapters.ts    # 数据适配/同步相关封装
└── README.md
```

## 配置来源

- Supabase 的连接信息来自环境变量（例如 `.env.local`）。
- 仓库内仅提供示例 `.env.example`，真实密钥不应提交。