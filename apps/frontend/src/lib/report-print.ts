export function escapePrintHtml(value: unknown): string {
  const input = value == null ? '' : String(value)
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function multilineToPrintHtml(value: unknown): string {
  return escapePrintHtml(value).replace(/\n/g, '<br />')
}

type PrintReportPayload = {
  title: string
  subtitle?: string
  contentHtml: string
}

export function printFormalReport(payload: PrintReportPayload): boolean {
  if (typeof window === 'undefined') return false

  const printWindow = window.open('', '_blank', 'width=1200,height=900')
  if (!printWindow) return false

  const documentHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapePrintHtml(payload.title)}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #111827;
      background: #ffffff;
      font-family: "Segoe UI", Arial, sans-serif;
      line-height: 1.35;
      font-size: 12px;
    }
    .report-shell {
      max-width: 980px;
      margin: 0 auto;
    }
    .report-header {
      border-bottom: 2px solid #1f2937;
      margin-bottom: 16px;
      padding-bottom: 8px;
    }
    .report-title {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 0.2px;
    }
    .report-subtitle {
      margin: 4px 0 0;
      color: #4b5563;
      font-size: 11px;
    }
    .section {
      margin-top: 14px;
      page-break-inside: avoid;
    }
    .section-title {
      margin: 0 0 8px;
      font-size: 14px;
      font-weight: 700;
      color: #111827;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
    }
    .kpi-card {
      border: 1px solid #d1d5db;
      border-radius: 6px;
      padding: 8px;
      background: #f9fafb;
    }
    .kpi-label {
      margin: 0;
      color: #4b5563;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .kpi-value {
      margin: 4px 0 0;
      font-size: 16px;
      font-weight: 700;
    }
    .report-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #cbd5e1;
      background: #ffffff;
    }
    .report-table th,
    .report-table td {
      border: 1px solid #d1d5db;
      padding: 6px 8px;
      text-align: left;
      vertical-align: top;
    }
    .report-table th {
      background: #f3f4f6;
      font-weight: 700;
      font-size: 11px;
      color: #111827;
    }
    .note-block {
      border: 1px solid #d1d5db;
      border-radius: 6px;
      padding: 8px;
      background: #ffffff;
      margin-bottom: 8px;
    }
    .note-title {
      margin: 0;
      font-size: 12px;
      font-weight: 700;
      color: #111827;
    }
    .note-content {
      margin: 4px 0 0;
      color: #374151;
      white-space: normal;
    }
    .empty {
      border: 1px dashed #9ca3af;
      border-radius: 6px;
      padding: 10px;
      color: #6b7280;
      background: #f9fafb;
    }
    .footer-meta {
      margin-top: 12px;
      color: #6b7280;
      font-size: 10px;
      border-top: 1px solid #e5e7eb;
      padding-top: 8px;
    }
    @media print {
      .section { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <main class="report-shell">
    <header class="report-header">
      <h1 class="report-title">${escapePrintHtml(payload.title)}</h1>
      ${payload.subtitle ? `<p class="report-subtitle">${escapePrintHtml(payload.subtitle)}</p>` : ''}
    </header>
    ${payload.contentHtml}
  </main>
</body>
</html>`

  printWindow.document.open()
  printWindow.document.write(documentHtml)
  printWindow.document.close()

  printWindow.onload = () => {
    printWindow.focus()
    printWindow.print()
    printWindow.onafterprint = () => printWindow.close()
  }

  return true
}