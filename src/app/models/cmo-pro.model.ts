export type CmoProOrganizationType = 'CMO' | 'PRO' | 'BOTH';

export interface CmoProOrganization {
  id: string;
  name: string;
  acronym: string;
  organization_type: CmoProOrganizationType;
  country: string | null;
  website: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}
