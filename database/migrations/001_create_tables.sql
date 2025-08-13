-- Users
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    fingerprint_id VARCHAR(255) UNIQUE,
    clerk_user_id VARCHAR(255) UNIQUE,
    email VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'anonymous' 
        CHECK (status IN ('anonymous', 'registered', 'frozen', 'deleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Subscriptions
CREATE TABLE subscriptions (
    id BIGSERIAL PRIMARY KEY,
    subscription_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    pay_subscription_id VARCHAR(255) UNIQUE,
    price_id VARCHAR(255),
    price_name VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'incomplete'
        CHECK (status IN ('active', 'canceled', 'past_due', 'incomplete', 'trialing')),
    credits_allocated INTEGER NOT NULL DEFAULT 0,
    sub_period_start TIMESTAMP WITH TIME ZONE,
    sub_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_pay_subscription_id ON subscriptions(pay_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_sub_period_end ON subscriptions(sub_period_end);

-- Credits
CREATE TABLE credits (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    balance_free INTEGER NOT NULL DEFAULT 0,
    total_free_limit INTEGER NOT NULL DEFAULT 0,
    balance_paid INTEGER NOT NULL DEFAULT 0,
    total_paid_limit INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_credits_user_id ON credits(user_id);

-- Transactions
CREATE TABLE transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    order_id VARCHAR(255) UNIQUE NOT NULL,
    order_status VARCHAR(20) NOT NULL DEFAULT 'created'
        CHECK (order_status IN ('created', 'success', 'refunded', 'canceled', 'failed')),
    order_created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    order_expired_at TIMESTAMP WITH TIME ZONE,
    order_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    pay_supplier VARCHAR(50) CHECK (pay_supplier IN ('Stripe', 'Apple', 'Paypal')),
    pay_transaction_id VARCHAR(255) UNIQUE,
    pay_subscription_id VARCHAR(255),
    pay_session_id VARCHAR(255),
    pay_invoice_id VARCHAR(255),
    price_id VARCHAR(255),
    price_name VARCHAR(255),
    sub_interval_count INTEGER,
    sub_cycle_anchor TIMESTAMP WITH TIME ZONE,
    amount DECIMAL(10,2),
    currency VARCHAR(10),
    type VARCHAR(20) CHECK (type IN ('subscription', 'one_time')),
    credits_granted INTEGER DEFAULT 0,
    sub_period_start TIMESTAMP WITH TIME ZONE,
    sub_period_end TIMESTAMP WITH TIME ZONE,
    order_detail TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    paid_email VARCHAR(255),
    paid_detail TEXT,
    pay_created_at TIMESTAMP WITH TIME ZONE,
    pay_updated_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_order_id ON transactions(order_id);
CREATE INDEX idx_transactions_pay_session_id ON transactions(pay_session_id);
CREATE INDEX idx_transactions_pay_invoice_id ON transactions(pay_invoice_id);
CREATE INDEX idx_transactions_pay_subscription_id ON transactions(pay_subscription_id);
CREATE INDEX idx_transactions_order_status ON transactions(order_status);
CREATE INDEX idx_transactions_order_created_at ON transactions(order_created_at);

-- Credit_Usage
CREATE TABLE credit_usage (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    feature VARCHAR(255),
    order_id VARCHAR(255),
    credit_type VARCHAR(10) NOT NULL CHECK (credit_type IN ('free', 'paid')),
    operation_type VARCHAR(20) NOT NULL CHECK (operation_type IN ('consume', 'recharge', 'freeze', 'unfreeze')),
    credits_used INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_credit_usage_user_id ON credit_usage(user_id);
CREATE INDEX idx_credit_usage_order_id ON credit_usage(order_id);
CREATE INDEX idx_credit_usage_credit_type ON credit_usage(credit_type);
CREATE INDEX idx_credit_usage_operation_type ON credit_usage(operation_type);
CREATE INDEX idx_credit_usage_created_at ON credit_usage(created_at);

-- UserBackup
CREATE TABLE user_backup (
    id BIGSERIAL PRIMARY KEY,
    original_user_id UUID NOT NULL,
    fingerprint_id VARCHAR(255),
    clerk_user_id VARCHAR(255),
    email VARCHAR(255),
    status VARCHAR(50),
    backup_data JSONB,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_user_backup_original_user_id ON user_backup(original_user_id);
CREATE INDEX idx_user_backup_fingerprint_id ON user_backup(fingerprint_id);
CREATE INDEX idx_user_backup_clerk_user_id ON user_backup(clerk_user_id);
CREATE INDEX idx_user_backup_email ON user_backup(email);
CREATE INDEX idx_user_backup_deleted_at ON user_backup(deleted_at);

-- UpdateTime Trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- UpdateTime Triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_credits_updated_at BEFORE UPDATE ON credits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_transactions_order_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Comments
COMMENT ON TABLE users IS '用户表，存储匿名用户和注册用户信息';
COMMENT ON TABLE subscriptions IS '订阅表，跟踪用户订阅状态';
COMMENT ON TABLE credits IS '积分表，管理用户积分余额';
COMMENT ON TABLE transactions IS '订单交易表，记录所有支付交易';
COMMENT ON TABLE credit_usage IS '积分使用表，跟踪积分消耗和充值';
COMMENT ON TABLE user_backup IS '用户备份表，存储注销用户数据';