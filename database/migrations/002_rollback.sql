-- 回滚脚本 - 删除所有表

-- 删除触发器
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
DROP TRIGGER IF EXISTS update_credits_updated_at ON credits;
DROP TRIGGER IF EXISTS update_transactions_order_updated_at ON transactions;

-- 删除函数
DROP FUNCTION IF EXISTS update_updated_at();

-- 删除表（按照依赖关系顺序）
DROP TABLE IF EXISTS user_backup CASCADE;
DROP TABLE IF EXISTS credit_usage CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS credits CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS users CASCADE;