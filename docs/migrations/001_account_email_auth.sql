-- Run once on existing databases (local / VPS)
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_verify_token VARCHAR(255),
  ADD COLUMN IF NOT EXISTS email_verify_expires TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
  ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ;

-- Keep existing accounts able to log in
UPDATE accounts
SET email_verified = TRUE
WHERE email_verify_token IS NULL
  AND email_verified = FALSE;
