# 订阅与积分系统设计

## 1. 概述

本文档详细描述了一个与Stripe支付处理集成的订阅与积分系统的全面设计。该系统旨在为用户提供无缝的订阅服务、积分管理和支付体验，确保可扩展性、安全性和可维护性。设计涵盖了用户操作、数据模型和数据流，改进了初始草稿，增加了清晰度、专业性和鲁棒性。

---

## 2. 目标

- 使用户能够通过Stripe订阅计划或购买一次性积分包。
- 提供用户友好的界面，用于管理订阅和查看积分余额。
- 使用Fingerprint确保用户（包括匿名用户）的安全识别。
- 支持灵活的订阅管理（自动续费、取消、升级、附加包）。
- 维护详细的交易和积分使用历史记录。
- 设计可扩展的数据模型和清晰的数据流，确保可靠性和性能。

---

## 3. 用户操作场景

### 3.1 用户注册与识别
- **匿名用户**：通过Fingerprint（基于设备的标识符）识别，防止滥用（例如，过度使用免费积分）。
- **注册用户**：用户可通过电子邮件和密码注册，或使用SSO（例如Google、Apple）。注册用户分配唯一的`user_id`。
- **场景**：
  - 新用户访问平台，系统分配Fingerprint ID。
  - 用户无需注册即可使用有限的免费积分。
  - 要访问付费功能，用户必须注册或登录，将Fingerprint ID关联到`user_id`。

### 3.2 订阅管理
- **订阅计划**：用户可选择多种计划（例如，基础版、专业版、企业版），具有不同的积分分配和定价。
- **操作**：
  - **订阅**：用户选择计划并被重定向到Stripe的结账页面进行支付。
  - **自动续费**：订阅默认自动续费，除非用户取消。
  - **升级/降级**：用户可切换计划，Stripe处理按比例分配费用。
  - **取消**：用户可取消订阅，取消在计费周期结束时生效。
  - **附加包**：用户可购买额外的积分包，而无需更改计划。
- **场景**：
  - 用户选择专业版计划，通过Stripe完成支付，获得每月积分。
  - 在计费周期中，用户购买额外的积分包以增加使用量。
  - 用户随后升级到企业版计划，Stripe处理按比例分配费用。

### 3.3 积分使用
- **积分系统**：积分用于访问高级功能（例如，API调用、高级工具）。
- **免费积分与付费积分**：
  - 新用户获得免费积分（通过Fingerprint限制，防止滥用）。
  - 付费积分根据订阅计划或一次性购买分配。
- **场景**：
  - 用户为API请求消耗积分。
  - 系统从用户余额中扣除积分，优先使用付费积分。
  - 如果积分耗尽，提示用户购买更多积分或升级计划。

### 3.4 历史记录与报告
- **交易历史**：用户可查看过去的支付记录，包括发票和收据。
- **积分使用历史**：用户可查看积分使用的详细日志（例如，使用功能、时间戳、消耗积分）。
- **场景**：
  - 用户导航到历史页面，查看过去三个月的积分使用和支付记录。

### 3.5 退款与争议
- **退款流程**：用户可为符合条件的交易（例如，7天内）请求退款。
- **场景**：
  - 用户为一次性积分购买请求退款。系统通过Stripe处理退款并更新积分余额。

---

## 4. 数据模型设计

### 4.1 核心数据表

#### 用户表 (Users)
存储用户信息，包括通过Fingerprint识别的匿名用户。

| 列名                | 类型         | 描述                                    |
|---------------------|--------------|----------------------------------------|
| `user_id`           | UUID         | 主键，唯一用户标识符                   |
| `fingerprint_id`    | String       | 匿名用户的Fingerprint标识符            |
| `email`             | String       | 用户电子邮件（匿名用户可为空）         |
| `created_at`        | Timestamp    | 账户创建时间戳                        |
| `updated_at`        | Timestamp    | 最后更新时间戳                        |

#### 订阅表 (Subscriptions)
跟踪活跃订阅及其详细信息。

| 列名                | 类型         | 描述                                    |
|---------------------|--------------|----------------------------------------|
| `subscription_id`   | UUID         | 主键，唯一订阅ID                       |
| `user_id`           | UUID         | 外键，引用`Users`表                   |
| `stripe_subscription_id` | String   | Stripe订阅ID (sub_xxx)                |
| `plan_id`           | String       | 计划标识符（例如，basic、pro）         |
| `status`            | Enum         | 状态：活跃、已取消、逾期等             |
| `credits_allocated` | Integer      | 每个计费周期分配的积分                 |
| `start_date`        | Timestamp    | 订阅开始日期                          |
| `end_date`          | Timestamp    | 订阅结束日期（可为空）                |
| `created_at`        | Timestamp    | 记录创建时间戳                        |
| `updated_at`        | Timestamp    | 最后更新时间戳                        |

#### 积分表 (Credits)
管理用户积分余额。

| 列名                | 类型         | 描述                                    |
|---------------------|--------------|----------------------------------------|
| `credit_id`         | UUID         | 主键，唯一积分记录ID                   |
| `user_id`           | UUID         | 外键，引用`Users`表                   |
| `balance_free`      | Integer      | 免费积分余额                          |
| `balance_paid`      | Integer      | 付费积分余额                          |
| `created_at`        | Timestamp    | 记录创建时间戳                        |
| `updated_at`        | Timestamp    | 最后更新时间戳                        |

#### 交易表 (Transactions)
记录支付交易，包括订阅和一次性购买。

| 列名                | 类型         | 描述                                    |
|---------------------|--------------|----------------------------------------|
| `transaction_id`    | UUID         | 主键，唯一交易ID                       |
| `user_id`           | UUID         | 外键，引用`Users`表                   |
| `stripe_session_id` | String       | Stripe Checkout Session ID (cs_xxx)    |
| `stripe_invoice_id` | String       | Stripe发票ID (in_xxx)                 |
| `amount`            | Integer      | 支付金额（以分为单位）                 |
| `currency`          | String       | 货币代码（例如，USD、CNY）             |
| `status`            | Enum         | 状态：已支付、已退款、已取消、失败     |
| `type`              | Enum         | 类型：订阅、一次性                     |
| `credits_granted`   | Integer      | 此交易授予的积分                      |
| `created_at`        | Timestamp    | 交易创建时间戳                        |
| `updated_at`        | Timestamp    | 最后更新时间戳                        |

#### 积分使用表 (Credit Usage)
跟踪积分的消耗情况。

| 列名                | 类型         | 描述                                    |
|---------------------|--------------|----------------------------------------|
| `usage_id`          | UUID         | 主键，唯一使用记录ID                   |
| `user_id`           | UUID         | 外键，引用`Users`表                   |
| `feature`           | String       | 使用的功能（例如，API调用、工具）      |
| `credits_used`      | Integer      | 消耗的积分数量                        |
| `created_at`        | Timestamp    | 使用时间戳                            |

### 4.2 索引
- **用户表**：主键 (`user_id`)，`fingerprint_id` 唯一索引，`email` 索引。
- **订阅表**：主键 (`subscription_id`)，`user_id`、`stripe_subscription_id` 索引。
- **积分表**：主键 (`credit_id`)，`user_id` 索引。
- **交易表**：主键 (`transaction_id`)，`user_id`、`stripe_session_id`、`stripe_invoice_id` 索引。
- **积分使用表**：主键 (`usage_id`)，`user_id`、`created_at` 索引。

---

## 5. 数据流设计

### 5.1 订阅购买流程
1. **用户发起订阅**：
   - 用户在订阅管理界面选择计划。
   - 前端向后端发送请求，包含`plan_id`和`user_id`（或匿名用户的`fingerprint_id`）。
2. **创建Stripe会话**：
   - 后端为选定的计划创建Stripe Checkout Session (`stripe_session_id`)。
   - 用户被重定向到Stripe的结账页面。
3. **支付完成**：
   - 支付成功后，Stripe向后端发送Webhook (`checkout.session.completed`)。
   - 后端更新`Subscriptions`表，分配积分到`Credits`表。
   - 在`Transactions`表中创建记录，包含`stripe_session_id`、`amount`和`credits_granted`。
4. **用户通知**：
   - 用户收到确认电子邮件，界面显示更新后的积分余额。

### 5.2 积分使用流程
1. **功能访问**：
   - 用户尝试访问高级功能。
   - 后端检查`Credits`表，确保`balance_paid`或`balance_free`足够。
2. **积分扣除**：
   - 如果积分足够，优先从`balance_paid`扣除，再从`balance_free`扣除。
   - 在`Credit Usage`表中记录使用情况，包含`feature`和`credits_used`。
3. **积分不足**：
   - 提示用户购买更多积分或升级计划。

### 5.3 订阅管理流程
- **自动续费**：
  - Stripe处理自动续费并向后端发送Webhook (`invoice.paid`)。
  - 后端更新`Subscriptions`表并向`Credits`表添加积分。
- **取消**：
  - 用户通过订阅管理界面取消订阅。
  - 后端向Stripe发送取消请求，更新`Subscriptions`表（`status` = canceled）。
- **升级/降级**：
  - 用户选择新计划；后端更新Stripe订阅并按比例分配费用。
  - 更新`Subscriptions`表的`plan_id`和`credits_allocated`。
- **附加包购买**：
  - 与订阅购买类似，但创建一次性Stripe Checkout Session。
  - Webhook确认后，向`Credits`表添加积分。

### 5.4 退款流程
1. **用户请求退款**：
   - 用户通过界面发起退款请求。
   - 后端验证退款资格（例如，7天内，基于`Transactions`表）。
2. **处理退款**：
   - 后端使用`stripe_session_id`向Stripe发送退款请求。
   - Stripe处理退款并发送Webhook (`charge.refunded`)。
   - 后端更新`Transactions`表（`status` = refunded）并从`Credits`表扣除积分。

---

## 6. 订阅管理界面

### 6.1 布局
- **顶部**：
  - 显示当前`balance_free`和`balance_paid`积分。
  - 管理订阅按钮（重定向到Stripe客户门户）。
- **主区域**：
  - 列出可用计划及其详细信息（价格、积分、功能）。
  - 提供购买一次性积分附加包的选项。
- **历史记录区域**：
  - 交易历史选项卡（支付详情、发票）。
  - 积分使用历史选项卡（功能、消耗积分、时间戳）。
- **底部**：
  - 支持、退款政策和服务条款链接。

### 6.2 示例线框
```
----------------------------------------
| 免费积分: 50 | 付费积分: 200         |
| [管理订阅]                           |
----------------------------------------
| 计划:                                |
| - 基础版 (￥70/月, 100积分)          |
| - 专业版 (￥140/月, 250积分)         |
| - 企业版 (￥350/月, 1000积分)        |
| [购买附加积分]                       |
----------------------------------------
| 历史记录:                            |
| - 交易 | 积分使用                    |
| [交易列表]                           |
----------------------------------------
```

---

## 7. 安全考虑
- **Fingerprint集成**：限制匿名用户的免费积分滥用。
- **Stripe Webhook**：验证Webhook签名以确保真实性。
- **数据加密**：在数据库中加密敏感数据（例如，`stripe_session_id`）。
- **限流**：对API端点应用限流，防止滥用。
- **GDPR合规**：允许用户删除账户及相关数据。

---

## 8. 可扩展性与性能
- **数据库优化**：使用索引加速`user_id`、`stripe_session_id`等查询。
- **缓存**：使用Redis缓存频繁访问的数据（例如，用户积分余额）。
- **异步处理**：异步处理Stripe Webhook，避免用户操作延迟。
- **负载均衡**：使用负载均衡器将流量分配到多个后端服务器。

---

## 9. 未来改进
- **多货币支持**：通过Stripe支持多种货币支付。
- **促销积分**：引入限时促销积分用于营销活动。
- **分析仪表板**：为用户提供积分使用模式的洞察。
- **API访问**：提供API供开发者集成订阅系统（参考 https://x.ai/api）。

---

## 10. 参考资料
- Stripe文档：https://stripe.com/docs
- Fingerprint文档：https://fingerprint.com/docs
- 示例UI灵感：https://pikttochart.com/generative-ai/editor/