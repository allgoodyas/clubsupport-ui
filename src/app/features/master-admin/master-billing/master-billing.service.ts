import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

const BASE = `${environment.apiUrl}/master/billing`;

export interface ServiceCatalogue {
  serviceId: number; serviceCode: string; nameEn: string; nameAr: string;
  description: string; chargeType: string; defaultPrice: number;
  unitLabel: string; freeTierUnits: number; isActive: boolean;
  displayOrder: number; category: string; icon: string;
}

export interface ClubServiceSub {
  subscriptionId: number; clubId: number; serviceId: number;
  nameEn: string; nameAr: string; chargeType: string; category: string; icon: string;
  isEnabled: boolean; defaultPrice: number; customPrice: number | null;
  effectivePrice: number; discountPct: number; finalPrice: number;
  billingCycle: string; freeTierOverride: number | null; notes: string;
  freeTierUnits: number;  // from master_service_catalogue
}

export interface AdhocCharge {
  adhocId: number; clubId: number; clubNameEn: string; serviceId: number | null;
  description: string; amount: number; billingMode: string; status: string;
  masterInvoiceId: number | null; notes: string; createdAt: string;
}

export interface MasterInvoice {
  masterInvoiceId: number; invoiceNumber: string; clubId: number;
  clubNameEn: string; clubCode: string;
  periodFrom: string; periodTo: string;
  subtotal: number; discountTotal: number; taxPct: number; taxAmount: number;
  totalAmount: number; amountPaid: number; amountDue: number;
  invoiceDate: string; dueDate: string; status: string; invoiceType: string;
  studentCountSnapshot: number | null; notes: string;
  lines: MasterInvoiceLine[];
}

export interface MasterInvoiceLine {
  lineId: number; serviceId: number | null; description: string;
  quantity: number; unitPrice: number; discountPct: number; lineTotal: number;
  isAdhoc: boolean; isCredit: boolean; sortOrder: number;
}

export interface BillingDashboardRow {
  clubId: number; clubNameEn: string; clubCode: string;
  activeServices: number; estMonthlyValue: number;
  totalInvoices: number; totalInvoiced: number;
  totalPaid: number; totalOutstanding: number;
  lastInvoiceDate: string; lastInvoiceStatus: string;
}

@Injectable({ providedIn: 'root' })
export class MasterBillingService {
  constructor(private http: HttpClient) {}

  // Catalogue
  getServices(): Observable<ServiceCatalogue[]>     { return this.http.get<ServiceCatalogue[]>(`${BASE}/services`); }
  createService(d: any): Observable<any>            { return this.http.post(`${BASE}/services`, d); }
  updateService(id: number, d: any): Observable<any>{ return this.http.put(`${BASE}/services/${id}`, d); }
  deleteService(id: number): Observable<any>        { return this.http.delete(`${BASE}/services/${id}`); }

  // Club services
  getClubServices(clubId: number): Observable<ClubServiceSub[]> { return this.http.get<ClubServiceSub[]>(`${BASE}/club/${clubId}/services`); }
  saveClubServices(clubId: number, d: any): Observable<any>     { return this.http.post(`${BASE}/club/${clubId}/services`, d); }

  // Adhoc
  getAdhoc(clubId?: number): Observable<AdhocCharge[]> { return this.http.get<AdhocCharge[]>(`${BASE}/adhoc`, { params: clubId ? { clubId } : {} }); }
  createAdhoc(d: any): Observable<any>                 { return this.http.post(`${BASE}/adhoc`, d); }
  cancelAdhoc(id: number): Observable<any>             { return this.http.delete(`${BASE}/adhoc/${id}`); }

  // Invoices
  getInvoices(clubId?: number, status?: string): Observable<MasterInvoice[]> {
    const p: any = {};
    if (clubId) p['clubId'] = clubId;
    if (status) p['status'] = status;
    return this.http.get<MasterInvoice[]>(`${BASE}/invoices`, { params: p });
  }
  getInvoice(id: number): Observable<MasterInvoice>   { return this.http.get<MasterInvoice>(`${BASE}/invoices/${id}`); }
  generateInvoice(d: any): Observable<any>             { return this.http.post(`${BASE}/invoices/generate`, d); }
  updateStatus(id: number, s: string): Observable<any> { return this.http.patch(`${BASE}/invoices/${id}/status`, JSON.stringify(s), { headers: {'Content-Type':'application/json'} }); }
  recordPayment(id: number, d: any): Observable<any>   { return this.http.post(`${BASE}/invoices/${id}/payment`, d); }

  // Dashboard
  getDashboard(): Observable<BillingDashboardRow[]>    { return this.http.get<BillingDashboardRow[]>(`${BASE}/dashboard`); }
}
