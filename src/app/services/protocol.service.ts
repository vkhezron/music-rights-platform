import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { WorkspaceService } from './workspace.service';
import {
  Protocol,
  ProtocolFormData,
  LyricAuthor,
  MusicAuthor,
  NeighbouringRightsholder
} from '../models/protocol.model';

@Injectable({
  providedIn: 'root'
})
export class ProtocolService {
  private supabase = inject(SupabaseService);
  private workspaceService = inject(WorkspaceService);

  private protocolsSubject = new BehaviorSubject<Protocol[]>([]);
  public protocols$ = this.protocolsSubject.asObservable();

  private currentProtocolSubject = new BehaviorSubject<Protocol | null>(null);
  public currentProtocol$ = this.currentProtocolSubject.asObservable();

  /**
   * Create a new protocol (music work registration)
   */
  async createProtocol(workId: string, formData: ProtocolFormData): Promise<Protocol> {
    const currentWorkspace = this.workspaceService.currentWorkspace;
    if (!currentWorkspace) {
      throw new Error('No workspace selected');
    }

    const currentUser = this.supabase.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      // Create main protocol record
      const { data: protocol, error: protocolError } = await this.supabase.client
        .from('protocols')
        .insert({
          workspace_id: currentWorkspace.id,
          work_id: workId,
          work_title: formData.work_title,
          alternative_title: formData.alternative_title || null,
          release_title: formData.release_title || null,
          isrc: formData.isrc || null,
          iswc: formData.iswc || null,
          ean: formData.ean || null,
          primary_language: formData.primary_language || null,
          secondary_language: formData.secondary_language || null,
          is_cover_version: formData.is_cover_version,
          original_work_title: formData.original_work_title || null,
          status: 'draft',
          created_by: currentUser.id
        })
        .select()
        .single();

      if (protocolError) throw protocolError;
      if (!protocol) throw new Error('Failed to create protocol');

      // Add authors in parallel
      await Promise.all([
        this.addLyricAuthors(protocol.id, formData.lyric_authors),
        this.addMusicAuthors(protocol.id, formData.music_authors),
        this.addNeighbouringRightsholders(protocol.id, formData.neighbouring_rightsholders)
      ]);

      // Update local state
      const currentProtocols = this.protocolsSubject.value;
      this.protocolsSubject.next([protocol, ...currentProtocols]);
      this.currentProtocolSubject.next(protocol);

      return protocol;
    } catch (error) {
      console.error('Error creating protocol:', error);
      throw error;
    }
  }

  /**
   * Load all protocols for current workspace
   */
  async loadProtocols(workspaceId: string): Promise<void> {
    try {
      const { data, error } = await this.supabase.client
        .from('protocols')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      this.protocolsSubject.next(data || []);
    } catch (error) {
      console.error('Error loading protocols:', error);
      throw error;
    }
  }

  /**
   * Get protocol with all related authors
   */
  async getProtocolWithAuthors(protocolId: string): Promise<{
    protocol: Protocol;
    lyric_authors: LyricAuthor[];
    music_authors: MusicAuthor[];
    neighbouring_rightsholders: NeighbouringRightsholder[];
  }> {
    try {
      const [protocol, lyricAuthors, musicAuthors, neighbouringRightsholders] = await Promise.all([
        this.supabase.client
          .from('protocols')
          .select('*')
          .eq('id', protocolId)
          .single()
          .then(res => {
            if (res.error) throw res.error;
            return res.data;
          }),
        this.getLyricAuthors(protocolId),
        this.getMusicAuthors(protocolId),
        this.getNeighbouringRightsholders(protocolId)
      ]);

      return {
        protocol,
        lyric_authors: lyricAuthors,
        music_authors: musicAuthors,
        neighbouring_rightsholders: neighbouringRightsholders
      };
    } catch (error) {
      console.error('Error fetching protocol with authors:', error);
      throw error;
    }
  }

  /**
   * Add lyric authors to a protocol
   */
  private async addLyricAuthors(protocolId: string, authors: LyricAuthor[]): Promise<void> {
    if (authors.length === 0) return;

    const insertData = authors.map(author => ({
      protocol_id: protocolId,
      name: author.name,
      middle_name: author.middle_name || null,
      surname: author.surname,
      aka: author.aka || null,
      cmo_name: author.cmo_name || null,
      pro_name: author.pro_name || null,
      participation_percentage: author.participation_percentage
    }));

    const { error } = await this.supabase.client
      .from('protocol_lyric_authors')
      .insert(insertData);

    if (error) throw error;
  }

  /**
   * Get lyric authors for a protocol
   */
  async getLyricAuthors(protocolId: string): Promise<LyricAuthor[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('protocol_lyric_authors')
        .select('*')
        .eq('protocol_id', protocolId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error loading lyric authors:', error);
      return [];
    }
  }

  /**
   * Add music authors to a protocol
   */
  private async addMusicAuthors(protocolId: string, authors: MusicAuthor[]): Promise<void> {
    if (authors.length === 0) return;

    const insertData = authors.map(author => ({
      protocol_id: protocolId,
      name: author.name,
      middle_name: author.middle_name || null,
      surname: author.surname,
      aka: author.aka || null,
      cmo_name: author.cmo_name || null,
      pro_name: author.pro_name || null,
      participation_percentage: author.participation_percentage,
      melody: author.melody,
      harmony: author.harmony,
      arrangement: author.arrangement
    }));

    const { error } = await this.supabase.client
      .from('protocol_music_authors')
      .insert(insertData);

    if (error) throw error;
  }

  /**
   * Get music authors for a protocol
   */
  async getMusicAuthors(protocolId: string): Promise<MusicAuthor[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('protocol_music_authors')
        .select('*')
        .eq('protocol_id', protocolId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error loading music authors:', error);
      return [];
    }
  }

  /**
   * Add neighbouring rightsholders to a protocol
   */
  private async addNeighbouringRightsholders(
    protocolId: string,
    rightsholders: NeighbouringRightsholder[]
  ): Promise<void> {
    if (rightsholders.length === 0) return;

    const insertData = rightsholders.map(rh => ({
      protocol_id: protocolId,
      name: rh.name,
      middle_name: rh.middle_name || null,
      surname: rh.surname,
      aka: rh.aka || null,
      cmo_name: rh.cmo_name || null,
      pro_name: rh.pro_name || null,
      participation_percentage: rh.participation_percentage,
      roles: rh.roles // Store as array (will use PostgreSQL array type)
    }));

    const { error } = await this.supabase.client
      .from('protocol_neighbouring_rightsholders')
      .insert(insertData);

    if (error) throw error;
  }

  /**
   * Get neighbouring rightsholders for a protocol
   */
  async getNeighbouringRightsholders(protocolId: string): Promise<NeighbouringRightsholder[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('protocol_neighbouring_rightsholders')
        .select('*')
        .eq('protocol_id', protocolId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error loading neighbouring rightsholders:', error);
      return [];
    }
  }

  /**
   * Submit protocol (change status from draft to submitted)
   */
  async submitProtocol(protocolId: string): Promise<Protocol> {
    try {
      const { data, error } = await this.supabase.client
        .from('protocols')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .eq('id', protocolId)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      const protocols = this.protocolsSubject.value.map(p =>
        p.id === protocolId ? data : p
      );
      this.protocolsSubject.next(protocols);

      return data;
    } catch (error) {
      console.error('Error submitting protocol:', error);
      throw error;
    }
  }

  /**
   * Delete a protocol and all related data
   */
  async deleteProtocol(protocolId: string): Promise<void> {
    try {
      // Delete cascade will handle related records if configured in DB
      const { error } = await this.supabase.client
        .from('protocols')
        .delete()
        .eq('id', protocolId);

      if (error) throw error;

      // Update local state
      const protocols = this.protocolsSubject.value.filter(p => p.id !== protocolId);
      this.protocolsSubject.next(protocols);
    } catch (error) {
      console.error('Error deleting protocol:', error);
      throw error;
    }
  }
}
