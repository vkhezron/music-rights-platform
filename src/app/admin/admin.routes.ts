import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './layout/admin-layout';

export const routes: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', loadComponent: () => import('./overview/admin-overview').then(m => m.AdminOverviewComponent) },
      { path: 'users', loadComponent: () => import('./users/admin-users').then(m => m.AdminUsersComponent) },
      { path: 'invites', loadComponent: () => import('./invites/admin-invites').then(m => m.AdminInvitesComponent) }
    ]
  }
];
