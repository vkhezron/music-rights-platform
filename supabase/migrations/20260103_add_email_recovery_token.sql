-- Password recovery email tokens

BEGIN;

ALTER TABLE public.user_recovery_credentials
  ADD COLUMN IF NOT EXISTS email_recovery_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS email_recovery_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_recovery_token_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_recovery_attempts INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_recovery_credentials_email_token_expires
  ON public.user_recovery_credentials(email_recovery_token_expires_at);

COMMIT;
