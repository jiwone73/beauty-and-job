"use client";
import { useRef, useState, useEffect } from "react";
import type { CSSProperties } from "react";
import { X, Download, Printer } from "lucide-react";
import { downloadApplicationPdf, printApplication } from "@/lib/applicationPdf";
import CertificateSheet from "@/components/profile/CertificateSheet";

type AppRow = {
  id: string;
  job_id?: string;
  brand_name?: string;
  company_name?: string;
  job_title?: string;
  applied_at?: string;
  job_snapshot?: any;
};

// 취업활동 증명서(개별형): 특정 지원 건 + 해당 채용공고문을 함께 담아 증빙
export default function JobPostingCertificateModal({
  name,
  app,
  onClose,
}: {
  name: string;
  app: AppRow;
  onClose: () => void;
}) {
  const captureRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSnapshot, setIsSnapshot] = useState(false);

  useEffect(() => {
    // 지원 시점 박제본이 있으면 그것을 사용 (공고가 수정·마감·삭제돼도 지원 당시 내용 보장)
    if (app.job_snapshot) { setJob(app.job_snapshot); setIsSnapshot(true); setLoading(false); return; }
    // 박제본이 없는 과거 지원 건은 현재 공고를 폴백으로 조회
    if (!app.job_id) { setLoading(false); return; }
    const token = localStorage.getItem("access_token");
    fetch(`/api/jobs/${app.job_id}`, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)
      .then((r) => r.json())
      .then((res) => { if (res.success) setJob(res.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [app.job_id, app.job_snapshot]);

  const today = new Date();
  const todayStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
  const docNo = `BW-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}-${app.id.slice(0, 6).toUpperCase()}`;
  const fmt = (d?: string) => {
    if (!d) return "-";
    const dt = new Date(d);
    return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
  };

  const handleDownload = async () => {
    if (!captureRef.current) return;
    setIsDownloading(true);
    try {
      await downloadApplicationPdf(captureRef.current, `취업활동증명서_${name || "구직자"}_${app.job_title || "공고"}.pdf`);
    } catch {
      alert("다운로드 중 오류가 발생했습니다.");
    } finally {
      setIsDownloading(false);
    }
  };
  const handlePrint = async () => {
    if (!captureRef.current) return;
    try { await printApplication(captureRef.current); } catch { alert("인쇄 준비 중 오류가 발생했습니다."); }
  };

  const th: CSSProperties = { border: "1px solid #ccc", padding: "7px 8px", fontSize: 13, fontWeight: 700, background: "#f5f0fa", color: "#1a1a1a", textAlign: "center", width: "22%", lineHeight: 1.15, verticalAlign: "middle" };
  const td: CSSProperties = { border: "1px solid #ddd", padding: "7px 8px", fontSize: 13, color: "#333", lineHeight: 1.15, verticalAlign: "middle" };
  const company = job?.company?.brand_name || job?.company?.company_name || app.brand_name || app.company_name || "-";
  const workplace = job?.location || job?.address || (job?.company ? [job.company.region_sido, job.company.region_sigungu].filter(Boolean).join(" ") : "") || "-";

  return (
    <div className="rp-modal-overlay">
      <div className="rp-modal myapp-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720, width: "94%", maxHeight: "92vh", display: "flex", flexDirection: "column" }}>
        <div className="rp-modal-header" style={{ flexShrink: 0 }}>
          <h2 className="rp-modal-title">취업활동 증명서</h2>
          <div className="rp-modal-actions">
            <button className="resume-action-btn" onClick={handleDownload} disabled={isDownloading || loading}>
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
          {loading ? (
            <div style={{ padding: 60, textAlign: "center", color: "#888" }}>불러오는 중...</div>
          ) : (
            <CertificateSheet ref={captureRef} docNo={docNo} todayStr={todayStr}>
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 18 }}>
                <tbody>
                  <tr>
                    <td style={th}>성명</td>
                    <td style={{ ...td, width: "28%" }}>{name || "-"}</td>
                    <td style={th}>지원일</td>
                    <td style={{ ...td, width: "28%" }}>{fmt(app.applied_at)}</td>
                  </tr>
                </tbody>
              </table>

              <p style={{ fontSize: 14, color: "#333", lineHeight: 1.9, margin: "0 0 18px" }}>
                위 사람은 뷰티 채용 플랫폼 <strong>뷰티워크(beautywork.co.kr)</strong>를 통해 아래 채용공고에 입사지원(구직활동)하였음을 증명합니다.
              </p>

              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", margin: "0 0 10px", paddingBottom: 6, borderBottom: "2px solid #eee" }}>■ 채용공고</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: job?.description ? 14 : 0 }}>
                <tbody>
                  <tr>
                    <td style={th}>회사·매장명</td>
                    <td style={td} colSpan={3}>{company}</td>
                  </tr>
                  <tr>
                    <td style={th}>채용공고</td>
                    <td style={td} colSpan={3}>{job?.title || app.job_title || "-"}</td>
                  </tr>
                  <tr>
                    <td style={th}>근무지</td>
                    <td style={td} colSpan={3}>{workplace}</td>
                  </tr>
                  {job?.deadline && (
                    <tr>
                      <td style={th}>모집마감</td>
                      <td style={td} colSpan={3}>{fmt(job.deadline)}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {job?.description && (
                <div style={{ border: "1px solid #ddd", borderTop: "none", padding: "12px 12px 14px", marginBottom: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#666", margin: "0 0 6px" }}>모집 내용</p>
                  <p style={{ fontSize: 13, color: "#333", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>{job.description}</p>
                </div>
              )}

              <p style={{ fontSize: 12, color: "#888", lineHeight: 1.8, margin: "18px 0 0" }}>
                {isSnapshot && (
                  <>※ 위 채용공고 내용은 지원일({fmt(app.applied_at)}) 시점 기준으로 보관된 자료입니다.<br /></>
                )}
                ※ 본 증명서는 구직활동 증빙 자료로 활용하실 수 있으며, 최종 인정 여부는 관할 고용센터의 판단에 따릅니다.
              </p>
            </CertificateSheet>
          )}
        </div>
      </div>
    </div>
  );
}
