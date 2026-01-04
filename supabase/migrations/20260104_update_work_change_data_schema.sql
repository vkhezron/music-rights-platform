-- Rename legacy work_change_log table (if present) and align schema for comprehensive auditing
DO $$
BEGIN
  IF to_regclass('public.work_change_log') IS NOT NULL AND to_regclass('public.work_change_data') IS NULL THEN
    ALTER TABLE public.work_change_log RENAME TO work_change_data;
  END IF;
END $$;

-- Ensure expected indexes reference the new table name
DROP INDEX IF EXISTS idx_work_change_log_work_id;
DROP INDEX IF EXISTS idx_work_change_log_changed_by;

-- Remove legacy foreign key constraint on split_id if it exists
ALTER TABLE public.work_change_data
  DROP CONSTRAINT IF EXISTS work_change_data_split_id_fkey;

-- Required structural columns for unified work/split auditing
ALTER TABLE public.work_change_data
  ADD COLUMN IF NOT EXISTS split_id uuid,
  ADD COLUMN IF NOT EXISTS entity_type text;

-- Backfill defaults for newly introduced columns
UPDATE public.work_change_data
SET entity_type = COALESCE(entity_type, 'work')
WHERE entity_type IS NULL;

ALTER TABLE public.work_change_data
  ALTER COLUMN entity_type SET NOT NULL,
  ALTER COLUMN entity_type SET DEFAULT 'work';

-- Optional summary column for future use (kept nullable)
ALTER TABLE public.work_change_data
  ADD COLUMN IF NOT EXISTS change_summary text;

-- Maintain referential metadata
ALTER TABLE public.work_change_data
  ALTER COLUMN changed_at SET DEFAULT now();

-- Enforce valid entity types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'work_change_data_entity_type_check'
      AND table_name = 'work_change_data'
  ) THEN
    ALTER TABLE public.work_change_data
      ADD CONSTRAINT work_change_data_entity_type_check
        CHECK (entity_type IN ('work', 'split'));
  END IF;
END $$;

-- Recreate helpful indexes under the new naming scheme
CREATE INDEX IF NOT EXISTS idx_work_change_data_work_id ON public.work_change_data(work_id);
CREATE INDEX IF NOT EXISTS idx_work_change_data_split_id ON public.work_change_data(split_id);
CREATE INDEX IF NOT EXISTS idx_work_change_data_changed_by ON public.work_change_data(changed_by);
CREATE INDEX IF NOT EXISTS idx_work_change_data_changed_at ON public.work_change_data(changed_at);
