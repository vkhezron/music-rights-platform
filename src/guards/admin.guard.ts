import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { FeedbackService } from '../app/services/feedback.service';
import { ProfileService } from '../app/services/profile.service';
import { SupabaseService } from '../app/services/supabase.service';

export const AdminGuard: CanActivateFn = async (_route, _state) => {
  const supabase = inject(SupabaseService);
  const profileService = inject(ProfileService);
  const feedback = inject(FeedbackService);
  const router = inject(Router);

  if (!supabase.currentUser) {
    router.navigate(['/auth/login']);
    return false;
  }

  const profile = await profileService.getCurrentProfile({ refresh: true });

  if (!profile?.is_admin) {
    feedback.error('You need admin privileges to access that area.');
    router.navigate(['/dashboard']);
    return false;
  }

  if (profile.is_deactivated) {
    feedback.error('Your account is currently deactivated. Please contact support.');
    await supabase.signOut().catch(() => undefined);
    router.navigate(['/auth/login']);
    return false;
  }

  return true;
};
