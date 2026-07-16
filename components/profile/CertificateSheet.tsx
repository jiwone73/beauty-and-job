"use client";
import { forwardRef } from "react";

// 증명서 공용 서식: 테두리 프레임 + 문서번호 + 제목 + 본문(children) + 발급처/직인
const CertificateSheet = forwardRef<HTMLDivElement, {
  docNo: string;
  todayStr: string;
  children: React.ReactNode;
}>(function CertificateSheet({ docNo, todayStr, children }, ref) {
  return (
    <div ref={ref} style={{ background: "#fff", padding: 40 }}>
      <div style={{ border: "2px solid #333", padding: "34px 32px 30px" }}>
        <p style={{ textAlign: "right", fontSize: 12, color: "#888", margin: "0 0 4px" }}>문서번호 : {docNo}</p>
        <h1 style={{ fontSize: 26, fontWeight: 800, textAlign: "center", letterSpacing: 8, margin: "8px 0 18px", color: "#1a1a1a" }}>취업활동 증명서</h1>
        <div style={{ borderTop: "1px solid #d5d5d5", margin: "0 0 24px" }} />

        {children}

        <div style={{ textAlign: "center", marginTop: 42 }}>
          <p style={{ fontSize: 15, color: "#333", letterSpacing: 3, margin: "0 0 16px" }}>{todayStr}</p>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            <span style={{ fontSize: 21, fontWeight: 800, letterSpacing: 6, color: "#1a1a1a" }}>뷰티워크</span>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 54, height: 54, borderRadius: "50%", border: "2px solid #c0392b", color: "#c0392b", fontSize: 12, fontWeight: 800, letterSpacing: 1, transform: "rotate(-6deg)", marginLeft: 6 }}>직인</span>
          </div>
          <p style={{ fontSize: 12, color: "#999", marginTop: 10 }}>뷰티 채용 플랫폼 뷰티워크 · beautywork.co.kr</p>
        </div>
      </div>
    </div>
  );
});

export default CertificateSheet;
