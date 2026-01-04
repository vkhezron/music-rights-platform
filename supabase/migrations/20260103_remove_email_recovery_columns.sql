-- Migration: 20260103_remove_email_recovery_columns.sql
-- Removes all email recovery related columns and indexes from user_recovery_credentials and profiles

BEGIN;

-- Remove columns from user_recovery_credentials
ALTER TABLE public.user_recovery_credentials
  DROP COLUMN IF EXISTS email_recovery_token_hash,
  DROP COLUMN IF EXISTS email_recovery_token_expires_at,
  DROP COLUMN IF EXISTS email_recovery_token_sent_at,
  DROP COLUMN IF EXISTS email_recovery_attempts,
  DROP COLUMN IF EXISTS recovery_email_hash,
  DROP COLUMN IF EXISTS recovery_email_plain,
  DROP COLUMN IF EXISTS recovery_email_verified,
  DROP COLUMN IF EXISTS recovery_email_verified_at;

-- Remove index if exists
DROP INDEX IF EXISTS idx_recovery_credentials_email_token_expires;
DROP INDEX IF EXISTS idx_recovery_credentials_verified;

-- Remove column from profiles
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS recovery_email;

COMMIT;
