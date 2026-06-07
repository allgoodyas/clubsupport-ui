import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './payment-success.component.html',
  styleUrls: ['./payment-success.component.scss']
})
export class PaymentSuccessComponent implements OnInit {
  receiptNumbers: string[] = [];
  totalAmount: number = 0;
  invoiceCount: number = 0;
  currentDate: Date = new Date();

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['receiptNumbers']) {
        this.receiptNumbers = params['receiptNumbers'].split(',');
      }
      this.totalAmount = +params['amount'] || 0;
      this.invoiceCount = +params['count'] || 0;

      // If no data, redirect back
      if (this.receiptNumbers.length === 0) {
        this.router.navigate(['/parent/dashboard']);
      }
    });
  }

  goToDashboard() {
    this.router.navigate(['/parent/dashboard']);
  }

  viewPaymentHistory() {
    this.router.navigate(['/parent/payments/history']);
  }

  formatCurrency(amount: number): string {
    return `${amount.toFixed(2)} SAR`;
  }

  printReceipt() {
    window.print();
  }
}
