# FindIt V1 Codex 开发任务文档

项目中文名：我东西呢？

英文名：Where's My Stuff?

Slogan：忘了放哪？来这里找。

---

# 一、项目目标

FindIt 是一个移动端优先的个人物品位置记录与查找应用。

用户可以记录重要物品的存放位置、上传现场照片、维护位置历史，并通过搜索和提醒机制快速找回物品。

核心价值：

```text
视觉记忆 + 位置历史 + 定期核对提醒
```

---

# 二、V1 MVP 范围

V1 只实现基础可用版本。

## 必须实现

- 用户注册
- 用户登录
- JWT 鉴权
- 固定分类系统
- 物品创建
- 物品列表
- 物品搜索
- 物品详情
- 图片上传
- 位置历史记录
- 更新位置
- 原地核对
- 提醒列表
- 移动端 Web 前端页面

## 暂不实现

- AI 图像识别
- OCR
- 语音输入
- 大模型 Agent
- 自然语言搜索
- App 推送通知
- iOS / Android 原生打包
- MinIO / OSS / S3
- Elasticsearch

---

# 三、技术栈

## 后端

```text
Go
Gin
GORM
MySQL 8
Redis 7
JWT
bcrypt
```

## 前端

```text
Vue 3
TypeScript
Vite
Pinia
Axios
Vant Mobile
```

## 图片存储

V1 使用本地文件存储。

目录：

```text
backend/uploads/
```

后续版本再迁移到 MinIO / OSS / S3。

---

# 四、推荐项目目录

```text
FindIt/
├── docs/
│   ├── FindIt_V1_Database_Design.md
│   └── FindIt_V1_Codex_Task.md
├── backend/
│   ├── cmd/
│   │   └── main.go
│   ├── internal/
│   │   ├── config/
│   │   ├── handler/
│   │   ├── middleware/
│   │   ├── model/
│   │   ├── repository/
│   │   ├── router/
│   │   └── service/
│   ├── pkg/
│   │   ├── jwt/
│   │   ├── response/
│   │   └── storage/
│   ├── uploads/
│   ├── go.mod
│   └── config.yaml
└── frontend/
    ├── src/
    │   ├── api/
    │   ├── assets/
    │   ├── components/
    │   ├── router/
    │   ├── stores/
    │   ├── types/
    │   ├── utils/
    │   └── views/
    ├── package.json
    └── vite.config.ts
```

---

# 五、数据库要求

数据库设计参考：

```text
docs/FindIt_V1_Database_Design.md
```

V1 使用 5 张表：

```text
users
categories
items
location_records
item_images
```

必须使用事务保证以下操作一致性：

```text
创建物品
更新位置
原地确认
删除物品
```

---

# 六、固定分类系统

分类必须初始化为以下 7 类：

```text
📄 证件
📷 摄影器材
💻 电子设备
🔑 钥匙
📁 文件资料
💎 贵重物品
📦 其他
```

分类不允许用户在 V1 自定义。

前端显示分类时必须使用：

```text
图标 + 分类名称
```

不能只显示图标。

---

# 七、后端开发任务拆分

## Task 1：创建后端项目骨架

目标：

创建 Go + Gin 后端项目。

要求：

- 初始化 go.mod
- 创建基础目录结构
- 创建 config.yaml
- 连接 MySQL
- 连接 Redis
- 配置 CORS
- 配置统一响应结构
- 配置统一错误处理

验收标准：

- `go run cmd/main.go` 可以启动
- `/api/ping` 返回成功

---

## Task 2：实现数据库模型

目标：

根据数据库文档创建 GORM Model。

模型：

- User
- Category
- Item
- LocationRecord
- ItemImage

要求：

- 字段与数据库文档保持一致
- 使用 GORM tag
- 支持软删除
- 启动时可自动迁移，或提供 SQL 初始化脚本
- 启动时初始化 7 个固定分类

验收标准：

- MySQL 中能成功创建表
- categories 表自动初始化 7 条数据

---

## Task 3：实现用户注册登录

接口：

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/profile
```

要求：

- 密码使用 bcrypt 加密
- 登录成功返回 JWT
- profile 接口需要鉴权
- 统一返回格式

验收标准：

- 可注册
- 可登录
- 可携带 token 获取用户信息

---

## Task 4：实现分类接口

接口：

```text
GET /api/categories
```

要求：

- 返回固定分类列表
- 按 sort 升序排序

验收标准：

- 前端可以展示 7 个分类

---

## Task 5：实现物品创建

接口：

```text
POST /api/items
```

表单字段：

```text
category_id
name
remark
location
note
reminder_enabled
reminder_days
photos
```

要求：

- 支持 multipart/form-data
- photos 可以为空，但推荐上传
- 创建 items
- 创建 location_records，type=create
- 创建 item_images
- 设置 cover_image
- 设置 latest_location
- 设置 last_confirmed_at
- 设置 next_remind_at
- 全流程使用事务

验收标准：

- 创建物品后，items 有数据
- location_records 有初始记录
- 上传图片能保存到 uploads
- item_images 有图片记录

---

## Task 6：实现物品列表与搜索

接口：

```text
GET /api/items
```

查询参数：

```text
keyword
category_id
page
page_size
```

要求：

- 支持按分类筛选
- 支持关键词搜索
- 搜索范围包括：
  - item name
  - item remark
  - latest_location
  - location_records.location
  - location_records.note
- 默认按 updated_at 倒序
- 返回分页信息

验收标准：

- 首页列表能正常展示
- 分类筛选能正常工作
- 搜索身份证、抽屉、相机等关键词能返回结果

---

## Task 7：实现物品详情与历史记录

接口：

```text
GET /api/items/:id
GET /api/items/:id/history
```

要求：

物品详情返回：

- 基本信息
- 分类信息
- cover_image
- latest_location
- 图片列表
- 最新位置记录
- 提醒信息

历史记录返回：

- 所有 location_records
- 每条记录关联的图片
- 按 created_at 倒序

验收标准：

- 详情页可以展示最新照片
- 历史时间线可以展示每次位置变化

---

## Task 8：实现更新位置

接口：

```text
POST /api/items/:id/location
```

字段：

```text
location
note
photos
```

要求：

- 新增 location_records，type=move
- 新增 item_images
- 更新 items.latest_location
- 如有图片，更新 items.cover_image
- 更新 last_confirmed_at
- 更新 next_remind_at
- 使用事务

验收标准：

- 物品位置更新后，首页显示最新位置
- 历史记录新增一条 move 记录
- 图片可以正常展示

---

## Task 9：实现原地核对

接口：

```text
POST /api/items/:id/confirm
```

字段：

```text
note
photos
```

要求：

- 新增 location_records，type=confirm
- location 使用当前 latest_location
- 更新 last_confirmed_at
- 重新计算 next_remind_at
- 如果上传照片，则新增 item_images 并更新 cover_image

验收标准：

- 点击原地核对后，提醒消失
- 历史记录新增 confirm 记录

---

## Task 10：实现提醒列表

接口：

```text
GET /api/reminders
```

要求：

返回：

```text
next_remind_at <= 当前时间
且 reminder_enabled = true
且未删除的物品
```

验收标准：

- 到期物品出现在提醒页面
- 原地核对或更新位置后，该物品从提醒列表消失

---

## Task 11：实现图片上传与静态访问

要求：

- 支持上传 jpg / jpeg / png / webp
- 限制单张图片大小，例如 5MB
- 图片按日期目录保存
- 返回可访问 URL
- Gin 配置静态文件服务

示例：

```text
/uploads/items/2026/06/xxx.jpg
```

验收标准：

- 前端上传图片成功
- 前端能通过 URL 正常显示图片

---

# 八、前端开发任务拆分

## Task 12：创建前端项目骨架

目标：

创建 Vue3 + Vite + TypeScript + Vant Mobile 项目。

要求：

- 配置 Vue Router
- 配置 Pinia
- 配置 Axios
- 配置移动端适配
- 配置 API baseURL
- 配置 token 自动注入

验收标准：

- 前端项目可启动
- 页面能访问
- 能请求后端 `/api/ping`

---

## Task 13：实现登录注册页面

页面：

```text
/login
/register
```

要求：

- 表单校验
- 登录后保存 token
- 自动跳转首页
- 未登录访问业务页面时跳转登录页

验收标准：

- 登录注册流程可用

---

## Task 14：实现首页

页面：

```text
/
```

展示：

- 顶部问候语
- 搜索框
- 分类横向筛选
- 最近物品列表
- 待核对提醒入口
- 快捷添加按钮

要求：

- 分类显示图标 + 名称
- 物品卡片显示：
  - 封面图
  - 物品名称
  - 最新位置
  - 更新时间
  - 分类

验收标准：

- 首页能展示物品
- 分类筛选有效
- 搜索有效

---

## Task 15：实现添加物品页面

页面：

```text
/items/create
```

字段：

- 分类
- 物品名称
- 备注
- 位置描述
- 现场照片
- 提醒开关
- 提醒周期

要求：

- 照片不是必填
- 但必须有“强烈建议上传照片”的提示
- 分类卡片必须有图标 + 名称 + 示例说明
- 提交时使用 multipart/form-data

验收标准：

- 能创建物品
- 能上传图片
- 创建后跳转物品详情页

---

## Task 16：实现物品详情页

页面：

```text
/items/:id
```

展示：

- 最新实地存放照片
- 物品基本信息
- 最新位置
- 提醒状态
- 历史位置时间线
- 历史照片
- 原地核对按钮
- 更新位置按钮

验收标准：

- 详情页信息完整
- 历史记录展示正确

---

## Task 17：实现更新位置页面

页面：

```text
/items/:id/location
```

字段：

- 新位置描述
- 备注
- 新照片

要求：

- 文案使用“更新位置”或“记录新位置”
- 不使用“移至新物件点”
- 强烈建议上传新照片
- 提交后回到详情页

验收标准：

- 能新增位置历史
- 首页显示最新位置

---

## Task 18：实现提醒页面

页面：

```text
/reminders
```

展示：

- 待核对物品
- 上次位置
- 距离上次核对天数
- 原地核对按钮
- 更新位置按钮

验收标准：

- 能展示到期物品
- 原地核对后列表刷新

---

## Task 19：实现个人页面

页面：

```text
/profile
```

展示：

- 用户信息
- 物品总数
- 待核对数量
- 退出登录

验收标准：

- 个人页可查看基础信息
- 可退出登录

---

# 九、统一 API 返回格式

成功：

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

失败：

```json
{
  "code": 40001,
  "message": "错误信息",
  "data": null
}
```

分页：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [],
    "page": 1,
    "page_size": 10,
    "total": 100
  }
}
```

---

# 十、前后端联调重点

必须验证以下闭环：

## 闭环 1：用户注册登录

```text
注册
登录
获取用户信息
```

## 闭环 2：创建物品

```text
选择分类
填写名称
填写位置
上传照片
保存
首页出现物品
详情页展示初始位置记录
```

## 闭环 3：更新位置

```text
进入详情页
点击更新位置
填写新位置
上传新照片
保存
首页显示新位置
历史记录新增
```

## 闭环 4：原地核对

```text
进入提醒页
点击原地核对
提醒消失
历史记录新增 confirm
next_remind_at 更新
```

## 闭环 5：搜索

```text
搜索物品名
搜索位置
搜索备注
均能返回正确物品
```

---

# 十一、开发原则

1. 先完成后端，再完成前端。

2. 每个接口开发完成后写简单测试或用 curl / Postman 验证。

3. 不要提前实现 V2 功能。

4. 保持代码结构清晰。

5. Service 层写业务逻辑。

6. Repository 层只访问数据库。

7. Handler 层只处理 HTTP 请求和响应。

8. 图片上传逻辑封装到 storage 包。

9. JWT 逻辑封装到 pkg/jwt。

10. 统一响应封装到 pkg/response。

---

# 十二、Codex 第一阶段执行任务

请 Codex 首先执行：

```text
创建 backend Go 项目骨架，并实现：

1. Gin 服务启动
2. config.yaml 配置读取
3. MySQL 连接
4. Redis 连接
5. 统一响应结构
6. /api/ping 测试接口
7. 基础目录结构
```

不要一次性实现完整项目。

完成后等待人工验收。

---

# 十三、验收标准

第一阶段完成后，应满足：

```text
cd backend

go run cmd/main.go
```

服务启动成功。

访问：

```text
GET /api/ping
```

返回：

```json
{
  "code": 0,
  "message": "success",
  "data": "pong"
}
```

MySQL 连接成功。

Redis 连接成功。

无明显报错。
