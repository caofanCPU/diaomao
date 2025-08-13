-- Rollback Script - Delete All Tables

-- Delete Triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
DROP TRIGGER IF EXISTS update_credits_updated_at ON credits;
DROP TRIGGER IF EXISTS update_transactions_order_updated_at ON transactions;

-- Delete Functions
DROP FUNCTION IF EXISTS update_updated_at();

-- Delete Tables (In Reverse Dependency Order)
DROP TABLE IF EXISTS user_backup CASCADE;
DROP TABLE IF EXISTS credit_usage CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS credits CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS users CASCADE;