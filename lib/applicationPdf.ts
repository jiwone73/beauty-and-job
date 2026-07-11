// 제출한 지원서(자기소개서+이력서) 공용 PDF/인쇄 유틸
// 화면에 보이는 요소(el)를 통째로 캡처해 A4 페이지 높이로 분할 → 미리보기와 완전히 동일한 결과물

export async function downloadApplicationPdf(el: HTMLElement, fileName: string) {
  const html2canvas = (await import("html2canvas")).default;
  const jsPDF = (await import("jspdf")).default;
  await new Promise((r) => setTimeout(r, 300));

  const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
  const pdf = new jsPDF("p", "mm", "a4");
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginTop = 6;
  const marginBottom = 6;
  const marginX = 0; // 좌우 여백은 캡처 내부 padding으로만 → 미리보기와 동일
  const contentWidth = pdfWidth - marginX * 2;
  const usableHeight = pageHeight - marginTop - marginBottom;

  const pxPerPage = Math.floor((canvas.width * usableHeight) / contentWidth);
  let rendered = 0;
  let pageStart = true;
  while (rendered < canvas.height) {
    const sliceH = Math.min(pxPerPage, canvas.height - rendered);
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceH;
    const ctx = pageCanvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(canvas, 0, rendered, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
    }
    const sliceImg = pageCanvas.toDataURL("image/png");
    const sliceHmm = (sliceH * contentWidth) / canvas.width;
    if (!pageStart) pdf.addPage();
    pdf.addImage(sliceImg, "PNG", marginX, marginTop, contentWidth, sliceHmm);
    rendered += sliceH;
    pageStart = false;
  }
  pdf.save(fileName);
}

export async function printApplication(el: HTMLElement) {
  const html2canvas = (await import("html2canvas")).default;
  await new Promise((r) => setTimeout(r, 300));
  const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
  const imgData = canvas.toDataURL("image/png");

  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc) { document.body.removeChild(iframe); return; }
  doc.open();
  doc.write(`<html><head><title>이력서 인쇄</title></head><body style="margin:0"><img src="${imgData}" style="width:100%" /></body></html>`);
  doc.close();
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => { if (iframe.parentNode) document.body.removeChild(iframe); }, 1000);
  }, 400);
}
