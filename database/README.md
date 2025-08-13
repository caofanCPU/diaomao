# 订阅与积分系统数据库

## 概述

本项目实现了一个完整的订阅与积分系统数据库架构，包括用户管理、订阅管理、积分管理、交易记录、使用记录和用户备份等功能。

## 数据库初始化

### 1. 创建数据库

* psql -U your_username -c "CREATE DATABASE diaomao;"

```sql
CREATE DATABASE diaomao;
```

### 2. 执行建表SQL
连接到diaomao数据库，执行以下SQL文件：
```bash
psql -U your_username -d diaomao -f database/migrations/001_create_tables.sql
```

### 3. 配置环境变量
创建`.env`文件：
```bash
DATABASE_URL="postgresql://username:password@localhost:5432/diaomao"
```

### 4. 生成Prisma客户端
```bash
# 安装依赖
npm install @prisma/client prisma

# 从现有数据库拉取schema（可选，用于验证）
npx prisma db pull

# 生成客户端代码
npx prisma generate
```

### 5. 初始化执行结果

```text
执行结果很好！npx prisma db pull 成功从数据库同步了模型到
  schema.prisma。让我分析一下输出：

  ✅ 成功的部分：

  - 成功内省了6个模型：User, Subscription, Credit, Transaction, CreditUsage,
  UserBackup
  - 保留了原有的字段映射：所有的 @map 信息都被正确保留
  - 保留了表映射：所有的 @@map 信息都被正确保留
  - 数据库连接正常：成功连接到PostgreSQL数据库

  ⚠️ 警告信息（不是错误，是正常的）：

  1. CHECK约束不支持

  These constraints are not supported by Prisma Client, because Prisma currently
   does not fully support check constraints
  这是正常的，Prisma目前不完全支持CHECK约束，但不影响使用。

  2. 数据库注释不支持

  These objects have comments defined in the database, which is not yet fully
  supported
  数据库表的注释暂不支持，但不影响功能。

  🎯 需要的后续操作：

  # 生成Prisma Client
  npx prisma generate

  📋 检查同步结果：

  从生成的schema.prisma看，所有字段都正确同步了：
  - ✅ paySubscriptionId 字段正确
  - ✅ payTransactionId 字段正确
  - ✅ paySessionId 字段正确
  - ✅ payInvoiceId 字段正确
  - ✅ paySupplier 字段正确
  - ✅ subCycleAnchor 字段正确

  总结：

  没有任何问题！ 这是一次成功的Database
  First同步。警告信息都是Prisma的已知限制，不影响实际使用。现在可以运行 npx 
  prisma generate 来生成客户端代码了。
```

## Database First 工作流程

当你手动修改数据库结构后，需要同步到 Prisma：

### 1. 从数据库同步到 Prisma
```bash
# 从数据库拉取最新结构并更新 schema.prisma
npx prisma db pull
```

### 2. 生成新的 Prisma Client
```bash
# 根据更新后的 schema.prisma 生成客户端代码
npx prisma generate
```

### 3. 验证同步结果
```bash
# 查看 schema.prisma 是否正确更新
cat prisma/schema.prisma

# 测试 Prisma Client 是否正常工作
npm run test  # 或其他测试命令
```

### 4. 处理冲突情况
如果出现数据库和 schema.prisma 不一致的情况：

```bash
# 方案一：强制从数据库拉取（会覆盖 schema.prisma）
npx prisma db pull --force

# 方案二：备份后手动合并
cp prisma/schema.prisma prisma/schema.prisma.backup
npx prisma db pull
# 然后手动比较和合并差异

# 方案三：重置到数据库状态
npx prisma db pull
npx prisma generate
```

### 5. 环境变量配置
确保环境变量正确配置：

```bash
# .env 文件中设置
DATABASE_BASE_URL="postgresql://username:password@localhost:5432"
DATABASE_NAME="diaomao"
DATABASE_SCHEMA="public"
```

### Database First vs Schema First

| 工作流程 | 优点 | 缺点 | 适用场景 |
|---------|------|------|----------|
| **Database First** | 直接操作数据库，灵活性高 | 需要手动同步，容易不一致 | 数据库管理员主导，复杂迁移 |
| **Schema First** | 版本控制友好，团队协作好 | 复杂变更可能失败 | 开发团队主导，标准开发流程 |

### 注意事项
- `prisma db pull` 会**完全覆盖** `schema.prisma` 文件
- 执行前请备份手动修改的配置
- 建议在团队中统一使用一种工作流程

## 数据表结构

### 1. Users（用户表）
- 存储匿名用户和注册用户信息
- 支持从匿名用户到注册用户的平滑过渡
- 通过fingerprint_id实现设备识别

### 2. Subscriptions（订阅表）
- 管理用户订阅状态和周期
- 支持多种订阅状态（active、canceled、past_due等）
- 与Stripe深度集成

### 3. Credits（积分表）
- 管理用户积分余额
- 区分免费积分和付费积分
- 支持积分限制和余额管理

### 4. Transactions（交易表）
- 记录所有支付交易
- 支持订单状态流转
- 完整的支付信息记录

### 5. Credit_Usage（积分使用表）
- 记录所有积分操作
- 支持多种操作类型（consume、recharge、freeze、unfreeze）
- 提供完整的审计追踪

### 6. UserBackup（用户备份表）
- 存储注销用户的完整数据
- 支持数据恢复
- 满足GDPR合规要求

## 使用示例

```typescript
import { userService, creditService, UserStatus } from './src/services/database';

// 创建用户
const user = await userService.createUser({
  email: 'user@example.com',
  status: UserStatus.REGISTERED
});

// 初始化积分
const credits = await creditService.initializeCredits(user.userId, 50);

// 消耗积分
const result = await creditService.consumeCredits(
  user.userId,
  10,
  'API Call'
);
```

## CRUD操作说明

### UserService
- `createUser()` - 创建用户
- `findById()` - 通过ID查找用户
- `findByEmail()` - 通过邮箱查找用户
- `updateUser()` - 更新用户信息
- `upgradeToRegistered()` - 升级为注册用户
- `softDeleteUser()` - 软删除用户
- `hardDeleteUser()` - 硬删除用户（带备份）

### SubscriptionService
- `createSubscription()` - 创建订阅
- `getActiveSubscription()` - 获取活跃订阅
- `updateStatus()` - 更新订阅状态
- `cancelSubscription()` - 取消订阅
- `renewSubscription()` - 续费订阅

### CreditService
- `initializeCredits()` - 初始化积分
- `rechargeCredits()` - 充值积分
- `consumeCredits()` - 消耗积分
- `freezeCredits()` - 冻结积分
- `unfreezeCredits()` - 解冻积分
- `refundCredits()` - 退款扣除积分

### TransactionService
- `createTransaction()` - 创建交易
- `updateStatus()` - 更新交易状态
- `completePayment()` - 完成支付
- `processRefund()` - 处理退款
- `getRevenueStats()` - 获取收入统计

### CreditUsageService
- `recordUsage()` - 记录积分使用
- `getUserUsageHistory()` - 获取使用历史
- `getUserUsageStats()` - 获取使用统计
- `getPopularFeatures()` - 获取热门功能

### UserBackupService
- `backupFullUserData()` - 备份完整用户数据
- `restoreUserData()` - 恢复用户数据
- `findByOriginalUserId()` - 查找备份
- `deleteOldBackups()` - 清理旧备份

## 数据库维护

### 删除所有表（谨慎使用）
```bash
psql -U your_username -d diaomao -f database/migrations/002_rollback.sql
```

### 重新创建表
```bash
psql -U your_username -d diaomao -f database/migrations/001_create_tables.sql
```

## 性能优化建议

1. **索引策略**
   - 所有外键字段都已创建索引
   - 常用查询字段（email、status等）已创建索引
   - 时间字段已创建索引用于范围查询

2. **查询优化**
   - 使用Prisma的include进行关联查询
   - 使用事务确保数据一致性
   - 批量操作使用createMany/updateMany

3. **缓存策略**
   - 用户信息建议使用Redis缓存
   - 积分余额建议使用Redis缓存
   - 热门功能统计可以定期计算并缓存

## 监控与维护

### 定期任务
```typescript
// 更新过期订阅
await subscriptionService.updateExpiredSubscriptions();

// 更新过期订单
await transactionService.updateExpiredOrders();

// 清理旧的备份数据
await userBackupService.deleteOldBackups(90);

// 清理旧的使用记录
await creditUsageService.deleteOldRecords(365);
```

### 数据统计
```typescript
// 用户统计
const userStats = await userService.getUserStats();

// 积分统计
const creditStats = await creditService.getCreditStats();

// 收入统计
const revenueStats = await transactionService.getRevenueStats();

// 使用统计
const usageStats = await creditUsageService.getSystemStats();
```

## 安全建议

1. **数据加密**
   - 敏感字段（如stripe_session_id）应加密存储
   - 使用SSL/TLS连接数据库

2. **访问控制**
   - 使用最小权限原则配置数据库用户
   - 生产环境禁用DROP权限

3. **审计日志**
   - 所有积分操作都有记录
   - 关键操作记录操作者信息

4. **备份策略**
   - 定期备份数据库
   - 用户删除前自动备份

## 故障排查

### 常见问题

1. **连接失败**
   - 检查DATABASE_URL配置
   - 确认PostgreSQL服务运行中
   - 检查防火墙设置

2. **Prisma错误**
   - 运行 `npx prisma generate` 重新生成客户端
   - 检查schema.prisma与数据库结构一致性

3. **性能问题**
   - 检查索引是否正确创建
   - 使用EXPLAIN分析慢查询
   - 考虑添加Redis缓存

## 技术支持

如有问题，请查看：
- [Prisma文档](https://www.prisma.io/docs)
- [PostgreSQL文档](https://www.postgresql.org/docs)
- 项目Issue追踪器