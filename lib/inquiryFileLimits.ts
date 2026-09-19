/** 문의 첨부의 한계값. 폼(브라우저)과 접수 API 가 같은 값을 본다.
 *  DB·저장소를 건드리는 쪽(lib/inquiryFiles.ts)과 나눠 둔다 — 그쪽을
 *  화면에서 가져오면 pg 가 브라우저 번들에 끌려 들어온다. */
export const 첨부최대크기 = 5 * 1024 * 1024; // 한 개 5MB
export const 첨부최대개수 = 3;

/** 확장자 → contentType. MIME 은 브라우저·OS 가 비워 보내는 일이 있어 확장자로 판단한다. */
export const 확장자표: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  hwp: "application/x-hwp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  zip: "application/zip",
};

export const 붙일수있는확장자 = Object.keys(확장자표);
