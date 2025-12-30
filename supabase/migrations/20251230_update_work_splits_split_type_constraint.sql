-- Align work_splits.split_type check constraint with granular UI types
-- Allows tracking lyrics, music, publishing, performance, master recording, neighboring rights
-- Run via Supabase SQL editor or supabase db push

BEGIN;

ALTER TABLE public.work_splits
  DROP CONSTRAINT IF EXISTS work_splits_split_type_check;

UPDATE public.work_splits
SET split_type = CASE split_type
  WHEN 'ip' THEN 'music'
  WHEN 'neighboring' THEN 'neighboring_rights'
  ELSE split_type
END;

ALTER TABLE public.work_splits
  ADD CONSTRAINT work_splits_split_type_check
  CHECK (split_type IN (
    'lyrics',
    'music',
    'publishing',
    'performance',
    'master_recording',
    'neighboring_rights'
  ));

COMMIT;
