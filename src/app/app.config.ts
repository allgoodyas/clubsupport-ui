import { ApplicationConfig, provideZoneChangeDetection, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, HttpClient, withInterceptors } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { routes } from './app.routes';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

// Custom Translation Loader with debugging
export class CustomTranslateLoader implements TranslateLoader {
  constructor(private http: HttpClient) {}

  getTranslation(lang: string): Observable<any> {
    const path = `/assets/i18n/${lang}.json`;
    console.log(`[TranslateLoader] Loading translations for: ${lang} from ${path}`);
    
    return this.http.get(path).pipe(
      tap((translations) => {
        console.log(`[TranslateLoader] Successfully loaded ${lang} translations:`, translations);
      }),
      catchError((error) => {
        console.error(`[TranslateLoader] Failed to load ${lang} translations:`, error);
        console.error(`[TranslateLoader] Attempted path: ${path}`);
        return of({});
      })
    );
  }
}

// Factory function
export function createTranslateLoader(http: HttpClient) {
  return new CustomTranslateLoader(http);
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    importProvidersFrom(
      TranslateModule.forRoot({
        defaultLanguage: 'en',
        loader: {
          provide: TranslateLoader,
          useFactory: createTranslateLoader,
          deps: [HttpClient]
        }
      })
    )
  ]
};
