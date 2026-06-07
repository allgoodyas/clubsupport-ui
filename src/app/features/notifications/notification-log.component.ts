import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-notification-log',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  template: `
<div class="nl">

  <!-- Header -->
  <div class="nl-header">
    <button class="nl-back" (click)="goBack()">← Back</button>
    <div class="nl-header-title">
      <span>📊</span>
      <div>
        <h1>Notification Analytics</h1>
        <p>Opt-in counts · delivery stats · Twilio cost estimate</p>
      </div>
    </div>
  </div>

  <!-- Date range + quick filters + tabs -->
  <div class="nl-toolbar">
    <div class="nl-date-group">
      <label>From</label>
      <input type="date" [(ngModel)]="fromDate" [max]="toDate" (change)="loadAll()" />
    </div>
    <div class="nl-date-group">
      <label>To</label>
      <input type="date" [(ngModel)]="toDate" [min]="fromDate" [max]="today" (change)="loadAll()" />
    </div>
    <div class="nl-quick-btns">
      <button [class.active]="quickPeriod===7"  (click)="setQuick(7)">7d</button>
      <button [class.active]="quickPeriod===30" (click)="setQuick(30)">30d</button>
      <button [class.active]="quickPeriod===90" (click)="setQuick(90)">90d</button>
    </div>
    <div class="nl-tabs">
      <button [class.active]="tab==='overview'" (click)="tab='overview'">📈 Overview</button>
      <button [class.active]="tab==='opted-in'" (click)="tab='opted-in'; loadOptedIn()">👥 Opted-in Parents</button>
      <button [class.active]="tab==='log'"      (click)="tab='log'; loadLog()">📋 Raw Log</button>
    </div>
  </div>

  <!-- Loading -->
  <div class="nl-loading" *ngIf="loading">
    <div class="nl-spin"></div> Loading...
  </div>

  <!-- ══════════════════ OVERVIEW TAB ══════════════════ -->
  <div class="nl-body" *ngIf="!loading && tab==='overview'">

    <div class="nl-kpi-row">
      <div class="nl-kpi">
        <div class="nl-kpi-icon">📱</div>
        <div class="nl-kpi-val">{{ pushSent | number }}</div>
        <div class="nl-kpi-lbl">Push sent</div>
        <div class="nl-kpi-sub">{{ pushDelivered | number }} delivered · {{ pushFailed | number }} failed</div>
      </div>
      <div class="nl-kpi">
        <div class="nl-kpi-icon">💬</div>
        <div class="nl-kpi-val">{{ waSent | number }}</div>
        <div class="nl-kpi-lbl">WhatsApp sent</div>
        <div class="nl-kpi-sub">{{ waDelivered | number }} delivered · {{ waFailed | number }} failed</div>
      </div>
      <div class="nl-kpi nl-kpi-green">
        <div class="nl-kpi-icon">👥</div>
        <div class="nl-kpi-val">{{ pushOptedIn | number }}</div>
        <div class="nl-kpi-lbl">Push opt-ins</div>
        <div class="nl-kpi-sub">parents with push enabled</div>
      </div>
      <div class="nl-kpi nl-kpi-green">
        <div class="nl-kpi-icon">📞</div>
        <div class="nl-kpi-val">{{ waOptedIn | number }}</div>
        <div class="nl-kpi-lbl">WhatsApp opt-ins</div>
        <div class="nl-kpi-sub">parents with WhatsApp enabled</div>
      </div>
      <div class="nl-kpi nl-kpi-amber">
        <div class="nl-kpi-icon">💰</div>
        <div class="nl-kpi-val">SAR {{ waCostSar | number:'1.2-2' }}</div>
        <div class="nl-kpi-lbl">Est. Twilio cost</div>
        <div class="nl-kpi-sub">{{ waSent | number }} msgs × SAR 0.07 avg</div>
      </div>
    </div>

    <div class="nl-section-title">Breakdown by notification type</div>
    <div class="nl-card">
      <div class="nl-empty" *ngIf="byType.length === 0">No data for this period.</div>
      <table class="nl-tbl" *ngIf="byType.length > 0">
        <thead>
          <tr>
            <th>Type</th><th>Channel</th><th>Total</th>
            <th>Delivered</th><th>Failed</th><th>Unique parents</th><th>Delivery rate</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let r of byType">
            <td>{{ r.typeName || '—' }}</td>
            <td>
              <span class="nl-badge" [class.nl-push]="r.channelName==='Push'" [class.nl-wa]="r.channelName==='WhatsApp'">
                {{ r.channelName === 'Push' ? '📱' : '💬' }} {{ r.channelName }}
              </span>
            </td>
            <td><strong>{{ r.total | number }}</strong></td>
            <td class="ok">{{ r.delivered | number }}</td>
            <td [class.fail]="r.failed > 0">{{ r.failed | number }}</td>
            <td>{{ r.uniqueParents | number }}</td>
            <td>
              <div class="nl-bar-wrap">
                <div class="nl-bar-fill"
                  [style.width.%]="r.total > 0 ? (r.delivered / r.total * 100) : 0"
                  [class.nl-bar-ok]="r.total > 0 && (r.delivered / r.total * 100) >= 80"
                  [class.nl-bar-warn]="r.total > 0 && (r.delivered / r.total * 100) < 80"></div>
              </div>
              <span class="nl-pct">
                {{ r.total > 0 ? (r.delivered / r.total * 100 | number:'1.0-0') : 0 }}%
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="nl-section-title">Daily notification volume (last {{ quickPeriod }} days)</div>
    <div class="nl-card nl-chart-card">
      <div class="nl-empty" *ngIf="dailyData.length === 0">No data for this period.</div>
      <div class="nl-chart" *ngIf="dailyData.length > 0">
        <div class="nl-chart-bar-group" *ngFor="let d of dailyData">
          <div class="nl-bar-stack">
            <div class="nl-bar-push" [style.height.px]="barHeight(d.pushTotal)" [title]="'Push: ' + d.pushTotal"></div>
            <div class="nl-bar-wa"   [style.height.px]="barHeight(d.waTotal)"   [title]="'WhatsApp: ' + d.waTotal"></div>
          </div>
          <div class="nl-chart-label">{{ d.day | date:'d/M' }}</div>
        </div>
      </div>
      <div class="nl-chart-legend">
        <span class="nl-leg-push">📱 Push</span>
        <span class="nl-leg-wa">💬 WhatsApp</span>
      </div>
    </div>

    <div class="nl-section-title">Twilio cost estimate</div>
    <div class="nl-cost-card">
      <div class="nl-cost-row">
        <span>WhatsApp messages sent ({{ fromDate }} → {{ toDate }})</span>
        <strong>{{ waSent | number }}</strong>
      </div>
      <div class="nl-cost-row">
        <span>Avg cost per message (utility template, KSA)</span>
        <strong>SAR 0.04–0.06 (Meta) + SAR 0.02 (Twilio) = ~SAR 0.07</strong>
      </div>
      <div class="nl-cost-row">
        <span>Estimated Twilio bill for this period</span>
        <strong class="nl-cost-highlight">SAR {{ waCostSar | number:'1.2-2' }}</strong>
      </div>
      <div class="nl-cost-row nl-cost-info">
        <span>If you switch to Meta Cloud API direct (no Twilio)</span>
        <strong class="nl-cost-green">
          SAR {{ waDirectCostSar | number:'1.2-2' }}
          (saves SAR {{ (waCostSar - waDirectCostSar) | number:'1.2-2' }})
        </strong>
      </div>
      <div class="nl-cost-note">
        ℹ️ Estimates only — check your Twilio Console for the exact invoice.
      </div>
    </div>

  </div>

  <!-- ══════════════════ OPTED-IN PARENTS TAB ══════════════════ -->
  <div class="nl-body" *ngIf="!loading && tab==='opted-in'">
    <div class="nl-section-title">
      Parents opted in per channel &nbsp;
      <span class="nl-count-badge">{{ parents.length | number }} parents</span>
    </div>

    <!-- Pills — use method calls, NOT pipe syntax -->
    <div class="nl-pill-row">
      <div class="nl-pill nl-pill-push">
        📱 Push: <strong>{{ pushCount(parents) }} / {{ parents.length }}</strong>
      </div>
      <div class="nl-pill nl-pill-wa">
        💬 WhatsApp: <strong>{{ waCount(parents) }} / {{ parents.length }}</strong>
      </div>
      <div class="nl-pill">
        Both: <strong>{{ bothCount(parents) }} / {{ parents.length }}</strong>
      </div>
    </div>

    <div class="nl-card">
      <div class="nl-empty" *ngIf="parents.length === 0">No parent data found.</div>
      <table class="nl-tbl" *ngIf="parents.length > 0">
        <thead>
          <tr>
            <th>Parent</th><th>Mobile</th>
            <th>📱 Push</th><th>💬 WhatsApp</th>
            <th>Push msgs</th><th>WA msgs</th><th>Total</th><th>Last notified</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let p of parents">
            <td><strong>{{ p.parentName }}</strong></td>
            <td class="nl-mono">{{ p.mobile || '—' }}</td>
            <td>
              <span class="nl-dot" [class.nl-dot-on]="p.pushOptedIn" [class.nl-dot-off]="!p.pushOptedIn">
                {{ p.pushOptedIn ? '✓' : '✕' }}
              </span>
            </td>
            <td>
              <span class="nl-dot" [class.nl-dot-on]="p.whatsAppOptedIn" [class.nl-dot-off]="!p.whatsAppOptedIn">
                {{ p.whatsAppOptedIn ? '✓' : '✕' }}
              </span>
            </td>
            <td>{{ p.pushCount | number }}</td>
            <td>{{ p.whatsAppCount | number }}</td>
            <td><strong>{{ p.totalReceived | number }}</strong></td>
            <td class="nl-date">{{ p.lastNotified ? (p.lastNotified | date:'dd MMM yyyy HH:mm') : '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ══════════════════ RAW LOG TAB ══════════════════ -->
  <div class="nl-body" *ngIf="!loading && tab==='log'">
    <div class="nl-section-title">
      Raw notification log &nbsp;
      <span class="nl-count-badge">{{ logTotal | number }} records</span>
    </div>

    <div class="nl-filter-row">
      <label>Channel</label>
      <select [(ngModel)]="logChannelFilter" (change)="logPage=1; loadLog()">
        <option [ngValue]="null">All channels</option>
        <option [ngValue]="1">📱 Push only</option>
        <option [ngValue]="2">💬 WhatsApp only</option>
      </select>
    </div>

    <div class="nl-card">
      <div class="nl-empty" *ngIf="logs.length === 0">No records for this period.</div>
      <table class="nl-tbl" *ngIf="logs.length > 0">
        <thead>
          <tr>
            <th>Date & time</th><th>Parent</th><th>Title</th>
            <th>Channel</th><th>Status</th><th>Phone / Error</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let l of logs">
            <td class="nl-date">{{ l.sentAt | date:'dd MMM yyyy HH:mm' }}</td>
            <td>{{ l.parentName || '—' }}</td>
            <td class="nl-title-cell">{{ l.title }}</td>
            <td>
              <span class="nl-badge" [class.nl-push]="l.channel==='Push'" [class.nl-wa]="l.channel==='WhatsApp'">
                {{ l.channel === 'Push' ? '📱' : '💬' }} {{ l.channel }}
              </span>
            </td>
            <td>
              <span class="nl-status"
                [class.nl-ok]="l.status==='sent' || l.status==='delivered'"
                [class.nl-fail]="l.status==='failed'"
                [class.nl-muted]="l.status==='no_devices'">
                {{ l.status }}
              </span>
            </td>
            <td class="nl-mono nl-small">{{ l.errorMessage || l.phoneNumber || '—' }}</td>
          </tr>
        </tbody>
      </table>
      <div class="nl-pager" *ngIf="logTotalPages > 1">
        <button [disabled]="logPage===1" (click)="logPage=logPage-1; loadLog()">← Prev</button>
        <span>Page {{ logPage }} of {{ logTotalPages }}</span>
        <button [disabled]="logPage===logTotalPages" (click)="logPage=logPage+1; loadLog()">Next →</button>
      </div>
    </div>
  </div>

</div>
  `,
  styles: [`
.nl { min-height:100vh; background:var(--bg-app,#0A0F1E); color:var(--text-primary,#E2E8F0); }
.nl-header { background:linear-gradient(135deg,#1B3A6B,#2E6DB4); padding:12px 16px; display:flex; align-items:center; gap:12px; position:sticky; top:0; z-index:10; box-shadow:0 3px 10px rgba(0,0,0,.3); }
.nl-back { background:rgba(255,255,255,.15); color:white; border:1px solid rgba(255,255,255,.3); padding:6px 12px; border-radius:7px; cursor:pointer; font-size:.8rem; }
.nl-back:hover { background:rgba(255,255,255,.25); }
.nl-header-title { display:flex; align-items:center; gap:8px; }
.nl-header-title h1 { margin:0; font-size:1rem; color:white; font-weight:700; }
.nl-header-title p  { margin:0; font-size:.68rem; color:rgba(255,255,255,.7); }
.nl-toolbar { display:flex; align-items:center; gap:12px; padding:10px 16px; background:var(--bg-card,#1A2235); border-bottom:1px solid var(--bg-border,#1E2D45); flex-wrap:wrap; }
.nl-date-group { display:flex; align-items:center; gap:6px; font-size:.8rem; color:var(--text-secondary,#94A3B8); }
.nl-date-group input { background:var(--bg-panel,#111827); border:1px solid var(--bg-border,#1E2D45); color:var(--text-primary,#E2E8F0); padding:4px 8px; border-radius:6px; font-size:.8rem; }
.nl-quick-btns { display:flex; gap:4px; }
.nl-quick-btns button { background:var(--bg-panel,#111827); border:1px solid var(--bg-border,#1E2D45); color:var(--text-secondary,#94A3B8); padding:4px 10px; border-radius:6px; cursor:pointer; font-size:.8rem; }
.nl-quick-btns button.active { background:var(--accent-primary,#00D4FF); color:#000; border-color:var(--accent-primary,#00D4FF); font-weight:600; }
.nl-tabs { margin-left:auto; display:flex; gap:4px; flex-wrap:wrap; }
.nl-tabs button { background:var(--bg-panel,#111827); border:1px solid var(--bg-border,#1E2D45); color:var(--text-secondary,#94A3B8); padding:5px 12px; border-radius:6px; cursor:pointer; font-size:.8rem; }
.nl-tabs button.active { background:var(--accent-primary,#00D4FF); color:#000; font-weight:600; border-color:var(--accent-primary,#00D4FF); }
.nl-loading { display:flex; align-items:center; gap:10px; padding:48px; justify-content:center; color:var(--text-secondary,#94A3B8); }
.nl-spin { width:20px; height:20px; border:2px solid rgba(255,255,255,.1); border-top-color:var(--accent-primary,#00D4FF); border-radius:50%; animation:spin .8s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }
.nl-body { max-width:1300px; margin:0 auto; padding:16px 16px 40px; }
.nl-kpi-row { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:10px; margin-bottom:20px; }
.nl-kpi { background:var(--bg-card,#1A2235); border:1px solid var(--bg-border,#1E2D45); border-radius:12px; padding:14px 16px; }
.nl-kpi-green { border-color:rgba(74,222,128,.3); }
.nl-kpi-amber { border-color:rgba(251,191,36,.3); }
.nl-kpi-icon { font-size:1.4rem; margin-bottom:6px; }
.nl-kpi-val  { font-size:1.6rem; font-weight:700; color:var(--text-primary,#E2E8F0); }
.nl-kpi-lbl  { font-size:.78rem; font-weight:600; color:var(--text-secondary,#94A3B8); margin-top:2px; }
.nl-kpi-sub  { font-size:.68rem; color:var(--text-secondary,#94A3B8); margin-top:3px; }
.nl-section-title { font-size:.78rem; font-weight:600; color:var(--text-secondary,#94A3B8); text-transform:uppercase; letter-spacing:.06em; margin:0 0 8px; display:flex; align-items:center; gap:8px; }
.nl-count-badge { background:var(--bg-card,#1A2235); border:1px solid var(--bg-border,#1E2D45); border-radius:20px; padding:2px 8px; font-size:.72rem; font-weight:600; color:var(--text-primary,#E2E8F0); text-transform:none; letter-spacing:0; }
.nl-card { background:var(--bg-card,#1A2235); border:1px solid var(--bg-border,#1E2D45); border-radius:12px; overflow:auto; margin-bottom:16px; }
.nl-tbl { width:100%; border-collapse:collapse; font-size:.82rem; }
.nl-tbl th { text-align:left; padding:9px 12px; font-size:.72rem; font-weight:600; color:var(--text-secondary,#94A3B8); border-bottom:1px solid var(--bg-border,#1E2D45); background:var(--bg-panel,#111827); white-space:nowrap; }
.nl-tbl td { padding:9px 12px; border-bottom:1px solid rgba(255,255,255,.04); color:var(--text-secondary,#94A3B8); vertical-align:middle; }
.nl-tbl td strong { color:var(--text-primary,#E2E8F0); }
.nl-tbl tr:last-child td { border-bottom:none; }
.nl-tbl tr:hover td { background:rgba(255,255,255,.02); }
.ok   { color:#4ADE80 !important; }
.fail { color:#F87171 !important; }
.nl-mono { font-family:monospace; font-size:.75rem; }
.nl-small { font-size:.72rem; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.nl-date { font-size:.75rem; white-space:nowrap; }
.nl-title-cell { max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--text-primary,#E2E8F0); }
.nl-badge { padding:3px 9px; border-radius:99px; font-size:.7rem; font-weight:700; display:inline-block; }
.nl-push { background:rgba(0,212,255,.12); color:#00D4FF; }
.nl-wa   { background:rgba(74,222,128,.12); color:#4ADE80; }
.nl-status { padding:2px 8px; border-radius:99px; font-size:.68rem; font-weight:700; }
.nl-ok    { background:rgba(74,222,128,.12); color:#4ADE80; }
.nl-fail  { background:rgba(248,113,113,.12); color:#F87171; }
.nl-muted { background:rgba(148,163,184,.1);  color:#94A3B8; }
.nl-bar-wrap { height:6px; background:var(--bg-border,#1E2D45); border-radius:3px; overflow:hidden; display:inline-block; width:60px; margin-right:6px; vertical-align:middle; }
.nl-bar-fill { height:100%; border-radius:3px; }
.nl-bar-ok   { background:#4ADE80; }
.nl-bar-warn { background:#FBBF24; }
.nl-pct { font-size:.72rem; color:var(--text-secondary,#94A3B8); vertical-align:middle; }
.nl-chart-card { padding:16px; }
.nl-chart { display:flex; align-items:flex-end; gap:4px; height:120px; overflow-x:auto; padding-bottom:4px; }
.nl-chart-bar-group { display:flex; flex-direction:column; align-items:center; gap:2px; flex-shrink:0; }
.nl-bar-stack { display:flex; flex-direction:column-reverse; align-items:center; gap:1px; }
.nl-bar-push { width:14px; background:var(--accent-primary,#00D4FF); border-radius:2px 2px 0 0; min-height:2px; }
.nl-bar-wa   { width:14px; background:#4ADE80; border-radius:2px 2px 0 0; min-height:2px; }
.nl-chart-label { font-size:.58rem; color:var(--text-secondary,#94A3B8); margin-top:4px; white-space:nowrap; }
.nl-chart-legend { display:flex; gap:16px; margin-top:10px; font-size:.75rem; color:var(--text-secondary,#94A3B8); }
.nl-leg-push::before { content:''; display:inline-block; width:10px; height:10px; background:var(--accent-primary,#00D4FF); border-radius:2px; margin-right:5px; vertical-align:middle; }
.nl-leg-wa::before   { content:''; display:inline-block; width:10px; height:10px; background:#4ADE80; border-radius:2px; margin-right:5px; vertical-align:middle; }
.nl-cost-card { background:var(--bg-card,#1A2235); border:1px solid rgba(251,191,36,.3); border-radius:12px; padding:16px; margin-bottom:16px; }
.nl-cost-row { display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid rgba(255,255,255,.05); font-size:.82rem; color:var(--text-secondary,#94A3B8); gap:12px; flex-wrap:wrap; }
.nl-cost-row:last-child { border-bottom:none; }
.nl-cost-row strong { color:var(--text-primary,#E2E8F0); }
.nl-cost-highlight { color:#FBBF24 !important; font-size:1.1rem; }
.nl-cost-green { color:#4ADE80 !important; }
.nl-cost-info { background:rgba(74,222,128,.05); border-radius:6px; padding:8px 10px; margin-top:4px; }
.nl-cost-note { font-size:.72rem; color:var(--text-secondary,#94A3B8); margin-top:10px; font-style:italic; }
.nl-pill-row { display:flex; gap:10px; margin-bottom:12px; flex-wrap:wrap; }
.nl-pill { background:var(--bg-card,#1A2235); border:1px solid var(--bg-border,#1E2D45); border-radius:20px; padding:6px 14px; font-size:.8rem; color:var(--text-secondary,#94A3B8); }
.nl-pill strong { color:var(--text-primary,#E2E8F0); }
.nl-pill-push { border-color:rgba(0,212,255,.3); }
.nl-pill-wa   { border-color:rgba(74,222,128,.3); }
.nl-dot { display:inline-flex; width:22px; height:22px; border-radius:50%; align-items:center; justify-content:center; font-size:.7rem; font-weight:700; }
.nl-dot-on  { background:rgba(74,222,128,.15); color:#4ADE80; }
.nl-dot-off { background:rgba(148,163,184,.1);  color:#94A3B8; }
.nl-pager { display:flex; align-items:center; justify-content:center; gap:12px; padding:12px; font-size:.82rem; color:var(--text-secondary,#94A3B8); border-top:1px solid var(--bg-border,#1E2D45); }
.nl-pager button { background:var(--bg-panel,#111827); border:1px solid var(--bg-border,#1E2D45); color:var(--text-primary,#E2E8F0); padding:5px 12px; border-radius:6px; cursor:pointer; font-size:.8rem; }
.nl-pager button:disabled { opacity:.3; cursor:not-allowed; }
.nl-pager button:hover:not(:disabled) { border-color:var(--accent-primary,#00D4FF); }
.nl-filter-row { display:flex; align-items:center; gap:8px; margin-bottom:10px; font-size:.82rem; color:var(--text-secondary,#94A3B8); }
.nl-filter-row select { background:var(--bg-panel,#111827); border:1px solid var(--bg-border,#1E2D45); color:var(--text-primary,#E2E8F0); padding:5px 10px; border-radius:6px; font-size:.82rem; }
.nl-empty { padding:32px; text-align:center; color:var(--text-secondary,#94A3B8); font-size:.85rem; }
  `]
})
export class NotificationLogComponent implements OnInit {

  tab: 'overview' | 'opted-in' | 'log' = 'overview';
  loading    = false;
  quickPeriod = 30;

  today    = new Date().toISOString().split('T')[0];
  fromDate = '';
  toDate   = this.today;

  pushSent = 0; pushDelivered = 0; pushFailed = 0;
  waSent   = 0; waDelivered  = 0; waFailed   = 0;
  pushOptedIn = 0; waOptedIn = 0;
  waCostSar     = 0;
  waDirectCostSar = 0;

  byType:    any[] = [];
  dailyData: any[] = [];
  maxDaily   = 1;

  parents: any[] = [];

  logs: any[] = [];
  logTotal      = 0;
  logTotalPages = 1;
  logPage       = 1;
  logChannelFilter: number | null = null;

  private readonly api = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private router: Router,
    private themeService: ThemeService,
    private authService: AuthService
  ) { this.setQuick(30); }

  ngOnInit() {
    const user = this.authService.currentUserValue;
    if (user?.clubId) {
      this.themeService.loadAndApplyClubTheme(user.clubId)
        .subscribe({ error: () => this.themeService.loadThemeFromStorage() });
    } else {
      this.themeService.loadThemeFromStorage();
    }
    this.loadAll();
  }

  setQuick(days: number) {
    this.quickPeriod = days;
    const d = new Date();
    d.setDate(d.getDate() - days);
    this.fromDate = d.toISOString().split('T')[0];
    this.toDate   = this.today;
    this.loadAll();
  }

  loadAll() {
    this.loading = true;
    const params = `from=${this.fromDate}&to=${this.toDate}`;
    let done = 0;
    const check = () => { if (++done === 3) this.loading = false; };

    this.http.get<any>(`${this.api}/NotificationLog/summary?${params}`).subscribe({
      next: res => {
        if (res.success) {
          const push = res.channels?.find((c: any) => c.channelId === 1) || {};
          const wa   = res.channels?.find((c: any) => c.channelId === 2) || {};
          this.pushSent = push.totalSent || 0; this.pushDelivered = push.delivered || 0; this.pushFailed = push.failed || 0;
          this.waSent   = wa.totalSent   || 0; this.waDelivered  = wa.delivered   || 0; this.waFailed   = wa.failed   || 0;
          const poi = res.optedIn?.find((o: any) => o.channelId === 1) || {};
          const woi = res.optedIn?.find((o: any) => o.channelId === 2) || {};
          this.pushOptedIn    = poi.active || poi.optedIn || 0;
          this.waOptedIn      = woi.active || woi.optedIn || 0;
          this.waCostSar      = res.whatsAppEstimatedCostSar || 0;
          this.waDirectCostSar = Math.round((res.whatsAppMessageCount || 0) * 0.05 * 100) / 100;
        }
        check();
      },
      error: () => check()
    });

    this.http.get<any>(`${this.api}/NotificationLog/by-type?${params}`).subscribe({
      next: res => { this.byType = res.types || []; check(); },
      error: () => check()
    });

    this.http.get<any>(`${this.api}/NotificationLog/daily?${params}`).subscribe({
      next: res => {
        const map = new Map<string, { day: string; pushTotal: number; waTotal: number }>();
        for (const r of (res.days || [])) {
          if (!map.has(r.day)) map.set(r.day, { day: r.day, pushTotal: 0, waTotal: 0 });
          const e = map.get(r.day)!;
          if (r.channelId === 1) e.pushTotal += r.total;
          if (r.channelId === 2) e.waTotal   += r.total;
        }
        this.dailyData = Array.from(map.values()).sort((a, b) => a.day.localeCompare(b.day));
        this.maxDaily  = Math.max(1, ...this.dailyData.map(d => d.pushTotal + d.waTotal));
        check();
      },
      error: () => check()
    });
  }

  loadOptedIn() {
    this.loading = true;
    this.http.get<any>(`${this.api}/NotificationLog/opted-in`).subscribe({
      next: res => { this.parents = res.parents || []; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  loadLog() {
    this.loading = true;
    const ch = this.logChannelFilter ? `&channelId=${this.logChannelFilter}` : '';
    const params = `from=${this.fromDate}&to=${this.toDate}&page=${this.logPage}&pageSize=50${ch}`;
    this.http.get<any>(`${this.api}/NotificationLog/log?${params}`).subscribe({
      next: res => {
        this.logs          = res.logs || [];
        this.logTotal      = res.total || 0;
        this.logTotalPages = res.totalPages || 1;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  barHeight(val: number): number {
    return Math.max(2, Math.round((val / this.maxDaily) * 100));
  }

  // ── Counted as plain methods — NOT pipes ──────────────────────────────────
  pushCount(parents: any[]): number  { return parents.filter(p => p.pushOptedIn).length; }
  waCount  (parents: any[]): number  { return parents.filter(p => p.whatsAppOptedIn).length; }
  bothCount(parents: any[]): number  { return parents.filter(p => p.pushOptedIn && p.whatsAppOptedIn).length; }

  goBack() { this.router.navigate(['/club/notifications']); }
}
