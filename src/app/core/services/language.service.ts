import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type Language = 'en' | 'ar';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private readonly STORAGE_KEY = 'app_language';
  private readonly DEFAULT_LANGUAGE: Language = 'en';
  
  availableLanguages: Array<{code: Language, name: string, nativeName: string, direction: 'ltr' | 'rtl'}> = [
    { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'rtl' }
  ];

  constructor(private translate: TranslateService) {
    this.initLanguage();
  }

  private initLanguage(): void {
    // Set available languages
    this.translate.addLangs(this.availableLanguages.map(lang => lang.code));
    
    // Set default language
    this.translate.setDefaultLang(this.DEFAULT_LANGUAGE);
    
    // Load saved language or use default
    const savedLanguage = this.getSavedLanguage();
    this.setLanguage(savedLanguage);
  }

  setLanguage(lang: Language): void {
    this.translate.use(lang);
    this.saveLanguage(lang);
    this.updateDocumentDirection(lang);
    this.updateDocumentLang(lang);
  }

  getCurrentLanguage(): Language {
    return this.translate.currentLang as Language || this.DEFAULT_LANGUAGE;
  }

  private getSavedLanguage(): Language {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved && this.isValidLanguage(saved)) {
      return saved as Language;
    }
    return this.DEFAULT_LANGUAGE;
  }

  private saveLanguage(lang: Language): void {
    localStorage.setItem(this.STORAGE_KEY, lang);
  }

  private isValidLanguage(lang: string): boolean {
    return this.availableLanguages.some(l => l.code === lang);
  }

  private updateDocumentDirection(lang: Language): void {
    const langConfig = this.availableLanguages.find(l => l.code === lang);
    const direction = langConfig?.direction || 'ltr';
    document.documentElement.dir = direction;
    document.body.dir = direction;
  }

  private updateDocumentLang(lang: Language): void {
    document.documentElement.lang = lang;
  }

  isRTL(): boolean {
    const currentLang = this.getCurrentLanguage();
    const langConfig = this.availableLanguages.find(l => l.code === currentLang);
    return langConfig?.direction === 'rtl';
  }

  getLanguageName(code: Language): string {
    const lang = this.availableLanguages.find(l => l.code === code);
    return lang?.name || code;
  }

  getLanguageNativeName(code: Language): string {
    const lang = this.availableLanguages.find(l => l.code === code);
    return lang?.nativeName || code;
  }
}
