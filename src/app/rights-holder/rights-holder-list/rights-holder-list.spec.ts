import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RightsHolderList } from './rights-holder-list';

describe('RightsHolderList', () => {
  let component: RightsHolderList;
  let fixture: ComponentFixture<RightsHolderList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RightsHolderList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RightsHolderList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
