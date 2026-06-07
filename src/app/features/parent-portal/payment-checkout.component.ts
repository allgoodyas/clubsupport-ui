import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ParentService, ParentInvoice, PayInvoicesRequest } from '../../core/services/parent.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-payment-checkout',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './payment-checkout.component.html',
  styleUrls: ['./payment-checkout.component.scss']
})
export class PaymentCheckoutComponent implements OnInit {
  invoices: ParentInvoice[] = [];
  paymentMethod: string = 'cash';
  notes: string = '';
  isProcessing = false;
  isLoading = false;
  error: string | null = null;

  constructor(
    private parentService: ParentService,
    private router: Router,
    private route: ActivatedRoute,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const invoiceIds = params['invoiceIds'];
      if (invoiceIds) {
        const ids = invoiceIds.split(',').map((id: string) => +id);
        this.loadInvoiceDetails(ids);
      } else {
        this.toastService.showError('No invoices selected');
        this.router.navigate(['/parent/invoices']);
      }
    });
  }

  loadInvoiceDetails(invoiceIds: number[]) {
    this.isLoading = true;
    this.error = null;

    // Load details for each invoice
    const loadPromises = invoiceIds.map(id => 
      this.parentService.getInvoiceDetails(id).toPromise()
    );

    Promise.all(loadPromises)
      .then(responses => {
        this.invoices = responses
          .filter(r => r && r.success)
          .map(r => r!.invoice);
        this.isLoading = false;

        if (this.invoices.length === 0) {
          this.error = 'No valid invoices found';
        }
      })
      .catch(err => {
        console.error('Error loading invoice details:', err);
        this.error = 'Error loading invoice details';
        this.isLoading = false;
        this.toastService.showError('❌ Error loading invoices');
      });
  }

  getTotalAmount(): number {
    return this.invoices.reduce((sum, inv) => sum + inv.amountDue, 0);
  }

  processPayment() {
    if (this.isProcessing) return;

    if (this.invoices.length === 0) {
      this.toastService.showWarning('No invoices to pay');
      return;
    }

    this.isProcessing = true;

    const request: PayInvoicesRequest = {
      invoiceIds: this.invoices.map(inv => inv.invoiceId),
      paymentMethod: this.paymentMethod,
      notes: this.notes || undefined
    };

    this.parentService.paySelectedInvoices(request).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastService.showSuccess('✅ Payment successful!');
          this.router.navigate(['/parent/payments/success'], {
            queryParams: {
              receiptNumbers: response.receiptNumbers.join(','),
              amount: response.totalAmount,
              count: response.invoicesPaid
            }
          });
        } else {
          this.toastService.showError('❌ Payment failed: ' + response.message);
          this.isProcessing = false;
        }
      },
      error: (err) => {
        console.error('Payment error:', err);
        this.toastService.showError('❌ Payment failed. Please try again.');
        this.isProcessing = false;
      }
    });
  }

  cancel() {
    this.router.navigate(['/parent/invoices']);
  }

  formatCurrency(amount: number): string {
    return `${amount.toFixed(2)} SAR`;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
