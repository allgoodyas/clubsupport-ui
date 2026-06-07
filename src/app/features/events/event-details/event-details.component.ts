import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EventsService } from '../../../core/services/events.service';
import { AuthService } from '../../../core/services/auth.service';
import { EventDetails } from '../../../shared/models/event.model';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-event-details',
  standalone: false,
  templateUrl: './event-details.component.html',
  styleUrls: ['./event-details.component.scss']
})
export class EventDetailsComponent implements OnInit {
  event: EventDetails | null = null;
  loading = true;
  eventId: number = 0;
  bannerUrl: string | null = null;
  
  // Modal states for Phase 2
  showTrainerModal: boolean = false;
  showAttendanceModal: boolean = false;
  showPaymentPanel: boolean = false;


  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventsService: EventsService,
    private authService: AuthService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.eventId = Number(this.route.snapshot.paramMap.get('id'));
    if (this.eventId) {
      this.loadEvent();
    }
  }

  loadEvent(): void {
    this.loading = true;
    this.eventsService.getEventById(this.eventId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.event = response.data;
          if (this.event.hasBanner) {
            this.loadBanner();
          }
          this.loading = false;
        } else {
          this.toastService.showError('Event not found');
          this.router.navigate(['/events']);
        }
      },
      error: (error) => {
        console.error('Error loading event:', error);
        this.toastService.showError('Error loading event details');
        this.router.navigate(['/events']);
      }
    });
  }

  loadBanner(): void {
    const token = this.authService.getToken();
    const url = this.eventsService.getEventBannerUrl(this.eventId);
    
    fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => response.blob())
    .then(blob => {
      this.bannerUrl = URL.createObjectURL(blob);
    })
    .catch(error => {
      console.error('Error loading banner:', error);
    });
  }

  goBack(): void {
    this.router.navigate(['/events']);
  }

  editEvent(): void {
    this.router.navigate(['/events', this.eventId, 'edit']);
  }

  getEventIcon(eventType: string): string {
    const icons: { [key: string]: string } = {
      'Training': '🏋️',
      'Competition': '🏆',
      'Camp': '🏕️',
      'Workshop': '🎓'
    };
    return icons[eventType] || '📅';
  }

  getStatusBadgeClass(status: string): string {
    const classes: { [key: string]: string } = {
      'Published': 'badge-success',
      'Draft': 'badge-warning',
      'Cancelled': 'badge-danger',
      'Active': 'badge-info'
    };
    return classes[status] || 'badge-secondary';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    });
  }

  getRecurrenceDaysText(days?: number[]): string {
    if (!days || days.length === 0) return '';
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days.map(d => dayNames[d]).join(', ');
  }

  getCapacityPercentage(): number {
    if (!this.event) return 0;
    return (this.event.currentEnrollment / this.event.maxParticipants) * 100;
  }

  getCapacityClass(): string {
    const percentage = this.getCapacityPercentage();
    if (percentage >= 90) return 'capacity-full';
    if (percentage >= 70) return 'capacity-high';
    if (percentage >= 50) return 'capacity-medium';
    return 'capacity-low';
  }

  ngOnDestroy(): void {
    if (this.bannerUrl) {
      URL.revokeObjectURL(this.bannerUrl);
    }
  }

  // Phase 2: Trainer Assignment Methods
  openTrainerModal(): void {
    this.showTrainerModal = true;
  }

  closeTrainerModal(): void {
    this.showTrainerModal = false;
  }

  onTrainerAssigned(): void {
    // Optionally refresh event data or show success message
    this.toastService.showSuccess('Trainer assigned successfully');
  }
  openPaymentPanel(): void {
  this.showPaymentPanel = true;
}

closePaymentPanel(): void {
  this.showPaymentPanel = false;
}

onPaymentRecorded(): void {
  console.log('✅ Payment recorded, refreshing...');
  this.loadEvent(); // Refresh event data
}


  // Phase 2: Attendance Methods
  openAttendanceModal(): void {
    this.showAttendanceModal = true;
  }

  closeAttendanceModal(): void {
    this.showAttendanceModal = false;
  }

  onAttendanceMarked(): void {
    // Optionally refresh enrollment data
    this.toastService.showSuccess('Attendance marked successfully');
  }
}
