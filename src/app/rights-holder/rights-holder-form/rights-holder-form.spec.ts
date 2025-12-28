import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RightsHolderForm } from './rights-holder-form';

describe('RightsHolderForm', () => {
  let component: RightsHolderForm;
  let fixture: ComponentFixture<RightsHolderForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RightsHolderForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RightsHolderForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
