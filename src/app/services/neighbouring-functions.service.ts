import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type {
  NeighbouringFunction,
  NeighbouringFunctionGroup,
  NeighbouringFunctionType
} from '../models/neighbouring-function.model';

@Injectable({ providedIn: 'root' })
export class NeighbouringFunctionsService {
  private readonly supabase = inject(SupabaseService);

  async getAll(): Promise<NeighbouringFunction[]> {
    const { data, error } = await this.supabase.client
      .from('neighbouring_functions')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return (data ?? []) as NeighbouringFunction[];
  }

  async getByType(type: NeighbouringFunctionType): Promise<NeighbouringFunction[]> {
    const { data, error } = await this.supabase.client
      .from('neighbouring_functions')
      .select('*')
      .eq('is_active', true)
      .eq('type', type)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return (data ?? []) as NeighbouringFunction[];
  }

  async getGrouped(): Promise<NeighbouringFunctionGroup[]> {
    const functions = await this.getAll();
    const groupedMap = new Map<NeighbouringFunctionType, NeighbouringFunction[]>();

    for (const fn of functions) {
      const bucket = groupedMap.get(fn.type) ?? [];
      bucket.push(fn);
      groupedMap.set(fn.type, bucket);
    }

    return Array.from(groupedMap.entries()).map(([type, items]) => ({
      type,
      functions: items
    }));
  }
}