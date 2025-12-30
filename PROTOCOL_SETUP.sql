-- ============================================
-- MUSIC WORK PROTOCOL SYSTEM - SUPABASE SETUP
-- ============================================
-- Copy and paste this entire file into Supabase SQL Editor
-- and run it to create all necessary tables for the protocol system

-- Drop existing tables (if upgrading)
-- DROP TABLE IF EXISTS protocol_neighbouring_rightsholders CASCADE;
-- DROP TABLE IF EXISTS protocol_music_authors CASCADE;
-- DROP TABLE IF EXISTS protocol_lyric_authors CASCADE;
-- DROP TABLE IF EXISTS protocols CASCADE;

-- ============ PROTOCOLS TABLE ============
CREATE TABLE IF NOT EXISTS protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  
  -- Work metadata
  work_title TEXT NOT NULL,
  alternative_title TEXT,
  release_title TEXT,
  isrc TEXT,
  iswc TEXT,
  ean TEXT,
  primary_language TEXT,
  secondary_language TEXT,
  is_cover_version BOOLEAN DEFAULT FALSE,
  original_work_title TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'draft' 
    CHECK (status IN ('draft', 'submitted', 'approved', 'archived')),
  
  -- Audit fields
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraint to prevent duplicate protocols per work per workspace
  UNIQUE(workspace_id, work_id)
);

-- ============ LYRIC AUTHORS TABLE ============
CREATE TABLE IF NOT EXISTS protocol_lyric_authors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id UUID NOT NULL REFERENCES protocols(id) ON DELETE CASCADE,
  
  -- Name fields
  name TEXT NOT NULL,
  middle_name TEXT,
  surname TEXT NOT NULL CHECK (surname != ''),
  aka TEXT,
  
  -- Organization references
  cmo_name TEXT,
  pro_name TEXT,
  
  -- Rights allocation
  participation_percentage NUMERIC(5, 2) NOT NULL CHECK (participation_percentage >= 0),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============ MUSIC AUTHORS TABLE ============
CREATE TABLE IF NOT EXISTS protocol_music_authors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id UUID NOT NULL REFERENCES protocols(id) ON DELETE CASCADE,
  
  -- Name fields
  name TEXT NOT NULL,
  middle_name TEXT,
  surname TEXT NOT NULL CHECK (surname != ''),
  aka TEXT,
  
  -- Organization references
  cmo_name TEXT,
  pro_name TEXT,
  
  -- Rights allocation
  participation_percentage NUMERIC(5, 2) NOT NULL CHECK (participation_percentage >= 0),
  
  -- Contribution types
  melody BOOLEAN DEFAULT FALSE,
  harmony BOOLEAN DEFAULT FALSE,
  arrangement BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============ NEIGHBOURING RIGHTS HOLDERS TABLE ============
CREATE TABLE IF NOT EXISTS protocol_neighbouring_rightsholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id UUID NOT NULL REFERENCES protocols(id) ON DELETE CASCADE,
  
  -- Name fields
  name TEXT NOT NULL,
  middle_name TEXT,
  surname TEXT NOT NULL CHECK (surname != ''),
  aka TEXT,
  
  -- Organization references
  cmo_name TEXT,
  pro_name TEXT,
  
  -- Rights allocation
  participation_percentage NUMERIC(5, 2) NOT NULL CHECK (participation_percentage >= 0),
  
  -- Roles (stored as PostgreSQL array of text)
  roles TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[] CHECK (array_length(roles, 1) > 0),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============ INDEXES FOR PERFORMANCE ============
CREATE INDEX IF NOT EXISTS idx_protocols_workspace_id 
  ON protocols(workspace_id);

CREATE INDEX IF NOT EXISTS idx_protocols_work_id 
  ON protocols(work_id);

CREATE INDEX IF NOT EXISTS idx_protocols_status 
  ON protocols(status);

CREATE INDEX IF NOT EXISTS idx_protocols_created_by 
  ON protocols(created_by);

CREATE INDEX IF NOT EXISTS idx_lyric_authors_protocol_id 
  ON protocol_lyric_authors(protocol_id);

CREATE INDEX IF NOT EXISTS idx_music_authors_protocol_id 
  ON protocol_music_authors(protocol_id);

CREATE INDEX IF NOT EXISTS idx_neighbouring_protocol_id 
  ON protocol_neighbouring_rightsholders(protocol_id);

-- ============ ROW LEVEL SECURITY (OPTIONAL) ============
-- Uncomment to enable RLS policies
-- 
-- ALTER TABLE protocols ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE protocol_lyric_authors ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE protocol_music_authors ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE protocol_neighbouring_rightsholders ENABLE ROW LEVEL SECURITY;
--
-- -- Allow users to access protocols only for their workspaces
-- CREATE POLICY "Users can access workspace protocols"
--   ON protocols
--   FOR SELECT
--   USING (
--     workspace_id IN (
--       SELECT workspace_id FROM workspace_members 
--       WHERE user_id = auth.uid()
--     )
--   );
--
-- CREATE POLICY "Users can create protocols in their workspace"
--   ON protocols
--   FOR INSERT
--   WITH CHECK (
--     workspace_id IN (
--       SELECT workspace_id FROM workspace_members 
--       WHERE user_id = auth.uid()
--     )
--   );
--
-- -- Similar policies for author tables inherit through foreign keys
-- CREATE POLICY "Users can view protocol authors through protocol access"
--   ON protocol_lyric_authors
--   FOR SELECT
--   USING (
--     protocol_id IN (
--       SELECT id FROM protocols 
--       WHERE workspace_id IN (
--         SELECT workspace_id FROM workspace_members 
--         WHERE user_id = auth.uid()
--       )
--     )
--   );

-- ============ VERIFICATION ============
-- Run these queries to verify table creation:
-- SELECT * FROM protocols LIMIT 0;
-- SELECT * FROM protocol_lyric_authors LIMIT 0;
-- SELECT * FROM protocol_music_authors LIMIT 0;
-- SELECT * FROM protocol_neighbouring_rightsholders LIMIT 0;

-- ============ SAMPLE DATA (FOR TESTING) ============
-- Uncomment below to insert test data
--
-- INSERT INTO protocols (
--   workspace_id, work_id, work_title, 
--   isrc, iswc, status, created_by
-- ) VALUES (
--   '00000000-0000-0000-0000-000000000000'::uuid,
--   '00000000-0000-0000-0000-000000000001'::uuid,
--   'Test Song',
--   'USRC17607839',
--   'T-123.456.789-0',
--   'draft',
--   auth.uid()
-- );

-- ============ NOTES ============
-- 1. Replace workspace references with actual UUIDs from your system
-- 2. Ensure 'workspaces' and 'works' tables exist first
-- 3. RLS policies are optional but recommended for security
-- 4. All timestamps are stored in UTC (TIMESTAMP WITH TIME ZONE)
-- 5. Arrays in PostgreSQL are stored as TEXT[] - well supported by Supabase
-- 6. Constraints ensure data integrity at database level
-- 7. Cascade deletes ensure orphaned records are cleaned up

-- ============ TROUBLESHOOTING ============
-- If you see "relation does not exist" error:
--   → Check that workspaces and works tables exist
--   → Verify schema names match your setup
--   → Create missing referenced tables first
--
-- If you see "permission denied" error:
--   → Check user role has CREATE TABLE permissions
--   → Ensure you're in the correct schema (usually 'public')
--
-- To drop all protocol tables:
--   DROP TABLE IF EXISTS protocol_neighbouring_rightsholders CASCADE;
--   DROP TABLE IF EXISTS protocol_music_authors CASCADE;
--   DROP TABLE IF EXISTS protocol_lyric_authors CASCADE;
--   DROP TABLE IF EXISTS protocols CASCADE;
