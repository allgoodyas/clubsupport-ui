import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SidebarStateService {
  // Sidebar is always visible — this controls collapsed (false) vs expanded (true)
  private _isExpanded = new BehaviorSubject<boolean>(false);
  isExpanded$ = this._isExpanded.asObservable();

  get isExpanded(): boolean { return this._isExpanded.value; }

  expand()  { this._isExpanded.next(true);  }
  collapse(){ this._isExpanded.next(false); }
  toggle()  { this._isExpanded.next(!this._isExpanded.value); }

  // Keep old aliases so existing page code (open/close/isOpen$) still compiles
  get isOpen(): boolean { return this._isExpanded.value; }
  isOpen$ = this._isExpanded.asObservable();
  open()  { this._isExpanded.next(true);  }
  close() { this._isExpanded.next(false); }
}
