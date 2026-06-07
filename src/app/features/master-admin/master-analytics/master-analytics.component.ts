import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import type * as ExcelJS from 'exceljs';
import { environment } from '../../../../environments/environment';

interface ClubSummary {
  clubId: number; clubNameEn: string; clubCode: string;
  cityName: string; regionName: string; isActive: boolean;
  totalStudents: number; activeEvents: number; totalEnrollments: number;
  totalRevenue: number; totalExpenses: number; netProfit: number;
  outstanding: number; collectionRate: number;
  revenuePerStudent: number; costPerStudent: number; lastActivityDate: string;
}
interface SportDemand {
  sport: string; totalEnrollments: number; clubCount: number;
  avgPrice: number; minPrice: number; maxPrice: number; suggestedPrice: number;
}
interface SportByRegion {
  regionName: string; sport: string; enrollments: number;
  avgPrice: number; clubCount: number;
}
interface EventTypeBreakdown {
  eventType: string; eventCount: number; totalEnrollments: number;
  avgPrice: number; totalRevenue: number;
}
interface Analytics {
  totalClubs: number; activeClubs: number; totalStudents: number;
  totalEnrollments: number; totalRevenue: number; totalExpenses: number;
  netProfit: number; avgRevenuePerClub: number; avgCollectionRate: number;
  clubSummaries: ClubSummary[];
  sportDemand: SportDemand[];
  sportByRegion: SportByRegion[];
  eventTypes: EventTypeBreakdown[];
  fromDate: string; toDate: string;
}

@Component({
  selector: 'app-master-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './master-analytics.component.html',
  styleUrls: ['./master-analytics.component.scss']
})
export class MasterAnalyticsComponent implements OnInit {
  private readonly api = environment.apiUrl;
  data: Analytics | null = null;
  loading = false;
  error = '';
  exporting = false;
  fromDate = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
  toDate   = new Date().toISOString().split('T')[0];
  activeTab: 'overview' | 'clubs' | 'sports' | 'regions' = 'overview';
  clubSort: { col: keyof ClubSummary; dir: 'asc'|'desc' } = { col: 'totalRevenue', dir: 'desc' };
  selectedRegion = 'All';

  constructor(private http: HttpClient, private router: Router) {}
  ngOnInit() { this.load(); }

  load() {
    this.loading = true; this.error = '';
    this.http.get<Analytics>(`${this.api}/master/analytics?fromDate=${this.fromDate}&toDate=${this.toDate}`)
      .subscribe({ next: r => { this.data = r; this.loading = false; }, error: e => { this.error = e.error?.message || 'Failed'; this.loading = false; } });
  }

  get sortedClubs(): ClubSummary[] {
    if (!this.data) return [];
    const col = this.clubSort.col; const dir = this.clubSort.dir === 'asc' ? 1 : -1;
    return [...this.data.clubSummaries].sort((a,b) => { const av=a[col] as any, bv=b[col] as any; return av<bv?-dir:av>bv?dir:0; });
  }
  sortClubs(col: keyof ClubSummary) {
    this.clubSort = this.clubSort.col===col ? { col, dir: this.clubSort.dir==='asc'?'desc':'asc' } : { col, dir: 'desc' };
  }
  sortIcon(col: keyof ClubSummary) { return this.clubSort.col!==col?'↕':this.clubSort.dir==='asc'?'↑':'↓'; }

  get regions() { return ['All', ...new Set(this.data?.sportByRegion.map(x=>x.regionName)??[]).values()].sort((a,b)=>a==='All'?-1:a.localeCompare(b)); }
  get filteredSportByRegion() { return !this.data?[]:this.selectedRegion==='All'?this.data.sportByRegion:this.data.sportByRegion.filter(x=>x.regionName===this.selectedRegion); }
  maxEnrollments() { return Math.max(1,...(this.data?.sportDemand.map(s=>s.totalEnrollments)??[1])); }
  barWidth(v: number) { return Math.round(v/this.maxEnrollments()*100)+'%'; }
  sar(n: number) { return new Intl.NumberFormat('en-SA',{maximumFractionDigits:0}).format(n)+' SAR'; }
  profitClass(n: number) { return n>=0?'pos':'neg'; }

  async exportExcel() {
    if (!this.data) return;
    this.exporting = true;
    try {
      const EX = await import('exceljs');
      const { saveAs } = await import('file-saver');
      const wb = new EX.Workbook();
      const hFill = (argb:string): ExcelJS.Fill => ({type:'pattern',pattern:'solid',fgColor:{argb}});
      const border: Partial<ExcelJS.Borders> = { top:{style:'thin',color:{argb:'FFD3D1C7'}}, bottom:{style:'thin',color:{argb:'FFD3D1C7'}}, left:{style:'thin',color:{argb:'FFD3D1C7'}}, right:{style:'thin',color:{argb:'FFD3D1C7'}} };
      const sar2 = '#,##0.00" SAR"';
      const applyHdr = (row: ExcelJS.Row, fill: string) => { row.eachCell((c:ExcelJS.Cell)=>{ c.fill=hFill(fill); c.font={bold:true,color:{argb:'FFFFFFFF'},size:10}; c.alignment={horizontal:'center',vertical:'middle'}; c.border=border; }); row.height=22; };

      const s1 = wb.addWorksheet('Club Summary',      { properties:{tabColor:{argb:'FF00D4FF'}} });
      s1.columns = [{header:'Club',key:'clubNameEn',width:24},{header:'Code',key:'clubCode',width:12},{header:'City',key:'cityName',width:14},{header:'Region',key:'regionName',width:18},{header:'Students',key:'totalStudents',width:12},{header:'Events',key:'activeEvents',width:10},{header:'Enrollments',key:'totalEnrollments',width:14},{header:'Revenue',key:'totalRevenue',width:16},{header:'Expenses',key:'totalExpenses',width:16},{header:'Net Profit',key:'netProfit',width:16},{header:'Outstanding',key:'outstanding',width:16},{header:'Collection %',key:'collectionRate',width:14},{header:'Rev/Student',key:'revenuePerStudent',width:14},{header:'Cost/Student',key:'costPerStudent',width:14},{header:'Last Activity',key:'lastActivityDate',width:16}];
      applyHdr(s1.getRow(1),'FF0B5345');
      this.data.clubSummaries.forEach(r=>{ const row=s1.addRow(r); [8,9,10,11,13,14].forEach(i=>{row.getCell(i).numFmt=sar2;}); row.getCell(12).numFmt='0.0"%"'; row.eachCell((c:ExcelJS.Cell)=>{c.border=border;c.font={size:10};}); });

      const s2 = wb.addWorksheet('Sport Demand',      { properties:{tabColor:{argb:'FF7F77DD'}} });
      s2.columns = [{header:'Sport',key:'sport',width:24},{header:'Enrollments',key:'totalEnrollments',width:16},{header:'Clubs',key:'clubCount',width:10},{header:'Avg Price',key:'avgPrice',width:14},{header:'Min Price',key:'minPrice',width:14},{header:'Max Price',key:'maxPrice',width:14},{header:'Suggested Price',key:'suggestedPrice',width:20}];
      applyHdr(s2.getRow(1),'FF534AB7');
      this.data.sportDemand.forEach(r=>{ const row=s2.addRow(r); [4,5,6,7].forEach(i=>{row.getCell(i).numFmt=sar2;}); row.eachCell((c:ExcelJS.Cell)=>{c.border=border;c.font={size:10};}); });

      const s3 = wb.addWorksheet('Regional Breakdown', { properties:{tabColor:{argb:'FFBA7517'}} });
      s3.columns = [{header:'Region',key:'regionName',width:22},{header:'Sport',key:'sport',width:20},{header:'Enrollments',key:'enrollments',width:14},{header:'Avg Price',key:'avgPrice',width:14},{header:'Clubs',key:'clubCount',width:10}];
      applyHdr(s3.getRow(1),'FF854F0B');
      this.data.sportByRegion.forEach(r=>{ const row=s3.addRow(r); row.getCell(4).numFmt=sar2; row.eachCell((c:ExcelJS.Cell)=>{c.border=border;c.font={size:10};}); });

      const s4 = wb.addWorksheet('Event Types',        { properties:{tabColor:{argb:'FFD85A30'}} });
      s4.columns = [{header:'Event Type',key:'eventType',width:18},{header:'Events',key:'eventCount',width:10},{header:'Enrollments',key:'totalEnrollments',width:14},{header:'Avg Price',key:'avgPrice',width:14},{header:'Revenue',key:'totalRevenue',width:16}];
      applyHdr(s4.getRow(1),'FF993C1D');
      this.data.eventTypes.forEach(r=>{ const row=s4.addRow(r); [4,5].forEach(i=>{row.getCell(i).numFmt=sar2;}); row.eachCell((c:ExcelJS.Cell)=>{c.border=border;c.font={size:10};}); });

      const buf = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}), `Master-Analytics_${this.fromDate}_to_${this.toDate}.xlsx`);
    } catch(e){ console.error(e); alert('Export failed.'); } finally { this.exporting=false; }
  }

  goBack() { this.router.navigate(['/master-admin']); }
}
