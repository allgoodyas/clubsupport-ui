import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GuideChapter } from '../../user-guide.service';

type State = 'idle' | 'playing' | 'paused' | 'done';

@Component({
  selector: 'app-narrated-demo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './narrated-demo.component.html',
  styleUrls: ['./narrated-demo.component.scss'],
})
export class NarratedDemoComponent implements OnInit, OnDestroy {
  @Input() chapter!: GuideChapter;

  state: State = 'idle';
  currentStep = 0;
  voices: SpeechSynthesisVoice[] = [];
  selectedVoice: SpeechSynthesisVoice | null = null;
  private utterance: SpeechSynthesisUtterance | null = null;

  constructor(private cd: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      this.loadVoices();
      this.cd.detectChanges();
    };
  }

  ngOnDestroy(): void {
    this.stop();
    window.speechSynthesis.onvoiceschanged = null;
  }

  private loadVoices(): void {
    const all = window.speechSynthesis.getVoices();
    const en = all.filter(v => v.lang.startsWith('en'));
    // Prefer voices with female-sounding names
    const femaleKeywords = ['female', 'samantha', 'victoria', 'karen', 'moira', 'tessa',
      'zira', 'hazel', 'susan', 'allison', 'ava', 'alice', 'sara', 'fiona', 'siri',
      'google us english', 'microsoft zira', 'microsoft hazel'];
    const female = en.filter(v =>
      femaleKeywords.some(k => v.name.toLowerCase().includes(k))
    );
    this.voices = female.length ? female : en;
    if (!this.selectedVoice && this.voices.length) {
      this.selectedVoice = this.voices[0];
    }
  }

  get steps() { return this.chapter?.steps ?? []; }
  get total() { return this.steps.length; }
  get progress() { return this.total ? ((this.currentStep + 1) / this.total) * 100 : 0; }
  get step() { return this.steps[this.currentStep]; }

  play(): void {
    if (this.state === 'done') {
      this.currentStep = 0;
    }
    this.state = 'playing';
    this.speakCurrent();
  }

  pause(): void {
    window.speechSynthesis.pause();
    this.state = 'paused';
  }

  resume(): void {
    window.speechSynthesis.resume();
    this.state = 'playing';
  }

  stop(): void {
    window.speechSynthesis.cancel();
    this.state = 'idle';
    this.currentStep = 0;
  }

  skipNext(): void {
    window.speechSynthesis.cancel();
    if (this.currentStep < this.total - 1) {
      this.currentStep++;
      if (this.state === 'playing') this.speakCurrent();
    } else {
      this.state = 'done';
      this.cd.detectChanges();
    }
  }

  skipPrev(): void {
    window.speechSynthesis.cancel();
    if (this.currentStep > 0) {
      this.currentStep--;
      if (this.state === 'playing') this.speakCurrent();
    }
  }

  changeVoice(event: Event): void {
    const name = (event.target as HTMLSelectElement).value;
    this.selectedVoice = this.voices.find(v => v.name === name) ?? this.voices[0];
    if (this.state === 'playing') {
      window.speechSynthesis.cancel();
      this.speakCurrent();
    }
  }

  private speakCurrent(): void {
    if (!this.step) { this.state = 'done'; this.cd.detectChanges(); return; }
    const text = `Step ${this.currentStep + 1}. ${this.step.title}. ${this.cleanText(this.step.body)}`;
    this.utterance = new SpeechSynthesisUtterance(text);
    if (this.selectedVoice) this.utterance.voice = this.selectedVoice;
    this.utterance.rate = 0.92;
    this.utterance.pitch = 1.05;
    this.utterance.volume = 1;
    this.utterance.onend = () => {
      // brief pause between steps
      setTimeout(() => {
        if (this.state !== 'playing') return;
        if (this.currentStep < this.total - 1) {
          this.currentStep++;
          this.cd.detectChanges();
          this.speakCurrent();
        } else {
          this.state = 'done';
          this.cd.detectChanges();
        }
      }, 800);
    };
    this.utterance.onerror = () => { this.state = 'idle'; this.cd.detectChanges(); };
    this.cd.detectChanges();
    window.speechSynthesis.speak(this.utterance);
  }

  private cleanText(text: string): string {
    return text.replace(/[+()]/g, ' ').replace(/\s+/g, ' ').trim();
  }
}
