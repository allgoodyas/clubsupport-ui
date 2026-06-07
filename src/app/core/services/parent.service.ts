import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

// ===================================================
// INTERFACES / DTOs
// ===================================================

export interface DashboardSummary {
  totalChildren: number;
  totalActiveEnrollments: number;
  totalPendingInvoices: number;
  totalPendingAmount: number;
  activeSubscriptions: number;
}

export interface ChildSummary {
  parentUserId: number;
  studentId: number;
  studentName: string;
  dateOfBirth: string;
  gender: string;
  age: number;
  clubId: number;
  activeEnrollments: number;
  pendingInvoiceCount: number;
  pendingAmount: number;
  activeSubscriptionId?: number;
  subscriptionPlanName?: string;
  photoUrl?: string;  // Will be constructed from StudentController endpoint
}

export interface ChildEnrollment {
  enrollmentId: number;
  eventId: number;
  eventName: string;
  eventNameAr?: string;
  startDate: string;
  endDate: string;
  eventType: string;
  sport?: string;
  enrollmentDate: string;
  isActive: boolean;
}

export interface ParentInvoice {
  parentUserId: number;
  invoiceId: number;
  invoiceNumber: string;
  studentId: number;
  studentName: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  status: string;
  invoiceType?: string;
  notes?: string;
  parentNotes?: string;
  enrollmentId?: number;
  eventName?: string;
  eventNameAr?: string;
  isOverdue: boolean;
  daysUntilDue: number;
}

export interface InvoiceLineItem {
  itemId: number;
  invoiceId: number;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PaymentHistory {
  parentUserId: number;
  paymentId: number;
  receiptNumber: string;
  studentId: number;
  studentName: string;
  amount: number;
  paymentDate: string;
  notes?: string;
  paymentSource: string;
  invoiceNumbers?: string;
  totalAllocated: number;
}

export interface PaymentReceipt {
  paymentId: number;
  receiptNumber: string;
  studentId: number;
  studentName: string;
  amount: number;
  paymentDate: string;
  notes?: string;
  clubName: string;
  clubNameAr?: string;
}

export interface PaymentAllocation {
  amountAllocated: number;
  invoiceNumber: string;
  invoiceDate: string;
}

export interface PayInvoicesRequest {
  invoiceIds: number[];
  paymentMethod?: string;
  notes?: string;
}

export interface PayInvoicesResponse {
  success: boolean;
  message: string;
  paymentIds: number[];
  receiptNumbers: string[];
  totalAmount: number;
  invoicesPaid: number;
}

// ===================================================
// SERVICE
// ===================================================

@Injectable({
  providedIn: 'root'
})
export class ParentService {
  
  constructor(private apiService: ApiService) {}

  // ===================================================
  // DASHBOARD APIs
  // ===================================================

  getDashboardSummary(): Observable<{ success: boolean; summary: DashboardSummary; recentActivity: any[] }> {
    return this.apiService.get('ParentDashboard/summary');
  }

  getMyChildren(): Observable<{ success: boolean; children: ChildSummary[] }> {
    return this.apiService.get('ParentDashboard/children');
  }

  getChildDetails(studentId: number): Observable<{ 
    success: boolean; 
    student: ChildSummary; 
    enrollments: ChildEnrollment[] 
  }> {
    return this.apiService.get(`ParentDashboard/children/${studentId}`);
  }

  logActivity(activityType: string, studentId?: number, description?: string): Observable<any> {
    return this.apiService.post('ParentDashboard/log-activity', {
      studentId,
      activityType,
      description
    });
  }

  // ===================================================
  // INVOICE APIs
  // ===================================================

  getAllPendingInvoices(): Observable<{ 
    success: boolean; 
    invoices: ParentInvoice[]; 
    summary: {
      totalInvoices: number;
      totalPendingAmount: number;
      overdueCount: number;
    }
  }> {
    return this.apiService.get('ParentInvoice/pending');
  }

  getPendingInvoicesByChild(studentId: number): Observable<{ 
    success: boolean; 
    invoices: ParentInvoice[];
    summary: {
      studentId: number;
      totalInvoices: number;
      totalPendingAmount: number;
    }
  }> {
    return this.apiService.get(`ParentInvoice/pending/${studentId}`);
  }

  getInvoiceDetails(invoiceId: number): Observable<{ 
    success: boolean; 
    invoice: ParentInvoice;
    lineItems: InvoiceLineItem[];
  }> {
    return this.apiService.get(`ParentInvoice/${invoiceId}`);
  }

  getInvoicePaymentHistory(): Observable<{ 
    success: boolean; 
    payments: PaymentHistory[] 
  }> {
    return this.apiService.get('ParentInvoice/payment-history');
  }

  // ===================================================
  // PAYMENT APIs
  // ===================================================

  paySelectedInvoices(request: PayInvoicesRequest): Observable<PayInvoicesResponse> {
    return this.apiService.post('ParentPayment/pay-selected', request);
  }

  getPaymentReceipt(paymentId: number): Observable<{ 
    success: boolean; 
    receipt: PaymentReceipt;
    allocations: PaymentAllocation[];
  }> {
    return this.apiService.get(`ParentPayment/receipt/${paymentId}`);
  }

  getPaymentHistory(page: number = 1, pageSize: number = 20): Observable<{ 
    success: boolean; 
    payments: PaymentHistory[];
    pagination: {
      currentPage: number;
      pageSize: number;
      totalRecords: number;
      totalPages: number;
    }
  }> {
    return this.apiService.get(`ParentPayment/history?page=${page}&pageSize=${pageSize}`);
  }
}
