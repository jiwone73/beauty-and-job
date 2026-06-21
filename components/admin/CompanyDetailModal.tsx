"use client";
import { useState, useRef } from "react";
import { X, Download, Printer, FileText } from "lucide-react";

const STATUS_TO_LABEL: Record<string, string> = {
  PENDING: "승인대기", ACTIVE: "승인완료", SUSPENDED: "정지", REJECTED: "반려",
};
const TYPE_LABEL: Record<string, string> = {
  OFFICE: "기업", STORE: "매장", BOTH: "기업+매장",
};
const JOB_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "게시중", DRAFT: "승인대기", HIDDEN: "반려", CLOSED: "마감", EXPIRED: "만료",
};
const STATUS_CHIP: Record<string, { bg: string; color: string }> = {
  ACTIVE: { bg: "#e8f5e9", color: "#1b7a3d" },
  PENDING: { bg: "#fff4e0", color: "#a05a00" },
  SUSPENDED: { bg: "#fdeaea", color: "#c0392b" },
  REJECTED: { bg: "#f0f0f0", color: "#777" },
};

function fmtDate(d: string | null) {
  if (!d) return "-";
  const dt = new Date(d);
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
}
const isPdf = (u: string) => u.split("?")[0].toLowerCase().endsWith(".pdf");

export default function CompanyDetailModal({ company, onClose }: { company: any; onClose: () => void }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const lbl: React.CSSProperties = { color: "#888" };
  const modalBtn: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600,
    padding: "6px 10px", borderRadius: 6, border: "1px solid #e3dceb", background: "#fff",
    color: "#5f0080", cursor: "pointer",
  };

  const handlePdf = async () => {
    if (!ref.current) return;
    setPdfLoading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;
      await new Promise((r) => setTimeout(r, 300));
      const canvas = await html2canvas(ref.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      let heightLeft = pdfHeight; let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(company?.company_name ? `${company.company_name}_기업정보.pdf` : "기업정보.pdf");
    } catch (e) {
      alert("다운로드 중 오류가 발생했습니다.");
    } finally {
      setPdfLoading(false);
    }
  };

  const handlePrint = async () => {
    if (!ref.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      await new Promise((r) => setTimeout(r, 300));
      const canvas = await html2canvas(ref.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const w = window.open("", "_blank");
      if (!w) return;
      w.document.write(`<html><head><title>기업정보 인쇄</title></head><body style="margin:0"><img src="${imgData}" style="width:100%" onload="window.print();window.close()" /></body></html>`);
      w.document.close();
    } catch (e) {
      alert("인쇄 준비 중 오류가 발생했습니다.");
    }
  };

  const cover = Array.isArray(company.cover_images) && company.cover_images[0]?.url ? company.cover_images[0].url : null;
  const chip = STATUS_CHIP[company.status] || { bg: "#f0f0f0", color: "#777" };

  return (
    <>
      <div className="admin-modal-overlay" onClick={onClose}>
        <div className="admin-modal" style={{ maxWidth: 600, width: "92%", overflow: "hidden", padding: 0 }} onClick={(e) => e.stopPropagation()}>
          <div className="admin-modal-header" style={{ padding: "14px 18px" }}>
            <h2 className="admin-modal-title">기업 정보</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {company.business_license_url && (
                <button onClick={() => setPreviewUrl(company.business_license_url)} style={modalBtn}>
                  <FileText size={15} /> 사업자등록증
                </button>
              )}
              <button onClick={handlePdf} disabled={pdfLoading} style={modalBtn}>
                <Download size={15} /> {pdfLoading ? "저장 중..." : "PDF"}
              </button>
              <button onClick={handlePrint} style={modalBtn}>
                <Printer size={15} /> 인쇄
              </button>
              <button className="admin-modal-close" onClick={onClose}><X size={20} /></button>
            </div>
          </div>

          <div ref={ref} style={{ maxHeight: "72vh", overflow: "auto", background: "#fff" }}>
            <div style={{ position: "relative", height: 128, background: cover ? "#eee" : "#7c3aed" }}>
              {cover && <img src={cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
              <div style={{ position: "absolute", left: 20, bottom: -28, width: 64, height: 64, borderRadius: 12, background: "#5f0080", border: "3px solid #fff", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 22, fontWeight: 700 }}>
                {company.logo_url
                  ? <img src={company.logo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : (company.company_name?.[0] || "·")}
              </div>
            </div>

            <div style={{ padding: "38px 22px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>{company.company_name}</span>
                <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 6, background: "#f3e8ff", color: "#5f0080" }}>{TYPE_LABEL[company.company_type] || company.company_type}</span>
                <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 6, background: chip.bg, color: chip.color }}>{STATUS_TO_LABEL[company.status] || company.status}</span>
              </div>
              {company.brand_name && <p style={{ fontSize: 13, color: "#888", margin: "4px 0 0" }}>{company.brand_name}</p>}
            </div>

            <div style={{ padding: "18px 22px 0" }}>
              <div style={{ display: "grid", gridTemplateColumns: "84px 1fr 84px 1fr", rowGap: 12, columnGap: 12, fontSize: 13, alignItems: "center" }}>
                <span style={lbl}>사업자번호</span><span>{company.business_number || "-"}</span>
                <span style={lbl}>설립연도</span><span>{company.founded_year ? `${company.founded_year}년` : "-"}</span>
                <span style={lbl}>사원수</span><span>{company.company_size || "-"}</span>
                <span style={lbl}>가입일</span><span>{fmtDate(company.created_at)}</span>
                <span style={lbl}>이메일</span><span style={{ color: "#5f0080", wordBreak: "break-all" }}>{company.email || "-"}</span>
                <span style={lbl}>연락처</span><span>{company.phone || "-"}</span>
                <span style={{ ...lbl, alignSelf: "start" }}>주소</span><span style={{ gridColumn: "span 3" }}>{company.address || "-"}</span>
                <span style={lbl}>웹사이트</span>
                <span style={{ gridColumn: "span 3", wordBreak: "break-all" }}>{company.website_url
                  ? <a href={company.website_url} target="_blank" rel="noreferrer" style={{ color: "#5f0080" }}>{company.website_url}</a>
                  : "-"}</span>
              </div>
            </div>

            {company.description && (
              <div style={{ padding: "20px 22px 0" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#5f0080", marginBottom: 7 }}>기업 소개</div>
                <p style={{ fontSize: 13, color: "#333", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>{company.description}</p>
              </div>
            )}

            <div style={{ padding: "20px 22px 24px" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#5f0080", marginBottom: 8 }}>등록 공고 ({company.job_count}건)</div>
              {company.jobs && company.jobs.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {company.jobs.map((j: any, i: number) => {
                    const closed = j.status === "CLOSED" || j.status === "EXPIRED" || j.status === "HIDDEN";
                    const row = (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", background: closed ? "#f5f5f5" : "#f3e8ff", borderRadius: 6, cursor: j.id ? "pointer" : "default" }}>
                        <span style={{ fontSize: 13, color: closed ? "#888" : "#1a1a1a" }}>{j.title}</span>
                        <span style={{ fontSize: 11, color: closed ? "#aaa" : "#5f0080", flexShrink: 0, marginLeft: 8 }}>{JOB_STATUS_LABEL[j.status] || j.status} · {fmtDate(j.created_at)}</span>
                      </div>
                    );
                    return j.id
                      ? <a key={i} href={`/jobs/${j.id}?preview=admin`} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>{row}</a>
                      : <div key={i}>{row}</div>;
                  })}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "#aaa" }}>등록된 공고가 없습니다.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {previewUrl && (
        <div className="admin-modal-overlay" onClick={() => setPreviewUrl(null)}>
          <div className="admin-modal" style={{ maxWidth: 760, width: "90%" }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">사업자등록증</h2>
              <button className="admin-modal-close" onClick={() => setPreviewUrl(null)}><X size={20} /></button>
            </div>
            <div style={{ maxHeight: "75vh", overflow: "auto", padding: 16, background: "#f3f3f3" }}>
              {isPdf(previewUrl) ? (
                <iframe src={previewUrl} title="사업자등록증" style={{ width: "100%", height: "72vh", border: "none", background: "#fff", borderRadius: 6 }} />
              ) : (
                <img src={previewUrl} alt="사업자등록증" style={{ width: "100%", height: "auto", display: "block", borderRadius: 6 }} />
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 16px", borderTop: "1px solid #ececec" }}>
              <a href={previewUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "#5f0080", fontWeight: 600 }}>
                새 탭에서 열기 ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}