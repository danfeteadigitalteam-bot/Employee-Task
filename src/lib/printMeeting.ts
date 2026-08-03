import logoUrl from "@/img/nte trans logo black.png";

async function toDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function printMeetingMinutes(title: string, date: string, contentHtml: string) {
  let logoSrc = logoUrl;
  try {
    logoSrc = await toDataUrl(logoUrl);
  } catch {
    // fall back to the asset URL if embedding fails
  }

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title}</title>
<style>
  @page { size: A4; margin: 0; }
  body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; }
  .letterhead { text-align: center; border-bottom: 2px solid #1a1a1a; padding-bottom: 1.25rem; margin-bottom: 1.5rem; }
  .letterhead img { max-height: 160px; max-width: 240px; object-fit: contain; }
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
  @media print { body { margin: 0; padding: 0.5in; } }
</style></head>
<body>
  <div class="letterhead">
    <img src="${logoSrc}" alt="Nepal Tea Exchange" />
  </div>
  <h1>${title}</h1>
  <div class="date">${date}</div>
  ${contentHtml}
</body></html>
  `;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const cleanup = () => {
    setTimeout(() => iframe.remove(), 100);
  };

  iframe.onload = () => {
    const w = iframe.contentWindow;
    if (!w) {
      iframe.remove();
      return;
    }
    w.addEventListener("afterprint", cleanup);
    w.focus();
    w.print();
    setTimeout(cleanup, 1000);
  };

  iframe.srcdoc = html;
}
