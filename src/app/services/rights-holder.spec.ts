import { TestBed } from '@angular/core/testing';

import { RightsHolder } from './rights-holder';

describe('RightsHolder', () => {
  let service: RightsHolder;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RightsHolder);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
