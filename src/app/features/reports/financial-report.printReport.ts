  // ── Print Report — Printer-friendly ──────────────────────────────────────
  printReport() {
    if (!this.report) return;

    const r = this.report;
    const period = `${this.fromDate}  →  ${this.toDate}`;
    const clubName = 'Club Management';

    // ── helpers ──────────────────────────────────────────────────────────
    const fmt = (n: number) =>
      new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' SAR';

    const statusColour = (s: string) => ({
      Paid: '#166534', Partial: '#854D0E', Pending: '#1E3A5F',
      Overdue: '#991B1B', Sent: '#1E40AF'
    } as any)[s] ?? '#374151';

    const statusBg = (s: string) => ({
      Paid: '#DCFCE7', Partial: '#FEF3C7', Pending: '#DBEAFE',
      Overdue: '#FEE2E2', Sent: '#DBEAFE'
    } as any)[s] ?? '#F3F4F6';

    // ── KPI card HTML ─────────────────────────────────────────────────────
    const kpiCard = (label: string, value: string, accent: string, sub = '') => `
      <div style="background:#fff;border:1px solid #E2E8F0;border-radius:8px;padding:14px 16px;border-left:4px solid ${accent}">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748B;margin-bottom:5px">${label}</div>
        <div style="font-size:17px;font-weight:700;color:#0F172A;margin-bottom:4px">${value}</div>
        ${sub ? `<div style="font-size:9px;color:#64748B">${sub}</div>` : ''}
      </div>`;

    // ── Table header row HTML ─────────────────────────────────────────────
    const th = (cols: string[]) => `
      <tr style="background:#1E3A5F">
        ${cols.map(c => `<th style="padding:7px 10px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#fff;white-space:nowrap">${c}</th>`).join('')}
      </tr>`;

    // ── Section title HTML ────────────────────────────────────────────────
    const sectionTitle = (dot: string, text: string) => `
      <div style="display:flex;align-items:center;gap:8px;margin:24px 0 8px;font-size:12px;font-weight:700;color:#1E3A5F">
        <span style="width:9px;height:9px;border-radius:50%;background:${dot};display:inline-block"></span>
        ${text}
      </div>`;

    // ── Period breakdown rows ─────────────────────────────────────────────
    const periodRows = r.periodRows.map(p => `
      <tr style="border-bottom:1px solid #F1F5F9">
        <td style="padding:7px 10px;font-weight:600;color:#0F172A;font-size:10px">${p.periodLabel}</td>
        <td style="padding:7px 10px;text-align:right;font-size:10px;color:#166534">${fmt(p.eventIncome)}</td>
        <td style="padding:7px 10px;text-align:right;font-size:10px;color:#166534">${fmt(p.adhocIncome)}</td>
        <td style="padding:7px 10px;text-align:right;font-size:10px;font-weight:700;color:#0F172A">${fmt(p.totalIncome)}</td>
        <td style="padding:7px 10px;text-align:right;font-size:10px;color:#9A3412">${fmt(p.expenses)}</td>
        <td style="padding:7px 10px;text-align:right;font-size:10px;font-weight:700;color:${p.net >= 0 ? '#1E3A5F' : '#991B1B'}">${fmt(p.net)}</td>
        <td style="padding:7px 10px;text-align:right;font-size:10px;color:#854D0E">${fmt(p.outstanding)}</td>
      </tr>`).join('');

    const periodTotals = `
      <tr style="background:#F8FAFC;font-weight:700;border-top:2px solid #CBD5E1">
        <td style="padding:8px 10px;font-size:10px;font-weight:700;color:#0F172A">TOTAL</td>
        <td style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;color:#166534">${fmt(r.totalEventIncome)}</td>
        <td style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;color:#166534">${fmt(r.totalAdhocIncome)}</td>
        <td style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;color:#0F172A">${fmt(r.totalIncome)}</td>
        <td style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;color:#9A3412">${fmt(r.totalExpenses)}</td>
        <td style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;color:${r.netBalance >= 0 ? '#1E3A5F' : '#991B1B'}">${fmt(r.netBalance)}</td>
        <td style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;color:#854D0E">${fmt(r.totalOutstanding)}</td>
      </tr>`;

    // ── Income detail rows ────────────────────────────────────────────────
    const incomeRows = r.incomeDetails.map((row, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#F8FAFC'};border-bottom:1px solid #F1F5F9">
        <td style="padding:6px 8px;font-size:9px;color:#64748B;font-family:monospace">${row.invoiceRef}</td>
        <td style="padding:6px 8px;font-size:9px;color:#64748B;white-space:nowrap">${row.date}</td>
        <td style="padding:6px 8px">
          <span style="font-size:8px;font-weight:700;padding:2px 6px;border-radius:3px;background:${row.type === 'Event' ? '#DBEAFE' : '#EDE9FE'};color:${row.type === 'Event' ? '#1E40AF' : '#5B21B6'}">${row.type}</span>
        </td>
        <td style="padding:6px 8px;font-size:9px;color:#374151;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${row.description}</td>
        <td style="padding:6px 8px;font-size:9px;color:#0F172A">${row.studentName}</td>
        <td style="padding:6px 8px;font-size:9px;color:#64748B">${row.paymentMethod}</td>
        <td style="padding:6px 8px;text-align:right;font-size:9px;font-weight:600;color:#166534">${fmt(row.amountPaid)}</td>
        <td style="padding:6px 8px;text-align:right;font-size:9px;color:#854D0E">${fmt(row.amountDue)}</td>
        <td style="padding:6px 8px">
          <span style="font-size:8px;font-weight:700;padding:2px 6px;border-radius:3px;background:${statusBg(row.status)};color:${statusColour(row.status)}">${row.status}</span>
        </td>
      </tr>`).join('');

    // ── Expense detail rows ───────────────────────────────────────────────
    const expenseRows = r.expenseDetails.map((row, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#F8FAFC'};border-bottom:1px solid #F1F5F9">
        <td style="padding:6px 8px;font-size:9px;color:#64748B;white-space:nowrap">${row.date}</td>
        <td style="padding:6px 8px;font-size:9px;color:#374151">${row.category}</td>
        <td style="padding:6px 8px;font-size:9px;color:#374151;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${row.description}</td>
        <td style="padding:6px 8px;font-size:9px;color:#64748B">${row.team || '—'}</td>
        <td style="padding:6px 8px;font-size:9px;color:#64748B">${row.paymentMethod}</td>
        <td style="padding:6px 8px;font-size:9px;color:#64748B">${row.addedBy || '—'}</td>
        <td style="padding:6px 8px;text-align:right;font-size:9px;font-weight:600;color:#9A3412">${fmt(row.amount)}</td>
      </tr>`).join('');

    // ── Outstanding rows ──────────────────────────────────────────────────
    const outstandingRows = r.outstanding.map((row, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#FFFBEB'};border-bottom:1px solid #F1F5F9">
        <td style="padding:6px 8px;font-size:9px;color:#64748B;font-family:monospace">${row.invoiceRef}</td>
        <td style="padding:6px 8px;font-size:9px;color:#0F172A">${row.studentName}</td>
        <td style="padding:6px 8px;font-size:9px;color:#374151;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${row.description}</td>
        <td style="padding:6px 8px">
          <span style="font-size:8px;font-weight:700;padding:2px 6px;border-radius:3px;background:${row.type === 'Event' ? '#DBEAFE' : '#EDE9FE'};color:${row.type === 'Event' ? '#1E40AF' : '#5B21B6'}">${row.type}</span>
        </td>
        <td style="padding:6px 8px;font-size:9px;color:#64748B;white-space:nowrap">${row.dueDate || '—'}</td>
        <td style="padding:6px 8px;text-align:right;font-size:9px;font-weight:700;color:#9A3412">${fmt(row.amountDue)}</td>
        <td style="padding:6px 8px;text-align:right;font-size:9px;color:#166534">${fmt(row.amountPaid)}</td>
        <td style="padding:6px 8px">
          <span style="font-size:8px;font-weight:700;padding:2px 6px;border-radius:3px;background:${statusBg(row.status)};color:${statusColour(row.status)}">${row.status}</span>
        </td>
      </tr>`).join('');

    // ── Full print document ───────────────────────────────────────────────
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Financial Report — ${period}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    background: #fff;
    color: #0F172A;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page { max-width: 100%; padding: 20mm 14mm 16mm; }
  table { width: 100%; border-collapse: collapse; }
  .section-break { page-break-inside: avoid; }
  @page { size: A4 landscape; margin: 0; }
  @media print {
    .page { padding: 10mm 8mm; }
    body { font-size: 9px; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- ── Cover header ── -->
  <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #1E3A5F;padding-bottom:10px;margin-bottom:18px">
    <div>
      <div style="font-size:9px;color:#64748B;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">${clubName}</div>
      <h1 style="font-size:20px;font-weight:700;color:#1E3A5F;margin-bottom:3px">Financial Report</h1>
      <p style="font-size:10px;color:#64748B">Period: <strong>${period}</strong> &nbsp;·&nbsp; Grouped by: <strong>${this.groupBy}</strong></p>
    </div>
    <div style="text-align:right">
      <div style="font-size:9px;color:#94A3B8">Printed on</div>
      <div style="font-size:10px;font-weight:600;color:#374151">${new Date().toLocaleDateString('en-US', { day:'numeric', month:'long', year:'numeric' })}</div>
    </div>
  </div>

  <!-- ── KPI cards ── -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px">
    ${kpiCard('Total Income',    fmt(r.totalIncome),    '#1D9E75', `Events ${fmt(r.totalEventIncome)} · Adhoc ${fmt(r.totalAdhocIncome)}`)}
    ${kpiCard('Total Expenses',  fmt(r.totalExpenses),  '#D97706', `${r.expenseCount} records`)}
    ${kpiCard('Net Balance',     fmt(r.netBalance),     r.netBalance >= 0 ? '#1E3A5F' : '#DC2626', 'Income − Expenses')}
    ${kpiCard('Outstanding',     fmt(r.totalOutstanding), '#D97706', `${r.outstanding.length} unpaid invoices`)}
  </div>

  <!-- ── Period Breakdown ── -->
  <div class="section-break">
    ${sectionTitle('#7C3AED', 'Period Breakdown')}
    <table style="border:1px solid #E2E8F0;border-radius:6px;overflow:hidden">
      <thead>
        ${th(['Period','Event Income','Adhoc Income','Total Income','Expenses','Net','Outstanding'])}
      </thead>
      <tbody>
        ${periodRows}
        ${periodTotals}
      </tbody>
    </table>
  </div>

  ${r.incomeDetails.length > 0 ? `
  <!-- ── Income Detail ── -->
  <div class="section-break" style="margin-top:20px">
    ${sectionTitle('#1D9E75', `Income Detail — ${r.incomeDetails.length} records`)}
    <table style="border:1px solid #E2E8F0;border-radius:6px;overflow:hidden">
      <thead>
        ${th(['Ref','Date','Type','Description','Student','Method','Paid','Due','Status'])}
      </thead>
      <tbody>${incomeRows}</tbody>
    </table>
  </div>` : ''}

  ${r.expenseDetails.length > 0 ? `
  <!-- ── Expense Detail ── -->
  <div class="section-break" style="margin-top:20px">
    ${sectionTitle('#D97706', `Expense Detail — ${r.expenseDetails.length} records`)}
    <table style="border:1px solid #E2E8F0;border-radius:6px;overflow:hidden">
      <thead>
        ${th(['Date','Category','Description','Team','Method','Added By','Amount'])}
      </thead>
      <tbody>${expenseRows}</tbody>
    </table>
  </div>` : ''}

  ${r.outstanding.length > 0 ? `
  <!-- ── Outstanding ── -->
  <div class="section-break" style="margin-top:20px">
    ${sectionTitle('#D97706', `Outstanding Invoices — ${r.outstanding.length}`)}
    <table style="border:1px solid #E2E8F0;border-radius:6px;overflow:hidden">
      <thead>
        ${th(['Ref','Student','Description','Type','Due Date','Amount Due','Paid','Status'])}
      </thead>
      <tbody>${outstandingRows}</tbody>
    </table>
  </div>` : ''}

  <!-- ── Footer ── -->
  <div style="margin-top:24px;padding-top:8px;border-top:1px solid #E2E8F0;display:flex;justify-content:space-between;font-size:8px;color:#94A3B8">
    <span>${clubName} — Financial Report — ${period}</span>
    <span>Generated ${new Date().toLocaleString()}</span>
  </div>

</div><!-- .page -->
<script>
  window.onload = function() {
    window.focus();
    window.print();
    setTimeout(function(){ window.close(); }, 1500);
  };
<\/script>
</body>
</html>`;

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) { document.body.removeChild(iframe); return; }
    doc.open(); doc.write(html); doc.close();
    setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 8000);
  }