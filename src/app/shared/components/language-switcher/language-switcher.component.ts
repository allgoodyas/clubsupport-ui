import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService, Language } from '../../../core/services/language.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './language-switcher.component.html',
  styleUrls: ['./language-switcher.component.scss']
})
export class LanguageSwitcherComponent {
  @Input() iconOnly = false;
  isOpen = false;

  constructor(public languageService: LanguageService) {}

  get currentLanguage(): Language {
    return this.languageService.getCurrentLanguage();
  }

  get currentLabel(): string {
    return this.currentLanguage === 'ar' ? 'ع' : 'EN';
  }

  getFlag(code: Language): string {
    const flags: Record<Language, string> = {
      en: '🇬🇧',
      ar: '🇸🇦'
    };
    return flags[code] ?? '🌐';
  }

  toggleDropdown(): void {
    this.isOpen = !this.isOpen;
  }

  selectLanguage(lang: Language): void {
    this.languageService.setLanguage(lang);
    this.isOpen = false;
  }

  closeDropdown(): void {
    this.isOpen = false;
  }
}
