import { FormsModule } from '@angular/forms';  
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import { StudentService } from '../../core/services/student.service';
import { ToastService } from '../../shared/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher/language-switcher.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SidebarNavigationComponent } from '../../shared/components/sidebar-navigation/sidebar-navigation.component';
import { StudentDetails } from '../../models/api.models';
import { StudentIdCardComponent } from '../../shared/components/student-id-card/student-id-card.component';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { SidebarStateService } from '../../core/services/sidebar-state.service';

interface StudentListItem {
  studentId: number;
  fullName: string;
  age: number;
  gender: string;
  parentFullName: string;
  parentMobile: string;
  hasPhoto: boolean;
  isActive: boolean;
  isSelfRegistered: boolean;
}

@Component({
  selector: 'app-students-list',
  standalone: true,
  imports: [CommonModule, TranslateModule, FormsModule, LanguageSwitcherComponent, SidebarNavigationComponent, PageHeaderComponent, StudentIdCardComponent],
  templateUrl: './students-list.component.html',
  styleUrl: './students-list.component.scss'
})
export class StudentsListComponent implements OnInit, OnDestroy {

  viewMode: 'grid' | 'table' = 'table';
  students: StudentListItem[] = [];
  filteredStudents: StudentListItem[] = [];
  photoUrls: Map<number, SafeUrl> = new Map();
  photoDataUrls: Map<number, string> = new Map();

  searchQuery: string = '';
  genderFilter: string = 'all';
  selfRegisteredFilter: string = 'all';
  ageMinFilter: number | null = null;
  ageMaxFilter: number | null = null;

  isLoading: boolean = false;
  isSidebarOpen: boolean = false;

  idCardOpen    = false;
  idCardStudent: StudentListItem | null = null;

  // ── Multi-select & bulk print ──────────────────────────────────
  selectedIds: Set<number> = new Set();
  bulkPrinting = false;

  get selectedCount(): number  { return this.selectedIds.size; }
  get sheetsNeeded(): number   { return Math.ceil(this.selectedIds.size / 9); }
  get allPageSelected(): boolean {
    return this.pagedStudents.length > 0 && this.pagedStudents.every(s => this.selectedIds.has(s.studentId));
  }
  get somePageSelected(): boolean {
    return this.pagedStudents.some(s => this.selectedIds.has(s.studentId));
  }

  toggleSelect(studentId: number, event: Event): void {
    event.stopPropagation();
    if (this.selectedIds.has(studentId)) { this.selectedIds.delete(studentId); }
    else { this.selectedIds.add(studentId); }
    this.selectedIds = new Set(this.selectedIds);
  }

  toggleSelectAll(event: Event): void {
    event.stopPropagation();
    if (this.allPageSelected) {
      this.pagedStudents.forEach(s => this.selectedIds.delete(s.studentId));
    } else {
      this.pagedStudents.forEach(s => this.selectedIds.add(s.studentId));
    }
    this.selectedIds = new Set(this.selectedIds);
  }

  clearSelection(): void { this.selectedIds = new Set(); }
  isSelected(studentId: number): boolean { return this.selectedIds.has(studentId); }

  // Pagination
  pageSize    = 20;
  currentPage = 1;
  get totalPages(): number  { return Math.max(1, Math.ceil(this.filteredStudents.length / this.pageSize)); }
  get pagedStudents(): StudentListItem[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredStudents.slice(start, start + this.pageSize);
  }
  get pageEnd(): number    { return Math.min(this.currentPage * this.pageSize, this.filteredStudents.length); }
  get pageNums(): number[] { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }
  goToPage(p: number): void { if (p >= 1 && p <= this.totalPages) this.currentPage = p; }

  constructor(
    private studentService: StudentService,
    private toastService: ToastService,
    private authService: AuthService,
    private sanitizer: DomSanitizer,
    private router: Router,
    private http: HttpClient,
    private sidebarState: SidebarStateService
  ) {}

  ngOnInit(): void { this.loadStudents(); }

  ngOnDestroy(): void {
    this.photoUrls.forEach(url => { if (typeof url === 'string') URL.revokeObjectURL(url); });
    this.photoUrls.clear();
  }

  loadStudents(): void {
    this.isLoading = true;
    this.studentService.getStudents().subscribe({
      next: (students) => {
        this.students = students;
        this.applyFilters();
        this.isLoading = false;
        students.forEach(s => { if (s.hasPhoto) this.loadPhoto(s.studentId); });
      },
      error: () => { this.toastService.error('Failed to load students'); this.isLoading = false; }
    });
  }

  loadPhoto(studentId: number): void {
    const token = this.authService.getToken();
    if (!token) return;
    fetch(this.studentService.getStudentPhotoUrl(studentId), { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error('err'); return r.blob(); })
      .then(blob => {
        this.photoUrls.set(studentId, this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob)));
        const reader = new FileReader();
        reader.onloadend = () => { this.photoDataUrls.set(studentId, reader.result as string); };
        reader.readAsDataURL(blob);
      })
      .catch(() => {});
  }

  applyFilters(): void {
    let filtered = [...this.students];
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.fullName.toLowerCase().includes(q) ||
        s.parentFullName.toLowerCase().includes(q) ||
        s.parentMobile.includes(q));
    }
    if (this.genderFilter !== 'all') filtered = filtered.filter(s => s.gender === this.genderFilter);
    if (this.selfRegisteredFilter === 'self')   filtered = filtered.filter(s => s.isSelfRegistered);
    if (this.selfRegisteredFilter === 'parent') filtered = filtered.filter(s => !s.isSelfRegistered);
    if (this.ageMinFilter !== null) filtered = filtered.filter(s => s.age >= this.ageMinFilter!);
    if (this.ageMaxFilter !== null) filtered = filtered.filter(s => s.age <= this.ageMaxFilter!);
    this.filteredStudents = filtered;
    this.currentPage = 1;
  }

  onSearchChange(): void { this.applyFilters(); }
  onFilterChange(): void { this.applyFilters(); }
  clearFilters(): void {
    this.searchQuery = ''; this.genderFilter = 'all';
    this.selfRegisteredFilter = 'all'; this.ageMinFilter = null; this.ageMaxFilter = null;
    this.applyFilters();
  }

  toggleViewMode(): void   { this.viewMode = this.viewMode === 'grid' ? 'table' : 'grid'; }
  viewStudent(id: number): void { this.router.navigate(['/students', id]); }
  registerStudent(): void  { this.router.navigate(['/students/register']); }
  getPhotoUrl(id: number): SafeUrl | null { return this.photoUrls.get(id) || null; }
  toggleSidebar(): void { this.sidebarState.toggle(); }
  closeSidebar():  void { this.sidebarState.close();  }
  goBack(): void           { this.router.navigate(['/dashboard']); }
  goToDashboard(): void    { this.router.navigate(['/dashboard']); }
  goToSettings(): void     { this.router.navigate(['/club/settings']); }

  openIdCard(student: StudentListItem, event: Event): void {
    event.stopPropagation();
    this.idCardStudent = student;
    this.idCardOpen    = true;
  }
  closeIdCard(): void { this.idCardOpen = false; this.idCardStudent = null; }

  // ── Bulk print ────────────────────────────────────────────────────

  async printBulkCards(printerMode: boolean): Promise<void> {
    if (this.selectedIds.size === 0) return;
    this.bulkPrinting = true;

    const selected  = this.students.filter(s => this.selectedIds.has(s.studentId));
    const clubName  = (this.authService.currentUserValue?.clubNameEn || 'Club Management').toUpperCase();

    const PX_PER_MM = 3.7795 * 2;
    const CARD_W_MM = 55, CARD_H_MM = 85;
    const A4_W_MM = 210, A4_H_MM = 297;
    const MARGIN_MM = 5, GAP_MM = 3;
    const cardW  = Math.round(CARD_W_MM * PX_PER_MM);
    const cardH  = Math.round(CARD_H_MM * PX_PER_MM);
    const a4W    = Math.round(A4_W_MM   * PX_PER_MM);
    const a4H    = Math.round(A4_H_MM   * PX_PER_MM);
    const margin = Math.round(MARGIN_MM  * PX_PER_MM);
    const gap    = Math.round(GAP_MM     * PX_PER_MM);
    const cols   = Math.floor((A4_W_MM - 2 * MARGIN_MM + GAP_MM) / (CARD_W_MM + GAP_MM));
    const rows   = Math.floor((A4_H_MM - 2 * MARGIN_MM + GAP_MM) / (CARD_H_MM + GAP_MM));
    const perPage = cols * rows;

    // Preload QR codes
    const qrMap = new Map<number, HTMLImageElement>();
    await Promise.all(selected.map(async s => {
      try {
        const res: any = await this.http.get(`${environment.apiUrl}/QRCode/student/${s.studentId}/base64`).toPromise();
        if (res?.success && res?.qrCode) {
          const img = new Image();
          await new Promise<void>(r => { img.onload = () => r(); img.onerror = () => r(); img.src = `data:image/png;base64,${res.qrCode}`; });
          qrMap.set(s.studentId, img);
        }
      } catch {}
    }));

    // Preload photos
    const photoMap = new Map<number, HTMLImageElement>();
    await Promise.all(selected.map(async s => {
      const dataUrl = this.photoDataUrls.get(s.studentId);
      if (dataUrl) {
        const img = new Image();
        await new Promise<void>(r => { img.onload = () => r(); img.onerror = () => r(); img.src = dataUrl; });
        photoMap.set(s.studentId, img);
      }
    }));

    // Render pages
    const pages: StudentListItem[][] = [];
    for (let i = 0; i < selected.length; i += perPage) pages.push(selected.slice(i, i + perPage));

    const pageDataUrls: string[] = [];
    for (const page of pages) {
      const canvas = document.createElement('canvas');
      canvas.width = a4W; canvas.height = a4H;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = printerMode ? '#ffffff' : '#0A0F1E';
      ctx.fillRect(0, 0, a4W, a4H);
      page.forEach((student, idx) => {
        const col = idx % cols, row = Math.floor(idx / cols);
        const x = margin + col * (cardW + gap);
        const y = margin + row * (cardH + gap);
        this.drawSingleCard(ctx, student, x, y, cardW, cardH, printerMode, clubName,
          photoMap.get(student.studentId) || null, qrMap.get(student.studentId) || null);
      });
      pageDataUrls.push(canvas.toDataURL('image/png', 1.0));
    }

    const bgColor = printerMode ? '#ffffff' : '#0A0F1E';
    const printHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Student ID Cards</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
html,body { background:${bgColor}; }
.page { width:210mm; height:297mm; display:flex; align-items:center; justify-content:center; page-break-after:always; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
.page img { width:210mm; height:297mm; display:block; }
@page { size:A4 portrait; margin:0; }
</style></head><body>
${pageDataUrls.map(url => `<div class="page"><img src="${url}"/></div>`).join('\n')}
<script>window.onload=function(){window.focus();window.print();setTimeout(function(){window.close();},1000);};<\/script>
</body></html>`;

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
    document.body.appendChild(iframe);
    const iDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iDoc) { iDoc.open(); iDoc.write(printHtml); iDoc.close(); }
    setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 8000);
    this.bulkPrinting = false;
  }

  private drawSingleCard(
    ctx: CanvasRenderingContext2D, student: StudentListItem,
    x: number, y: number, W: number, H: number,
    printerMode: boolean, clubName: string,
    photoImg: HTMLImageElement | null, qrImg: HTMLImageElement | null
  ): void {
    const r = 14;
    this.roundRect(ctx, x, y, W, H, r);
    ctx.fillStyle = printerMode ? '#ffffff' : '#0D1B2E';
    ctx.fill();
    ctx.strokeStyle = printerMode ? '#CBD5E1' : 'rgba(0,212,255,0.2)';
    ctx.lineWidth = printerMode ? 2 : 1.5;
    ctx.stroke();

    const stripeH = Math.round(H * 0.04);
    this.roundRect(ctx, x, y, W, stripeH, r);
    ctx.fillStyle = printerMode ? '#1E3A5F' : '#00D4FF';
    ctx.fill();
    ctx.fillStyle = printerMode ? '#1E3A5F' : '#A855F7';
    ctx.fillRect(x, y + H - stripeH, W, stripeH);

    const clubY = y + stripeH + Math.round(H * 0.08);
    ctx.textAlign = 'center';
    ctx.font = `bold ${Math.round(W * 0.075)}px system-ui, sans-serif`;
    ctx.fillStyle = printerMode ? '#1E3A5F' : '#00D4FF';
    ctx.fillText(clubName, x + W / 2, clubY);
    ctx.font = `${Math.round(W * 0.06)}px system-ui, sans-serif`;
    ctx.fillStyle = printerMode ? '#94A3B8' : 'rgba(148,163,184,0.7)';
    ctx.fillText('STUDENT ID CARD', x + W / 2, clubY + Math.round(H * 0.065));

    const cx = x + W / 2;
    const pr = Math.round(W * 0.22);
    const pcy = clubY + Math.round(H * 0.075) + pr;

    ctx.beginPath();
    ctx.arc(cx, pcy, pr + 4, 0, Math.PI * 2);
    ctx.strokeStyle = printerMode ? '#1E3A5F' : '#00D4FF';
    ctx.lineWidth = printerMode ? 2.5 : 3;
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, pcy, pr, 0, Math.PI * 2);
    ctx.clip();
    if (photoImg && photoImg.complete && photoImg.naturalWidth > 0) {
      const s = Math.min(photoImg.naturalWidth, photoImg.naturalHeight);
      ctx.drawImage(photoImg, (photoImg.naturalWidth-s)/2, (photoImg.naturalHeight-s)/2, s, s, cx-pr, pcy-pr, pr*2, pr*2);
    } else {
      ctx.fillStyle = printerMode ? '#F1F5F9' : '#1A2235';
      ctx.fillRect(cx-pr, pcy-pr, pr*2, pr*2);
      ctx.font = `${pr}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(student.gender === 'Female' ? '👧' : '👦', cx, pcy);
      ctx.textBaseline = 'alphabetic';
    }
    ctx.restore();

    const nameY = pcy + pr + Math.round(H * 0.07);
    ctx.font = `bold ${Math.round(W * 0.1)}px system-ui, sans-serif`;
    ctx.fillStyle = printerMode ? '#0F172A' : '#E2E8F0';
    ctx.textAlign = 'center';
    const maxNameW = W - Math.round(W * 0.12);
    const words = student.fullName.split(' ');
    let line = '', lines: string[] = [];
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxNameW && line) { lines.push(line); line = w; }
      else line = test;
    }
    lines.push(line);
    let ny = nameY;
    const lineH = Math.round(W * 0.115);
    lines.forEach(l => { ctx.fillText(l, x + W / 2, ny); ny += lineH; });

    ctx.font = `${Math.round(W * 0.075)}px system-ui, sans-serif`;
    ctx.fillStyle = printerMode ? '#64748B' : 'rgba(148,163,184,0.85)';
    ctx.fillText([student.age + ' yrs', student.gender].join('  •  '), x + W / 2, ny + Math.round(H * 0.01));

    const divY = ny + Math.round(H * 0.045);
    ctx.strokeStyle = printerMode ? '#E2E8F0' : 'rgba(0,212,255,0.15)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + Math.round(W*0.1), divY); ctx.lineTo(x + W - Math.round(W*0.1), divY); ctx.stroke();

    const qrSize = Math.round(W * 0.44);
    const qrX = x + (W - qrSize) / 2;
    const qrY = divY + Math.round(H * 0.025);
    if (qrImg && qrImg.complete && qrImg.naturalWidth > 0) {
      ctx.fillStyle = printerMode ? '#F8FAFC' : '#ffffff';
      const pad = Math.round(qrSize * 0.06);
      this.roundRect(ctx, qrX - pad, qrY - pad, qrSize + pad*2, qrSize + pad*2, 6);
      ctx.fill();
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
    }

    ctx.font = `${Math.round(W * 0.055)}px system-ui, sans-serif`;
    ctx.fillStyle = printerMode ? '#94A3B8' : 'rgba(148,163,184,0.55)';
    ctx.fillText('SCAN FOR ATTENDANCE', x + W / 2, qrY + qrSize + Math.round(H * 0.03));
    ctx.font = `${Math.round(W * 0.055)}px monospace`;
    ctx.fillStyle = printerMode ? '#CBD5E1' : 'rgba(148,163,184,0.35)';
    ctx.fillText('ID: ' + student.studentId, x + W / 2, y + H - stripeH - Math.round(H * 0.02));
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y); ctx.quadraticCurveTo(x+w, y, x+w, y+r);
    ctx.lineTo(x+w, y+h-r); ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
    ctx.lineTo(x+r, y+h); ctx.quadraticCurveTo(x, y+h, x, y+h-r);
    ctx.lineTo(x, y+r); ctx.quadraticCurveTo(x, y, x+r, y);
    ctx.closePath();
  }
}
