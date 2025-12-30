-- Add ai_disclosure column to rights_holders table
-- This column stores AI creation disclosure information for rights holder contributions

ALTER TABLE public.rights_holders
ADD COLUMN ai_disclosure JSONB DEFAULT NULL;

-- Create index for better query performance
CREATE INDEX idx_rights_holders_ai_disclosure ON public.rights_holders USING gin(ai_disclosure);

-- Add comment for documentation
COMMENT ON COLUMN public.rights_holders.ai_disclosure IS 'Stores AI creation disclosure data including creation_type (human, ai_assisted, ai_generated), ai_tool, and notes';
