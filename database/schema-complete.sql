-- ============================================================
--  RootToLearn — Complete PostgreSQL Schema for Supabase
--  Merged from all migrations and schema files
--  Last Updated: 2026-04-12
--  Usage: Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

-- ============================================================
-- 1. USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(120)  NOT NULL,
  email           VARCHAR(191)  NOT NULL UNIQUE,
  password_hash   VARCHAR(255)  DEFAULT NULL,
  plan            VARCHAR(20)   NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','enterprise')),
  role            VARCHAR(50)   DEFAULT 'user',
  is_verified     BOOLEAN       DEFAULT false,
  is_active       BOOLEAN       DEFAULT true,
  docs_this_month INT           NOT NULL DEFAULT 0,
  total_docs      INT           NOT NULL DEFAULT 0,
  oauth_provider  VARCHAR(30)   DEFAULT NULL,
  stripe_cust_id  VARCHAR(100)  DEFAULT NULL,
  profile_image   TEXT          DEFAULT NULL,
  bio             TEXT          DEFAULT NULL,
  preferences     JSONB         DEFAULT '{}',
  last_login      TIMESTAMP     DEFAULT NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Auto-update updated_at on users
CREATE OR REPLACE FUNCTION _update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION _update_updated_at();

-- ============================================================
-- 2. ADMINS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS admins (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(120)  NOT NULL,
  email           VARCHAR(191)  NOT NULL UNIQUE,
  password_hash   VARCHAR(255)  NOT NULL,
  role            VARCHAR(20)   NOT NULL DEFAULT 'support' CHECK (role IN ('super','editor','support')),
  is_active       BOOLEAN       DEFAULT true,
  last_login      TIMESTAMP     DEFAULT NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. OTP TOKENS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS otp_tokens (
  id         SERIAL PRIMARY KEY,
  target     VARCHAR(191) NOT NULL,
  token      VARCHAR(64)  NOT NULL,
  purpose    VARCHAR(20)  NOT NULL CHECK (purpose IN ('signup','login','admin','reset','forgot')),
  attempts   SMALLINT     NOT NULL DEFAULT 0,
  expires_at TIMESTAMP    NOT NULL,
  used       SMALLINT     NOT NULL DEFAULT 0,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_otp_target ON otp_tokens(target, purpose);
CREATE INDEX IF NOT EXISTS idx_otp_tokens_target ON otp_tokens(target);
CREATE INDEX IF NOT EXISTS idx_otp_tokens_purpose ON otp_tokens(purpose);

-- ============================================================
-- 4. REFRESH TOKENS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  expires_at TIMESTAMP    NOT NULL,
  revoked    SMALLINT     NOT NULL DEFAULT 0,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 5. SUMMARIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS summaries (
  id           SERIAL PRIMARY KEY,
  user_id      INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name    VARCHAR(255) NOT NULL,
  file_type    VARCHAR(20)  NOT NULL CHECK (file_type IN ('pdf','ppt','audio','text')),
  file_size_kb INT          DEFAULT 0,
  language     VARCHAR(60)  NOT NULL DEFAULT 'english-simple',
  occupation   VARCHAR(30)  NOT NULL DEFAULT 'general',
  style        VARCHAR(20)  NOT NULL DEFAULT 'simple' CHECK (style IN ('simple','detailed','bullets')),
  word_count   INT          DEFAULT 0,
  summary_text TEXT         DEFAULT NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_summaries_user ON summaries(user_id);

-- ============================================================
-- 6. COUPONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS coupons (
  id           SERIAL PRIMARY KEY,
  code         VARCHAR(30)  NOT NULL UNIQUE,
  discount_pct SMALLINT     NOT NULL,
  max_uses     INT          NOT NULL DEFAULT 9999,
  uses_count   INT          NOT NULL DEFAULT 0,
  valid_until  DATE         DEFAULT NULL,
  is_active    SMALLINT     NOT NULL DEFAULT 1,
  created_by   INT          DEFAULT NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 7. PAYMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id            SERIAL PRIMARY KEY,
  user_id       INT          NOT NULL REFERENCES users(id),
  plan          VARCHAR(20)  NOT NULL CHECK (plan IN ('pro','enterprise')),
  amount_cents  INT          NOT NULL,
  currency      CHAR(3)      NOT NULL DEFAULT 'INR',
  coupon_id     INT          DEFAULT NULL REFERENCES coupons(id),
  stripe_pi_id  VARCHAR(100) DEFAULT NULL,
  status        VARCHAR(20)  NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','succeeded','failed','refunded')),
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 8. AUDIT LOG TABLE (Legacy)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id         BIGSERIAL PRIMARY KEY,
  actor_type VARCHAR(20)  NOT NULL CHECK (actor_type IN ('user','admin','system')),
  actor_id   INT          DEFAULT NULL,
  action     VARCHAR(80)  NOT NULL,
  detail     JSONB        DEFAULT NULL,
  ip         VARCHAR(45)  DEFAULT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_log(created_at);

-- ============================================================
-- 9. AUDIT LOGS TABLE (New)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id         SERIAL PRIMARY KEY,
  admin_id   INTEGER REFERENCES users(id),
  action     VARCHAR(255) NOT NULL,
  resource_type VARCHAR(100),
  resource_id INTEGER,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================
-- 10. SYSTEM SETTINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS system_settings (
  id         SERIAL PRIMARY KEY,
  key        VARCHAR(255) UNIQUE NOT NULL,
  value      JSONB,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER REFERENCES users(id)
);

-- ============================================================
-- 11. EMAIL TEMPLATES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS email_templates (
  id            SERIAL PRIMARY KEY,
  template_name VARCHAR(100) UNIQUE NOT NULL,
  subject       TEXT NOT NULL,
  html_content  TEXT NOT NULL,
  text_content  TEXT,
  variables     JSONB,
  active        BOOLEAN DEFAULT true,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 12. ACTIVITY LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER REFERENCES users(id),
  action        VARCHAR(255),
  resource_type VARCHAR(100),
  resource_id   INTEGER,
  details       JSONB,
  ip_address    VARCHAR(45),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

-- ============================================================
-- 13. SEED DATA
-- ============================================================

-- Default super admin (password: Admin@123 — CHANGE THIS IMMEDIATELY!)
INSERT INTO admins (name, email, password_hash, role)
VALUES ('Super Admin','araj821897@gmail.com','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGniMrCOFJa3iCmFHIh9yCfxQBe','super')
ON CONFLICT DO NOTHING;

-- Default coupons
INSERT INTO coupons (code, discount_pct, max_uses) VALUES
('SAVE20',20,9999),
('LAUNCH50',50,100),
('STUDENT30',30,9999),
('FREEMONTH',100,50),
('WELCOME15',15,9999)
ON CONFLICT DO NOTHING;

-- Sample activity log entries for testing
INSERT INTO audit_log (actor_type, actor_id, action, detail, ip) VALUES
('admin', 1, 'User signup approved', '{"user_id": 1, "email": "john@example.com"}'::jsonb, '192.168.1.1'),
('user', 1, 'Document processed', '{"doc_id": 5, "type": "pdf", "words": 2500}'::jsonb, '192.168.1.50'),
('admin', 1, 'Coupon created', '{"code": "SUMMER20", "discount": 20}'::jsonb, '192.168.1.1'),
('user', 2, 'Plan upgraded to pro', '{"from_plan": "free", "to_plan": "pro"}'::jsonb, '192.168.1.51'),
('admin', 1, 'Settings updated', '{"fields": "pro_price, otp_expiry"}'::jsonb, '192.168.1.1'),
('system', NULL, 'Database backup created', '{"size_mb": 50, "tables": 8}'::jsonb, NULL),
('user', 3, 'Login via OTP', '{"email": "alice@example.com", "device": "mobile"}'::jsonb, '192.168.1.52'),
('admin', 1, 'User suspended', '{"user_id": 10, "reason": "Suspicious activity"}'::jsonb, '192.168.1.1'),
('user', 1, 'Email verified', '{"email": "john@example.com"}'::jsonb, '192.168.1.50'),
('admin', 1, 'Coupon deactivated', '{"code": "OLDCODE99"}'::jsonb, '192.168.1.1')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Setup Complete!
-- ============================================================
-- All tables, indexes, triggers, and seed data have been created.
-- Review and update security settings as needed.
-- ============================================================
