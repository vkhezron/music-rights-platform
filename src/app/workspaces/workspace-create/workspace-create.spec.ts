import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkspaceCreate } from './workspace-create';

describe('WorkspaceCreate', () => {
  let component: WorkspaceCreate;
  let fixture: ComponentFixture<WorkspaceCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkspaceCreate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WorkspaceCreate);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
