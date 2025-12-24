import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * 🔐 SUPABASE SERVICE
 * 
 * This service handles all communication with Supabase.
 * Think of it as the bridge between your Angular app and the database.
 */

@Injectable({
  providedIn: 'root'  // Available everywhere in the app
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private currentUser$ = new BehaviorSubject<User | null>(null);

  constructor() {
    // Initialize Supabase client with your credentials
    this.supabase = createClient(
      environment.supabase.url,
      environment.supabase.anonKey
    );

    // Check if user is already logged in (on app start)
    this.supabase.auth.getSession().then(({ data: { session } }) => {
      this.currentUser$.next(session?.user ?? null);
    });

    // Listen for auth changes (login, logout, etc.)
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.currentUser$.next(session?.user ?? null);
    });
  }

  /**
   * Get the Supabase client (for direct database access)
   */
  get client(): SupabaseClient {
    return this.supabase;
  }

  /**
   * Get current user as Observable (reactive)
   */
  get user$(): Observable<User | null> {
    return this.currentUser$.asObservable();
  }

  /**
   * Get current user (one-time snapshot)
   */
  get currentUser(): User | null {
    return this.currentUser$.value;
  }

  /**
   * 📝 SIGN UP - Create new user account
   */
  async signUp(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password
    });

    if (error) throw error;
    return data;
  }

  /**
   * 🔑 SIGN IN - Login existing user
   */
  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  }

  /**
   * 🚪 SIGN OUT - Logout current user
   */
  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }

  /**
   * 🔄 RESET PASSWORD - Send reset email
   */
  async resetPassword(email: string) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  }
}