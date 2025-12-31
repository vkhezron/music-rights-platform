import type { WorkSplit } from '../../models/work.model';

export type EntryMethod = 'add_me' | 'scan_qr' | 'add_manually';
export type AICreationType = 'human' | 'ai_assisted' | 'ai_generated';
export type IPSplitType = 'lyrics' | 'music';

export interface ContributionFlags {
  melody?: boolean;
  harmony?: boolean;
  arrangement?: boolean;
}

export interface SplitEntry {
  id?: string;
  tempId?: string;
  rightsHolderId?: string;
  entryMethod: EntryMethod;
  splitType: IPSplitType | 'neighbouring';
  ownershipPercentage: number;
  nickname?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  cmoPro?: string;
  ipiNumber?: string;
  contributionTypes?: ContributionFlags;
  roles?: string[];
  aiDisclosure: {
    creationType: AICreationType;
    aiTool?: string;
    notes?: string;
  };
  isReadonly: boolean;
  isEditing?: boolean;
}

export interface IPRightsSummary {
  lyrics: {
    entries: SplitEntry[];
    total: number;
    weight: number;
  };
  music: {
    entries: SplitEntry[];
    total: number;
    weight: number;
  };
  total: number;
}

export interface NeighbouringRightsSummary {
  entries: SplitEntry[];
  total: number;
}

export const mapSplitToEntry = (split: WorkSplit): SplitEntry => ({
  id: split.id,
  rightsHolderId: split.rights_holder_id,
  entryMethod: 'add_manually',
  splitType: split.split_type === 'lyrics' || split.split_type === 'music' ? split.split_type : 'neighbouring',
  ownershipPercentage: split.ownership_percentage ?? 0,
  contributionTypes: split.contribution_types ?? undefined,
  roles: split.roles ?? undefined,
  aiDisclosure: {
    creationType: 'human',
  },
  isReadonly: false,
});
