# 我是谁 · Diaomao SaaS 模板白皮书

## 1. 产品定位与愿景
- **一句话**：一套开箱即用的 Next.js + Prisma + PostgreSQL + Stripe 模板，内置定价卡、积分总览、文档导航与指纹化匿名引导，帮助团队用配置快速上线可变现的多语言网站。
- **愿景**：把「定价/结算/积分/文档/导航」这些高频但耗时的基础设施产品化，让小团队把时间投入在差异化功能，而不是重复造轮子。

## 2. 解决的核心痛点
- **反复搭建支付/订阅流**：每个项目都要重新接 Stripe、Portal、Checkout，还要处理异步确认、退款、升级/降级、幂等，工程成本高且易踩坑。
- **定价与积分前端体验碎片化**：定价卡、一次性购买、订阅切换、移动端弹窗、信用额度展示等常见模块缺少一致的设计与交互。
- **匿名流量转化断层**：未注册用户的体验往往缺默认额度、追踪、升级通道，导致转化链路中断。
- **文档与主站割裂**：Docs、导航、CTA 常常与产品站风格不一致，维护多份样式和配置。
- **首屏抖动和移动端体验欠佳**：SSR/CSR 状态不一致导致 FOUC，移动端弹窗和下拉滚动体验常被忽略。

## 3. 核心卖点（按优先级）
1) **Money Price 2.0 定价体系**  
   - 支持 monthly/yearly/onetime 任意组合的计费开关，SSR 默认值可被用户订阅态覆盖。  
   - 升级按钮有启用开关，Portal/Checkout 双路径兜底，折扣徽标/副标题随计费模式自动变化。  
   - 设计规范：紫粉渐变主按钮、24px 节奏、三列栅格可自适应。

2) **Credit Overview 积分总览**  
   - 桌面下拉 + 移动滚动锁定，展示免费/订阅/一次性桶、到期提示、余额进度。  
   - CTA 行为可按端配置：桌面弹出定价模态，移动端跳转或鉴权后再关闭下拉。  
   - 与定价弹窗解耦，同一份 Money Price 数据复用。

3) **匿名指纹到 Clerk 的平滑跃迁**  
   - 首访生成指纹 ID，自动分配体验积分，建 Users/Credits/Subscriptions 初始化记录。  
   - 登录后沿用同一上下文，避免积分丢失；所有 API/中间件已容错。  
   - Hook + Provider 已封装，SSR InitUserContext 避免首屏按钮状态闪烁。

4) **Stripe 生命周期内建**  
   - Checkout/Portal 接入，支持异步支付、续费、退款、取消到期、升级/降级。  
   - Webhook 幂等：通过 event.id + order_id 元数据路由到 Transactions/Subscriptions。  
   - One-time 与 Subscription 双模逻辑和按钮状态已编码。

5) **Fumadocs + Header 导航体系**  
   - Mega Menu、多列卡片、Banner、图标、端上显示策略（nav/menu/all），保持营销页与 Docs 一致视觉。  
   - actionOrders 让搜索/主题/语言/GitHub/自定义按钮排序统一，移动端支持 pinned 行为。

6) **体验细节与可访问性**  
   - 移动端弹窗滚动锁、副作用后再关闭下拉，避免“点了没反应”的错觉。  
   - 统一 focus-visible、暗色描边、渐变按钮对比度≥4.5:1。  
   - 受控渲染替代 DOM 直改，减少闪烁。

## 4. 技术栈与实现要点
- **前端**：Next.js（SSR/RSC）、Tailwind 设计体系、Radix 弹窗/下拉、Lucide 图标、Fumadocs 导航框架。
- **数据层**：Prisma + PostgreSQL，按 Users / Subscriptions / Credits / Transactions / CreditAuditLog 设计，索引覆盖指纹、order_id、subscription_id。
- **支付**：Stripe Checkout + Portal，metadata 挂载 order_id，webhook 幂等防重；支持订阅与一次性产品分表配置。
- **身份/指纹**：Clerk 登录与指纹 SDK，匿名首访创建 FP_ID，SSR InitUserContext 减少状态抖动。
- **配置驱动**：定价、CTA、导航、Docs 卡片、计费默认值均通过翻译/配置文件控制，减少硬编码。

## 5. 创新特性（亮点）
- **计费类型插槽化**：enabledBillingTypes + defaultKey 让同一 UI 支持纯订阅、纯一次性或混合模式。
- **CTA 行为矩阵**：订阅/管理/一次性按钮按桌面/移动端映射 modal/redirect/auth/custom，保证跨端一致体验。
- **匿名到付费的无缝桥接**：指纹赠送体验积分 -> Clerk 登录 -> Portal 升级，全链路不中断。
- **设计即规范**：UI.md 给出主题/间距/交互准则，团队可复用“提示词”快速对齐风格。

## 6. 典型使用场景
- **早期 SaaS MVP**：一周内上线支付、定价、积分额度、文档站，专注业务逻辑。  
   - 价值：省去支付集成、定价设计、导航/Docs UI 搭建的 2–4 周。  
   - 路径：配置 Stripe/DB/Clerk -> 配置 pricing/nav/docs -> 发布。
- **现有产品的付费化升级**：接入 Money Price + Credit Overview，为原有功能加上订阅/积分节流。  
   - 价值：复用 CTA 行为矩阵与 Portal/Checkout 兜底，降低改造风险。  
- **多语言文档驱动的产品站**：Fumadocs + Header Mega Menu，统一营销页与产品文档的样式与导航体验。

## 7. 付费/价值论证
- **节省人力**：支付/定价/积分/Docs/导航全栈模板，减少前后端 2–4 周基础开发。  
- **减少错误**：Stripe 幂等、状态机、用户态切换、移动端行为已预防常见踩坑。  
- **更高转化**：首屏稳定（SSR 数据）、匿名赠送体验积分、清晰的升级/购买路径提升付费率。  
- **可维护**：配置化驱动，翻译/文案即可调整，不必频繁改代码。

## 8. 与常规模板的区别
- 不只是样式，而是包含**完整支付+积分+身份+Docs 的产品级编排**。  
- 交互细节遵循移动/桌面双端准则，避免“能用但不好用”的 Demo 感。  
- 数据模型与 webhook 幂等策略开箱即用，可直接对接生产 Stripe 账号。

## 9. 快速上手（高阶简版）
1) 配置环境变量：Stripe key/Portal API、PostgreSQL URL、Clerk。  
2) 运行 Prisma 迁移，保证核心表与索引就绪。  
3) 调整 `moneyPrice` 翻译与产品配置：billingSwitch、plans、enabledBillingTypes。  
4) 配置 `credit` CTA 行为矩阵与导航 `levelNavLinks/homeNavLinks`。  
5) 填充 Docs 内容与 Banner，确认行动按钮位序（actionOrders）。  
6) 本地/预发验证：SSR 首屏状态、移动端下拉/模态、Stripe Checkout & Portal 回环。  
7) 上线：切换生产密钥，监控 webhook/日志。

## 10. 我们希望用户感受到的价值
- “这不是一个空壳模板，而是一套能直接接入支付、积分、文档并且设计感在线的 SaaS 基座。”  
- “我只需要填配置和文案，就能有像样的首页、定价、积分和 Docs，移动端体验也稳。”  
- “付费链路可信：Portal、异步支付、取消、退款、升级/降级都被考虑了。”  
- “匿名用户也有清晰的成长路径，减少流失。”  

> 若需对外传播，可提炼为：**用一周时间升级为“可收费且有文档的产品”，其余交给 Diaomao 模板。**
