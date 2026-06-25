"use client";
import { useState, useEffect, useRef } from "react";
import ResumePreview from "@/components/profile/ResumePreview";
import { genderLabel } from "@/lib/memberFormat";import { X, Download, Printer } from "lucide-react";

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

      const root = previewRef.current;
      const scale = 2;
      const canvas = await html2canvas(root, { scale, useCORS: true, backgroundColor: "#ffffff" });

      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pxPerPage = Math.floor((canvas.width * pageHeight) / pdfWidth);

      // 끊을 수 있는 경계(캔버스 픽셀 기준) 수집 — 항목/섹션 단위로만 페이지를 끊는다
      const rootTop = root.getBoundingClientRect().top;
      // "끊겨선 안 되는 최소 단위"의 경계를 수집한다.
      // 각 섹션(rp-section)의 시작(상단)을 끊는 지점으로 삼으면,
      // 섹션 제목 + 내용이 항상 한 덩어리로 다음 페이지에 함께 넘어간다.
      const breakSet = new Set<number>();
      // 섹션 시작 상단 — 여기서 끊으면 섹션이 통째로 다음 페이지로 감
      Array.from(root.querySelectorAll(".rp-section")).forEach((el) => {
        const top = ((el as HTMLElement).getBoundingClientRect().top - rootTop) * scale;
        breakSet.add(Math.round(top));
      });
      // 섹션 내부 항목 하단 — 항목이 여러 개인 섹션에서 항목 사이를 끊을 수 있게
      Array.from(root.querySelectorAll(".rp-item, .rp-list-item")).forEach((el) => {
        const bottom = ((el as HTMLElement).getBoundingClientRect().bottom - rootTop) * scale;
        breakSet.add(Math.round(bottom));
      });
      const breakpoints = Array.from(breakSet).sort((a, b) => a - b);
      const SAFE_GAP = 12 * scale; // 끊는 지점 아래 안전 여백(구분선·여백 보호)

      let renderedHeight = 0;
      let pageIndex = 0;
      while (renderedHeight < canvas.height) {
        const maxEnd = renderedHeight + pxPerPage;
        let cut = maxEnd;
        if (maxEnd < canvas.height) {
          // 페이지 범위에 완전히 들어오는 마지막 경계에서 끊는다(안전 여백 확보)
          const candidates = breakpoints.filter((bp) => bp > renderedHeight + 50 && bp <= maxEnd - SAFE_GAP);
          if (candidates.length > 0) {
            cut = Math.max(...candidates);
          }
        } else {
          cut = canvas.height;
        }
        const sliceHeight = Math.min(cut - renderedHeight, canvas.height - renderedHeight);

        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;
        const ctx = pageCanvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(canvas, 0, renderedHeight, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
        }
        const pageImg = pageCanvas.toDataURL("image/png");
        const slicePdfHeight = (sliceHeight * pdfWidth) / canvas.width;
        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(pageImg, "PNG", 0, 0, pdfWidth, slicePdfHeight);
        renderedHeight += sliceHeight;
        pageIndex++;
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
    ? `${String(r.birth_date).slice(0, 4)}년 (${new Date().getFullYear() - Number(String(r.birth_date).slice(0, 4))}세${genderLabel(r.gender) ? ", " + genderLabel(r.gender) : ""})`
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
                jobDisplay={data.user_job_type === "STORE" ? "매장직" : "사무직"}
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