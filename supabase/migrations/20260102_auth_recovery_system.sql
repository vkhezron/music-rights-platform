-- User Recovery & Security Management
-- Migration: 20260102_auth_recovery_system

BEGIN;

-- Enhanced profiles table for username-based auth
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  -- removed: recovery_email TEXT,
  ADD COLUMN IF NOT EXISTS has_completed_recovery_setup BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_password_change_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until timestamptz;

COMMENT ON COLUMN public.profiles.username IS 'Unique username for authentication (no email required).';
-- removed: COMMENT ON COLUMN public.profiles.recovery_email IS 'Optional email for account recovery (user-provided).';
COMMENT ON COLUMN public.profiles.has_completed_recovery_setup IS 'Flag indicating user has set up security questions.';
COMMENT ON COLUMN public.profiles.failed_login_attempts IS 'Counter for failed login attempts (for rate limiting).';
COMMENT ON COLUMN public.profiles.locked_until IS 'Timestamp until account is locked due to failed attempts.';

-- Create unique index on username
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username) 
WHERE username IS NOT NULL;

-- User recovery credentials table
CREATE TABLE IF NOT EXISTS public.user_recovery_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Security questions (encrypted storage recommended)
  security_question_1 TEXT NOT NULL,
  security_answer_1_hash TEXT NOT NULL,
  security_question_2 TEXT NOT NULL,
  security_answer_2_hash TEXT NOT NULL,
  
  -- Recovery codes (hashed, shown only once to user)
  recovery_codes_hash TEXT[] NOT NULL,
  used_recovery_codes TEXT[] DEFAULT ARRAY[]::text[],
  
  -- Recovery email verification
  -- removed: recovery_email_verified BOOLEAN DEFAULT false,
  -- removed: recovery_email_verified_at timestamptz,
  
  -- Audit
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  recovery_setup_completed_at timestamptz
);

COMMENT ON TABLE public.user_recovery_credentials IS 'Stores security questions and recovery codes for password recovery without email dependency.';
COMMENT ON COLUMN public.user_recovery_credentials.security_answer_1_hash IS 'Hashed security answer (case-insensitive, trimmed).';
COMMENT ON COLUMN public.user_recovery_credentials.recovery_codes_hash IS 'Array of hashed recovery codes (user receives these once during setup).';
COMMENT ON COLUMN public.user_recovery_credentials.used_recovery_codes IS 'Array of hashed codes that have been used (prevents reuse).';

CREATE INDEX IF NOT EXISTS idx_recovery_credentials_user ON public.user_recovery_credentials(user_id);
-- removed: CREATE INDEX IF NOT EXISTS idx_recovery_credentials_verified ON public.user_recovery_credentials(recovery_email_verified);

-- Authentication attempts log (for rate limiting & security monitoring)
CREATE TABLE IF NOT EXISTS public.auth_attempt_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  attempt_type TEXT NOT NULL CHECK (attempt_type IN ('login', 'recovery', 'password_reset')),
  success BOOLEAN NOT NULL,
  failure_reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.auth_attempt_log IS 'Audit log for authentication attempts (used for security monitoring and rate limiting).';
COMMENT ON COLUMN public.auth_attempt_log.attempt_type IS 'Type of authentication attempt: login, recovery, or password_reset.';
COMMENT ON COLUMN public.auth_attempt_log.failure_reason IS 'Reason for failure if success = false.';

CREATE INDEX IF NOT EXISTS idx_auth_attempt_user ON public.auth_attempt_log(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_attempt_username ON public.auth_attempt_log(username);
CREATE INDEX IF NOT EXISTS idx_auth_attempt_created ON public.auth_attempt_log(created_at);
CREATE INDEX IF NOT EXISTS idx_auth_attempt_type ON public.auth_attempt_log(attempt_type);

-- Predefined security questions reference table
CREATE TABLE IF NOT EXISTS public.security_questions (
  id SERIAL PRIMARY KEY,
  question_key TEXT NOT NULL UNIQUE,
  question_text TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('personal', 'knowledge', 'experience')),
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.security_questions IS 'Library of predefined security questions for user selection during recovery setup.';
COMMENT ON COLUMN public.security_questions.question_key IS 'i18n translation key for the question.';
COMMENT ON COLUMN public.security_questions.category IS 'Category of question (personal, knowledge, experience).';

CREATE INDEX IF NOT EXISTS idx_security_questions_active ON public.security_questions(is_active);
CREATE INDEX IF NOT EXISTS idx_security_questions_category ON public.security_questions(category);

-- Insert default security questions
INSERT INTO public.security_questions (question_key, question_text, category, display_order) VALUES
  ('SECURITY.Q_FIRST_INSTRUMENT', 'What was the first instrument you learned to play?', 'personal', 1),
  ('SECURITY.Q_FIRST_SONG', 'What was the first song you ever performed?', 'personal', 2),
  ('SECURITY.Q_FAVORITE_COMPOSER', 'Who is your favorite composer or musician?', 'personal', 3),
  ('SECURITY.Q_MUSIC_STYLE', 'What music style did you grow up listening to?', 'personal', 4),
  ('SECURITY.Q_FIRST_RECORDING', 'Where was your first professional recording made?', 'experience', 5),
  ('SECURITY.Q_BIGGEST_ACHIEVEMENT', 'What was your biggest musical achievement?', 'experience', 6),
  ('SECURITY.Q_MUSICAL_INFLUENCE', 'Who was your biggest musical influence?', 'personal', 7),
  ('SECURITY.Q_DREAM_COLLABORATION', 'Who would you most like to collaborate with?', 'knowledge', 8),
  ('SECURITY.Q_SIGNATURE_STYLE', 'What instrument or element is your signature style?', 'personal', 9),
  ('SECURITY.Q_FIRST_VENUE', 'What was the first venue where you performed live?', 'experience', 10)
ON CONFLICT (question_key) DO NOTHING;

-- Function to validate username format
CREATE OR REPLACE FUNCTION public.validate_username(p_username TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Username must be 3-20 chars, alphanumeric + underscore
  RETURN p_username ~ '^[a-zA-Z0-9_]{3,20}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to clean up old auth attempt logs (runs daily)
CREATE OR REPLACE FUNCTION public.cleanup_old_auth_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.auth_attempt_log
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Trigger to update recovery credentials timestamp
CREATE OR REPLACE FUNCTION public.update_recovery_credentials_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_recovery_credentials_timestamp ON public.user_recovery_credentials;
CREATE TRIGGER update_recovery_credentials_timestamp
BEFORE UPDATE ON public.user_recovery_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_recovery_credentials_timestamp();

COMMIT;
