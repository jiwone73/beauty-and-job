"use client";
import { useState, useEffect, useRef } from "react";
import ResumePreview from "@/components/profile/ResumePreview";
import { X, Download, Printer } from "lucide-react";

const mapResume = (data: any) => {
  const p = data?.profile || {};
  return {
    careers: (data?.careers || []).map((c: any) => ({
      id: String(c.id), company: c.company || "", department: c.department || "",
      position: c.position || "", startDate: c.start_date || "", endDate: c.end_date || "",
      isVerified: c.is_verified || false, description: c.description || "",
    })),
    educations: (data?.educations || []).map((e: any) => ({
      id: String(e.id), school: e.school || "", major: e.major || "",
      status: e.status || "", startDate: e.start_date || "", endDate: e.end_date || "",
      description: e.description || "",
    })),
    experiences: (data?.experiences || []).map((x: any) => ({
      id: String(x.id), category: x.category || "", title: x.title || "", description: x.description || "",
    })),
    languages: (data?.languages || []).map((l: any) => ({
      id: String(l.id), language: l.language || "", level: l.level || "", test: l.test || "",
    })),
    links: (data?.links || []).map((lk: any) => ({
      id: String(lk.id), category: lk.category || "", url: lk.url || "",
    })),
    skills: p.skills || [],
    skillAreas: p.skill_areas || [],
    officeJobAreas: p.office_job_areas || [],
    certificates: p.certificates || [],
    intro: p.intro || "",
    coreCompetencies: p.core_competencies || "",
    workTypePrefer: p.work_type_prefer || "",
    regionPrefer: p.region_prefer || "",
  };
};

export default function MyApplicationModal({
  applicationId,
  onClose,
}: {
  applicationId: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleDownloadPdf = async () => {
    if (!previewRef.current) return;
    setIsDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;
      await new Promise((r) => setTimeout(r, 300));
      const canvas = await html2canvas(previewRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const margin = 8; // 상하 여백(mm)
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const usableHeight = pageHeight - margin * 2;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = pdfHeight;
      let position = margin;
      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= usableHeight;
      while (heightLeft > 0) {
        position = margin - (pdfHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= usableHeight;
      }
      const nm = data?.user_name;
      pdf.save(nm ? `${nm}_이력서.pdf` : "이력서.pdf");
    } catch (e) {
      alert("다운로드 중 오류가 발생했습니다.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = async () => {
    if (!previewRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      await new Promise((r) => setTimeout(r, 300));
      const canvas = await html2canvas(previewRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");

      // 팝업 차단을 피하기 위해 숨은 iframe으로 인쇄
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) { document.body.removeChild(iframe); return; }
      doc.open();
      doc.write(`<html><head><title>이력서 인쇄</title></head><body style="margin:0"><img src="${imgData}" style="width:100%" /></body></html>`);
      doc.close();

      const img = doc.querySelector("img");
      const triggerPrint = () => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        // 인쇄 대화상자 닫힌 뒤 정리
        setTimeout(() => { if (iframe.parentNode) document.body.removeChild(iframe); }, 1000);
      };
      if (img && !img.complete) {
        img.onload = triggerPrint;
      } else {
        setTimeout(triggerPrint, 200);
      }
    } catch (e) {
      alert("인쇄 준비 중 오류가 발생했습니다.");
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { setLoading(false); return; }
    setLoading(true);
    fetch(`/api/users/me/applications/${applicationId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => { if (res.success) setData(res.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [applicationId]);

  const r = data;
  const birthDisplay = r?.birth_date
    ? `${String(r.birth_date).slice(0, 4)}년 (${new Date().getFullYear() - Number(String(r.birth_date).slice(0, 4))}세, ${r.gender === "FEMALE" ? "여" : r.gender === "MALE" ? "남" : ""})`
    : "";

  return (
    <div className="rp-modal-overlay" onClick={onClose}>
      <div className="rp-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720, width: "94%", maxHeight: "92vh", display: "flex", flexDirection: "column" }}>
        <div className="rp-modal-header" style={{ flexShrink: 0 }}>
          <h2 className="rp-modal-title">
            내 지원서{data?.is_snapshot ? " (지원 시점)" : ""}
          </h2>
          <div className="rp-modal-actions">
            <button className="resume-action-btn" onClick={handleDownloadPdf} disabled={isDownloading || loading}>
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
            <div style={{ padding: "60px", textAlign: "center", color: "#888" }}>불러오는 중...</div>
          ) : data ? (
            <>
              <div style={{ background: "#f7f5fa", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#555" }}>
                <strong style={{ color: "#5f0080" }}>{data.company_name}</strong> · {data.job_title}
              </div>
              {data.cover_letter && data.cover_letter.trim() && (
                <div style={{ background: "#faf5ff", border: "1px solid #ecdcff", borderRadius: 10, padding: "16px 18px", margin: "0 0 18px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#5f0080", marginBottom: 8 }}>제출한 자기소개서</div>
                  <p style={{ fontSize: 14, color: "#333", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>{data.cover_letter}</p>
                </div>
              )}
              <ResumePreview
                ref={previewRef}
                name={data.user_name || ""}
                birthDisplay={birthDisplay}
                jobDisplay={data.user_job_type === "STORE" ? "매장·기술직" : "기업·사무직"}
                phone={data.user_phone || ""}
                email={data.user_email || ""}
                portfolioUrl={data.portfolio_url || null}
                portfolioFilename={data.portfolio_filename || null}
                avatarUrl={data.user_avatar_url || null}
                resumeType={data.user_job_type === "STORE" ? "salon" : "office"}
                {...mapResume(data.resume)}
              />
            </>
          ) : (
            <div style={{ padding: "60px", textAlign: "center", color: "#888" }}>지원서를 불러올 수 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
}