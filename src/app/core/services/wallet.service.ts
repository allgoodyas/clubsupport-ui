import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WalletService {
  private api = `${environment.apiUrl}/wallet`;

  constructor(private http: HttpClient) {}

  getWallet(parentId: number): Observable<any> {
    return this.http.get<any>(`${this.api}/${parentId}`);
  }

  getTransactions(parentId: number, page = 1, size = 20): Observable<any> {
    return this.http.get<any>(`${this.api}/${parentId}/transactions?page=${page}&size=${size}`);
  }

  topUp(parentId: number, dto: {
    amount: number;
    description?: string;
    reference?: string;
    paymentMethod?: string;
    recordAsPayment?: boolean;
  }): Observable<any> {
    return this.http.post<any>(`${this.api}/${parentId}/topup`, dto);
  }

  payInvoice(parentId: number, dto: {
    invoiceIds: number[];
    walletAmount: number;
    cashAmount: number;
    paymentMethod?: string;
    reference?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.api}/${parentId}/pay-invoice`, dto);
  }

  getParentList(): Observable<any> {
    return this.http.get<any>(`${this.api}/parent-list`);
  }
}
