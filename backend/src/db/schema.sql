-- Drop existing tables if they exist to allow clean resets during development
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS wallets;
DROP TABLE IF EXISTS users;

-- 1. USERS TABLE: Manages identity and authentication credentials
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. WALLETS TABLE: Maintains 1:1 state with a user
CREATE TABLE wallets (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- DECIMAL(15,2) prevents floating-point precision errors (e.g., 0.1 + 0.2 = 0.30000000000000004)
    balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Hard database fail-safe: Balance can NEVER drop below zero
    CONSTRAINT chk_wallet_balance_positive CHECK (balance >= 0.00)
);

-- 3. TRANSACTIONS TABLE: Immutable, append-only historical ledger
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    sender_wallet_id INT NOT NULL REFERENCES wallets(id),
    receiver_wallet_id INT NOT NULL REFERENCES wallets(id),
    amount DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Safeguards: Amount must be positive, and users cannot send money to themselves
    CONSTRAINT chk_transaction_amount_positive CHECK (amount > 0.00),
    CONSTRAINT chk_self_transfer CHECK (sender_wallet_id <> receiver_wallet_id)
);

-- Indexes to maximize performance under concurrent read loads
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_transactions_sender ON transactions(sender_wallet_id);
CREATE INDEX idx_transactions_receiver ON transactions(receiver_wallet_id);