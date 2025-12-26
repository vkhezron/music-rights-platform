import { TestBed } from '@angular/core/testing';

import { Works } from './works';

describe('Works', () => {
  let service: Works;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Works);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
