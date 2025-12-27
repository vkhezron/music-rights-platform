import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkForm } from './work-form';

describe('WorkForm', () => {
  let component: WorkForm;
  let fixture: ComponentFixture<WorkForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WorkForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
