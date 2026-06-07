import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EventsService } from '../../../core/services/events.service';
import { ToastService } from '../../../core/services/toast.service';
import { ThemeService } from '../../../core/services/theme.service';
import { EventDetails } from '../../../shared/models/event.model';
import { extractApiError } from '../../../core/utils/api-error.util';

@Component({
  selector: 'app-event-form',
  standalone: false,
  templateUrl: './event-form.component.html',
  styleUrls: ['./event-form.component.scss']
})
export class EventFormComponent implements OnInit {
  eventForm!: FormGroup;
  loading = false;
  submitted = false;
  
  // Mode detection
  mode: 'create' | 'edit' = 'create';
  eventId?: number;
  event?: EventDetails;
  isCloning = false; // Track if we're recreating an event

  eventTypes = [
    { value: 'Training', label: 'Training' },
    { value: 'Competition', label: 'Competition' },
    { value: 'Camp', label: 'Camp' },
    { value: 'Workshop', label: 'Workshop' }
  ];

  sports = ['Football', 'Basketball', 'Volleyball', 'Tennis', 'Swimming', 'Athletics', 'Gymnastics', 'Martial Arts', 'Other'];

  genderOptions = [
    { value: 'Both', label: 'Both' },
    { value: 'Male', label: 'Male Only' },
    { value: 'Female', label: 'Female Only' }
  ];

  skillLevels = [
    { value: 'All', label: 'All Levels' },
    { value: 'Beginner', label: 'Beginner' },
    { value: 'Intermediate', label: 'Intermediate' },
    { value: 'Advanced', label: 'Advanced' }
  ];

  recurrenceTypes = [
    { value: 'OneTime', label: 'One Time' },
    { value: 'Daily', label: 'Daily' },
    { value: 'Weekly', label: 'Weekly' },
    { value: 'Monthly', label: 'Monthly' }
  ];

  weekDays = [
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
    { value: 0, label: 'Sunday' }
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private eventsService: EventsService,
    private toastService: ToastService,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    // Load theme from storage for quick display
    this.themeService.loadThemeFromStorage();
    
    // Detect mode from route
    const id = this.route.snapshot.paramMap.get('id');
    const cloneId = this.route.snapshot.queryParamMap.get('clone');
    
    if (id) {
      this.mode = 'edit';
      this.eventId = Number(id);
    } else if (cloneId) {
      this.mode = 'create';
      this.isCloning = true;
    }

    this.initializeForm();

    if (this.mode === 'edit' && this.eventId) {
      this.loadEvent();
    } else if (this.isCloning && cloneId) {
      this.loadEventForCloning(Number(cloneId));
    }
  }

  initializeForm(): void {
    this.eventForm = this.fb.group({
      eventNameEn: ['', Validators.required],
      eventNameAr: [''],
      eventType: ['', Validators.required],
      sport: [''],
      description: [''],
      tags: [''],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required],
      isRecurring: [false],
      recurrenceType: ['OneTime'],
      recurrenceDays: [[]],
      recurrenceEndDate: [null],
      venueName: [''],
      venueAddress: [''],
      maxParticipants: ['', [Validators.required, Validators.min(1)]],
      minParticipants: [1, Validators.min(1)],
      minAge: [null],
      maxAge: [null],
      gender: ['Both'],
      skillLevel: ['All'],
      prerequisites: [''],
      requiresApproval: [false],
      isPaid: [true],
      priceIncludesTax: [true],
      actualPrice: [''],
      taxPercentage: [15],
      basePrice: [''],
      // ── Subscription fields
      isSubscription:  [false],
      priceMonthly:    [null],
      priceYearly:     [null],
      gracePeriodDays: [7],
      allowMultipleOffers: [false],
      maxDiscountPercentage: [100],
      allowCoupons: [true],
      allowCouponsWithOffers: [true],
      allowPartialPayment: [false],
      partialPaymentMinimum: [null],
      refundPolicy: ['Full'],
      refundPercentage: [100],
      siblingQuotaEnabled: [false],
      registrationStartDate: [null],
      registrationEndDate: [null],
      enableWaitlist: [false],
      waitlistCapacity: [null],
      autoConfirmEnrollment: [true],
      staffNotes: [''],
      equipmentNeeded: [''],
      whatToBring: [''],
      medicalRequirements: [''],
      requiresParentalConsent: [false],
      certificateProvided: [false],
      mealsIncluded: [false],
      transportationProvided: [false],
      isPublished: [false],
      isFeatured: [false]
    });

    this.eventForm.get('isSubscription')?.valueChanges.subscribe(isSub => {
      if (isSub) {
        // Subscription events use monthly/yearly pricing, not one-time isPaid
        this.eventForm.patchValue({ isPaid: false, actualPrice: null, basePrice: null });
      }
    });

    this.eventForm.get('isRecurring')?.valueChanges.subscribe(isRecurring => {
      if (!isRecurring) {
        this.eventForm.patchValue({ recurrenceType: 'OneTime', recurrenceDays: [] });
      }
    });

    this.eventForm.get('isPaid')?.valueChanges.subscribe(isPaid => {
      if (!isPaid) {
        this.eventForm.patchValue({ 
          actualPrice: null,
          basePrice: null,
          allowMultipleOffers: false,
          allowCoupons: false,
          allowPartialPayment: false
        });
      }
    });

    // Recompute total whenever actualPrice, taxPercentage, or priceIncludesTax changes
    const recompute = () => {
      const inclusive = this.eventForm.get('priceIncludesTax')?.value;
      const actual = parseFloat(this.eventForm.get('actualPrice')?.value) || 0;
      const taxPct = parseFloat(this.eventForm.get('taxPercentage')?.value) || 15;
      const total = inclusive ? actual : Math.round(actual * (1 + taxPct / 100) * 100) / 100;
      this.eventForm.patchValue({ basePrice: total || '' }, { emitEvent: false });
    };
    this.eventForm.get('actualPrice')?.valueChanges.subscribe(recompute);
    this.eventForm.get('taxPercentage')?.valueChanges.subscribe(recompute);
    this.eventForm.get('priceIncludesTax')?.valueChanges.subscribe(recompute);
  }

  loadEvent(): void {
    this.loading = true;
    this.eventsService.getEventById(this.eventId!).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.event = response.data;
          this.populateForm(response.data);
          this.loading = false;
        } else {
          this.toastService.showError('Event not found');
          this.router.navigate(['/events']);
        }
      },
      error: (error) => {
        console.error('Error loading event:', error);
        this.toastService.showError(extractApiError(error, 'Error loading event'));
        this.router.navigate(['/events']);
      }
    });
  }

  loadEventForCloning(eventId: number): void {
    this.loading = true;
    this.eventsService.getEventById(eventId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.event = response.data;
          this.populateFormForCloning(response.data);
          this.loading = false;
          this.toastService.showSuccess(`Recreating event: ${response.data.eventNameEn}`);
        } else {
          this.toastService.showError('Event not found');
          this.router.navigate(['/events']);
        }
      },
      error: (error) => {
        console.error('Error loading event for cloning:', error);
        this.toastService.showError(extractApiError(error, 'Error loading event for recreation'));
        this.router.navigate(['/events']);
      }
    });
  }

  populateForm(event: EventDetails): void {
    const formatDate = (dateStr: string) => {
      if (!dateStr) return null;
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0];
    };

    this.eventForm.patchValue({
      eventNameEn: event.eventNameEn,
      eventNameAr: event.eventNameAr,
      eventType: event.eventType,
      sport: event.sport,
      description: event.description,
      tags: event.tags ? event.tags.join(', ') : '',
      startDate: formatDate(event.startDate),
      endDate: formatDate(event.endDate),
      startTime: event.startTime,
      endTime: event.endTime,
      isRecurring: event.isRecurring,
      recurrenceType: event.recurrenceType || 'OneTime',
      recurrenceDays: event.recurrenceDays || [],
      recurrenceEndDate: event.recurrenceEndDate ? formatDate(event.recurrenceEndDate) : null,
      venueName: event.venueName,
      venueAddress: event.venueAddress,
      maxParticipants: event.maxParticipants,
      minParticipants: event.minParticipants,
      minAge: event.minAge,
      maxAge: event.maxAge,
      gender: event.gender || 'Both',
      skillLevel: event.skillLevel || 'All',
      prerequisites: event.prerequisites,
      requiresApproval: event.requiresApproval,
      isPaid: event.isPaid,
      priceIncludesTax: (event as any).priceIncludesTax ?? true,
      actualPrice: (event as any).actualPrice ?? event.basePrice,
      taxPercentage: (event as any).taxPercentage ?? 15,
      basePrice: event.basePrice,
      allowMultipleOffers: event.allowMultipleOffers,
      maxDiscountPercentage: event.maxDiscountPercentage,
      allowCoupons: event.allowCoupons,
      allowCouponsWithOffers: event.allowCouponsWithOffers,
      allowPartialPayment: event.allowPartialPayment,
      partialPaymentMinimum: event.partialPaymentMinimum,
      refundPolicy: event.refundPolicy,
      refundPercentage: event.refundPercentage,
      registrationStartDate: event.registrationStartDate ? formatDate(event.registrationStartDate) : null,
      registrationEndDate: event.registrationEndDate ? formatDate(event.registrationEndDate) : null,
      enableWaitlist: event.enableWaitlist,
      waitlistCapacity: event.waitlistCapacity,
      autoConfirmEnrollment: event.autoConfirmEnrollment,
      whatToBring: event.whatToBring,
      medicalRequirements: event.medicalRequirements,
      requiresParentalConsent: event.requiresParentalConsent,
      certificateProvided: event.certificateProvided,
      mealsIncluded: event.mealsIncluded,
      transportationProvided: event.transportationProvided,
      isPublished: event.isPublished,
      isFeatured: event.isFeatured,
      isSubscription:  (event as any).isSubscription  ?? false,
      priceMonthly:    (event as any).priceMonthly    ?? null,
      priceYearly:     (event as any).priceYearly     ?? null,
      gracePeriodDays: (event as any).gracePeriodDays ?? 7,
      siblingQuotaEnabled: (event as any).siblingQuotaEnabled ?? false
    });
  }

  populateFormForCloning(event: EventDetails): void {
    const formatDate = (dateStr: string) => {
      if (!dateStr) return null;
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0];
    };

    // Add 1 year to dates for recreation
    const addOneYear = (dateStr: string) => {
      if (!dateStr) return null;
      const date = new Date(dateStr);
      date.setFullYear(date.getFullYear() + 1);
      return date.toISOString().split('T')[0];
    };

    this.eventForm.patchValue({
      // Update event name to indicate it's a copy
      eventNameEn: `${event.eventNameEn} (Copy)`,
      eventNameAr: event.eventNameAr ? `${event.eventNameAr} (نسخة)` : '',
      eventType: event.eventType,
      sport: event.sport,
      description: event.description,
      tags: event.tags ? event.tags.join(', ') : '',
      
      // Add 1 year to dates
      startDate: addOneYear(event.startDate),
      endDate: addOneYear(event.endDate),
      startTime: event.startTime,
      endTime: event.endTime,
      
      // Keep recurring settings
      isRecurring: event.isRecurring,
      recurrenceType: event.recurrenceType || 'OneTime',
      recurrenceDays: event.recurrenceDays || [],
      recurrenceEndDate: event.recurrenceEndDate ? addOneYear(event.recurrenceEndDate) : null,
      
      // Keep location
      venueName: event.venueName,
      venueAddress: event.venueAddress,
      
      // Keep capacity settings
      maxParticipants: event.maxParticipants,
      minParticipants: event.minParticipants,
      
      // Keep eligibility
      minAge: event.minAge,
      maxAge: event.maxAge,
      gender: event.gender || 'Both',
      skillLevel: event.skillLevel || 'All',
      prerequisites: event.prerequisites,
      requiresApproval: event.requiresApproval,
      
      // Keep pricing
      isPaid: event.isPaid,
      basePrice: event.basePrice,
      allowMultipleOffers: event.allowMultipleOffers,
      maxDiscountPercentage: event.maxDiscountPercentage,
      allowCoupons: event.allowCoupons,
      allowCouponsWithOffers: event.allowCouponsWithOffers,
      allowPartialPayment: event.allowPartialPayment,
      partialPaymentMinimum: event.partialPaymentMinimum,
      refundPolicy: event.refundPolicy,
      refundPercentage: event.refundPercentage,
      
      // Add 1 year to registration dates
      registrationStartDate: event.registrationStartDate ? addOneYear(event.registrationStartDate) : null,
      registrationEndDate: event.registrationEndDate ? addOneYear(event.registrationEndDate) : null,
      
      // Keep registration settings
      enableWaitlist: event.enableWaitlist,
      waitlistCapacity: event.waitlistCapacity,
      autoConfirmEnrollment: event.autoConfirmEnrollment,
      
      // Keep requirements
      whatToBring: event.whatToBring,
      medicalRequirements: event.medicalRequirements,
      requiresParentalConsent: event.requiresParentalConsent,
      certificateProvided: event.certificateProvided,
      mealsIncluded: event.mealsIncluded,
      transportationProvided: event.transportationProvided,
      
      // Set as draft when recreating
      isPublished: false,
      isFeatured: false
    });
  }

  get f() {
    return this.eventForm.controls;
  }

  get pageTitle(): string {
    if (this.isCloning) return '🔄 Recreate Event';
    return this.mode === 'create' ? '➕ Create New Event' : '✏️ Edit Event';
  }

  get submitButtonText(): string {
    if (this.loading) {
      return this.mode === 'create' ? 'Creating...' : 'Updating...';
    }
    if (this.isCloning) {
      return this.eventForm.get('isPublished')?.value ? '✓ Publish Recreated Event' : '💾 Save Recreated Event';
    }
    return this.mode === 'create' 
      ? (this.eventForm.get('isPublished')?.value ? '✓ Publish Event' : '💾 Save Draft')
      : '💾 Update Event';
  }

  onRecurrenceDayToggle(day: number): void {
    const days = this.eventForm.get('recurrenceDays')?.value || [];
    const index = days.indexOf(day);
    if (index > -1) {
      days.splice(index, 1);
    } else {
      days.push(day);
    }
    this.eventForm.patchValue({ recurrenceDays: days.sort() });
  }

  isRecurrenceDaySelected(day: number): boolean {
    const days = this.eventForm.get('recurrenceDays')?.value || [];
    return days.includes(day);
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.eventForm.invalid) {
      this.toastService.showError('Please fill in all required fields');
      this.scrollToFirstError();
      return;
    }

    this.loading = true;
    const formValue = this.eventForm.value;
    
    const eventData: any = {
      eventNameEn: formValue.eventNameEn,
      eventNameAr: formValue.eventNameAr || null,
      eventType: formValue.eventType,
      sport: formValue.sport || null,
      description: formValue.description || null,
      tags: formValue.tags ? formValue.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t) : null,
      startDate: formValue.startDate,
      endDate: formValue.endDate,
      startTime: formValue.startTime,
      endTime: formValue.endTime,
      isRecurring: formValue.isRecurring,
      recurrenceType: formValue.isRecurring ? formValue.recurrenceType : null,
      recurrenceDays: formValue.isRecurring && formValue.recurrenceDays?.length > 0 ? formValue.recurrenceDays : null,
      recurrenceEndDate: formValue.recurrenceEndDate || null,
      excludedDates: null,
      venueName: formValue.venueName || null,
      venueAddress: formValue.venueAddress || null,
      maxParticipants: parseInt(formValue.maxParticipants) || 1,
      minParticipants: parseInt(formValue.minParticipants) || 1,
      minAge: formValue.minAge ? parseInt(formValue.minAge) : null,
      maxAge: formValue.maxAge ? parseInt(formValue.maxAge) : null,
      gender: formValue.gender || null,
      skillLevel: formValue.skillLevel || null,
      prerequisites: formValue.prerequisites || null,
      requiresApproval: formValue.requiresApproval,
      isPaid: formValue.isPaid,
      priceIncludesTax: formValue.priceIncludesTax,
      actualPrice: formValue.isPaid && formValue.actualPrice ? parseFloat(formValue.actualPrice) : null,
      taxPercentage: parseFloat(formValue.taxPercentage) || 15,
      basePrice: formValue.isPaid && formValue.basePrice ? parseFloat(formValue.basePrice) : null,
      allowMultipleOffers: formValue.allowMultipleOffers,
      maxDiscountPercentage: formValue.maxDiscountPercentage,
      allowCoupons: formValue.allowCoupons,
      allowCouponsWithOffers: formValue.allowCouponsWithOffers,
      paymentDeadline: null,
      allowPartialPayment: formValue.allowPartialPayment,
      partialPaymentMinimum: formValue.allowPartialPayment && formValue.partialPaymentMinimum ? parseFloat(formValue.partialPaymentMinimum) : null,
      refundPolicy: formValue.refundPolicy || null,
      refundDeadline: null,
      refundPercentage: formValue.refundPercentage,
      registrationStartDate: formValue.registrationStartDate || null,
      registrationEndDate: formValue.registrationEndDate || null,
      enableWaitlist: formValue.enableWaitlist,
      waitlistCapacity: formValue.enableWaitlist && formValue.waitlistCapacity ? parseInt(formValue.waitlistCapacity) : null,
      autoConfirmEnrollment: formValue.autoConfirmEnrollment,
      primaryInstructorId: null,
      staffNotes: formValue.staffNotes || null,
      equipmentNeeded: formValue.equipmentNeeded || null,
      bannerBase64: null,
      bannerContentType: null,
      bannerFileName: null,
      whatToBring: formValue.whatToBring || null,
      medicalRequirements: formValue.medicalRequirements || null,
      requiresParentalConsent: formValue.requiresParentalConsent,
      certificateProvided: formValue.certificateProvided,
      mealsIncluded: formValue.mealsIncluded,
      transportationProvided: formValue.transportationProvided,
      isPublished: formValue.isPublished,
      isFeatured: formValue.isFeatured,
      // subscription fields
      isSubscription:  formValue.isSubscription  ?? false,
      priceMonthly:    formValue.isSubscription && formValue.priceMonthly   ? parseFloat(formValue.priceMonthly)   : null,
      priceYearly:     formValue.isSubscription && formValue.priceYearly    ? parseFloat(formValue.priceYearly)    : null,
      gracePeriodDays: formValue.isSubscription ? (parseInt(formValue.gracePeriodDays) || 7) : 7,
      siblingQuotaEnabled: formValue.siblingQuotaEnabled ?? false
    };

    if (this.mode === 'create') {
      this.createEvent(eventData);
    } else {
      this.updateEvent(eventData);
    }
  }

  createEvent(eventData: any): void {
    this.eventsService.createEvent(eventData).subscribe({
      next: (response) => {
        if (response.success) {
          const message = this.isCloning ? 'Event recreated successfully!' : 'Event created successfully!';
          this.toastService.showSuccess(message);
          this.router.navigate(['/events']);
        } else {
          this.toastService.showError(response.message || 'Failed to create event');
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('Error creating event:', error);
        this.toastService.showError(extractApiError(error, 'Error creating event'));
        this.loading = false;
      }
    });
  }

  updateEvent(eventData: any): void {
    this.eventsService.updateEvent(this.eventId!, eventData).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastService.showSuccess('Event updated successfully!');
          this.router.navigate(['/events', this.eventId]);
        } else {
          this.toastService.showError(response.message || 'Failed to update event');
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('Error updating event:', error);
        this.toastService.showError(extractApiError(error, 'Error updating event'));
        this.loading = false;
      }
    });
  }

  onCancel(): void {
    if (this.mode === 'edit' && this.eventId) {
      this.router.navigate(['/events', this.eventId]);
    } else {
      this.router.navigate(['/events']);
    }
  }

  private scrollToFirstError(): void {
    const firstError = document.querySelector('.form-control.ng-invalid');
    if (firstError) {
      firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }  }

  hasError(field: string): boolean {
    const control = this.eventForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched || this.submitted));
  }
}
