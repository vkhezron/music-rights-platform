import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { ProfileService } from '../services/profile.service';
import { Observable } from 'rxjs';
import {  Workspace } from '../services/workspace.service';
import { WorkspaceService } from '../services/workspace.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, AsyncPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard  implements OnInit{
  private router = inject(Router);
  private profileService = inject(ProfileService);
  private supabase = inject(SupabaseService);
  private workspaceService = inject(WorkspaceService);

  // Public properties for template
  profile$ = this.profileService.profile$;
  user = this.supabase.currentUser;
  workspaces$!: Observable<Workspace[]>;
  currentWorkspace: Workspace | null = null;

  ngOnInit() {
    // If no user, redirect to login
    if (!this.user) {
      this.router.navigate(['/auth/login']);
      return;
    }

    //Observables
    // Initialize observables
    this.workspaces$ = this.workspaceService.workspaces;
    this.currentWorkspace = this.workspaceService.currentWorkspace;
  }

  goToWorkspaces() {
    this.router.navigate(['/workspaces']);
  }

  editProfile() {
    this.router.navigate(['/profile/edit']);
  }

  async logout() {
    await this.supabase.signOut();
    this.router.navigate(['/auth/login']);
  }


}
