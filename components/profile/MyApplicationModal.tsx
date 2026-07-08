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
  const coverRef = useRef<HTMLDivElement>(null);
  const handleDownloadPdf = async () => {
    if (!previewRef.current) return;
    setIsDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;
      await new Promise((r) => setTimeout(r, 300));

      const root = previewRef.current;
      const scale = 2;
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const marginTop = 6;     // 페이지 상단 여백(mm)
      const marginBottom = 6;  // 페이지 하단 여백(mm)
      const marginX = 10;      // 페이지 좌우 여백(mm)
      const contentWidth = pdfWidth - marginX * 2;
      const usableHeight = pageHeight - marginTop - marginBottom;

      // 페이지에 쌓을 블록 단위: (자기소개서) + 헤더 + 각 섹션
      const resumeBlocks = Array.from(
        root.querySelectorAll(".rp-header, .rp-section")
      ) as HTMLElement[];
      const blocks = coverRef.current
        ? [coverRef.current, ...resumeBlocks]
        : resumeBlocks;

      let cursorY = marginTop;
      let first = true;

      for (const block of blocks) {
        // 블록 하나를 개별 캡처
        const canvas = await html2canvas(block, { scale, useCORS: true, backgroundColor: "#ffffff" });
        const imgW = contentWidth;
        const imgH = (canvas.height * imgW) / canvas.width;
        const imgData = canvas.toDataURL("image/png");

        // 블록이 한 페이지보다 큰 경우(아주 긴 섹션) → 페이지 높이로 잘라서 여러 장
        if (imgH > usableHeight) {
          // 현재 페이지에 남은 게 있으면 새 페이지에서 시작
          if (!first && cursorY > marginTop) { pdf.addPage(); }
          if (first) { first = false; }
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
          cursorY = pageHeight; // 다음 블록은 새 페이지에서
          continue;
        }

        // 현재 페이지에 이 블록이 안 들어가면 새 페이지로
        if (!first && cursorY + imgH > pageHeight - marginBottom) {
          pdf.addPage();
          cursorY = marginTop;
        }
        if (first) first = false;

        pdf.addImage(imgData, "PNG", marginX, cursorY, imgW, imgH);
        cursorY += imgH;
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
            제출한 입사지원서
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
              {data.cover_letter && data.cover_letter.trim() && (
                <div ref={coverRef} style={{ background: "#fff", padding: "32px 36px 28px", marginBottom: 16 }}>
                  <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1a1a1a", textAlign: "center", margin: "0 0 6px", letterSpacing: "0.05em" }}>자기소개서</h1>
                  <p style={{ fontSize: 13, color: "#888", textAlign: "center", margin: "0 0 28px" }}>
                    {data.company_name} · {data.job_title}
                  </p>
                  <p style={{ fontSize: 14.5, color: "#333", lineHeight: 1.9, margin: 0, whiteSpace: "pre-wrap" }}>{data.cover_letter}</p>
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