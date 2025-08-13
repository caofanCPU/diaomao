# Clerk Webhook 设置指南

本文档说明如何设置和配置Clerk用户事件webhook，以便在用户注册和注销时同步更新数据库。

## 功能概述

- **用户创建 (user.created)**：当用户在Clerk中注册时触发
  - 如果用户之前是匿名用户，则升级为注册用户
  - 如果是全新用户，则创建用户记录并分配免费积分
- **用户删除 (user.deleted)**：当用户删除账户时触发
  - 备份用户数据到UserBackup表
  - 硬删除用户及相关数据

## API端点

```
POST /api/webhook/clerk/user
```

## 环境配置

在`.env.local`文件中添加以下环境变量：

```bash
# Clerk Webhook签名密钥
CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxx
```

## Clerk控制台配置

1. 登录 [Clerk Dashboard](https://dashboard.clerk.com/)
2. 选择你的应用
3. 进入 **Webhooks** 页面
4. 点击 **Add Endpoint**
5. 配置如下：
   - **Endpoint URL**: `https://yourdomain.com/api/webhook/clerk/user`
   - **Events**: 选择以下事件
     - `user.created`
     - `user.deleted`
6. 保存后复制 **Signing Secret** 到环境变量中

## 本地开发配置

由于webhook需要公网访问，本地开发时需要使用隧道工具：

### 使用 ngrok

1. 安装ngrok：`npm install -g ngrok`
2. 启动开发服务器：`npm run dev`
3. 在另一个终端运行：`ngrok http 3000`
4. 使用ngrok提供的公网URL配置Clerk webhook

### 使用 Vercel

部署到Vercel后，直接使用生产URL配置webhook。

## 数据流程

### 匿名用户注册流程

1. 匿名用户访问网站 → 生成fingerprint_id
2. 用户决定注册 → 通过Clerk SignUp组件传递user_id和fingerprint_id
3. Clerk验证用户信息 → 异步发送UserCreated webhook
4. 系统接收webhook → 查找匿名用户记录 → 升级为注册用户

### 直接注册流程

1. 新用户直接注册 → Clerk发送UserCreated webhook
2. 系统创建新用户记录 → 初始化50积分 → 记录积分操作

### 用户注销流程

1. 用户删除账户 → Clerk发送UserDeleted webhook
2. 系统备份用户数据 → 硬删除所有相关记录 → 清理缓存

## 签名验证

API使用svix库验证Clerk webhook签名：

```javascript
const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET);
const event = wh.verify(rawBody, headers);
```

## 错误处理

- 缺少必要的headers → 返回400错误
- 签名验证失败 → 返回400错误
- 系统处理异常 → 返回500错误，记录错误日志

## 测试

webhook处理完成后会返回：

```json
{
  "received": true
}
```

## 安全考虑

1. **环境变量**：webhook signing secret必须存储为环境变量
2. **签名验证**：所有webhook请求都必须通过签名验证
3. **错误处理**：适当的错误处理避免敏感信息泄露
4. **日志记录**：记录关键操作用于审计和调试

## 监控和日志

系统会记录以下日志：
- webhook事件类型和处理状态
- 用户创建/删除操作结果
- 积分操作记录
- 错误和异常信息

建议在生产环境中设置日志监控和告警机制。