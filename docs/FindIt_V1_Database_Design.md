# FindIt V1 数据库设计

数据库：

MySQL 8

字符集：

utf8mb4

排序规则：

utf8mb4_unicode_ci

---

# 一、核心设计原则

FindIt 采用：

物品主表 items

+

位置历史表 location_records

的设计。

items 保存物品当前状态。

location_records 保存每一次位置变化或确认记录。

位置记录永远新增，不覆盖旧数据。

---

# 二、users 用户表

```sql
CREATE TABLE users (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(64) NOT NULL,
    email VARCHAR(128) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar VARCHAR(255) DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,

    UNIQUE KEY uk_users_email (email),
    UNIQUE KEY uk_users_username (username),
    KEY idx_users_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

# 三、categories 分类表

```sql
CREATE TABLE categories (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(32) NOT NULL,
    code VARCHAR(32) NOT NULL,
    icon VARCHAR(64) NOT NULL,
    description VARCHAR(255) DEFAULT '',
    sort INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_categories_code (code),
    UNIQUE KEY uk_categories_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

初始化数据：

```sql
INSERT INTO categories (name, code, icon, description, sort) VALUES
('证件', 'document', '📄', '身份证、护照、驾驶证、银行卡', 1),
('摄影器材', 'camera', '📷', '相机、镜头、SD卡、电池、三脚架配件', 2),
('电子设备', 'electronics', '💻', '手机、平板、U盘、移动硬盘', 3),
('钥匙', 'key', '🔑', '家门钥匙、车钥匙、办公室钥匙', 4),
('文件资料', 'file', '📁', '合同、证书、发票、纸质资料', 5),
('贵重物品', 'valuable', '💎', '珠宝、收藏品、贵重纪念品', 6),
('其他', 'other', '📦', '其他物品', 99);
```

---

# 四、items 物品主表

```sql
CREATE TABLE items (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    category_id BIGINT UNSIGNED NOT NULL,

    name VARCHAR(128) NOT NULL,
    remark VARCHAR(512) DEFAULT '',

    cover_image VARCHAR(255) DEFAULT '',
    latest_location VARCHAR(255) NOT NULL,

    reminder_enabled TINYINT(1) NOT NULL DEFAULT 1,
    reminder_days INT NOT NULL DEFAULT 30,
    last_confirmed_at DATETIME NULL,
    next_remind_at DATETIME NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,

    KEY idx_items_user_id (user_id),
    KEY idx_items_category_id (category_id),
    KEY idx_items_next_remind_at (next_remind_at),
    KEY idx_items_deleted_at (deleted_at),
    KEY idx_items_user_updated_at (user_id, updated_at),

    CONSTRAINT fk_items_user
        FOREIGN KEY (user_id) REFERENCES users(id),

    CONSTRAINT fk_items_category
        FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

字段说明：

```text
cover_image：
物品最近一次位置记录的照片，用于首页卡片缩略图。

latest_location：
物品最近一次位置描述，用于快速展示。

reminder_enabled：
是否开启巡检提醒。

reminder_days：
巡检周期，例如 7、14、30、90。

last_confirmed_at：
最后一次确认物品仍在某位置的时间。

next_remind_at：
下次提醒时间。
```

---

# 五、location_records 位置历史表

```sql
CREATE TABLE location_records (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    item_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,

    location VARCHAR(255) NOT NULL,
    photo_url VARCHAR(255) DEFAULT '',
    note VARCHAR(512) DEFAULT '',

    type VARCHAR(32) NOT NULL DEFAULT 'move',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    KEY idx_location_records_item_id (item_id),
    KEY idx_location_records_user_id (user_id),
    KEY idx_location_records_created_at (created_at),
    KEY idx_location_records_item_created_at (item_id, created_at),

    CONSTRAINT fk_location_records_item
        FOREIGN KEY (item_id) REFERENCES items(id),

    CONSTRAINT fk_location_records_user
        FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

type 可选值：

```text
move：
位置发生变化。

confirm：
确认仍在原位置。

create：
创建物品时的初始位置。
```

---

# 六、item_images 图片表（可选但推荐）

为了支持一个位置记录上传多张图片，推荐增加图片表。

```sql
CREATE TABLE item_images (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    item_id BIGINT UNSIGNED NOT NULL,
    record_id BIGINT UNSIGNED NULL,
    user_id BIGINT UNSIGNED NOT NULL,

    image_url VARCHAR(255) NOT NULL,
    is_cover TINYINT(1) NOT NULL DEFAULT 0,
    sort INT NOT NULL DEFAULT 0,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    KEY idx_item_images_item_id (item_id),
    KEY idx_item_images_record_id (record_id),
    KEY idx_item_images_user_id (user_id),

    CONSTRAINT fk_item_images_item
        FOREIGN KEY (item_id) REFERENCES items(id),

    CONSTRAINT fk_item_images_record
        FOREIGN KEY (record_id) REFERENCES location_records(id),

    CONSTRAINT fk_item_images_user
        FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

说明：

V1 可以先只使用 location_records.photo_url。

如果想支持多图，使用 item_images。

建议 Codex 实现时采用 item_images，这样后期扩展更方便。

---

# 七、推荐最终表结构

V1 推荐使用：

```text
users

categories

items

location_records

item_images
```

不要只把图片放在 location_records.photo_url。

原因：

后续要支持：

一条位置记录多张照片

封面图

历史图库

全屏查看

AI图片分析

item_images 会更合理。

---

# 八、搜索设计

V1 使用 MySQL LIKE。

搜索范围：

```text
items.name

items.remark

items.latest_location

location_records.location

location_records.note
```

基础查询逻辑：

```sql
SELECT DISTINCT i.*
FROM items i
LEFT JOIN location_records lr ON lr.item_id = i.id
WHERE i.user_id = ?
  AND i.deleted_at IS NULL
  AND (
      i.name LIKE ?
      OR i.remark LIKE ?
      OR i.latest_location LIKE ?
      OR lr.location LIKE ?
      OR lr.note LIKE ?
  )
ORDER BY i.updated_at DESC;
```

---

# 九、提醒查询设计

查询需要提醒的物品：

```sql
SELECT *
FROM items
WHERE user_id = ?
  AND deleted_at IS NULL
  AND reminder_enabled = 1
  AND next_remind_at IS NOT NULL
  AND next_remind_at <= NOW()
ORDER BY next_remind_at ASC;
```

---

# 十、创建物品逻辑

创建物品时：

1. 插入 items

2. 插入 location_records，type=create

3. 插入 item_images

4. 更新 items.cover_image

5. 计算 next_remind_at

伪代码：

```text
CreateItem

开始事务

创建 item

创建 location_record

如果有图片：
    创建 item_images
    设置 item.cover_image

设置 last_confirmed_at = now

设置 next_remind_at = now + reminder_days

提交事务
```

---

# 十一、更新位置逻辑

用户点击：

更新位置

流程：

1. 新增 location_records，type=move

2. 新增 item_images

3. 更新 items.latest_location

4. 更新 items.cover_image

5. 更新 items.last_confirmed_at

6. 更新 items.next_remind_at

必须使用事务。

---

# 十二、原地确认逻辑

用户点击：

原地核对完好

流程：

1. 新增 location_records，type=confirm

2. location 使用当前 latest_location

3. note 记录“原地确认，物品仍在该位置”

4. 更新 last_confirmed_at

5. 更新 next_remind_at

6. 如果用户上传新照片，则新增 item_images 并更新 cover_image

---

# 十三、删除逻辑

V1 使用软删除。

只删除 items.deleted_at。

location_records 和 item_images 不直接删除。

原因：

保留历史数据。

---

# 十四、索引设计总结

重点索引：

```text
users.email

items.user_id

items.category_id

items.next_remind_at

items.user_id + updated_at

location_records.item_id + created_at

item_images.item_id

item_images.record_id
```

---

# 十五、后续扩展预留

V2 可以增加：

```text
ai_tags

image_embeddings

ocr_text

voice_records

notification_logs

reminder_logs
```
