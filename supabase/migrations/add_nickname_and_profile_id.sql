-- Add nickname and profile_id columns to rights_holders table
-- This helps avoid name_required constraint errors by providing alternative identification methods

-- Add nickname column (optional, can help identify rights holders)
ALTER TABLE rights_holders 
ADD COLUMN IF NOT EXISTS nickname VARCHAR(255);

-- Add profile_id column (optional, links to user profiles for system-managed holders)
ALTER TABLE rights_holders 
ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index on profile_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_rights_holders_profile_id 
ON rights_holders(profile_id);

-- Optional: Create a unique index on profile_id per workspace (one profile per rights holder per workspace)
CREATE UNIQUE INDEX IF NOT EXISTS idx_rights_holders_profile_workspace 
ON rights_holders(workspace_id, profile_id) 
WHERE profile_id IS NOT NULL;

-- Add comment explaining these columns
COMMENT ON COLUMN rights_holders.nickname IS 'Optional nickname for the rights holder, useful for quick identification';
COMMENT ON COLUMN rights_holders.profile_id IS 'Link to the auth user profile if this is a registered user in the system';
