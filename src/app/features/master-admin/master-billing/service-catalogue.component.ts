import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MasterBillingService, ServiceCatalogue } from './master-billing.service';

@Component({
  selector: 'app-service-catalogue',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './service-catalogue.component.html',
  styleUrls: ['./master-billing.shared.scss']
})
export class ServiceCatalogueComponent implements OnInit {
  services: ServiceCatalogue[] = [];
  loading  = false;
  saving   = false;
  error    = '';

  showForm = false;
  isEdit   = false;
  form: any = this.emptyForm();

  chargeTypes = [
    { value: 'flat_monthly',  label: 'Flat Monthly' },
    { value: 'flat_yearly',   label: 'Flat Yearly' },
    { value: 'per_student',   label: 'Per Student' },
    { value: 'per_message',   label: 'Per Message' },
    { value: 'one_time',      label: 'One Time' },
  ];

  categories = ['core', 'notifications', 'add-ons'];

  constructor(private svc: MasterBillingService, public router: Router) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.svc.getServices().subscribe({
      next: r  => { this.services = r; this.loading = false; },
      error: e => { this.error = e.error?.message || 'Failed'; this.loading = false; }
    });
  }

  openCreate() {
    this.form    = this.emptyForm();
    this.isEdit  = false;
    this.showForm = true;
  }

  openEdit(s: ServiceCatalogue) {
    this.form = {
      serviceId: s.serviceId, serviceCode: s.serviceCode,
      nameEn: s.nameEn, nameAr: s.nameAr, description: s.description,
      chargeType: s.chargeType, defaultPrice: s.defaultPrice,
      unitLabel: s.unitLabel, freeTierUnits: s.freeTierUnits,
      isActive: s.isActive, displayOrder: s.displayOrder,
      category: s.category, icon: s.icon
    };
    this.isEdit   = true;
    this.showForm = true;
  }

  save() {
    this.saving = true;
    const obs = this.isEdit
      ? this.svc.updateService(this.form.serviceId, this.form)
      : this.svc.createService(this.form);

    obs.subscribe({
      next: () => { this.saving = false; this.showForm = false; this.load(); },
      error: e  => { this.error = e.error?.message || 'Save failed'; this.saving = false; }
    });
  }

  deactivate(s: ServiceCatalogue) {
    if (!confirm(`Deactivate "${s.nameEn}"?`)) return;
    this.svc.deleteService(s.serviceId).subscribe({ next: () => this.load() });
  }

  chargeLabel(t: string): string {
    return this.chargeTypes.find(x => x.value === t)?.label ?? t;
  }

  emptyForm() {
    return { serviceCode:'', nameEn:'', nameAr:'', description:'',
             chargeType:'flat_monthly', defaultPrice: 0, unitLabel:'',
             freeTierUnits: 0, isActive: true, displayOrder: 0,
             category:'core', icon:'🏢' };
  }
}
