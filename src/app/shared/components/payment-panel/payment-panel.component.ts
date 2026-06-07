import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { PaymentReceiptComponent } from '../payment-receipt/payment-receipt.component';

interface StudentInvoice {
  invoiceId: number; invoiceNumber: string; invoiceType: string;
  invoiceDate: string; dueDate: string; totalAmount: number;
  amountPaid: number; amountDue: number; status: string; notes?: string;
  enrollmentId?: number; eventId?: number; eventName?: string;
  eventType?: string; sport?: string; eventStartDate?: string;
  eventEndDate?: string; paymentCount: number; lastPaymentDate?: string;
}

interface EnrolledStudent {
  enrollmentId: number; studentId: number; studentName: string;
  age: number; gender: string; invoiceId?: number | null;
  invoiceNumber?: string; totalAmount: number; amountPaid: number;
  amountDue: number; paymentStatus: string; hasBalance: boolean;
}

interface PaymentMethod {
  methodType: string; amount: number; referenceNumber: string; notes: string;
}

@Component({
  selector: 'app-payment-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, PaymentReceiptComponent],
  templateUrl: './payment-panel.component.html',
  styleUrls: ['./payment-panel.component.scss']
})
export class PaymentPanelComponent implements OnInit, OnChanges {

  @Input() mode: 'event' | 'student' = 'event';
  @Input() eventId?: number;
  @Input() studentId?: number;
  @Input() eventName: string = '';
  @Input() isOpen: boolean = false;
  @Input() disableOverlayClose: boolean = false;
  @Input() preSelectPayment?: {
    studentId: number; eventId: number; invoiceId?: number | null;
    studentName: string; amountDue: number; amountPaid: number;
    totalAmount: number; invoiceNumber?: string; eventName?: string;
  };

  @Output() closePanel      = new EventEmitter<void>();
  @Output() paymentRecorded = new EventEmitter<void>();

  showReceipt = false;
  receiptData: any = null;

  // Student mode
  invoices: StudentInvoice[] = []; filteredInvoices: StudentInvoice[] = [];
  selectedInvoice: StudentInvoice | null = null; loadingInvoices = false;
  statusFilter = 'all'; fromDate = ''; toDate = '';

  // Event mode
  students: EnrolledStudent[] = [];
  selectedStudent: EnrolledStudent | null = null;
  loadingStudents = false;

  // Payment flow
  currentStep = 1; totalSteps = 3;
  paymentAmount = 0; isFullPayment = false;
  paymentMethods: PaymentMethod[] = [];

  availableMethods = [
    { value: 'Cash',         label: '💵 Cash' },
    { value: 'BankTransfer', label: '🏦 Bank Transfer' },
    { value: 'Card',         label: '💳 Card' },
    { value: 'Online',       label: '🌐 Online' },
    { value: 'STCPay',       label: '📱 STC Pay' },
    { value: 'Mada',         label: '💳 Mada' },
    { value: 'Check',        label: '📝 Check' },
    { value: 'Wallet',       label: '👛 Wallet' }
  ];

  paymentNotes = '';
  isProcessing = false;

  // ── Wallet (loaded in step 2, used as method in step 3) ───────────────────
  walletBalance = 0;
  walletLoaded  = false;
  parentId      = 0;

  /** Amount entered in any Wallet method row */
  get walletMethodAmount(): number {
    return this.paymentMethods
      .filter(m => m.methodType === 'Wallet')
      .reduce((s, m) => s + (m.amount || 0), 0);
  }

  loadWalletBalance(studentId: number): void {
    this.walletLoaded  = false;
    this.walletBalance = 0;
    this.parentId      = 0;

    this.http.get<any>(`${environment.apiUrl}/students/${studentId}`).subscribe({
      next: s => {
        const pId = s.parentId ?? s.parentUserId ?? s.parent_id ?? s.ParentId;
        if (!pId) return;
        this.parentId = pId;
        this.http.get<any>(`${environment.apiUrl}/wallet/${pId}`).subscribe({
          next: r => {
            if (r.success) {
              this.walletBalance = r.wallet?.balance ?? 0;
              this.walletLoaded  = true;
            }
          }
        });
      }
    });
  }

  /** Called when admin changes method type dropdown */
  onMethodTypeChange(method: PaymentMethod): void {
    if (method.methodType === 'Wallet') {
      // Recalculate how much is still unallocated (excluding this method's current amount)
      const othersTotal = this.paymentMethods
        .filter(m => m !== method)
        .reduce((s, m) => s + (m.amount || 0), 0);
      const remaining = this.paymentAmount - othersTotal;
      // Auto-fill: min(walletBalance, remaining needed)
      method.amount = Math.min(this.walletBalance, Math.max(0, remaining));
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  constructor(private http: HttpClient) {}

  ngOnInit(): void { if (this.isOpen) this.initializePanel(); }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['eventId']   && !changes['eventId'].firstChange)   { this.students = []; this.selectedStudent = null; }
    if (changes['studentId'] && !changes['studentId'].firstChange) { this.invoices = []; this.selectedInvoice = null; }
    if (this.isOpen) this.initializePanel();
    else             this.resetPanel();
  }

  initializePanel(): void {
    if (this.preSelectPayment) {
      this.mode = 'event';
      this.selectedStudent = {
        enrollmentId: 0, studentId: this.preSelectPayment.studentId,
        studentName: this.preSelectPayment.studentName, age: 0, gender: '',
        invoiceId: this.preSelectPayment.invoiceId ?? undefined,
        invoiceNumber: this.preSelectPayment.invoiceNumber,
        totalAmount: this.preSelectPayment.totalAmount,
        amountPaid:  this.preSelectPayment.amountPaid,
        amountDue:   this.preSelectPayment.amountDue,
        paymentStatus: 'Pending', hasBalance: true
      };
      this.eventId       = this.preSelectPayment.eventId;
      this.eventName     = this.preSelectPayment.eventName || this.eventName;
      this.paymentAmount = this.preSelectPayment.amountDue;
      this.updatePaymentType();
      this.loadWalletBalance(this.preSelectPayment.studentId);
      this.currentStep   = 2;
      return;
    }
    if (this.studentId) { this.mode = 'student'; if (!this.invoices.length) this.loadStudentInvoices(); }
    else if (this.eventId) { this.mode = 'event'; if (!this.students.length) this.loadEventStudents(); }
  }

  // ── Data ──────────────────────────────────────────────────────────────────

  loadStudentInvoices(): void {
    this.loadingInvoices = true;
    let url = `${environment.apiUrl}/Payment/student/${this.studentId}/invoices`;
    const p: string[] = [];
    if (this.statusFilter !== 'all') p.push(`status=${this.statusFilter}`);
    if (this.fromDate) p.push(`fromDate=${this.fromDate}`);
    if (this.toDate)   p.push(`toDate=${this.toDate}`);
    if (p.length) url += '?' + p.join('&');
    this.http.get<StudentInvoice[]>(url).subscribe({
      next:  inv => { this.invoices = inv; this.filteredInvoices = [...inv]; this.loadingInvoices = false; },
      error: err => { this.loadingInvoices = false; alert('Failed to load invoices: ' + (err.error?.message || err.message)); }
    });
  }

  applyFilters():  void { this.filteredInvoices = [...this.invoices]; }
  onFilterChange():void { this.loadStudentInvoices(); }
  clearFilters():  void { this.statusFilter = 'all'; this.fromDate = ''; this.toDate = ''; this.loadStudentInvoices(); }

  loadEventStudents(): void {
    this.loadingStudents = true;
    this.http.get<EnrolledStudent[]>(`${environment.apiUrl}/Payment/event/${this.eventId}/students`).subscribe({
      next:  s   => { this.students = s; this.loadingStudents = false; },
      error: err => { this.loadingStudents = false; alert('Failed to load students: ' + (err.error?.message || err.message)); }
    });
  }

  // ── Step 1 ────────────────────────────────────────────────────────────────

  selectInvoice(invoice: StudentInvoice): void {
    this.selectedInvoice = invoice;
    this.paymentAmount   = invoice.amountDue || 0;
    this.updatePaymentType();
    if (this.studentId) this.loadWalletBalance(this.studentId);
    this.goToStep(2);
  }

  selectStudent(student: EnrolledStudent): void {
    this.selectedStudent = student;
    this.paymentAmount   = student.amountDue || 0;
    this.updatePaymentType();
    this.loadWalletBalance(student.studentId);
    this.goToStep(2);
  }

  // ── Step 2 ────────────────────────────────────────────────────────────────

  onPaymentAmountChange(): void { this.updatePaymentType(); }

  updatePaymentType(): void {
    const due = this.mode === 'student' ? (this.selectedInvoice?.amountDue || 0) : (this.selectedStudent?.amountDue || 0);
    this.isFullPayment = due === 0 || this.paymentAmount >= due - 0.01;
  }

  getRemainingBalance(): number {
    const due = this.mode === 'student' ? (this.selectedInvoice?.amountDue || 0) : (this.selectedStudent?.amountDue || 0);
    return Math.max(0, due - this.paymentAmount);
  }

  validatePaymentAmount(): boolean {
    const total   = this.mode === 'student' ? (this.selectedInvoice?.totalAmount || 0) : (this.selectedStudent?.totalAmount || 0);
    const paid    = this.mode === 'student' ? (this.selectedInvoice?.amountPaid  || 0) : (this.selectedStudent?.amountPaid  || 0);
    const due     = this.mode === 'student' ? (this.selectedInvoice?.amountDue   || 0) : (this.selectedStudent?.amountDue   || 0);
    const newPaid = paid + this.paymentAmount;

    if (this.paymentAmount <= 0) { alert('Payment amount must be greater than zero'); return false; }
    if (newPaid > total + 0.01) {
      const over = newPaid - total;
      alert(`⚠️ OVERPAYMENT DETECTED\n\nTotal: ${total.toFixed(2)} SAR\nAlready Paid: ${paid.toFixed(2)} SAR\nBalance Due: ${due.toFixed(2)} SAR\n\nYour Payment: ${this.paymentAmount.toFixed(2)} SAR\nOverpayment: ${over.toFixed(2)} SAR\n\nPlease adjust the amount.`);
      return false;
    }
    return true;
  }

  // ── Step 3 ────────────────────────────────────────────────────────────────

  addPaymentMethod(): void {
    const remaining = this.getMethodsRemaining();
    this.paymentMethods.push({
      methodType: 'Cash',
      amount: remaining > 0 ? remaining : this.paymentAmount,
      referenceNumber: '', notes: ''
    });
  }

  removePaymentMethod(i: number): void { this.paymentMethods.splice(i, 1); }

  getTotalAllocated():  number { return this.paymentMethods.reduce((s, m) => s + (m.amount || 0), 0); }
  getMethodsRemaining():number { return this.paymentAmount - this.getTotalAllocated(); }

  isPaymentValid(): boolean {
    if (!this.paymentMethods.length) return false;
    if (this.getTotalAllocated() === 0) return false;
    // Wallet amount must not exceed balance
    if (this.walletMethodAmount > this.walletBalance + 0.01) return false;
    return Math.abs(this.getMethodsRemaining()) < 0.01;
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  goToStep(step: number): void { this.currentStep = step; }

  nextStep(): void {
    if (this.currentStep === 2 && !this.validatePaymentAmount()) return;
    if (this.currentStep === 2 && !this.paymentMethods.length) this.addPaymentMethod();
    if (this.currentStep < this.totalSteps) this.currentStep++;
  }

  previousStep(): void { if (this.currentStep > 1) this.currentStep--; }

  // ── Submit ────────────────────────────────────────────────────────────────

  recordPayment(): void {
    if (!this.isPaymentValid())      { alert('Please complete all payment details'); return; }
    if (!this.validatePaymentAmount()) return;

    // Separate wallet methods from cash methods
    const walletMethods = this.paymentMethods.filter(m => m.methodType === 'Wallet');
    const cashMethods   = this.paymentMethods.filter(m => m.methodType !== 'Wallet');
    const walletTotal   = walletMethods.reduce((s, m) => s + (m.amount || 0), 0);
    const cashTotal     = cashMethods.reduce(  (s, m) => s + (m.amount || 0), 0);

    this.isProcessing = true;

    const invoiceId = this.mode === 'student'
      ? this.selectedInvoice?.invoiceId
      : (this.selectedStudent?.invoiceId ?? undefined);

    const buildReceipt = (receiptNumber: string, extra?: any) => {
      this.isProcessing = false;
      const studentName   = this.mode === 'student' ? 'Student' : (this.selectedStudent?.studentName || 'Student');
      const invoiceNumber = this.mode === 'student' ? this.selectedInvoice?.invoiceNumber : this.selectedStudent?.invoiceNumber;
      const totalAmt      = this.mode === 'student' ? (this.selectedInvoice?.totalAmount || 0) : (this.selectedStudent?.totalAmount || 0);

      this.receiptData = {
        receiptNumber,
        paymentDate:      new Date(),
        studentName,
        studentId:        this.mode === 'student' ? this.studentId : this.selectedStudent?.studentId,
        eventName:        this.eventName || (this.mode === 'student' ? this.selectedInvoice?.eventName : '') || 'Event',
        eventId:          this.mode === 'student' ? this.selectedInvoice?.eventId : this.eventId,
        invoiceNumber:    extra?.invoiceNumber || invoiceNumber,
        totalAmount:      totalAmt,
        amountPaid:       this.paymentAmount,
        paymentMethods:   this.paymentMethods.map(m => ({ methodType: m.methodType, amount: m.amount, referenceNumber: m.referenceNumber })),
        notes:            this.paymentNotes,
        isFullPayment:    this.isFullPayment,
        remainingBalance: this.getRemainingBalance()
      };
      this.showReceipt = true;
      this.paymentRecorded.emit();
    };

    // ── Step A: Deduct wallet via API (if wallet method used) ─────────────
    const walletPromise: Promise<void> = (walletTotal > 0 && this.parentId)
      ? new Promise((resolve, reject) => {
          this.http.post<any>(`${environment.apiUrl}/wallet/${this.parentId}/pay-invoice`, {
            invoiceIds:   invoiceId ? [invoiceId] : [],
            walletAmount: walletTotal,
            cashAmount:   0
          }).subscribe({
            next:  r => r.success ? resolve() : reject(new Error(r.message || 'Wallet payment failed')),
            error: e => reject(new Error(e.error?.message || 'Wallet error'))
          });
        })
      : Promise.resolve();

    walletPromise.then(() => {

      // ── Fully paid by wallet → show receipt ──────────────────────────────
      if (cashTotal < 0.01) {
        buildReceipt('WALLET-' + Date.now());
        return;
      }

      // ── Step B: Record cash portion via Payment/split ─────────────────────
      const paymentData: any = {
        totalAmount:    cashTotal,
        notes:          this.paymentNotes || (walletTotal > 0 ? `Wallet: ${walletTotal.toFixed(2)} SAR + Cash: ${cashTotal.toFixed(2)} SAR` : null),
        paymentMethods: cashMethods.map(m => ({
          methodType:      m.methodType,
          amount:          m.amount,
          referenceNumber: m.referenceNumber || null,
          notes:           m.notes || null
        }))
      };

      if (this.mode === 'student' && this.selectedInvoice) {
        paymentData.studentId = this.studentId;
        paymentData.invoiceId = this.selectedInvoice.invoiceId;
        paymentData.eventId   = this.selectedInvoice.eventId || 0;
      } else if (this.mode === 'event' && this.selectedStudent) {
        paymentData.studentId = this.selectedStudent.studentId;
        paymentData.eventId   = this.eventId || 0;
        if (this.selectedStudent.invoiceId) paymentData.invoiceId = this.selectedStudent.invoiceId;
      }

      this.http.post<any>(`${environment.apiUrl}/Payment/split`, paymentData).subscribe({
        next:  r => buildReceipt(r.receiptNumber, r),
        error: e => {
          this.isProcessing = false;
          alert('Failed to record payment:\n\n' + (e.error?.message || e.message || 'Unknown error'));
        }
      });

    }).catch(err => {
      this.isProcessing = false;
      alert('Wallet error: ' + err.message);
    });
  }

  // ── Close / Reset ─────────────────────────────────────────────────────────

  closeReceipt(): void { this.showReceipt = false; this.receiptData = null; this.close(); }
  close():        void { this.closePanel.emit(); }

  resetPanel(): void {
    this.currentStep = 1; this.selectedStudent = null; this.selectedInvoice = null;
    this.paymentAmount = 0; this.isFullPayment = false; this.paymentMethods = [];
    this.paymentNotes = ''; this.isProcessing = false; this.students = [];
    this.invoices = []; this.filteredInvoices = []; this.loadingStudents = false;
    this.loadingInvoices = false; this.preSelectPayment = undefined;
    this.walletBalance = 0; this.walletLoaded = false; this.parentId = 0;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  getStatusBadgeClass(s: string): string {
    return ({ Paid: 'status-paid', Partial: 'status-partial', Sent: 'status-unpaid', Overdue: 'status-overdue' } as any)[s] || 'status-default';
  }

  getInvoiceTypeIcon(t: string): string {
    return ({ enrollment: '🎓', subscription: '📅', manual: '📝', membership: '🏅' } as any)[t] || '📄';
  }
}
