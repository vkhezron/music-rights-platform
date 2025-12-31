import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SplitEditorComponent } from './split-editor';

describe('SplitEditorComponent', () => {
  let component: SplitEditorComponent;
  let fixture: ComponentFixture<SplitEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SplitEditorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SplitEditorComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
