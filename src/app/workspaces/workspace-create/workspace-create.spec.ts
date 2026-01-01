import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';

import { WorkspaceCreateComponent } from './workspace-create';
import { WorkspaceService } from '../../services/workspace.service';
import { TranslateMockLoader } from '../../../testing/translate-mock.loader';

describe('WorkspaceCreate', () => {
  let component: WorkspaceCreateComponent;
  let fixture: ComponentFixture<WorkspaceCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        WorkspaceCreateComponent,
        RouterTestingModule,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: TranslateMockLoader },
        }),
      ],
      providers: [
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } as Partial<Router> },
        {
          provide: WorkspaceService,
          useValue: {
            createWorkspace: () =>
              Promise.resolve({
                id: 'workspace-1',
                name: 'Workspace',
                type: 'single',
                created_by: 'user-1',
                created_at: '',
                updated_at: '',
              }),
          } as unknown as WorkspaceService,
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(WorkspaceCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
