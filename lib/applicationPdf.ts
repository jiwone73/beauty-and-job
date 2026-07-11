// 제출한 지원서(자기소개서+이력서) 공용 PDF/인쇄 유틸
// 화면에 보이는 요소(el)를 통째로 캡처해 A4 페이지 높이로 분할 → 미리보기와 완전히 동일한 결과물

export async function downloadApplicationPdf(el: HTMLElement, fileName: string) {
  const html2canvas = (await import("html2canvas")).default;
  const jsPDF = (await import("jspdf")).default;
  await new Promise((r) => setTimeout(r, 300));

  const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
  const imgW = canvas.width;
  const imgH = canvas.height;
  const srcCtx = canvas.getContext("2d");
  const pixels = srcCtx ? srcCtx.getImageData(0, 0, imgW, imgH).data : null;

  const pdf = new jsPDF("p", "mm", "a4");
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginTop = 12;   // 각 페이지 상단 여백(mm, 자소서 상단 여백과 유사)
  const marginBottom = 12;// 각 페이지 하단 여백(mm)
  const marginX = 0;      // 좌우 여백은 캡처 내부 padding(40px)으로
  const contentWidth = pdfWidth - marginX * 2;
  const usableHeight = pageHeight - marginTop - marginBottom;
  const pxPerPage = Math.floor((imgW * usableHeight) / contentWidth);

  // 해당 y행이 거의 흰색인지(=여백/블록 사이) 판단
  const isWhiteRow = (y: number) => {
    if (!pixels) return false;
    for (let x = 0; x < imgW; x += 6) {
      const i = (y * imgW + x) * 4;
      if (pixels[i] < 244 || pixels[i + 1] < 244 || pixels[i + 2] < 244) return false;
    }
    return true;
  };

  let rendered = 0;
  let pageStart = true;
  while (rendered < imgH) {
    let sliceH = Math.min(pxPerPage, imgH - rendered);
    // 마지막 페이지가 아니면, 글자·배너를 자르지 않도록 흰 여백 줄에서 끊기
    if (rendered + sliceH < imgH) {
      const target = rendered + sliceH;
      const minCut = rendered + Math.floor(pxPerPage * 0.5);
      for (let y = target; y > minCut; y--) {
        if (isWhiteRow(y)) { sliceH = y - rendered; break; }
      }
    }
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = imgW;
    pageCanvas.height = sliceH;
    const ctx = pageCanvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, imgW, sliceH);
      ctx.drawImage(canvas, 0, rendered, imgW, sliceH, 0, 0, imgW, sliceH);
    }
    const sliceImg = pageCanvas.toDataURL("image/png");
    const sliceHmm = (sliceH * contentWidth) / imgW;
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
