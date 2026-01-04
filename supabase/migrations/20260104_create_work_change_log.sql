-- Create a table to log all changes made to works
CREATE TABLE IF NOT EXISTS public.work_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id uuid NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  changed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  change_type text NOT NULL, -- e.g. 'update', 'create', 'delete', 'split_edit', etc.
  field_changed text,        -- e.g. 'work_title', 'splits', etc.
  old_value text,
  new_value text,
  notes text
);

CREATE INDEX IF NOT EXISTS idx_work_change_log_work_id ON public.work_change_log(work_id);
CREATE INDEX IF NOT EXISTS idx_work_change_log_changed_by ON public.work_change_log(changed_by);
