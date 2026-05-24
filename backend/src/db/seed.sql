-- Clear old entries safely
TRUNCATE users, wallets, transactions RESTART IDENTITY CASCADE;

-- Insert 3 Test Users (Password hashes are placeholders for now)
INSERT INTO users (username, email, password_hash) VALUES
('alice', 'alice@stash.com', '$2b$10$xyzPlaceHolderHashForAlice'),
('bob', 'bob@stash.com', '$2b$10$xyzPlaceHolderHashForBob'),
('charlie', 'charlie@stash.com', '$2b$10$xyzPlaceHolderHashForCharlie');

-- Assign corresponding initial balances to their wallets
-- Alice gets $1,000.00, Bob gets $500.00, Charlie gets $0.00
INSERT INTO wallets (user_id, balance) VALUES
(1, 1000.00),
(2, 500.00),
(3, 0.00);