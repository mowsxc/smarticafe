# Smarticafe Pro 环境配置指南

## 📋 概述

本指南将帮助您快速搭建 Smarticafe Pro 的开发环境，包括前端开发、Tauri 桌面应用、数据库配置等完整的环境设置。

## 🔧 系统要求

### 操作系统
- **Windows**: Windows 10/11 (推荐，原生支持)
- **macOS**: macOS 10.15+ (Intel/Apple Silicon)
- **Linux**: Ubuntu 20.04+ / CentOS 8+ (需要额外配置)

### 硬件要求
- **内存**: 8GB RAM (推荐 16GB)
- **存储**: 至少 5GB 可用空间
- **处理器**: 支持 64 位架构

### 软件依赖
- **Node.js**: 18.0.0 或更高版本
- **npm**: 8.0.0 或更高版本 (或 yarn/pnpm)
- **Rust**: 1.70.0 或更高版本
- **Git**: 2.30.0 或更高版本

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-repo/smarticafe-pro.git
cd smarticafe-pro
```

### 2. 安装 Node.js 依赖

```bash
# 使用 npm
npm install

# 或使用 yarn
yarn install

# 或使用 pnpm (推荐)
pnpm install
```

### 3. 安装 Rust (如未安装)

**Windows**:
```bash
# 下载并运行 rustup-init.exe
# 访问: https://rustup.rs/

# 或使用 PowerShell
Invoke-WebRequest -Uri "https://win.rustup.rs/x86_64" -OutFile "rustup-init.exe"
.\rustup-init.exe
```

**macOS/Linux**:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

### 4. 验证安装

```bash
# 检查 Node.js 版本
node --version  # 应该 >= 18.0.0

# 检查 Rust 版本
rustc --version  # 应该 >= 1.70.0

# 检查 Cargo 版本
cargo --version
```

## 🔑 环境变量配置

### 1. 创建环境变量文件

复制环境变量模板：
```bash
cp .env.example .env.local
```

### 2. Supabase 配置

编辑 `.env.local` 文件，填入您的 Supabase 配置：

```env
# Supabase 配置 (必需)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
# ⚠️ 不要在前端环境变量中放 service_role / service key（最高权限密钥）
# 仅允许在后端/服务器端使用，并且永远不要提交到 Git
# VITE_SUPABASE_SERVICE_ROLE_KEY=<never_commit_service_role_key>

# 开发配置
VITE_DEV_PORT=32520
VITE_API_PORT=3030

# 应用配置
VITE_APP_NAME=Smarticafe Pro
VITE_SHOP_NAME=创新意电竞馆
VITE_VERSION=2.2.0

# 调试配置 (开发环境)
VITE_DEBUG=true
VITE_LOG_LEVEL=debug
```

### 3. 获取 Supabase 配置

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 创建新项目或选择现有项目
3. 在 Settings → API 中找到：
   - **Project URL**: `https://your-project-id.supabase.co`
   - **anon public**: 匿名访问密钥
   - **service_role**: 服务端密钥 (仅开发环境使用)

### 4. 数据库初始化

运行数据库迁移脚本：

```bash
# 如果项目包含迁移脚本
npm run db:migrate

# 或手动在 Supabase SQL Editor 中执行
# 文件位置: supabase/database/schema.sql
```

## 🛠️ 开发环境启动

### 方式一：完整 Tauri 应用 (推荐)

```bash
npm run tauri dev
```

这将启动：
- 前端开发服务器 (Vite)
- Rust 后端服务
- HTTP API 服务器
- Tauri 桌面应用窗口

### 方式二：仅前端开发

```bash
npm run dev
```

访问 `http://localhost:32520` 查看前端界面

### 方式三：仅 API 服务器

```bash
npm run api:dev
```

API 服务器运行在 `http://127.0.0.1:3030`

## 🔧 Tauri 特殊配置

### Windows 系统

**安装 WebView2** (如果尚未安装)：
```powershell
# 检查是否已安装
Get-AppxPackage -Name "Microsoft.WebView2"

# 自动下载安装 (项目中已包含)
# 或手动下载: https://developer.microsoft.com/en-us/microsoft-edge/webview2/
```

**安装 Visual Studio Build Tools** (推荐)：
- 下载 [Visual Studio Installer](https://visualstudio.microsoft.com/downloads/)
- 安装 "Visual Studio Build Tools"
- 选择 "C++ build tools" 工作负载

### macOS 系统

**安装 Xcode Command Line Tools**：
```bash
xcode-select --install
```

### Linux 系统

**安装系统依赖**：

**Ubuntu/Debian**:
```bash
sudo apt update
sudo apt install -y \
    libwebkit2gtk-4.0-37 \
    libappindicator3-dev \
    librsvg2-dev \
    patchelf
```

**CentOS/RHEL**:
```bash
sudo yum install -y \
    webkit2gtk3 \
    libappindicator-gtk3 \
    librsvg2 \
    patchelf
```

## 🗄️ 数据库配置

### 本地 SQLite

本地数据库文件会自动创建在：
- **Windows**: `%APPDATA%/com.smarticafe.app/databases/`
- **macOS**: `~/Library/Application Support/com.smarticafe.app/databases/`
- **Linux**: `~/.local/share/com.smarticafe.app/databases/`

### Supabase 云端同步

#### RLS (Row Level Security) 策略

确保在 Supabase 中正确配置 RLS 策略：

```sql
-- 启用 RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- ... 其他表

-- 创建策略 (示例)
CREATE POLICY "Users can view their own data" ON products
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own data" ON products
    FOR INSERT WITH CHECK (auth.uid() = user_id);
```

详细配置请参考：[SUPABASE_RLS.md](./SUPABASE_RLS.md)

#### 数据库表结构

核心表结构（包含在 `supabase/database/schema.sql` 中）：

```sql
-- 认证会话
CREATE TABLE auth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    role TEXT NOT NULL,
    display_name TEXT,
    equity_percentage DECIMAL(5,4),
    login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    logout_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 商品列表
CREATE TABLE products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    spec INTEGER NOT NULL DEFAULT 1,
    on_shelf BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 其他表结构...
```

## 🧪 测试环境配置

### 单元测试

```bash
# 运行所有测试
npm run test

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

### E2E 测试 (Playwright)

```bash
# 安装浏览器
npx playwright install

# 运行 E2E 测试
npm run test:e2e

# 调试模式
npm run test:e2e:debug
```

### 测试数据库

测试环境使用独立的数据库配置：

```env
# 测试环境变量
VITE_TEST_MODE=true
VITE_SUPABASE_URL_TEST=https://your-test-project.supabase.co
VITE_SUPABASE_ANON_KEY_TEST=your-test-anon-key
```

## 🚀 生产环境构建

### 前端构建

```bash
# 类型检查 + 构建
npm run build

# 仅类型检查
npm run type-check

# 仅构建 (跳过类型检查)
npm run build-only
```

### Tauri 应用构建

```bash
# 构建所有平台
npm run tauri build

# 构建特定平台
npm run tauri build --target x86_64-pc-windows-msvc  # Windows
npm run tauri build --target x86_64-apple-darwin     # macOS Intel
npm run tauri build --target aarch64-apple-darwin     # macOS Apple Silicon
npm run tauri build --target x86_64-unknown-linux-gnu # Linux
```

### 构建输出

构建产物位于：
- **Windows**: `src-tauri/target/release/bundle/msi/`
- **macOS**: `src-tauri/target/release/bundle/macos/`
- **Linux**: `src-tauri/target/release/bundle/deb/`

## 🔍 开发工具配置

### VS Code 推荐

安装以下 VS Code 扩展：

```json
{
  "recommendations": [
    "vue.volar",
    "vue.vscode-typescript-vue-plugin",
    "bradlc.vscode-tailwindcss",
    "rust-lang.rust-analyzer",
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint"
  ]
}
```

### Git Hooks (可选)

安装 husky 进行代码质量检查：

```bash
npm install --save-dev husky

# 初始化 husky
npx husky install

# 添加 pre-commit hook
npx husky add .husky/pre-commit "npm run type-check && npm run lint"

# 添加 commit-msg hook
npx husky add .husky/commit-msg "npx commitlint --edit $1"
```

### 调试配置

**VS Code 调试配置** (`.vscode/launch.json`)：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Tauri App",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/tauri",
      "args": ["dev"],
      "cwd": "${workspaceFolder}",
      "env": {
        "RUST_LOG": "debug"
      }
    },
    {
      "name": "Debug Frontend",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:32520",
      "webRoot": "${workspaceFolder}/src"
    }
  ]
}
```

## 🐛 常见问题排查

### 1. Node.js 版本问题

**问题**: `node: command not found`
```bash
# 解决方案：重新安装 Node.js 或添加到 PATH
# 确保使用 LTS 版本
```

**问题**: `Unsupported Node.js version`
```bash
# 解决方案：升级到支持的版本
nvm install 18
nvm use 18
```

### 2. Rust 编译问题

**问题**: `cargo: command not found`
```bash
# 解决方案：安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

**问题**: Microsoft Visual C++ 错误 (Windows)
```bash
# 解决方案：安装 Visual Studio Build Tools
# 或使用 rustup 添加 target
rustup target add x86_64-pc-windows-msvc
```

### 3. Tauri 启动问题

**问题**: WebView2 未安装 (Windows)
```bash
# 解决方案：安装 WebView2
# 或下载预构建版本 (项目中已包含)
```

**问题**: 权限被拒绝
```bash
# 解决方案：检查防火墙设置
# 或使用管理员权限运行
```

### 4. 数据库连接问题

**问题**: Supabase 连接失败
```bash
# 检查环境变量
echo $VITE_SUPABASE_URL

# 检查网络连接
curl https://your-project.supabase.co/rest/v1/
```

**问题**: RLS 策略错误
```sql
-- 临时禁用 RLS 测试
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
```

### 5. 端口占用问题

**问题**: 端口 32520 或 3030 被占用
```bash
# 查找占用端口的进程
# Windows
netstat -ano | findstr :32520

# macOS/Linux
lsof -i :32520

# 终止进程或修改端口配置
```

## 📚 相关文档

- [API 接口文档](./API.md)
- [数据库设计文档](./DATABASE.md)
- [部署运维指南](./DEPLOYMENT.md)
- [架构设计文档](./ARCHITECTURE.md)
- [故障排查手册](./TROUBLESHOOTING.md)

## 🆘 获取帮助

如果遇到问题，可以通过以下方式获取帮助：

1. **查看日志**: 检查控制台输出和日志文件
2. **阅读文档**: 参考相关文档和常见问题
3. **检查 Issues**: 查看 GitHub Issues
4. **联系支持**: 联系开发团队

---

**文档版本**: v2.2.0  
**最后更新**: 2026-01-20  
**维护者**: Smarticafe 开发团队