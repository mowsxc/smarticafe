# 后端开发日志 (Backend Dev Log)

> 记录 Rust/Tauri 后端开发、数据库 Schema 变更、Command 定义。

## 2026-01-15 规划与迁移

### 🛠️ 变更记录
### 🛠️ 变更记录
*   **[Core]** 成功从旧版项目迁移 `lib.rs` 核心逻辑，完成 SQLite 与 Tauri 的深度绑定。
*   **[Data]** 实装 `ensure_products_seed`，在数据库初始化时自动录入 2026-01-01 真实库存及规格。
*   **[API]** 新增 `pos_checkout` 命令，支持实时库存扣减与销售订单落库，替代了原来的批量汇总逻辑。
*   **[Security]** 实现 `auth_login` 真实鉴权，支持通过密码解析影子账号身份。

### 📅 下一步计划
1.  **Refactor**: 优化 `AccountingEntry` 逻辑，支持 POS 结账自动生成财务流水。
2.  **Report**: 实现基于真实数据的“日/周/月报表”计算逻辑。
3.  **Stability**: 完善数据库事务处理，确保断网环境下的数据原子性。

---
