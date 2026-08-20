function downloadDataUrl(dataUrl: string, fileName: string): void {
  const link = document.createElement('a');
  link.download = fileName;
  link.href = dataUrl;
  link.click();
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export async function exportResultPng(element: HTMLElement): Promise<void> {
  const { toPng } = await import('html-to-image');
  const dataUrl = await toPng(element, {
    pixelRatio: 2,
    backgroundColor: '#ffffff',
    cacheBust: true
  });
  downloadDataUrl(dataUrl, `JLU-GPA-${timestamp()}.png`);
}

export async function exportResultPdf(element: HTMLElement): Promise<void> {
  const [{ toPng }, { jsPDF }] = await Promise.all([import('html-to-image'), import('jspdf')]);
  const dataUrl = await toPng(element, {
    pixelRatio: 2,
    backgroundColor: '#ffffff',
    cacheBust: true
  });
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 12;
  const width = 210 - margin * 2;
  const image = document.createElement('img');
  image.src = dataUrl;
  await image.decode();
  const height = (image.height * width) / image.width;
  pdf.addImage(dataUrl, 'PNG', margin, margin, width, Math.min(height, 297 - margin * 2));
  pdf.save(`JLU-GPA-${timestamp()}.pdf`);
}
