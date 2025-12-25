import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { ProfileService } from '../services/profile.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard  implements OnInit{
  private router = inject(Router);
  private profileService = inject(ProfileService);
  private supabase = inject(SupabaseService);

  profile$ = this.profileService.profile$;
  user = this.supabase.currentUser;

  ngOnInit() {
    // If no user, redirect to login
    if (!this.user) {
      this.router.navigate(['/auth/login']);
    }
  }

  async logout() {
    await this.supabase.signOut();
    this.router.navigate(['/auth/login']);
  }


}
