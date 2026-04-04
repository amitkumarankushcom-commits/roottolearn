-- Migration: Add 'forgot' to OTP purpose enum
ALTER TABLE otp_tokens MODIFY purpose ENUM('signup','login','admin','reset','forgot') NOT NULL;
