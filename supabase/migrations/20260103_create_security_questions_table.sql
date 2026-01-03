-- Create security_questions table for auth recovery system
-- This table stores predefined security questions used during password recovery

CREATE TABLE IF NOT EXISTS public.security_questions (
  id BIGSERIAL PRIMARY KEY,
  question_key TEXT NOT NULL UNIQUE,
  question_text TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'personal',
  display_order INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE public.security_questions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read questions
CREATE POLICY "Allow authenticated users to read security questions" ON public.security_questions
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Delete existing music-themed questions
DELETE FROM public.security_questions;

-- Insert universal security questions
INSERT INTO public.security_questions (question_key, question_text, category, display_order) VALUES
  -- Personal Category
  ('SECURITY.Q_CHILDHOOD_FRIEND', 'What was the name of your childhood best friend?', 'personal', 1),
  ('SECURITY.Q_FIRST_PET', 'What was the name of your first pet?', 'personal', 2),
  ('SECURITY.Q_BIRTH_CITY', 'In what city were you born?', 'personal', 3),
  ('SECURITY.Q_MOTHERS_MAIDEN', 'What is your mother''s maiden name?', 'personal', 4),
  ('SECURITY.Q_FAVORITE_TEACHER', 'What was the name of your favorite teacher?', 'personal', 5),
  
  -- Knowledge Category
  ('SECURITY.Q_DREAM_JOB', 'What was your dream job as a child?', 'knowledge', 6),
  ('SECURITY.Q_FAVORITE_BOOK', 'What is your favorite book of all time?', 'knowledge', 7),
  ('SECURITY.Q_FIRST_CAR', 'What was the make and model of your first car?', 'knowledge', 8),
  ('SECURITY.Q_FAVORITE_FOOD', 'What was your favorite food as a child?', 'knowledge', 9),
  
  -- Experience Category
  ('SECURITY.Q_FIRST_SCHOOL', 'What was the name of your elementary school?', 'experience', 10),
  ('SECURITY.Q_FIRST_JOB', 'What was your first job?', 'experience', 11),
  ('SECURITY.Q_FIRST_VACATION', 'Where did you go on your first vacation?', 'experience', 12),
  ('SECURITY.Q_STREET_GREW_UP', 'What street did you grow up on?', 'experience', 13),
  ('SECURITY.Q_MEMORABLE_YEAR', 'What year was most memorable to you and why?', 'experience', 14),
  
  -- Additional secure questions
  ('SECURITY.Q_OLDEST_SIBLING', 'What is the middle name of your oldest sibling?', 'personal', 15),
  ('SECURITY.Q_WEDDING_LOCATION', 'In what city did you meet your spouse/partner?', 'experience', 16),
  ('SECURITY.Q_CHILDHOOD_NICKNAME', 'What was your childhood nickname?', 'personal', 17),
  ('SECURITY.Q_GRANDFATHER_OCCUPATION', 'What was your paternal grandfather''s occupation?', 'knowledge', 18),
  ('SECURITY.Q_FIRST_CONCERT', 'What was the first concert you attended?', 'experience', 19),
  ('SECURITY.Q_CHILDHOOD_HERO', 'Who was your childhood hero?', 'knowledge', 20)
ON CONFLICT (question_key) DO UPDATE SET
  question_text = EXCLUDED.question_text,
  category = EXCLUDED.category,
  display_order = EXCLUDED.display_order,
  is_active = true;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_security_questions_active 
  ON public.security_questions(is_active) 
  WHERE is_active = true;

-- Create index for question_key lookups
CREATE INDEX IF NOT EXISTS idx_security_questions_key
  ON public.security_questions(question_key);
