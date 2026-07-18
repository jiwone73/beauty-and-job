"use client";
import { forwardRef } from "react";

// 증명서 공용 서식: 테두리 프레임 + 문서번호 + 제목 + 본문(children) + 발급처/직인
const CertificateSheet = forwardRef<HTMLDivElement, {
  docNo: string;
  todayStr: string;
  children: React.ReactNode;
  compact?: boolean;
}>(function CertificateSheet({ docNo, todayStr, children, compact = false }, ref) {
  const c = compact;
  return (
    <div ref={ref} style={{ background: "#fff", padding: c ? 8 : 40 }}>
      <div style={{ border: c ? "1.5px solid #333" : "2px solid #333", padding: c ? "12px 10px" : "34px 32px 30px" }}>
        <p style={{ textAlign: "right", fontSize: c ? 8 : 12, color: "#888", margin: "0 0 4px" }}>문서번호 : {docNo}</p>
        <h1 style={{ fontSize: c ? 17 : 26, fontWeight: 800, textAlign: "center", letterSpacing: c ? 0 : 8, margin: c ? "2px 0 8px" : "8px 0 18px", color: "#1a1a1a" }}>취업활동 증명서</h1>
        <div style={{ borderTop: "1px solid #d5d5d5", margin: c ? "0 0 16px" : "0 0 24px" }} />

        {children}

        <div style={{ textAlign: "center", marginTop: c ? 28 : 42 }}>
          <p style={{ fontSize: c ? 13 : 15, color: "#333", letterSpacing: 3, margin: c ? "0 0 12px" : "0 0 16px" }}>{todayStr}</p>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            <span style={{ fontSize: c ? 17 : 21, fontWeight: 800, letterSpacing: c ? 4 : 6, color: "#1a1a1a" }}>뷰티워크</span>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: c ? 42 : 54, height: c ? 42 : 54, borderRadius: "50%", border: "2px solid #c0392b", color: "#c0392b", fontSize: c ? 11 : 12, fontWeight: 800, letterSpacing: 1, transform: "rotate(-6deg)", marginLeft: 6 }}>직인</span>
          </div>
          <p style={{ fontSize: c ? 10 : 12, color: "#999", marginTop: 10 }}>뷰티 채용 플랫폼 뷰티워크 · beautywork.co.kr</p>
        </div>
      </div>
    </div>
  );
});

export default CertificateSheet;
