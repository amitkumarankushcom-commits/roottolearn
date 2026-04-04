-- ============================================================
--  RootToLearn — MySQL Schema (phpMyAdmin)
--  Run: phpMyAdmin → Select DB → SQL tab → Paste → Go
--  OR:  mysql -u root -p your_db < database/schema-mysql.sql
-- ============================================================
CREATE DATABASE IF NOT EXISTS summariq_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE summariq_db;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(120)  NOT NULL,
  email           VARCHAR(191)  NOT NULL UNIQUE,
  password_hash   VARCHAR(255)  DEFAULT NULL,
  plan            ENUM('free','pro','enterprise') NOT NULL DEFAULT 'free',
  is_verified     TINYINT(1)   NOT NULL DEFAULT 0,
  is_active       TINYINT(1)   NOT NULL DEFAULT 1,
  docs_this_month INT UNSIGNED NOT NULL DEFAULT 0,
  total_docs      INT UNSIGNED NOT NULL DEFAULT 0,
  oauth_provider  VARCHAR(30)  DEFAULT NULL,
  stripe_cust_id  VARCHAR(100) DEFAULT NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email)
) ENGINE=InnoDB;

-- Admins
CREATE TABLE IF NOT EXISTS admins (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(120) NOT NULL,
  email           VARCHAR(191) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  role            ENUM('super','editor','support') NOT NULL DEFAULT 'support',
  is_active       TINYINT(1)  NOT NULL DEFAULT 1,
  last_login      DATETIME    DEFAULT NULL,
  created_at      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- OTP tokens
CREATE TABLE IF NOT EXISTS otp_tokens (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  target     VARCHAR(191) NOT NULL,
  token      VARCHAR(64)  NOT NULL,
  purpose    ENUM('signup','login','admin','reset','forgot') NOT NULL,
  attempts   TINYINT      NOT NULL DEFAULT 0,
  expires_at DATETIME     NOT NULL,
  used       TINYINT(1)   NOT NULL DEFAULT 0,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_target (target, purpose)
) ENGINE=InnoDB;

-- Refresh tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  expires_at DATETIME     NOT NULL,
  revoked    TINYINT(1)   NOT NULL DEFAULT 0,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Summaries
CREATE TABLE IF NOT EXISTS summaries (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      INT UNSIGNED NOT NULL,
  file_name    VARCHAR(255) NOT NULL,
  file_type    ENUM('pdf','ppt','audio','text') NOT NULL,
  file_size_kb INT UNSIGNED DEFAULT 0,
  language     VARCHAR(60)  NOT NULL DEFAULT 'english-simple',
  occupation   VARCHAR(30)  NOT NULL DEFAULT 'general',
  style        ENUM('simple','detailed','bullets') NOT NULL DEFAULT 'simple',
  word_count   INT UNSIGNED DEFAULT 0,
  summary_text MEDIUMTEXT   DEFAULT NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- Coupons
CREATE TABLE IF NOT EXISTS coupons (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code         VARCHAR(30)  NOT NULL UNIQUE,
  discount_pct TINYINT      NOT NULL,
  max_uses     INT UNSIGNED NOT NULL DEFAULT 9999,
  uses_count   INT UNSIGNED NOT NULL DEFAULT 0,
  valid_until  DATE         DEFAULT NULL,
  is_active    TINYINT(1)   NOT NULL DEFAULT 1,
  created_by   INT UNSIGNED DEFAULT NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NOT NULL,
  plan          ENUM('pro','enterprise') NOT NULL,
  amount_cents  INT UNSIGNED NOT NULL,
  currency      CHAR(3) NOT NULL DEFAULT 'INR',
  coupon_id     INT UNSIGNED DEFAULT NULL,
  stripe_pi_id  VARCHAR(100) DEFAULT NULL,
  status        ENUM('pending','succeeded','failed','refunded') NOT NULL DEFAULT 'pending',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (coupon_id) REFERENCES coupons(id)
) ENGINE=InnoDB;

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_type ENUM('user','admin','system') NOT NULL,
  actor_id   INT UNSIGNED DEFAULT NULL,
  action     VARCHAR(80)  NOT NULL,
  detail     JSON         DEFAULT NULL,
  ip         VARCHAR(45)  DEFAULT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_date (created_at)
) ENGINE=InnoDB;

-- ── Seeds ──────────────────────────────────────────────────────
-- Default super admin (password: Admin@123 — CHANGE THIS!)
INSERT IGNORE INTO admins (name, email, password_hash, role) VALUES
('Super Admin','admin@roottolearn.app','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGniMrCOFJa3iCmFHIh9yCfxQBe','super');

-- Default coupons
INSERT IGNORE INTO coupons (code, discount_pct, max_uses) VALUES
('SAVE20',20,9999),('LAUNCH50',50,100),('STUDENT30',30,9999),('FREEMONTH',100,50),('WELCOME15',15,9999);
