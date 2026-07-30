export function printMeetingMinutes(title: string, date: string, contentHtml: string) {
  const win = window.open("", "_blank");
  if (!win) { return; }
  win.document.write(`
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; }
  h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
  .date { color: #666; font-size: 0.875rem; margin-bottom: 2rem; }
  h2 { font-size: 1.125rem; margin-top: 1.5rem; margin-bottom: 0.75rem; border-bottom: 1px solid #e5e5e5; padding-bottom: 0.25rem; }
  h3 { font-size: 1rem; margin-top: 1rem; margin-bottom: 0.5rem; }
  .task-list { list-style: none; padding: 0; }
  .task-list li { padding: 0.25rem 0; font-size: 0.875rem; }
  .checked { text-decoration: line-through; color: #999; }
  .unchecked { color: #1a1a1a; }
  .discussion, .decision { font-size: 0.875rem; white-space: pre-wrap; background: #f5f5f5; padding: 0.75rem; border-radius: 4px; margin-bottom: 0.5rem; }
  .label { font-size: 0.75rem; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem; }
  .section { margin-bottom: 1.5rem; }
  @media print { body { margin: 0.5in; } }
</style></head>
<body>
  <h1>${title}</h1>
  <div class="date">${date}</div>
  ${contentHtml}
</body></html>
  `);
  win.document.close();
  win.focus();
  win.print();
}
