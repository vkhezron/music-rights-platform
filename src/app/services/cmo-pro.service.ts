import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type { CmoProOrganization, CmoProOrganizationType } from '../models/cmo-pro.model';

@Injectable({ providedIn: 'root' })
export class CmoProService {
  private readonly supabase = inject(SupabaseService);

  async getAll(): Promise<CmoProOrganization[]> {
    const { data, error } = await this.supabase.client
      .from('cmo_pro_organizations')
      .select('*')
      .eq('is_active', true)
      .order('acronym', { ascending: true });

    if (error) throw error;
    return (data ?? []) as CmoProOrganization[];
  }

  async getByCountry(country: string): Promise<CmoProOrganization[]> {
    const { data, error } = await this.supabase.client
      .rpc('get_cmo_pro_by_country', { p_country: country } as Record<string, unknown>);

    if (error) throw error;
    return (data ?? []) as CmoProOrganization[];
  }

  async getByType(type: CmoProOrganizationType): Promise<CmoProOrganization[]> {
    const { data, error } = await this.supabase.client
      .rpc('get_cmo_pro_by_type', { p_type: type } as Record<string, unknown>);

    if (error) throw error;
    return (data ?? []) as CmoProOrganization[];
  }

  async getByRegion(region: string): Promise<CmoProOrganization[]> {
    const { data, error } = await this.supabase.client
      .rpc('get_cmo_pro_by_region', { p_region: region } as Record<string, unknown>);

    if (error) throw error;
    return (data ?? []) as CmoProOrganization[];
  }

  async search(term: string): Promise<CmoProOrganization[]> {
    const likeValue = `%${term}%`;
    const { data, error } = await this.supabase.client
      .from('cmo_pro_organizations')
      .select('*')
      .eq('is_active', true)
      .or(`acronym.ilike.${likeValue},name.ilike.${likeValue}`)
      .order('acronym', { ascending: true });

    if (error) throw error;
    return (data ?? []) as CmoProOrganization[];
  }
}
