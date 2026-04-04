USE summariq_db;

-- Add sample activity log entries for testing
INSERT IGNORE INTO audit_log (actor_type, actor_id, action, detail, ip) VALUES
('admin', 6, 'User signup approved', JSON_OBJECT('user_id', 1, 'email', 'john@example.com'), '192.168.1.1'),
('user', 1, 'Document processed', JSON_OBJECT('doc_id', 5, 'type', 'pdf', 'words', 2500), '192.168.1.50'),
('admin', 6, 'Coupon created', JSON_OBJECT('code', 'SUMMER20', 'discount', 20), '192.168.1.1'),
('user', 2, 'Plan upgraded to pro', JSON_OBJECT('from_plan', 'free', 'to_plan', 'pro'), '192.168.1.51'),
('admin', 6, 'Settings updated', JSON_OBJECT('fields', 'pro_price, otp_expiry'), '192.168.1.1'),
('system', NULL, 'Database backup created', JSON_OBJECT('size_mb', 50, 'tables', 8), NULL),
('user', 3, 'Login via OTP', JSON_OBJECT('email', 'alice@example.com', 'device', 'mobile'), '192.168.1.52'),
('admin', 6, 'User suspended', JSON_OBJECT('user_id', 10, 'reason', 'Suspicious activity'), '192.168.1.1'),
('user', 1, 'Email verified', JSON_OBJECT('email', 'john@example.com'), '192.168.1.50'),
('admin', 6, 'Coupon deactivated', JSON_OBJECT('code', 'OLDCODE99'), '192.168.1.1');
