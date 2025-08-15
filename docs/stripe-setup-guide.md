# Stripe 设置指南

本文档将指导您在 Stripe Dashboard 中设置产品和价格，以便与积分订阅系统集成。

## 第一步：登录 Stripe Dashboard

1. 访问 [Stripe Dashboard](https://dashboard.stripe.com/)
2. 登录您的 Stripe 账户
3. 确保您处于正确的模式（测试模式或生产模式）

## 第二步：创建产品

### 1. 订阅产品

导航到 **Products** → **Add product**

#### 基础版订阅产品
- **Name**: 基础版订阅
- **Description**: 基础版计划 - 每月100积分
- **Images**: 可选择上传产品图片

#### 专业版订阅产品  
- **Name**: 专业版订阅
- **Description**: 专业版计划 - 每月250积分
- **Images**: 可选择上传产品图片

#### 企业版订阅产品
- **Name**: 企业版订阅  
- **Description**: 企业版计划 - 每月1000积分
- **Images**: 可选择上传产品图片

### 2. 一次性积分包产品

#### 100积分包
- **Name**: 100积分包
- **Description**: 一次性购买100积分

#### 500积分包  
- **Name**: 500积分包
- **Description**: 一次性购买500积分

## 第三步：创建价格

为每个产品创建对应的价格计划：

### 订阅价格（Recurring）

#### 基础版价格
- **Product**: 基础版订阅
- **Pricing model**: Standard pricing
- **Price**: ¥70.00 CNY
- **Billing period**: Monthly
- **Tax behavior**: Exclusive (不含税)

#### 专业版价格
- **Product**: 专业版订阅
- **Pricing model**: Standard pricing  
- **Price**: ¥140.00 CNY
- **Billing period**: Monthly
- **Tax behavior**: Exclusive (不含税)

#### 企业版价格
- **Product**: 企业版订阅
- **Pricing model**: Standard pricing
- **Price**: ¥350.00 CNY  
- **Billing period**: Monthly
- **Tax behavior**: Exclusive (不含税)

### 一次性价格（One-time）

#### 100积分包价格
- **Product**: 100积分包
- **Pricing model**: Standard pricing
- **Price**: ¥35.00 CNY
- **Billing period**: One time
- **Tax behavior**: Exclusive (不含税)

#### 500积分包价格
- **Product**: 500积分包
- **Pricing model**: Standard pricing  
- **Price**: ¥150.00 CNY
- **Billing period**: One time
- **Tax behavior**: Exclusive (不含税)

## 第四步：获取价格 ID

创建完价格后，您需要复制价格ID并配置到环境变量中：

1. 在 Products 页面找到每个价格
2. 点击价格查看详情
3. 复制价格ID（格式：price_xxxxxxxxxx）

## 第五步：配置环境变量

将获取到的价格ID配置到 `.env.local` 文件中：

```bash
# Stripe Price IDs - 基础版计划 (￥70/月, 100积分)
STRIPE_PRICE_BASIC_MONTHLY="price_1234567890abcdef"

# Stripe Price IDs - 专业版计划 (￥140/月, 250积分)  
STRIPE_PRICE_PRO_MONTHLY="price_1234567890abcdef"

# Stripe Price IDs - 企业版计划 (￥350/月, 1000积分)
STRIPE_PRICE_ENTERPRISE_MONTHLY="price_1234567890abcdef"

# Stripe Price IDs - 一次性积分包
STRIPE_PRICE_CREDITS_100="price_1234567890abcdef"  # 100积分 ￥35
STRIPE_PRICE_CREDITS_500="price_1234567890abcdef"  # 500积分 ￥150
```

## 第六步：设置 Webhook

### 1. 创建 Webhook Endpoint

1. 导航到 **Developers** → **Webhooks**
2. 点击 **Add endpoint**
3. 配置如下：

**Endpoint URL**: `https://yourdomain.com/api/webhook/stripe`

**Listen to**: Select events

**Events to send**:
- `checkout.session.completed`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `charge.refunded`

### 2. 获取 Webhook 签名密钥

1. 创建 webhook 后，点击查看详情
2. 复制 **Signing secret**（格式：whsec_xxxxxxxxxx）
3. 配置到环境变量：

```bash
STRIPE_WEBHOOK_SECRET="whsec_1234567890abcdef"
```

## 第七步：测试配置

### 1. 验证价格配置

创建一个简单的测试脚本来验证价格配置：

```javascript
import { STRIPE_PRICES, getPriceConfig } from '@/lib/stripe-config';

// 测试所有价格配置
Object.entries(STRIPE_PRICES).forEach(([key, config]) => {
  console.log(`${key}: ${config.priceName} - ¥${config.amount} - ${config.credits}积分`);
});
```

### 2. 测试 Webhook

使用 Stripe CLI 测试 webhook：

```bash
# 安装 Stripe CLI
# 测试 checkout session completed 事件
stripe trigger checkout.session.completed
```

## 第八步：本地开发配置

### 使用 ngrok 进行本地测试

1. 安装 ngrok: `npm install -g ngrok`
2. 启动开发服务器: `npm run dev`  
3. 在另一个终端运行: `ngrok http 3000`
4. 使用 ngrok 提供的 URL 配置 Stripe webhook

### 使用 Stripe CLI 转发 webhook

```bash
# 登录 Stripe CLI
stripe login

# 转发 webhook 到本地
stripe listen --forward-to localhost:3000/api/webhook/stripe

# 获取 webhook 签名密钥用于本地测试
stripe listen --print-secret
```

## 安全注意事项

1. **环境变量**: 确保所有敏感密钥都存储在环境变量中，不要提交到版本控制
2. **Webhook 验证**: 始终验证 webhook 签名以确保请求来自 Stripe
3. **HTTPS**: 生产环境必须使用 HTTPS
4. **错误处理**: 实现适当的错误处理和日志记录
5. **幂等性**: 确保 webhook 处理具有幂等性，避免重复处理

## 监控和调试

1. **Stripe Dashboard**: 使用 Stripe Dashboard 监控支付和 webhook 事件
2. **日志**: 查看应用日志了解 webhook 处理情况  
3. **Webhook 尝试**: 在 Stripe Dashboard 中查看 webhook 尝试历史
4. **测试**: 定期测试完整的支付流程

## 常见问题

### Q: Webhook 处理失败怎么办？
A: Stripe 会自动重试失败的 webhook。检查应用日志和 Stripe Dashboard 中的 webhook 尝试历史。

### Q: 如何处理重复的 webhook 事件？
A: 使用事件ID实现幂等性处理，确保同一事件不会被重复处理。

### Q: 价格变更后如何处理现有订阅？
A: 现有订阅会继续使用原价格，新订阅使用新价格。可以通过 API 升级现有订阅。

### Q: 如何支持多货币？
A: 为每个货币创建独立的价格，在创建 checkout session 时选择对应货币的价格ID。

---

完成以上步骤后，您的 Stripe 积分订阅系统就配置完成了！