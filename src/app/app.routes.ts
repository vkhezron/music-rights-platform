import { Routes } from '@angular/router';
import { AuthGuard } from '../guards/auth.guard';

export const routes: Routes = [
    { path: '', redirectTo: '/auth/login', pathMatch: 'full' },
    {path: 'auth/login', loadComponent: () => import('./auth/login/login').then(m => m.Login)},
   //Protected routes
    {
        path: 'dashboard'
        , loadComponent: () => import('./dashboard/dashboard').then(m => m.Dashboard),
        canActivate: [AuthGuard]
    },
    {
        path: 'auth/register'
        , loadComponent: () => import('./auth/register/register').then(m => m.Register),
        canActivate: [AuthGuard]
    },
    
    {
        path: 'profile/setup'
        ,loadComponent: () => import('./profile/profile-setup/profile-setup').then(m => m.ProfileSetup),
        canActivate: [AuthGuard]
    },
    {
        path: 'workspaces'
        , loadComponent: () => import('./workspaces/workspace-list/workspace-list').then(m => m.WorkspaceList)
        , canActivate: [AuthGuard]
    },
    {
        path: 'workspaces/create'
        , loadComponent: () => import('./workspaces/workspace-create/workspace-create').then(m => m.WorkspaceCreateComponent)
        , canActivate: [AuthGuard]
    },
    {
        path: 'profile/edit'
        ,  loadComponent: () => import('./profile/profile-edit/profile-edit').then(m => m.ProfileEdit)
        , canActivate: [AuthGuard]  
    },
    {path: 'profile/qr-code'
        ,loadComponent: () => import('./profile/qr-code-display/qr-code-display').then(m => m.QrCodeDisplayComponent)
        , canActivate: [AuthGuard]  
    },
    {
        path: 'works'
        , loadComponent: () => import('./works/work-list/work-list').then(m => m.WorksListComponent)
        , canActivate: [AuthGuard]
    },
    {
        path: 'works/create'
        , loadComponent: () => import('./works/work-form/work-form').then(m => m.WorkFormComponent)
        , canActivate: [AuthGuard]  
    },
    { 
        path: 'rights-holders'
        , loadComponent: () => import('./rights-holder/rights-holder-list/rights-holder-list').then(m => m.RightsHolderListComponent)
        , canActivate: [AuthGuard]  
    },
    {   
        path: 'rights-holders/create'
        , loadComponent: () => import('./rights-holder/rights-holder-form/rights-holder-form').then(m => m.RightsHolderForm)
        , canActivate: [AuthGuard]          
    },
    {
        path: 'rights-holders/edit/:id'
        , loadComponent: () => import('./rights-holder/rights-holder-form/rights-holder-form').then(m => m.RightsHolderForm)
        , canActivate: [AuthGuard]
    },
    {path: '**', redirectTo: 'login' }

];
