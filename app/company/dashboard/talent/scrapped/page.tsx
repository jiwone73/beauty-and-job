"use client";
import { useState, useEffect, useRef } from "react";
import CompanyLayout from "@/components/company/CompanyLayout";
import { Search, BookmarkCheck, X, FileText, Download, Printer } from "lucide-react";
import ResumePreview from "@/components/profile/ResumePreview";

function calcAgeFromBirth(birth: string | null): number {
  if (!birth) return 0;
  const y = parseInt(String(birth).slice(0, 4));
  return new Date().getFullYear() - y;
}

function careerLabel(years: number | null, count: number): string {
  if (!count || years === null || years === 0) return "신입";
  return `경력 ${years}년`;
}

function metaLine(gender: string | null, age: number | null, years: number | null, count: number): string {
  const c = careerLabel(years, count);
  const parts: string[] = [];
  if (gender === "FEMALE") parts.push("여");
  else if (gender === "MALE") parts.push("남");
  if (age) parts.push(`${age}세`);
  parts.push(c);
  return parts.join(" · ");
}

export default function ScrappedTalentPage() {
  const [talents, setTalents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const [resumeData, setResumeData] = useState<any>(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const token = typeof window !== "undefined"
    ? (localStorage.getItem("access_token") || "")
    : "";

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

  useEffect(() => {
    const fetchScrapped = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/company/talent/scrapped", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setTalents(data.data?.talents || data.talents || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchScrapped();
  }, [token]);

  useEffect(() => {
    if (!selected) { setResumeData(null); return; }
    setResumeLoading(true);
    fetch(`/api/company/talent/${selected.user_id}/resume`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setResumeData(d.data || d))
      .catch(e => console.error(e))
      .finally(() => setResumeLoading(false));
  }, [selected]);

  const handleUnscrap = async (userId: string) => {
    if (!confirm("스크랩을 해제하시겠습니까?")) return;
    try {
      await fetch(`/api/company/talent/${userId}/scrap`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setTalents(prev => prev.filter(t => t.user_id !== userId));
      if (selected?.user_id === userId) setSelected(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadPdf = async () => {
    if (!previewRef.current || !selected) return;
    setIsDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;
      const canvas = await html2canvas(previewRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pageW) / canvas.width;
      let y = 0;
      while (y < imgH) {
        if (y > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, -y, pageW, imgH);
        y += pageH;
      }
      pdf.save(`${selected.name || "이력서"}_이력서.pdf`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    if (!previewRef.current) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>이력서</title><style>body{margin:0;padding:20px;font-family:sans-serif;}</style></head><body>${previewRef.current.innerHTML}</body></html>`);
    w.document.close();
    w.print();
  };

  const filtered = talents.filter(t =>
    !search || (t.name || "").includes(search) || (t.job_category || "").includes(search)
  );

  return (
    <CompanyLayout activePage="scrapped">
      <div className="company-toolbar">
        <div className="company-toolbar-left">
          <div className="admin-search-wrap">
            <Search size={16} className="admin-search-icon" />
            <input className="admin-search-input" placeholder="이름, 직군 검색"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div style={{ fontSize: "13px", color: "#888" }}>
          총 <strong style={{ color: "#1a1a1a" }}>{filtered.length}</strong>명
        </div>
      </div>

      {loading ? (
        <div className="admin-empty">불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div className="admin-empty">스크랩한 인재가 없습니다.</div>
      ) : (
        <div style={{ border: "1px solid #eee", borderRadius: 8, overflow: "hidden", background: "#fff" }}>

          {/* 헤더 */}
          <div style={{ display: "flex", alignItems: "stretch", background: "#fafafa", borderBottom: "1px solid #eee", fontSize: 12, color: "#999", fontWeight: 500 }}>
            <div style={{ width: 60, flexShrink: 0, borderRight: "1px solid #f0f0f0" }} />
            <div style={{ flex: 1.3, minWidth: 0, height: 40, display: "flex", alignItems: "center", justifyContent: "center", borderRight: "1px solid #f0f0f0" }}>이름</div>
            <div style={{ flex: 1, minWidth: 0, height: 40, display: "flex", alignItems: "center", justifyContent: "center", borderRight: "1px solid #f0f0f0" }}>직군</div>
            <div style={{ flex: 1.1, minWidth: 0, height: 40, display: "flex", alignItems: "center", justifyContent: "center", borderRight: "1px solid #f0f0f0" }}>지역</div>
            <div style={{ flex: 1.7, minWidth: 0, height: 40, display: "flex", alignItems: "center", justifyContent: "center", borderRight: "1px solid #f0f0f0" }}>최종학력</div>
            <div style={{ flex: 1.8, minWidth: 0, height: 40, display: "flex", alignItems: "center", justifyContent: "center", borderRight: "1px solid #f0f0f0" }}>최근경력</div>
            <div style={{ flex: 1.8, minWidth: 0, height: 40, display: "flex", alignItems: "center", justifyContent: "center", borderRight: "1px solid #f0f0f0" }}>스킬</div>
            <div style={{ width: 150, flexShrink: 0, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>관리</div>
          </div>

          {/* 바디 */}
          {filtered.map((t, idx) => {
            const cell = (flexVal: number, last = false): React.CSSProperties => ({
              flex: flexVal, minWidth: 0, height: 68,
              display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
              padding: "0 12px", borderRight: last ? "none" : "1px solid #f0f0f0",
              textAlign: "center", overflow: "hidden",
            });
            const clamp1: React.CSSProperties = { display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden", textOverflow: "ellipsis", wordBreak: "break-word", maxWidth: "100%" };
            const clamp2: React.CSSProperties = { ...clamp1, WebkitLineClamp: 2, lineHeight: 1.35 };
            return (
              <div key={t.user_id}
                style={{ display: "flex", alignItems: "stretch", borderBottom: idx < filtered.length - 1 ? "1px solid #f2f2f2" : "none", cursor: "pointer", transition: "background .1s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
              >
                {/* 아바타 */}
                <div style={{ width: 60, flexShrink: 0, height: 68, display: "flex", alignItems: "center", justifyContent: "center", borderRight: "1px solid #f0f0f0" }}>
                  <div className="talent-avatar" style={{ width: 40, height: 40, overflow: "hidden" }}>
                    {t.avatar_url
                      ? <img src={t.avatar_url} alt={t.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : (t.name || "?").slice(0, 1)}

      {selected && (
        <div className="rp-modal-overlay" onClick={() => setSelected(null)}>
          <div className="rp-modal" onClick={e => e.stopPropagation()}>
            <div className="rp-modal-header">
              <div className="rp-modal-actions">
                <button className="resume-action-btn" onClick={handleDownloadPdf} disabled={isDownloading || resumeLoading}>
                  <Download size={15} /> {isDownloading ? "저장 중..." : "PDF 저장"}
                </button>
                <button className="resume-action-btn" onClick={handlePrint}>
                  <Printer size={15} /> 인쇄
                </button>
                <button className="resume-action-btn danger" onClick={() => handleUnscrap(selected.user_id)}>
                  스크랩 해제
                </button>
              </div>
              <button className="admin-modal-close" onClick={() => setSelected(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="rp-modal-body" ref={previewRef}>
              {resumeLoading ? (
                <div className="admin-empty">이력서 불러오는 중...</div>
              ) : resumeData ? (
                <ResumePreview
                  ref={previewRef}
                  name={resumeData.user?.name || selected.name}
                  birthDisplay={
                    resumeData.user?.birth_date
                      ? `${String(resumeData.user.birth_date).slice(0, 4)}년 (${calcAgeFromBirth(resumeData.user.birth_date)}세, ${resumeData.user.gender === "FEMALE" ? "여" : resumeData.user.gender === "MALE" ? "남" : ""})`
                      : ""
                  }
                  jobDisplay={resumeData.user?.job_type === "STORE" ? "매장·기술직" : "기업·사무직"}
                  phone={resumeData.user?.phone || ""}
                  email={resumeData.user?.email || ""}
                  portfolioUrl={resumeData.user?.portfolio_url || null}
                  portfolioFilename={resumeData.user?.portfolio_filename || null}
                  avatarUrl={resumeData.user?.avatar_url || null}
                  resumeType={resumeData.user?.job_type === "STORE" ? "salon" : "office"}
                  {...mapResume(resumeData)}
                />
              ) : (
                <div className="admin-empty">이력서 데이터를 불러올 수 없습니다.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </CompanyLayout>
  );
}