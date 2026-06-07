import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { EventsService } from '../../../core/services/events.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-create-event',
  standalone: false,
  templateUrl: './create-event.component.html',
  styleUrls: ['./create-event.component.scss']
})
export class CreateEventComponent implements OnInit {
  eventForm!: FormGroup;
  loading = false;
  submitted = false;

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
    private eventsService: EventsService,
    private router: Router,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
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
      basePrice: [''],
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

    this.eventForm.get('isRecurring')?.valueChanges.subscribe(isRecurring => {
      if (!isRecurring) {
        this.eventForm.patchValue({ recurrenceType: 'OneTime', recurrenceDays: [] });
      }
    });

    this.eventForm.get('isPaid')?.valueChanges.subscribe(isPaid => {
      if (!isPaid) {
        this.eventForm.patchValue({ 
          basePrice: null,
          allowMultipleOffers: false,
          allowCoupons: false,
          allowPartialPayment: false
        });
      }
    });
  }

  get f() {
    return this.eventForm.controls;
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
    
    // Properly format data - convert empty strings to null
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
      maxParticipants: parseInt(formValue.maxParticipants),
      minParticipants: parseInt(formValue.minParticipants),
      minAge: formValue.minAge ? parseInt(formValue.minAge) : null,
      maxAge: formValue.maxAge ? parseInt(formValue.maxAge) : null,
      gender: formValue.gender || null,
      skillLevel: formValue.skillLevel || null,
      prerequisites: formValue.prerequisites || null,
      requiresApproval: formValue.requiresApproval,
      isPaid: formValue.isPaid,
      basePrice: formValue.isPaid && formValue.basePrice ? parseFloat(formValue.basePrice) : null,
      allowMultipleOffers: formValue.allowMultipleOffers,
      allowCoupons: formValue.allowCoupons,
      siblingQuotaEnabled: formValue.siblingQuotaEnabled,
      isPublished: formValue.isPublished,
      isFeatured: formValue.isFeatured
    };

    console.log('Sending event data:', eventData);

    this.eventsService.createEvent(eventData).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastService.showSuccess('Event created successfully!');
          this.router.navigate(['/events']);
        } else {
          this.toastService.showError(response.message || 'Failed to create event');
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('Error creating event:', error);
        this.toastService.showError('Error creating event. Please try again.');
        this.loading = false;
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/events']);
  }

  private scrollToFirstError(): void {
    const firstError = document.querySelector('.form-control.ng-invalid');
    if (firstError) {
      firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  hasError(field: string): boolean {
    const control = this.eventForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched || this.submitted));
  }
}
