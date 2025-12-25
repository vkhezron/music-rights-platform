import { Routes } from '@angular/router';

export const routes: Routes = [
    { path: '', redirectTo: '/auth/login', pathMatch: 'full' },
    {path: 'auth/login', loadComponent: () => import('./auth/login/login').then(m => m.Login)},
    {path: 'dashboard', loadComponent: () => import('./dashboard/dashboard').then(m => m.Dashboard)},
    {path: 'auth/register', loadComponent: () => import('./auth/register/register').then(m => m.Register)},
    {path: 'profile/setup',loadComponent: () => import('./profile/profile-setup/profile-setup').then(m => m.ProfileSetup)},
    {path: '**', redirectTo: 'login' }

];
