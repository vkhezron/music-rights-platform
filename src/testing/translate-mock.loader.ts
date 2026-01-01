import { Observable, of } from 'rxjs';
import { TranslateLoader } from '@ngx-translate/core';

export class TranslateMockLoader implements TranslateLoader {
  getTranslation(): Observable<Record<string, string>> {
    return of({});
  }
}
