-- Seed script to create a sample work + protocol with lyric and music authors
-- Run inside the Supabase SQL editor or via supabase db remote commit

DO $$
DECLARE
  target_workspace UUID;
  target_user UUID;
  new_work_id UUID;
  new_protocol_id UUID;
  work_title TEXT := 'Test Protocol Work ' || TO_CHAR(now(), 'YYYYMMDD_HH24MISS');
BEGIN
  -- Pick the most recently created workspace (adjust as needed)
  SELECT id INTO target_workspace
  FROM public.workspaces
  ORDER BY created_at DESC
  LIMIT 1;

  IF target_workspace IS NULL THEN
    RAISE EXCEPTION 'No workspace found. Create a workspace first.';
  END IF;

  -- Pick any user to act as creator (adjust if you need a specific user)
  SELECT id INTO target_user
  FROM auth.users
  ORDER BY created_at DESC
  LIMIT 1;

  IF target_user IS NULL THEN
    RAISE EXCEPTION 'No auth.users found. Create a user first.';
  END IF;

  -- Create a lightweight work to attach the protocol to
  INSERT INTO public.works (
    workspace_id,
    work_title,
    status,
    is_cover_version,
    created_by
  )
  VALUES (
    target_workspace,
    work_title,
    'draft',
    FALSE,
    target_user
  )
  RETURNING id INTO new_work_id;

  -- Create the protocol shell
  INSERT INTO public.protocols (
    workspace_id,
    work_id,
    work_title,
    status,
    is_cover_version,
    created_by
  )
  VALUES (
    target_workspace,
    new_work_id,
    work_title,
    'draft',
    FALSE,
    target_user
  )
  RETURNING id INTO new_protocol_id;

  -- Add sample lyric author
  INSERT INTO public.protocol_lyric_authors (
    protocol_id,
    name,
    surname,
    aka,
    participation_percentage,
    cmo_name,
    pro_name
  ) VALUES (
    new_protocol_id,
    'Alex',
    'Rivera',
    'Alex R.',
    50.00,
    'BMI',
    'ASCAP'
  );

  -- Add sample music author (melody + arrangement flags set true)
  INSERT INTO public.protocol_music_authors (
    protocol_id,
    name,
    surname,
    aka,
    participation_percentage,
    melody,
    harmony,
    arrangement,
    cmo_name,
    pro_name
  ) VALUES (
    new_protocol_id,
    'Jamie',
    'Stone',
    'J. Stone',
    50.00,
    1::int,
    0::int,
    1::int,
    'SESAC',
    NULL
  );

  RAISE NOTICE 'Created work % with protocol %', new_work_id, new_protocol_id;
END;
$$;
