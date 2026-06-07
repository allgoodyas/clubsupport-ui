import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { EventTrainersService, EventTrainerDto, AvailableTrainerDto, AssignTrainerDto } 
from '../../../../shared/services/event-trainers.service';
  
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-trainer-assignment-modal',
  standalone: false,
  templateUrl: './trainer-assignment-modal.component.html',
  styleUrls: ['./trainer-assignment-modal.component.css']
})
export class TrainerAssignmentModalComponent implements OnInit {
  @Input() eventId: number = 0;
  @Input() eventName: string = '';
  @Input() isOpen: boolean = false;
  @Output() closeModal = new EventEmitter<void>();
  @Output() trainerAssigned = new EventEmitter<void>();

  assignedTrainers: EventTrainerDto[] = [];
  availableTrainers: AvailableTrainerDto[] = [];
  filteredTrainers: AvailableTrainerDto[] = [];
  
  searchTerm: string = '';
  selectedTrainerId: number | null = null;
  selectedRole: string = 'Trainer';
  notes: string = '';
  
  loading: boolean = false;
  assigning: boolean = false;

  roles = [
    { value: 'Primary', label: 'Primary Trainer' },
    { value: 'Assistant', label: 'Assistant Trainer' },
    { value: 'Trainer', label: 'General Trainer' }
  ];

  constructor(
    private eventTrainersService: EventTrainersService,    
    private toastr: ToastService
  ) { }

  ngOnInit(): void {
    if (this.eventId) {
      this.loadData();
    }
  }

  ngOnChanges(): void {
    if (this.isOpen && this.eventId) {
      this.loadData();
      this.resetForm();
    }
  }

  loadData(): void {
    this.loading = true;
    
    // Load both assigned and available trainers
    Promise.all([
      this.eventTrainersService.getEventTrainers(this.eventId).toPromise(),
      this.eventTrainersService.getAvailableTrainers(this.eventId).toPromise()
    ])
    .then(([assigned, available]) => {
      this.assignedTrainers = assigned || [];
      this.availableTrainers = available || [];
      this.filterTrainers();
      this.loading = false;
    })
    .catch(error => {
      console.error('Error loading trainers:', error);
      this.toastr.showError('Failed to load trainers');
      this.loading = false;
    });
  }

  filterTrainers(): void {
    if (!this.searchTerm) {
      this.filteredTrainers = this.availableTrainers.filter(t => !t.isAlreadyAssigned);
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredTrainers = this.availableTrainers
        .filter(t => !t.isAlreadyAssigned)
        .filter(t => 
          t.fullName.toLowerCase().includes(term) ||
          t.email.toLowerCase().includes(term) ||
          (t.mobileNumber && t.mobileNumber.includes(term))
        );
    }
  }

  onSearchChange(): void {
    this.filterTrainers();
  }

  selectTrainer(trainerId: number): void {
    this.selectedTrainerId = trainerId;
  }

  assignTrainer(): void {
    if (!this.selectedTrainerId) {
      this.toastr.showWarning('Please select a trainer');
      return;
    }

    if (!this.selectedRole) {
      this.toastr.showWarning('Please select a role');
      return;
    }

    this.assigning = true;

    const dto: AssignTrainerDto = {
      eventId: this.eventId,
      trainerId: this.selectedTrainerId,
      trainerRole: this.selectedRole,
      notes: this.notes || undefined
    };

    this.eventTrainersService.assignTrainer(dto).subscribe({
      next: (result:any) => {
        this.toastr.showSuccess('Trainer assigned successfully');
        this.assigning = false;
        this.resetForm();
        this.loadData(); // Reload to show updated list
        this.trainerAssigned.emit();
      },
      error: (error: any) => {
        console.error('Error assigning trainer:', error);
        this.toastr.showError(error.error?.message || 'Failed to assign trainer');
        this.assigning = false;
      }
    });
  }

  removeTrainer(trainerId: number, trainerName: string): void {
    if (!confirm(`Are you sure you want to remove ${trainerName} from this event?`)) {
      return;
    }

    this.eventTrainersService.removeTrainer(this.eventId, trainerId).subscribe({
      next: () => {
        this.toastr.showInfo('Trainer removed successfully');
        this.loadData();
        this.trainerAssigned.emit();
      },
      error: (error :any) => {
        console.error('Error removing trainer:', error);
        this.toastr.showError(error.error?.message || 'Failed to remove trainer');
      }
    });
  }

  changeRole(trainer: EventTrainerDto, newRole: string): void {
    this.eventTrainersService.updateTrainerRole(
      this.eventId,
      trainer.trainerId,
      { trainerRole: newRole, notes: trainer.notes }
    ).subscribe({
      next: () => {
        this.toastr.showInfo('Trainer role updated');
        this.loadData();
        this.trainerAssigned.emit();
      },
      error: (error: any) => {
        console.error('Error updating role:', error);
        this.toastr.showError('Failed to update role');
      }
    });
  }

  resetForm(): void {
    this.selectedTrainerId = null;
    this.selectedRole = 'Trainer';
    this.notes = '';
    this.searchTerm = '';
    this.filterTrainers();
  }

  close(): void {
    this.resetForm();
    this.closeModal.emit();
  }

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'Primary':
        return 'badge-primary';
      case 'Assistant':
        return 'badge-warning';
      default:
        return 'badge-secondary';
    }
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }
}
