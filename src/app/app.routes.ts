import { Routes } from '@angular/router';

export const routes: Routes = [
    { path: '', redirectTo: '/auth/login', pathMatch: 'full' },
    {path: 'auth/login', loadComponent: () => import('./auth/login/login').then(m => m.Login)},
    {path: 'dashboard', loadComponent: () => import('./auth/login/login').then(m => m.Login)},
    {path: 'auth/register', loadComponent: () => import('./auth/register/register').then(m => m.Register)},
    {path: '**', redirectTo: 'login' }

];
