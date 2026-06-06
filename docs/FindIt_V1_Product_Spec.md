# FindIt V1 技术设计文档（Codex版）

项目名称：

我东西呢？

英文名称：

Where's My Stuff?

Slogan：

忘了放哪？来这里找。

---

# 一、项目目标

FindIt 是一款个人物品位置记录与追踪工具。

核心目标：

帮助用户记录重要物品的存放位置，并保留完整位置历史链路。

用户忘记物品位置时，可以通过搜索、照片和历史记录快速找回。

---

# 二、V1 MVP范围

本版本只实现：

✅ 用户系统

✅ 物品管理

✅ 分类管理

✅ 图片上传

✅ 位置历史记录

✅ 搜索

✅ 巡检提醒

不实现：

❌ AI识别

❌ OCR

❌ 语音输入

❌ 大模型Agent

❌ 自然语言搜索

---

# 三、技术栈

前端

Vue3

TypeScript

Vite

Pinia

Axios

Vant Mobile

后端

Go 1.24+

Gin

GORM

MySQL 8

Redis 7

JWT

图片存储

本地存储（V1）

后续：

MinIO

OSS

S3

---

# 四、系统架构

Client

↓

Vue3 Mobile App

↓

Gin API Server

↓

MySQL

↓

Redis

↓

Local Storage

---

# 五、数据库设计

## users

用户表

id

username

email

password_hash

avatar

created_at

updated_at

---

## categories

分类表

id

name

icon

sort

created_at

updated_at

---

固定数据：

证件

摄影器材

电子设备

钥匙

文件资料

贵重物品

其他

---

## items

物品主表

id

user_id

category_id

name

remark

cover_image

latest_location

reminder_days

last_confirmed_at

created_at

updated_at

说明：

一条记录代表一个物品。

例如：

身份证

护照

Z30电池

SD卡

---

## location_records

位置历史表

id

item_id

location

photo_url

note

type

created_at

说明：

每一次位置变化都会新增记录。

永远不覆盖。

type：

move

confirm

示例：

身份证

↓

书桌抽屉

↓

背包夹层

↓

保险柜

---

# 六、ER关系

User

1:N

Item

Item

1:N

LocationRecord

Category

1:N

Item

---

# 七、图片存储方案

目录：

uploads/

├── items/

│ ├── 2026/

│ ├── 06/

│ └── xxx.jpg

保存数据库：

photo_url

示例：

/uploads/items/2026/06/xxx.jpg

---

# 八、登录鉴权

JWT

登录成功返回：

access_token

refresh_token（预留）

请求头：

Authorization

Bearer token

中间件：

AuthMiddleware

保护：

新增物品

删除物品

更新位置

查看个人数据

---

# 九、Redis设计

V1只做：

搜索缓存

热门数据缓存

Key示例：

item:list:user:1

item:detail:1001

后续再扩展。

---

# 十、API设计

## Auth

POST

/api/auth/register

用户注册

---

POST

/api/auth/login

用户登录

---

GET

/api/auth/profile

获取当前用户

---

## Category

GET

/api/categories

获取分类

---

## Item

POST

/api/items

创建物品

---

GET

/api/items

物品列表

支持：

keyword

category

page

pageSize

---

GET

/api/items/:id

物品详情

---

PUT

/api/items/:id

修改物品

---

DELETE

/api/items/:id

删除物品

---

## Location

POST

/api/items/:id/location

新增位置记录

请求：

location

photo

note

type

---

GET

/api/items/:id/history

获取历史记录

---

POST

/api/items/:id/confirm

原地确认

新增：

type=confirm

---

## Reminder

GET

/api/reminders

待巡检列表

---

POST

/api/reminders/:itemId/confirm

确认仍在原位

---

POST

/api/reminders/:itemId/update

更新位置

---

# 十一、Gin目录结构

cmd/

main.go

internal/

handler/

service/

repository/

model/

middleware/

router/

pkg/

jwt/

response/

storage/

config/

uploads/

docs/

---

# 十二、Repository层

职责：

只负责数据库访问。

禁止写业务逻辑。

---

# 十三、Service层

职责：

业务逻辑。

例如：

CreateItem

UpdateLocation

ConfirmLocation

SearchItem

GetReminderList

---

# 十四、搜索设计

支持：

名称

备注

位置

模糊搜索

SQL：

LIKE

V1不接ES。

---

# 十五、提醒机制

登录后：

查询：

当前时间 > next_remind_time

显示：

待核对

用户点击：

原地核对完好

↓

更新：

last_confirmed_at

↓

计算：

next_remind_time

---

# 十六、V2规划

AI图片识别

OCR

语音录入

自然语言搜索

Gemini Vision

OpenAI Vision

MinIO

推送通知

邮件提醒

iOS App

Android App