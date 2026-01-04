-- Create a table to log all changes made to works and related splits
CREATE TABLE IF NOT EXISTS public.work_change_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id uuid NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  split_id uuid,
  entity_type text NOT NULL DEFAULT 'work',
  change_type text NOT NULL,
  field_changed text,
  old_value text,
  new_value text,
  notes text,
  changed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.work_change_data
  DROP CONSTRAINT IF EXISTS work_change_data_entity_type_check;

ALTER TABLE public.work_change_data
  ADD CONSTRAINT work_change_data_entity_type_check
    CHECK (entity_type IN ('work', 'split'));

CREATE INDEX IF NOT EXISTS idx_work_change_data_work_id ON public.work_change_data(work_id);
CREATE INDEX IF NOT EXISTS idx_work_change_data_split_id ON public.work_change_data(split_id);
CREATE INDEX IF NOT EXISTS idx_work_change_data_changed_by ON public.work_change_data(changed_by);
CREATE INDEX IF NOT EXISTS idx_work_change_data_changed_at ON public.work_change_data(changed_at);
