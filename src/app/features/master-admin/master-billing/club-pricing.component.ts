import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { MasterBillingService, ClubServiceSub, AdhocCharge } from './master-billing.service';

interface Club { clubId: number; clubNameEn: string; clubCode: string; }

@Component({
  selector: 'app-club-pricing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './club-pricing.component.html',
  styleUrls: ['./master-billing.shared.scss']
})
export class ClubPricingComponent implements OnInit {
  clubs: Club[]           = [];
  services: ClubServiceSub[] = [];
  adhocList: AdhocCharge[] = [];

  selectedClubId: number | null = null;
  loading  = false;
  saving   = false;
  error    = '';
  tab: 'services' | 'adhoc' = 'services';

  // Adhoc form
  showAdhocForm = false;
  adhocForm: any = { description:'', amount:0, billingMode:'next_invoice', notes:'' };

  constructor(
    private svc: MasterBillingService,
    private http: HttpClient,
    public router: Router
  ) {}

  ngOnInit() {
    this.http.get<Club[]>(`${environment.apiUrl}/master/clubs`)
      .subscribe(r => this.clubs = r);
  }

  selectClub(id: number) {
    this.selectedClubId = id;
    this.loadServices();
    this.loadAdhoc();
  }

  loadServices() {
    if (!this.selectedClubId) return;
    this.loading = true;
    this.svc.getClubServices(this.selectedClubId).subscribe({
      next: r  => { this.services = r; this.loading = false; },
      error: e => { this.error = e.error?.message || 'Failed'; this.loading = false; }
    });
  }

  loadAdhoc() {
    if (!this.selectedClubId) return;
    this.svc.getAdhoc(this.selectedClubId).subscribe(r => this.adhocList = r);
  }

  saveServices() {
    if (!this.selectedClubId) return;
    this.saving = true;
    const payload = {
      services: this.services.map(s => ({
        serviceId:       s.serviceId,
        isEnabled:       s.isEnabled,
        customPrice:     s.customPrice || null,
        discountPct:     s.discountPct || 0,
        billingCycle:    s.billingCycle || 'monthly',
        freeTierOverride:s.freeTierOverride || null,
        notes:           s.notes || ''
      }))
    };
    this.svc.saveClubServices(this.selectedClubId, payload).subscribe({
      next: () => { this.saving = false; this.loadServices(); },
      error: e => { this.error = e.error?.message || 'Save failed'; this.saving = false; }
    });
  }

  computeFinal(s: ClubServiceSub): number {
    const price = s.customPrice ?? s.defaultPrice;
    return Math.round(price * (1 - (s.discountPct || 0) / 100) * 100) / 100;
  }

  totalMonthly(): number {
    return this.services
      .filter(s => s.isEnabled)
      .reduce((sum, s) => sum + this.computeFinal(s), 0);
  }

  createAdhoc() {
    if (!this.selectedClubId) return;
    this.saving = true;
    this.svc.createAdhoc({ ...this.adhocForm, clubId: this.selectedClubId }).subscribe({
      next: () => {
        this.saving = false; this.showAdhocForm = false;
        this.adhocForm = { description:'', amount:0, billingMode:'next_invoice', notes:'' };
        this.loadAdhoc();
      },
      error: e => { this.error = e.error?.message || 'Failed'; this.saving = false; }
    });
  }

  cancelAdhoc(id: number) {
    if (!confirm('Cancel this charge?')) return;
    this.svc.cancelAdhoc(id).subscribe(() => this.loadAdhoc());
  }

  selectedClubName(): string {
    return this.clubs.find(c => c.clubId === this.selectedClubId)?.clubNameEn ?? '';
  }
}
