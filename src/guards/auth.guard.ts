import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { CanActivateFn } from '@angular/router';
import { SupabaseService } from '../app/services/supabase.service';

export const AuthGuard: CanActivateFn = (route, state) => {
  void route;
  void state;
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  const user = supabase.currentUser;

  if (!user) {
    // Not logged in, redirect to login
    router.navigate(['/auth/login']);
    return false;
  }

  return true;
};