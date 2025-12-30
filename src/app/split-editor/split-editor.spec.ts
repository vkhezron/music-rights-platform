import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SplitEditor } from './split-editor';

describe('SplitEditor', () => {
  let component: SplitEditor;
  let fixture: ComponentFixture<SplitEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SplitEditor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SplitEditor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
