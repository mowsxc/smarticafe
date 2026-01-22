# Smarticafe Pro API 接口文档

## 概述

Smarticafe Pro 提供了完整的 RESTful API 接口，支持商品管理、订单处理、财务记账、用户管理等核心功能。API 基于本地 HTTP 服务器，支持 JSON 格式的数据交换。

## 🚀 快速开始

### 服务器信息
- **基础URL**: `http://127.0.0.1:3030`
- **启动方式**: `npm run tauri dev` (自带HTTP服务器)
- **数据格式**: `application/json`
- **字符编码**: `UTF-8`

### 认证方式
目前使用基于会话的认证，通过登录接口获取会话：

```json
POST /api/auth/login
{
  "username": "黄河",
  "password": ""  // 员工免密，股东需要密码
}
```

## 📚 API 分类

### 1. 认证接口 (`/api/auth`)

#### 用户登录
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "string",
  "password": "string"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "emp_黄河",
      "username": "黄河",
      "role": "employee",
      "displayName": "黄河",
      "equityPercentage": null,
      "heldFrom": null
    },
    "token": "session_token_here"
  }
}
```

#### 用户登出
```http
POST /api/auth/logout
Authorization: Bearer {token}
```

#### 获取当前用户信息
```http
GET /api/auth/me
Authorization: Bearer {token}
```

#### 获取可选用户列表
```http
GET /api/auth/users
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "employees": ["黄河", "刘杰", "贾政华", "秦佳", "史红"],
    "bosses": ["莫健", "朱晓培"]
  }
}
```

### 2. 商品管理接口 (`/api/products`)

#### 获取商品列表
```http
GET /api/products
```

**查询参数**:
- `category` (可选): 商品分类筛选
- `on_shelf` (可选): 是否上架 (`true`/`false`)
- `page` (可选): 页码，默认 1
- `limit` (可选): 每页数量，默认 50

**响应示例**:
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "prod_001",
        "name": "中瓶冰茶",
        "category": "饮料",
        "unit_price": 3.00,
        "stock": 120,
        "spec": 24,
        "on_shelf": true
      }
    ],
    "total": 45,
    "page": 1,
    "limit": 50
  }
}
```

#### 创建商品
```http
POST /api/products
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "string",
  "category": "string",
  "unit_price": "number",
  "stock": "number",
  "spec": "number",
  "on_shelf": "boolean"
}
```

#### 更新商品
```http
PUT /api/products/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "string",
  "category": "string",
  "unit_price": "number",
  "stock": "number",
  "spec": "number",
  "on_shelf": "boolean"
}
```

#### 删除商品
```http
DELETE /api/products/{id}
Authorization: Bearer {token}
```

#### 批量更新库存
```http
POST /api/products/batch-update-stock
Authorization: Bearer {token}
Content-Type: application/json

{
  "updates": [
    {
      "id": "prod_001",
      "stock_change": -5
    }
  ]
}
```

### 3. 订单管理接口 (`/api/orders`)

#### 创建销售订单
```http
POST /api/orders
Authorization: Bearer {token}
Content-Type: application/json

{
  "items": [
    {
      "product_id": "prod_001",
      "quantity": 2,
      "unit_price": 3.00,
      "total_price": 6.00
    }
  ],
  "total_amount": 6.00,
  "payment_method": "cash",
  "customer_info": {
    "name": "散客",
    "phone": ""
  }
}
```

#### 获取订单列表
```http
GET /api/orders
Authorization: Bearer {token}
```

**查询参数**:
- `date_from` (可选): 开始日期 `YYYY-MM-DD`
- `date_to` (可选): 结束日期 `YYYY-MM-DD`
- `shift` (可选): 班次筛选 (`早班`/`晚班`)
- `page` (可选): 页码
- `limit` (可选): 每页数量

#### 获取订单详情
```http
GET /api/orders/{id}
Authorization: Bearer {token}
```

#### 退款订单
```http
POST /api/orders/{id}/refund
Authorization: Bearer {token}
Content-Type: application/json

{
  "reason": "string",
  "refund_amount": "number",
  "refund_items": [
    {
      "product_id": "prod_001",
      "quantity": 1,
      "refund_amount": 3.00
    }
  ]
}
```

### 4. 财务管理接口 (`/api/finance`)

#### 获取财务汇总
```http
GET /api/finance/summary
Authorization: Bearer {token}
```

**查询参数**:
- `date_from` (可选): 开始日期
- `date_to` (可选): 结束日期
- `shift_type` (可选): 班次类型

**响应示例**:
```json
{
  "success": true,
  "data": {
    "period": "2026-01-01 to 2026-01-20",
    "total_sales": 12580.50,
    "total_expenses": 3200.00,
    "net_income": 9380.50,
    "meituan_revenue": 3450.00,
    "cash_revenue": 9130.50,
    "expenses": [
      {
        "item": "网费",
        "amount": 1200.00
      }
    ]
  }
}
```

#### 创建支出记录
```http
POST /api/finance/expenses
Authorization: Bearer {token}
Content-Type: application/json

{
  "item": "string",
  "amount": "number",
  "category": "string",
  "payment_method": "bar|finance",
  "notes": "string"
}
```

#### 获取支出列表
```http
GET /api/finance/expenses
Authorization: Bearer {token}
```

#### 创建收入记录
```http
POST /api/finance/income
Authorization: Bearer {token}
Content-Type: application/json

{
  "item": "string",
  "amount": "number",
  "category": "string",
  "notes": "string"
}
```

### 5. 交班管理接口 (`/api/shifts`)

#### 创建交班记录
```http
POST /api/shifts
Authorization: Bearer {token}
Content-Type: application/json

{
  "shift_date": "2026-01-20",
  "shift_type": "早班|晚班",
  "employee": "黄河",
  "successor": "刘杰",
  "financial_summary": {
    "cash_amount": 1250.50,
    "sales_amount": 890.00,
    "expense_amount": 120.00,
    "total_amount": 2020.50
  },
  "inventory_snapshot": {
    "products": [
      {
        "product_id": "prod_001",
        "product_name": "中瓶冰茶",
        "original": 24,
        "restock": 12,
        "remaining": 18,
        "redeem": 2,
        "loss": 0,
        "purchase": 1
      }
    ]
  },
  "notes": "正常交班"
}
```

#### 获取交班记录列表
```http
GET /api/shifts
Authorization: Bearer {token}
```

**查询参数**:
- `date_from` (可选): 开始日期
- `date_to` (可选): 结束日期
- `employee` (可选): 员工筛选
- `shift_type` (可选): 班次类型

#### 获取交班详情
```http
GET /api/shifts/{id}
Authorization: Bearer {token}
```

#### 生成交班快照
```http
POST /api/shifts/{id}/snapshot
Authorization: Bearer {token}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "snapshot_url": "/snapshots/shift_20260120_001.html",
    "snapshot_html": "<html>...</html>"
  }
}
```

### 6. 美团管理接口 (`/api/meituan`)

#### 解析美团订单数据
```http
POST /api/meituan/parse
Authorization: Bearer {token}
Content-Type: application/json

{
  "raw_data": "粘贴的美团订单原始数据"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "name": "中瓶冰茶",
        "type": "饮料",
        "coupon": "123456789",
        "amount": 3.00,
        "discount": 0.50,
        "actual": 2.50,
        "financial": 1.50,
        "time": "2026-01-20 14:30",
        "phone": "138****1234",
        "remark": "",
        "store": "创新意电竞馆"
      }
    ],
    "stats": {
      "bar_total": 25.50,
      "real_bar_total": 21.00,
      "financial_total": 15.00,
      "count": 8,
      "cokes": 3,
      "range": "2026-01-20 14:00-15:00"
    }
  }
}
```

#### 保存美团订单
```http
POST /api/meituan/orders
Authorization: Bearer {token}
Content-Type: application/json

{
  "orders": [
    {
      "name": "string",
      "type": "string",
      "coupon": "string",
      "amount": "number",
      "discount": "number",
      "actual": "number",
      "financial": "number",
      "time": "string",
      "phone": "string",
      "remark": "string",
      "store": "string"
    }
  ]
}
```

#### 获取美团订单列表
```http
GET /api/meituan/orders
Authorization: Bearer {token}
```

**查询参数**:
- `date_from` (可选): 开始日期
- `date_to` (可选): 结束日期
- `store` (可选): 门店筛选

#### 获取美团统计
```http
GET /api/meituan/stats
Authorization: Bearer {token}
```

### 7. 用户管理接口 (`/api/users`)

#### 获取用户列表 (仅超管)
```http
GET /api/users
Authorization: Bearer {token}
```

#### 创建用户 (仅超管)
```http
POST /api/users
Authorization: Bearer {token}
Content-Type: application/json

{
  "username": "string",
  "display_name": "string",
  "role": "employee|boss|admin",
  "password": "string",
  "equity_percentage": "number"
}
```

#### 更新用户 (仅超管)
```http
PUT /api/users/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "display_name": "string",
  "role": "employee|boss|admin",
  "equity_percentage": "number"
}
```

#### 禁用/启用用户 (仅超管)
```http
POST /api/users/{id}/toggle
Authorization: Bearer {token}
```

### 8. 系统设置接口 (`/api/settings`)

#### 获取系统设置
```http
GET /api/settings
Authorization: Bearer {token}
```

#### 更新系统设置 (仅超管)
```http
PUT /api/settings
Authorization: Bearer {token}
Content-Type: application/json

{
  "shop_name": "string",
  "shop_address": "string",
  "shop_phone": "string",
  "tax_rate": "number",
  "default_currency": "CNY",
  "backup_enabled": "boolean",
  "sync_interval": "number"
}
```

#### 备份数据
```http
POST /api/settings/backup
Authorization: Bearer {token}
```

#### 恢复数据
```http
POST /api/settings/restore
Authorization: Bearer {token}
Content-Type: application/json

{
  "backup_file": "string"
}
```

## 🔧 错误码说明

### HTTP 状态码
- `200` - 成功
- `400` - 请求参数错误
- `401` - 未认证
- `403` - 权限不足
- `404` - 资源不存在
- `500` - 服务器内部错误

### 业务错误码
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "商品库存不足",
    "details": {
      "product_id": "prod_001",
      "requested": 10,
      "available": 5
    }
  }
}
```

**常见错误码**:
- `INVALID_CREDENTIALS` - 用户名或密码错误
- `INSUFFICIENT_PERMISSIONS` - 权限不足
- `PRODUCT_NOT_FOUND` - 商品不存在
- `INSUFFICIENT_STOCK` - 库存不足
- `ORDER_NOT_FOUND` - 订单不存在
- `SHIFT_ALREADY_CLOSED` - 班次已关闭
- `DUPLICATE_USERNAME` - 用户名已存在
- `VALIDATION_ERROR` - 数据验证失败
- `DATABASE_ERROR` - 数据库操作失败
- `SYNC_ERROR` - 数据同步失败

## 🔄 数据同步

### 本地优先原则
- 所有操作优先写入本地 SQLite 数据库
- 后台异步同步到 Supabase 云端
- 网络异常时保存在同步队列中

### 同步状态查询
```http
GET /api/sync/status
Authorization: Bearer {token}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "last_sync": "2026-01-20T15:30:00Z",
    "pending_count": 3,
    "sync_enabled": true,
    "conflicts": []
  }
}
```

### 手动触发同步
```http
POST /api/sync/trigger
Authorization: Bearer {token}
```

## 📝 使用示例

### JavaScript/TypeScript 示例

```typescript
// 登录
const loginResponse = await fetch('http://127.0.0.1:3030/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    username: '黄河',
    password: ''
  })
});

const { data } = await loginResponse.json();
const token = data.token;

// 获取商品列表
const productsResponse = await fetch('http://127.0.0.1:3030/api/products', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { data: products } = await productsResponse.json();
console.log('商品列表:', products.products);

// 创建订单
const orderResponse = await fetch('http://127.0.0.1:3030/api/orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    items: [
      {
        product_id: 'prod_001',
        quantity: 2,
        unit_price: 3.00,
        total_price: 6.00
      }
    ],
    total_amount: 6.00,
    payment_method: 'cash'
  })
});
```

### Python 示例

```python
import requests
import json

# 登录
login_data = {
    "username": "黄河",
    "password": ""
}

response = requests.post('http://127.0.0.1:3030/api/auth/login', 
                         json=login_data)
result = response.json()
token = result['data']['token']

# 设置请求头
headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

# 获取商品列表
products_response = requests.get('http://127.0.0.1:3030/api/products', 
                                headers=headers)
products = products_response.json()['data']['products']

# 创建订单
order_data = {
    "items": [
        {
            "product_id": products[0]['id'],
            "quantity": 1,
            "unit_price": products[0]['unit_price'],
            "total_price": products[0]['unit_price']
        }
    ],
    "total_amount": products[0]['unit_price'],
    "payment_method": "cash"
}

order_response = requests.post('http://127.0.0.1:3030/api/orders',
                               json=order_data,
                               headers=headers)
print(order_response.json())
```

## ⚠️ 注意事项

1. **服务器启动**: API 服务器随 Tauri 应用启动，无需单独启动
2. **并发限制**: 建议客户端实现请求限流，避免过载
3. **数据备份**: 建议定期备份本地 SQLite 数据库
4. **网络依赖**: API 仅在应用运行时可用
5. **版本兼容**: API 可能随版本升级而变化，请关注更新日志

## 📚 相关文档

- [用户认证指南](./AUTH.md)
- [数据库设计文档](./DATABASE.md)
- [部署运维指南](./DEPLOYMENT.md)
- [错误排查手册](./TROUBLESHOOTING.md)

---
**文档版本**: v2.2.0  
**最后更新**: 2026-01-20  
**维护者**: Smarticafe 开发团队