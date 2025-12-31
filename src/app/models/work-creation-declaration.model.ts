export type WorkCreationSection = 'ip' | 'mixing' | 'mastering' | 'session_musicians' | 'visuals';

export type WorkCreationType = 'human' | 'ai_assisted' | 'ai_generated';

export interface WorkCreationDeclaration {
  id: string;
  work_id: string;
  section: WorkCreationSection;
  creation_type: WorkCreationType;
  ai_tool?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}
