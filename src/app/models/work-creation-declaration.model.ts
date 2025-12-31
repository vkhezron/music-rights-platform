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

export interface WorkCreationDeclarationDraft {
  section: WorkCreationSection;
  creation_type: WorkCreationType;
  ai_tool?: string | null;
  notes?: string | null;
}

export type WorkCreationDeclarationMap = Record<WorkCreationSection, WorkCreationDeclarationDraft>;

export const createDefaultWorkCreationDeclarationMap = (): WorkCreationDeclarationMap => ({
  ip: { section: 'ip', creation_type: 'human', ai_tool: null, notes: null },
  mixing: { section: 'mixing', creation_type: 'human', ai_tool: null, notes: null },
  mastering: { section: 'mastering', creation_type: 'human', ai_tool: null, notes: null },
  session_musicians: {
    section: 'session_musicians',
    creation_type: 'human',
    ai_tool: null,
    notes: null,
  },
  visuals: { section: 'visuals', creation_type: 'human', ai_tool: null, notes: null },
});
