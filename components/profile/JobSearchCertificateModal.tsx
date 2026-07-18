"use client";
import { useRef, useState, useEffect } from "react";
import type { CSSProperties } from "react";
import { X, Download, Printer } from "lucide-react";
import { downloadApplicationPdf, printApplication } from "@/lib/applicationPdf";
import CertificateSheet from "@/components/profile/CertificateSheet";

type AppRow = {
  id: string;
  brand_name?: string;
  company_name?: string;
  job_title?: string;
  applied_at?: string;
  status?: string;
};

// 취업활동 증명서(요약형): 뷰티워크를 통한 입사지원 내역 전체를 표로 증빙
export default function JobSearchCertificateModal({
  name,
  apps,
  onClose,
}: {
  name: string;
  apps: AppRow[];
  onClose: () => void;
}) {
  const captureRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const rows = apps.filter((a) => a.status !== "WITHDRAWN");
  const today = new Date();
  const todayStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
  const docNo = `BW-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}-${String(today.getHours()).padStart(2, "0")}${String(today.getMinutes()).padStart(2, "0")}`;
  const fmt = (d?: string) => {
    if (!d) return "-";
    const dt = new Date(d);
    return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
  };

  const handleDownload = async () => {
    if (!captureRef.current) return;
    setIsDownloading(true);
    try {
      await downloadApplicationPdf(captureRef.current, `취업활동증명서_${name || "구직자"}.pdf`);
    } catch {
      alert("다운로드 중 오류가 발생했습니다.");
    } finally {
      setIsDownloading(false);
    }
  };
  const handlePrint = async () => {
    if (!captureRef.current) return;
    try {
      await printApplication(captureRef.current);
    } catch {
      alert("인쇄 준비 중 오류가 발생했습니다.");
    }
  };

  const th: CSSProperties = { border: "1px solid #ccc", padding: isMobile ? "3px 3px" : "7px 8px", fontSize: isMobile ? 10 : 13, fontWeight: 700, background: "#f5f0fa", color: "#1a1a1a", lineHeight: 1.1, verticalAlign: "middle" };
  const td: CSSProperties = { border: "1px solid #ddd", padding: isMobile ? "3px 3px" : "7px 8px", fontSize: isMobile ? 10 : 13, color: "#333", lineHeight: 1.1, verticalAlign: "middle" };

  return (
    <div className="rp-modal-overlay">
      <div className="rp-modal myapp-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720, width: "94%", maxHeight: "92vh", display: "flex", flexDirection: "column" }}>
        <div className="rp-modal-header" style={{ flexShrink: 0 }}>
          <h2 className="rp-modal-title">취업활동 증명서</h2>
          <div className="rp-modal-actions">
            <button className="resume-action-btn" onClick={handleDownload} disabled={isDownloading}>
              <Download size={16} />
              <span>{isDownloading ? "저장 중..." : "PDF 다운로드"}</span>
            </button>
            <button className="resume-action-btn" onClick={handlePrint}>
              <Printer size={16} />
              <span>인쇄</span>
            </button>
            <button className="rp-modal-close" onClick={onClose}><X size={20} /></button>
          </div>
        </div>
        <div className="rp-modal-body" style={{ overflowY: "auto", flex: 1 }}>
          <CertificateSheet ref={captureRef} docNo={docNo} todayStr={todayStr} compact={isMobile}>
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 18 }}>
              <tbody>
                <tr>
                  <td style={{ ...th, width: "22%", textAlign: "center" }}>성명</td>
                  <td style={{ ...td, width: "28%" }}>{name || "-"}</td>
                  <td style={{ ...th, width: "22%", textAlign: "center" }}>발급일</td>
                  <td style={{ ...td, width: "28%" }}>{todayStr}</td>
                </tr>
              </tbody>
            </table>

            <p style={{ fontSize: isMobile ? 11 : 14, color: "#333", lineHeight: isMobile ? 1.55 : 1.9, margin: isMobile ? "0 0 12px" : "0 0 16px" }}>
              위 사람은 뷰티 채용 플랫폼 <strong>뷰티워크(beautywork.co.kr)</strong>를 통해 아래와 같이 입사지원(구직활동)하였음을 증명합니다.
            </p>

            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
              <thead>
                <tr>
                  <td style={{ ...th, width: "8%", textAlign: "center" }}>번호</td>
                  <td style={{ ...th, textAlign: "center" }}>회사·매장명</td>
                  <td style={{ ...th, textAlign: "center" }}>채용공고</td>
                  <td style={{ ...th, width: "16%", textAlign: "center" }}>지원일</td>
                  <td style={{ ...th, width: "16%", textAlign: "center" }}>지원경로</td>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td style={{ ...td, textAlign: "center", padding: "20px" }} colSpan={5}>지원 내역이 없습니다.</td></tr>
                ) : rows.map((a, i) => (
                  <tr key={a.id}>
                    <td style={{ ...td, textAlign: "center" }}>{i + 1}</td>
                    <td style={td}>{a.brand_name || a.company_name || "-"}</td>
                    <td style={td}>{a.job_title || "-"}</td>
                    <td style={{ ...td, textAlign: "center" }}>{fmt(a.applied_at)}</td>
                    <td style={{ ...td, textAlign: "center" }}>뷰티워크</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p style={{ fontSize: isMobile ? 9 : 12, color: "#888", lineHeight: 1.6, margin: 0 }}>
              ※ 본 증명서는 구직활동 증빙 자료로 활용하실 수 있으며, 최종 인정 여부는 관할 고용센터의 판단에 따릅니다.<br />
              ※ 실업급여 구직활동 증빙 시, 해당 채용공고문을 함께 제출해야 인정되는 경우가 있습니다. (공고문 포함 개별 증명서는 각 지원 건에서 발급할 수 있습니다.)
            </p>
          </CertificateSheet>
        </div>
      </div>
    </div>
  );
}
