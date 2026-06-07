/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Item, Category } from './types';

// Redesigned Categories (Fixed system)
export const CATEGORY_SYSTEM: Category[] = [
  {
    id: 'documents',
    name: '证件',
    icon: '📄',
    examples: ['身份证', '护照', '驾驶证', '银行卡'],
    color: 'from-blue-600 to-indigo-600',
    exampleText: '如：身份证、护照、驾驶证、银行卡等'
  },
  {
    id: 'photography',
    name: '摄影器材',
    icon: '📷',
    examples: ['相机', '镜头', 'SD卡', '电池', '三脚架配件'],
    color: 'from-emerald-500 to-teal-650',
    exampleText: '如：相机、镜头、SD卡、电池、三脚架配件等'
  },
  {
    id: 'electronics',
    name: '电子设备',
    icon: '💻',
    examples: ['手机', '平板', 'U盘', '移动硬盘'],
    color: 'from-purple-500 to-pink-600',
    exampleText: '如：手机、平板、U盘、移动硬盘等'
  },
  {
    id: 'keys',
    name: '钥匙',
    icon: '🔑',
    examples: ['家门钥匙', '车钥匙', '办公室钥匙'],
    color: 'from-amber-500 to-orange-600',
    exampleText: '如：家门钥匙、车钥匙、办公室钥匙等'
  },
  {
    id: 'files',
    name: '文件资料',
    icon: '📁',
    examples: ['合同', '证书', '发票', '纸质资料'],
    color: 'from-sky-500 to-blue-600',
    exampleText: '如：合同、证书、发票、纸质资料等'
  },
  {
    id: 'valuables',
    name: '贵重物品',
    icon: '💎',
    examples: ['珠宝', '收藏品', '贵重纪念品'],
    color: 'from-yellow-400 to-amber-550',
    exampleText: '如：珠宝、收藏品、贵重纪念品等'
  },
  {
    id: 'others',
    name: '其他',
    icon: '📦',
    examples: [],
    color: 'from-slate-550 to-slate-700',
    exampleText: '其他任何零散、不属于上述分类的物件'
  },
];

// Preset icon list for custom items
export const PRESET_ICONS = [
  { id: 'id-card', name: '身份证件', icon: 'IdCard', color: 'from-blue-500 to-indigo-600' },
  { id: 'passport', name: '护照/签证', icon: 'Globe', color: 'from-emerald-500 to-teal-600' },
  { id: 'key', name: '钥匙/门禁', icon: 'Key', color: 'from-amber-500 to-orange-600' },
  { id: 'sd-card', name: '微型卡/U盘', icon: 'Cpu', color: 'from-purple-500 to-pink-600' },
  { id: 'battery', name: '相机电池', icon: 'BatteryCharging', color: 'from-red-500 to-rose-600' },
  { id: 'briefcase', name: '重要文档', icon: 'FileText', color: 'from-sky-500 to-blue-600' },
  { id: 'wallet', name: '银行卡/钱包', icon: 'CreditCard', color: 'from-violet-500 to-fuchsia-600' },
  { id: 'harddrive', name: '硬盘/数码', icon: 'HardDrive', color: 'from-slate-600 to-slate-800' },
  { id: 'package', name: '贵重首饰', icon: 'Gem', color: 'from-yellow-400 to-amber-500' },
];

export const INITIAL_ITEMS: Item[] = [
  {
    id: 'item-1',
    name: '中华人民共和国身份证',
    remark: '个人身份证，日常补办极为麻烦，不可遗失',
    createdAt: '2026-04-10T12:00:00Z',
    photo: 'id-card',
    category: 'documents',
    latestLocation: '灰色日常便携背包暗格层',
    lastConfirmedAt: '2026-05-02T10:00:00Z', // 35 days ago from June 6th, 2026. Triggers 30-day reminder!
    reminderDays: 30,
    history: [
      {
        id: 'rec-1-2',
        location: '灰色日常便携背包暗格层',
        photos: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80'],
        timestamp: '2026-05-02T10:00:00Z',
        note: '因需要去银行办理网银，移入了灰色便携背包暗格，拉链拉好，随附照片便于出门前一眼确认位置',
        type: 'move',
      },
      {
        id: 'rec-1-1',
        location: '书桌最上层右侧抽屉',
        photos: ['https://images.unsplash.com/photo-1596079890744-c1a0462d0975?auto=format&fit=crop&w=600&q=80'],
        timestamp: '2026-04-10T12:00:00Z',
        note: '首次录入归档，放在书桌收纳盒最上层格子中',
        type: 'move',
      },
    ],
  },
  {
    id: 'item-2',
    name: '中国护照 (Passport)',
    remark: '有效期至2032年，带红色保护套',
    createdAt: '2026-05-15T09:00:00Z',
    photo: 'passport',
    category: 'documents',
    latestLocation: '主卧门口右手边保险箱中',
    lastConfirmedAt: '2026-05-15T09:00:00Z', // 22 days ago, no reminder triggered yet for 30d
    reminderDays: 30,
    history: [
      {
        id: 'rec-2-1',
        location: '主卧门口右手边保险箱中',
        photos: ['https://images.unsplash.com/photo-1627914078864-16aeca4df92f?auto=format&fit=crop&w=600&q=80'],
        timestamp: '2026-05-15T09:00:00Z',
        note: '旅行归来，锁入书房主保险箱。密码已记住，并拍下了箱内摆放布局。',
        type: 'move',
      },
    ],
  },
  {
    id: 'item-3',
    name: '常用车钥匙 (特斯拉 & 物理备份)',
    remark: '备用物理钥匙与挂坠，带有金属马蹄扣',
    createdAt: '2026-06-05T08:00:00Z',
    photo: 'key',
    category: 'keys',
    latestLocation: '客厅玄关实木钥匙托盘',
    lastConfirmedAt: '2026-06-05T18:00:00Z', // 1 day ago
    reminderDays: 7,
    history: [
      {
        id: 'rec-3-2',
        location: '客厅玄关实木钥匙托盘',
        photos: [
          'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=600&q=80'
        ],
        timestamp: '2026-06-05T18:00:00Z',
        note: '移到门口实木托盘，进出门更方便拿取，备份了托盘正面和玄关中景照片',
        type: 'move',
      },
      {
        id: 'rec-3-1',
        location: '小置物盒内',
        photos: ['https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=600&q=80'],
        timestamp: '2026-06-05T08:00:00Z',
        note: '初始化存放',
        type: 'move',
      },
    ],
  },
  {
    id: 'item-4',
    name: '索尼 NP-FZ100 相机备用电池 x2',
    remark: 'Sony A7R5 备用电池，满电状态存放',
    createdAt: '2026-05-01T15:00:00Z',
    photo: 'battery',
    category: 'photography',
    latestLocation: '防潮箱第二层数码配件盒',
    lastConfirmedAt: '2026-05-10T14:00:00Z', // 27 days ago. Triggers 14-day reminder!
    reminderDays: 14,
    history: [
      {
        id: 'rec-4-2',
        location: '防潮箱第二层数码配件盒',
        photos: ['https://images.unsplash.com/photo-1601524909162-be87252be298?auto=format&fit=crop&w=600&q=80'],
        timestamp: '2026-05-10T14:00:00Z',
        note: '拍摄任务结束，取出并充饱电后移入主防潮箱第二层，拍照记录充沛指示灯状态',
        type: 'move',
      },
      {
        id: 'rec-4-1',
        location: '相机包前侧小拉链袋内',
        photos: ['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80'],
        timestamp: '2026-05-01T15:00:00Z',
        note: '外拍准备，塞在相机背包里',
        type: 'move',
      },
    ],
  },
  {
    id: 'item-5',
    name: '闪迪 256GB 极速 SD 卡 (V60)',
    remark: '里面存有上周在阿那亚拍摄的风光原始 RAW 素材',
    createdAt: '2026-05-25T11:00:00Z',
    photo: 'sd-card',
    category: 'photography',
    latestLocation: '工作台木质多格卡片接纳收纳器',
    lastConfirmedAt: '2026-05-25T11:00:00Z', // 12 days ago. Triggers 7-day reminder
    reminderDays: 7,
    history: [
      {
        id: 'rec-5-1',
        location: '工作台木质多格卡片接纳收纳器',
        photos: ['https://images.unsplash.com/photo-1591405351990-4726e331f14c?auto=format&fit=crop&w=600&q=80'],
        timestamp: '2026-05-25T11:00:00Z',
        note: '拍摄素材未备份完成，临时插在工作台木卡槽最左端，拍照证明在这里',
        type: 'move',
      },
    ],
  },
];

export const PRODUCT_SPEC_SECTIONS = [
  {
    id: 'structure',
    title: '1. 产品架构 (Product Structure)',
    content: `《我东西呢？ (Where's My Stuff?)》定位为**轻量高频的物品位置随手记与确认工具**。它与传统备忘录的区别在于：
* **结构化定位**：核心围绕“位置树”及“物品”构建，强特定化字段（不仅是普通备注，而是聚焦当前位置描述）。
* **永久位置链条 (History Chain)**：全生命周期追踪。
* **主动式核对机制 (Active Verification)**：通过按需配置的确认周期，防止物件在不知不觉中流失。
* **极速检索流**：针对高频突发场景（如出门前找钥匙、机场入关找护照），首屏提供最快模糊查询。`,
  },
  {
    id: 'flow',
    title: '2. 用户旅程 (User Flows)',
    content: `* **场景 A：闪电查找 (出门急用)**
  1. 打开 App ➜ 顶部聚焦搜索框（支持首字母、拼音、简中多维度联想，如输入“SFZ”或“身”）。
  2. 匹配“中华人民共和国身份证” ➜ 浮现当前卡片。
  3. 卡片突出展示**【当前最新位置：亮绿色显示文字】**、最新确认时间、最后一次备注。
  4. 确认找到，或若不在当前位置，一键点击【查看路径历史】，回忆之前的所有停留轨迹。

* **场景 B：换地重置 (物归新处)**
  1. 移动物品（如：身份证用完放入了保险箱）。
  2. 检索并点击该物品详情 ➜ 点击【移到新地方】（即 Change Location）。
  3. 输入“主卧保险箱”并加上动作变动备注（如：“银行办卡归来归档”）。
  4. 提交。系统**不抹除旧记录**，而是像 Git Commit 一样向 Timeline 追加一条新的「移入记录」节点。

* **场景 C：习惯养成 (定期盘点)**
  1. 系统后台（或前台提醒卡片）发出超时未核对提醒：“**相机电池已在‘防潮箱’存放30天，它还在那儿吗？**”
  2. 用户扫一眼防潮箱，发现确实在 ➜ 一键点击【确认在这】，系统更新 “最后核实时间” 为今天，通知消失。
  3. 如果用户发现其已被移走 ➜ 点击【更新位置记录】，迅速追加当前所在处。`,
  },
  {
    id: 'architecture',
    title: '3. 信息架构 (Information Architecture)',
    content: `* **Item (物品实体)**
  ├── **核心元数据**: UUID, 名称 (Item Name), 备注 (Remark), 创建时间, 所属分类图标
  ├── **核心状态项**:
  │   ├── \`latestLocation\` (当前最新位置名称)
  │   └── \`lastConfirmedAt\` (最后确认存在的日期戳)
  └── **行为与设置**:
      ├── \`reminderDays\` (核审盘点周期：不提醒 / 7天 / 14天 / 30天 / 90天)
      └── \`history\` (位置变更与状态确认的历史链表)

* **LocationRecord (位置历史节点)**
  ├── \`timestamp\` (记录创建时间)
  ├── \`location\` (当时具体的存储空间、盒子、袋子)
  ├── \`note\` (用户添加的额外场景备注，如“旅行准备”)
  └── \`type\` (操作类型: \`move\` 变更位置 / \`confirm\` 旧址原位核期确认)`,
  },
  {
    id: 'pages',
    title: '4. 模块与页面结构 (Page List)',
    content: `本移动端采用 iOS 黄金底栏四分段导航：
* **【HOME - 发现/仪表盘】**
  * 搜索极速入口、快速扫视。
  * 「快捷盘点」待核对卡片：汇总所有已过期的需要确认还在不在的物品。
  * 紧急类别过滤（常用物品、证件、数码周边等）。
* **【ITEMS - 藏品列表】**
  * 全部记录物品的卡片化看板，支持自定义快速添加、分类筛查、多重排序。
* **【REMINDERS - 核对板】**
  * 定焦解决“我确认了吗？”专题。直观标红显示那些太久没碰、具有潜在遗失风险的物品列表及其到期详情。
* **【PROFILE - 数据面板】**
  * 统计数据：目前记录了多少件、本月做了多少次安全移位、有多少件处于安全核实周期。
  * 精美 logo 签名介绍。`,
  },
  {
    id: 'suggestions',
    title: '5. 极致体验优化建议 (Product Enhancements)',
    content: `在开发此应用时，为了将其提升至 Things 3 和 Apple Notes 那样高水平的纯粹感，我们做出了以下体验演进：
1. **防呆确认动画 (Haptic Touch Refinement)**：在用户确认“东西还在”时，触发一记“波纹微弹回执”交互，给予明确而解压的操作回馈。
2. **极简渐变卡片组**：避免枯燥的纯白框，使用温润的苹果原生毛玻璃微反光，以及根据物理属性对应的精美色彩勋章（例如：证件使用静穆群青，钥匙使用暖橙亮金，数码使用极客黛灰、电池使用热情绯红）。
3. **模糊相对时间**：除了显示精确日期，展示“5天前已确认”、“已遗忘32天”等能引起本能重视的人性化视觉标签。
4. **零阻力录入**：支持“位置选择器历史记忆联想”，如果用户之前写过“书桌抽屉”，下次新建其他物品时直接轻点，无需重复打字。`,
  },
];
