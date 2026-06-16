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
      ) : (
        <div className="talent-grid">
          {filtered.map(t => (
            <div key={t.user_id} className="talent-card">
              <div className="talent-card-head">
                <div className="talent-avatar" style={{ overflow: "hidden" }}>
                  {t.avatar_url
                    ? <img src={t.avatar_url} alt={t.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : (t.name || "?").slice(0, 1)}
                </div>
                <div className="talent-info">
                  <h3 className="talent-name">{t.name}</h3>
                  <p className="talent-meta">
                    {metaLine(t.gender, t.age, t.career_years, t.career_count)}
                  </p>
                  <p className="talent-location">{t.location || "지역 미설정"}</p>
                </div>
                <button className="talent-scrap-btn scrapped" onClick={() => handleUnscrap(t.user_id)}>
                  <BookmarkCheck size={20} />
                </button>
              </div>
              <p className="talent-title" onClick={() => setSelected(t)}>
                {t.headline || t.job_category || "프로필 미작성"}
              </p>
              <div style={{ fontSize: 12, color: "#555" }}>
                {(t.skills || []).slice(0, 4).join(", ")}
              </div>
              <div className="talent-card-footer">
                <div className="talent-detail">
                  <span>{t.job_category || "-"}</span>
                </div>
                <button className="company-action-btn" onClick={() => setSelected(t)}>
                  <FileText size={14} /> 이력서 보기
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="admin-empty">스크랩한 인재가 없습니다.</div>
          )}
        </div>
      )}

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