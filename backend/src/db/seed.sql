-- Clear old entries safely
TRUNCATE users, wallets, transactions RESTART IDENTITY CASCADE;

-- Insert Test Users (Password hashes are placeholders for now)
INSERT INTO users (username, email, password_hash) VALUES
('alice', 'alice@stash.com', 'password'),
('bob', 'bob@stash.com', 'password'),
('charlie', 'charlie@stash.com', 'password'),
('system_faucet', 'faucet@stash.com', 'password');

-- Assign corresponding initial balances to their wallets
-- Alice gets $1,000.00, Bob gets $500.00, Charlie gets $0.00, Faucet gets $1,000,000.00
INSERT INTO wallets (user_id, balance) VALUES
(1, 1000.00),
(2, 500.00),
(3, 0.00),
(4, 1000000.00);