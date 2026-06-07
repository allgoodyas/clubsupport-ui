import {
  Component, Input, Output, EventEmitter,
  OnChanges, SimpleChanges, ViewChild, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-student-id-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './student-id-card.component.html',
  styleUrls: ['./student-id-card.component.scss']
})
export class StudentIdCardComponent implements OnChanges {

  @Input() isOpen       = false;
  @Input() studentId!:  number;
  @Input() studentName  = '';
  @Input() gender       = '';
  @Input() age: number | null = null;
  @Input() clubName     = '';
  @Input() photoApiPath = '';
  @Input() parentMobile = '';

  @Output() closeCard = new EventEmitter<void>();

  @ViewChild('idCardEl') idCardEl!: ElementRef<HTMLDivElement>;

  photoDataUrl  = '';
  qrDataUrl     = '';
  loadingPhoto  = false;
  loadingQr     = false;
  downloading   = false;
  sendingWa     = false;
  printerMode   = false;

  get genderEmoji() { return this.gender?.toLowerCase() === 'female' ? '👧' : '👦'; }

  get initials() {
    return (this.studentName || '')
      .split(' ').slice(0, 2)
      .map(w => w[0] || '')
      .join('').toUpperCase();
  }

  /** Strips spaces/dashes, ensures leading + */
  get cleanMobile(): string {
    if (!this.parentMobile) return '';
    let n = this.parentMobile.replace(/[\s\-().]/g, '');
    if (!n.startsWith('+')) n = '+' + n;
    return n;
  }

  /** Digits only — for wa.me URL */
  get waMobile(): string {
    return this.cleanMobile.replace(/\D/g, '');
  }

  constructor(private http: HttpClient, private auth: AuthService) {
    const user = this.auth.currentUserValue;
    if (user?.clubNameEn) this.clubName = user.clubNameEn;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen'] && this.isOpen)  { this.loadAssets(); }
    if (changes['isOpen'] && !this.isOpen) {
      this.photoDataUrl = '';
      this.qrDataUrl    = '';
      this.printerMode  = false;
    }
  }

  togglePrinterMode(): void { this.printerMode = !this.printerMode; }

  private loadAssets() {
    this.loadQr();
    if (this.photoApiPath) this.loadPhoto();
  }

  private loadQr() {
    if (this.qrDataUrl || this.loadingQr) return;
    this.loadingQr = true;
    this.http.get<any>(`${environment.apiUrl}/QRCode/student/${this.studentId}/base64`).subscribe({
      next: res => {
        if (res.success && res.qrCode) this.qrDataUrl = `data:image/png;base64,${res.qrCode}`;
        this.loadingQr = false;
      },
      error: () => { this.loadingQr = false; }
    });
  }

  private loadPhoto() {
    if (this.photoDataUrl || this.loadingPhoto) return;
    this.loadingPhoto = true;
    const token = this.auth.getToken();
    const url   = this.photoApiPath.startsWith('http')
      ? this.photoApiPath
      : `${environment.apiUrl.replace('/api', '')}${this.photoApiPath}`;

    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error('no photo'); return r.blob(); })
      .then(blob => new Promise<string>(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      }))
      .then(dataUrl => { this.photoDataUrl = dataUrl; this.loadingPhoto = false; })
      .catch(() => { this.loadingPhoto = false; });
  }

  // ── Build card canvas ─────────────────────────────────────────
  private buildCanvas(): Promise<HTMLCanvasElement> {
    const W = 360, H = 580;
    const canvas  = document.createElement('canvas');
    canvas.width  = W * 2;
    canvas.height = H * 2;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(2, 2);

    const loadImg = (src: string) => new Promise<HTMLImageElement>(res => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload  = () => res(img);
      img.onerror = () => res(img);
      img.src = src;
    });

    const rr = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
      ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
      ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
      ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
      ctx.closePath();
    };

    return Promise.all([
      this.photoDataUrl ? loadImg(this.photoDataUrl) : Promise.resolve(null),
      this.qrDataUrl    ? loadImg(this.qrDataUrl)    : Promise.resolve(null),
    ]).then(([photoImg, qrImg]) => {
      this.printerMode
        ? this.drawPrintCanvas(ctx, W, H, rr, photoImg, qrImg)
        : this.drawDarkCanvas (ctx, W, H, rr, photoImg, qrImg);
      return canvas;
    });
  }

  // ── Download ──────────────────────────────────────────────────
  download() {
    this.downloading = true;
    this.buildCanvas().then(canvas => {
      const link    = document.createElement('a');
      link.download = `${this.studentName.replace(/\s+/g, '-')}-id-card${this.printerMode ? '-print' : ''}.png`;
      link.href     = canvas.toDataURL('image/png', 1.0);
      link.click();
      this.logIdCardAction('download');
      this.downloading = false;
    });
  }

  // ── WhatsApp ──────────────────────────────────────────────────
  // Behaviour:
  //   1. Renders the card as a PNG and silently downloads it (user has
  //      the file ready in their Downloads folder).
  //   2. Opens wa.me/{number} directly in a new tab — WhatsApp Web on
  //      desktop, the WhatsApp app on mobile — with the message pre-filled.
  //
  // Why NOT navigator.share():
  //   On desktop Chrome/Edge, canShare({files}) returns true and opens the
  //   OS share sheet (showing AirDrop, nearby devices, etc.) which is
  //   confusing and unrelated to WhatsApp.  The wa.me deep-link is simpler,
  //   works everywhere, and goes straight to the right contact.
  async shareWhatsApp(): Promise<void> {
    if (!this.waMobile || this.sendingWa) return;
    this.sendingWa = true;

    try {
      const canvas   = await this.buildCanvas();
      const dataUrl  = canvas.toDataURL('image/png', 1.0);
      const suffix   = this.printerMode ? '-print' : '';
      const fileName = `${this.studentName.replace(/\s+/g, '-')}-id-card${suffix}.png`;

      // Step 1 — silently download the PNG so it's ready to attach
      const a    = document.createElement('a');
      a.download = fileName;
      a.href     = dataUrl;
      a.click();

      // Step 2 — short pause so the download dialog registers
      await new Promise<void>(r => setTimeout(r, 500));

      // Step 3 — open WhatsApp Web / app with pre-filled message
      const clubLabel = this.clubName || 'The Club';
      const text =
        `🪪 *Student ID Card*\n\n` +
        `*${this.studentName}*\n` +
        `Student ID: ${this.studentId}\n\n` +
        `Issued by ${clubLabel}.\n` +
        `Please keep this card safe — it is used for attendance.\n\n` +
        `_(Attach the downloaded image: ${fileName})_`;

      window.open(
        `https://wa.me/${this.waMobile}?text=${encodeURIComponent(text)}`,
        '_blank',
        'noopener,noreferrer'
      );

      this.logIdCardAction('share');

    } catch (err: any) {
      console.error('WhatsApp share failed', err);
    } finally {
      this.sendingWa = false;
    }
  }

  // ── Dark canvas ───────────────────────────────────────────────
  private drawDarkCanvas(
    ctx: CanvasRenderingContext2D, W: number, H: number,
    rr: Function,
    photoImg: HTMLImageElement | null, qrImg: HTMLImageElement | null
  ) {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0D1B2E');
    grad.addColorStop(1, '#0A0F1E');
    rr(0, 0, W, H, 20); ctx.fillStyle = grad; ctx.fill();

    const stripe = ctx.createLinearGradient(0, 0, W, 0);
    stripe.addColorStop(0, '#00D4FF'); stripe.addColorStop(1, '#A855F7');
    ctx.fillStyle = stripe; ctx.fillRect(0, 0, W, 6);
    ctx.fillStyle = stripe; ctx.fillRect(0, H - 6, W, 6);

    rr(0, 0, W, H, 20);
    ctx.strokeStyle = 'rgba(0,212,255,0.25)'; ctx.lineWidth = 1.5; ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#00D4FF'; ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText((this.clubName || 'Club Management').toUpperCase(), W / 2, 36);
    ctx.fillStyle = 'rgba(148,163,184,0.7)'; ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('STUDENT ID CARD', W / 2, 56);

    this.drawPhotoCircle(ctx, W, photoImg, 155, 72, '#1A2235', true);
    const nameY = this.drawName(ctx, W, '#E2E8F0', 258);

    ctx.fillStyle = 'rgba(148,163,184,0.9)'; ctx.font = '13px system-ui, sans-serif';
    const meta: string[] = [];
    if (this.age)    meta.push(`${this.age} yrs`);
    if (this.gender) meta.push(this.gender);
    if (meta.length) ctx.fillText(meta.join('  •  '), W / 2, nameY + 4);

    ctx.strokeStyle = 'rgba(0,212,255,0.15)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(40, nameY + 22); ctx.lineTo(W - 40, nameY + 22); ctx.stroke();

    this.drawQr(ctx, W, qrImg, nameY + 36, 130, rr);
    ctx.fillStyle = 'rgba(148,163,184,0.6)'; ctx.font = '10px system-ui, sans-serif';
    ctx.fillText('SCAN FOR ATTENDANCE', W / 2, nameY + 36 + 130 + 20);
    ctx.fillStyle = 'rgba(148,163,184,0.4)'; ctx.font = '10px monospace';
    ctx.fillText(`ID: ${this.studentId}`, W / 2, H - 18);
  }

  // ── Print-friendly canvas ─────────────────────────────────────
  private drawPrintCanvas(
    ctx: CanvasRenderingContext2D, W: number, H: number,
    rr: Function,
    photoImg: HTMLImageElement | null, qrImg: HTMLImageElement | null
  ) {
    rr(0, 0, W, H, 20); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.strokeStyle = '#CBD5E1'; ctx.lineWidth = 1.5; ctx.stroke();

    ctx.fillStyle = '#1E3A5F'; ctx.fillRect(0, 0, W, 6);
    ctx.fillStyle = '#1E3A5F'; ctx.fillRect(0, H - 6, W, 6);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#1E3A5F'; ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText((this.clubName || 'Club Management').toUpperCase(), W / 2, 36);
    ctx.fillStyle = '#94A3B8'; ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('STUDENT ID CARD', W / 2, 56);

    this.drawPhotoCircle(ctx, W, photoImg, 155, 72, '#F1F5F9', false);
    const nameY = this.drawName(ctx, W, '#0F172A', 258);

    ctx.fillStyle = '#64748B'; ctx.font = '13px system-ui, sans-serif';
    const meta: string[] = [];
    if (this.age)    meta.push(`${this.age} yrs`);
    if (this.gender) meta.push(this.gender);
    if (meta.length) ctx.fillText(meta.join('  •  '), W / 2, nameY + 4);

    ctx.strokeStyle = '#E2E8F0'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(40, nameY + 22); ctx.lineTo(W - 40, nameY + 22); ctx.stroke();

    this.drawQrPrint(ctx, W, qrImg, nameY + 36, 130, rr);
    ctx.fillStyle = '#94A3B8'; ctx.font = '10px system-ui, sans-serif';
    ctx.fillText('SCAN FOR ATTENDANCE', W / 2, nameY + 36 + 130 + 20);
    ctx.fillStyle = '#CBD5E1'; ctx.font = '10px monospace';
    ctx.fillText(`ID: ${this.studentId}`, W / 2, H - 18);
  }

  // ── Shared drawing helpers ────────────────────────────────────

  private drawPhotoCircle(
    ctx: CanvasRenderingContext2D, W: number,
    photoImg: HTMLImageElement | null,
    cy: number, r: number, fallbackBg: string, glowRing: boolean
  ) {
    const cx = W / 2;
    if (glowRing) {
      ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
      const ring = ctx.createLinearGradient(cx-r, cy-r, cx+r, cy+r);
      ring.addColorStop(0, '#00D4FF'); ring.addColorStop(1, '#A855F7');
      ctx.strokeStyle = ring; ctx.lineWidth = 3; ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
      ctx.strokeStyle = '#1E3A5F'; ctx.lineWidth = 2.5; ctx.stroke();
    }
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    if (photoImg && photoImg.complete && photoImg.naturalWidth > 0) {
      const s  = Math.min(photoImg.naturalWidth, photoImg.naturalHeight);
      ctx.drawImage(photoImg, (photoImg.naturalWidth-s)/2, (photoImg.naturalHeight-s)/2, s, s, cx-r, cy-r, r*2, r*2);
    } else {
      ctx.fillStyle = fallbackBg; ctx.fillRect(cx-r, cy-r, r*2, r*2);
      ctx.font = `${r}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(this.genderEmoji, cx, cy); ctx.textBaseline = 'alphabetic';
    }
    ctx.restore();
  }

  private drawName(ctx: CanvasRenderingContext2D, W: number, color: string, startY: number): number {
    ctx.fillStyle = color; ctx.font = 'bold 22px system-ui, sans-serif'; ctx.textAlign = 'center';
    const maxW  = W - 40;
    const words = this.studentName.split(' ');
    let line = '', lines: string[] = [];
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
      else line = test;
    }
    lines.push(line);
    let ny = startY;
    lines.forEach(l => { ctx.fillText(l, W / 2, ny); ny += 28; });
    return ny;
  }

  private drawQr(ctx: CanvasRenderingContext2D, W: number, qrImg: HTMLImageElement | null, qrY: number, qrSize: number, rr: Function) {
    const qrX = (W - qrSize) / 2;
    if (qrImg && qrImg.complete && qrImg.naturalWidth > 0) {
      ctx.fillStyle = '#ffffff';
      rr(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 10); ctx.fill();
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
    }
  }

  private drawQrPrint(ctx: CanvasRenderingContext2D, W: number, qrImg: HTMLImageElement | null, qrY: number, qrSize: number, rr: Function) {
    const qrX = (W - qrSize) / 2;
    if (qrImg && qrImg.complete && qrImg.naturalWidth > 0) {
      ctx.fillStyle = '#F8FAFC'; ctx.strokeStyle = '#E2E8F0'; ctx.lineWidth = 1;
      rr(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 10); ctx.fill(); ctx.stroke();
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
    }
  }

  private logIdCardAction(action: 'print' | 'download' | 'share'): void {
    this.http.post(`${environment.apiUrl}/students/${this.studentId}/id-card-log`,
      { action, studentName: this.studentName }
    ).subscribe({ error: () => {} });
  }

  // ── Print ──────────────────────────────────────────────────────
  printCard() {
    this.logIdCardAction('print');
    const cardEl = this.idCardEl?.nativeElement;
    if (!cardEl) return;

    const cardHtml   = cardEl.outerHTML;
    const styleBlocks = Array.from(document.querySelectorAll('style')).map(s => s.outerHTML).join('\n');
    const linkBlocks  = Array.from(document.querySelectorAll('link[rel=stylesheet]')).map(l => l.outerHTML).join('\n');

    const overrides = this.printerMode ? `
      .id-card { background:#fff !important; border:1.5px solid #CBD5E1 !important; box-shadow:none !important; }
      .id-accent-top,.id-accent-bottom { background:#1E3A5F !important; }
      .id-club-name { color:#1E3A5F !important; } .id-card-label { color:#94A3B8 !important; }
      .id-photo-ring { background:#1E3A5F !important; } .id-photo-wrap { background:#F1F5F9 !important; }
      .id-name { color:#0F172A !important; } .id-meta { color:#64748B !important; }
      .id-divider { background:#E2E8F0 !important; }
      .id-qr-wrap { background:#F8FAFC !important; border:1px solid #E2E8F0 !important; box-shadow:none !important; }
      .id-scan-label { color:#94A3B8 !important; } .id-student-id { color:#CBD5E1 !important; }` : '';

    const bg = this.printerMode ? '#ffffff' : '#0A0F1E';
    const printHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>${this.studentName} — ID Card</title>${linkBlocks}${styleBlocks}
<style>*{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%;display:flex;align-items:center;justify-content:center;
background:${bg};-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.id-card{width:280px !important;page-break-inside:avoid;box-shadow:none !important;}
${overrides}
@page{size:90mm 145mm portrait;margin:4mm}
@media print{html,body{background:${bg} !important;}}</style>
</head><body>${cardHtml}
<script>window.onload=function(){window.focus();window.print();setTimeout(function(){window.close();},1000);};<\/script>
</body></html>`;

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) { document.body.removeChild(iframe); return; }
    doc.open(); doc.write(printHtml); doc.close();
    setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 5000);
  }

  close() { this.closeCard.emit(); }
}
