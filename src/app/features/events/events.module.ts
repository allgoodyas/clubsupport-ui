import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { PaymentPanelComponent } from '../../shared/components/payment-panel/payment-panel.component';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher/language-switcher.component';
import { SidebarNavigationComponent } from '../../shared/components/sidebar-navigation/sidebar-navigation.component';

import { EventsListComponent } from './events-list/events-list.component';
import { EventDetailsComponent } from './event-details/event-details.component';
import { EventFormComponent } from './event-form/event-form.component';
import { EnrollStudentDialogComponent } from './components/enroll-student-dialog/enroll-student-dialog.component';
import { EnrolledStudentsListComponent } from './components/enrolled-students-list/enrolled-students-list.component';
import { TrainerAssignmentModalComponent } from './components/trainer-assignment-modal/trainer-assignment-modal.component';
import { AttendanceModalComponent } from './components/attendance-modal/attendance-modal.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EnrollmentModalComponent } from './components/enrollment-modal/enrollment-modal.component';
//import { PaymentReceiptComponent } from './components/payment-receipt/payment-receipt.component';
import { PaymentReceiptComponent } from '../../shared/components/payment-receipt/payment-receipt.component'; // Updated import path


const routes: Routes = [
  { path: '', component: EventsListComponent },
  { path: 'create', component: EventFormComponent },
  {
    path: ':eventId/enroll',
    loadComponent: () => import('./enroll-student/enroll-student.component')
      .then(m => m.EnrollStudentComponent)
  },
  { path: ':id', component: EventDetailsComponent },
  { path: ':id/edit', component: EventFormComponent }
];

@NgModule({
  declarations: [
    EventsListComponent,
    EventDetailsComponent,
    EventFormComponent,
    EnrollStudentDialogComponent,   
    EnrolledStudentsListComponent,
    TrainerAssignmentModalComponent,
    AttendanceModalComponent,
    EnrollmentModalComponent    
    
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    TranslateModule,
    PaymentPanelComponent,
    PageHeaderComponent , // Import standalone component
    PaymentReceiptComponent,
    LanguageSwitcherComponent,
    SidebarNavigationComponent
  ]
})
export class EventsModule { }
