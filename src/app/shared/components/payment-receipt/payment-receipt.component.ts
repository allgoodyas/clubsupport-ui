// payment-receipt.component.ts
// Printable receipt for payment confirmation

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

interface PaymentReceipt {
  receiptNumber: string;
  paymentDate: Date;
  studentName: string;
  studentId: number;
  eventName: string;
  eventId: number;
  invoiceNumber?: string;
  totalAmount: number;
  amountPaid: number;
  paymentMethods: PaymentMethodDetail[];
  notes?: string;
  isFullPayment: boolean;
  remainingBalance?: number;
}

interface PaymentMethodDetail {
  methodType: string;
  amount: number;
  referenceNumber?: string;
}

@Component({
  selector: 'app-payment-receipt',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-receipt.component.html',
  styleUrls: ['./payment-receipt.component.scss']
})
export class PaymentReceiptComponent {
  @Input() receiptData: PaymentReceipt | null = null;
  @Input() isOpen: boolean = false;
  @Output() closeReceipt = new EventEmitter<void>();

  constructor() {}

  // Print receipt
  printReceipt(): void {
    window.print();
  }

  // Download as PDF (uses browser print to PDF)
  downloadPDF(): void {
    window.print(); // User can select "Save as PDF" in print dialog
  }

  // Close receipt
  close(): void {
    this.closeReceipt.emit();
  }

  // Get payment method icon
  getMethodIcon(methodType: string): string {
    const icons: { [key: string]: string } = {
      'Cash': '💵',
      'BankTransfer': '🏦',
      'Card': '💳',
      'Online': '🌐',
      'STCPay': '📱',
      'Mada': '💳',
      'Check': '📝',
      'LoyaltyPoints': '⭐'
    };
    return icons[methodType] || '💰';
  }

  // Get current date/time for display
  getCurrentDateTime(): string {
    return new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Format currency - handles undefined/null
  formatCurrency(amount: number | undefined): string {
    return (amount ?? 0).toFixed(2);
  }
}
