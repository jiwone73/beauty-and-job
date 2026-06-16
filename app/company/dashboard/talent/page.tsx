"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import CompanyLayout from "@/components/company/CompanyLayout";
import { Search, BookmarkCheck, Bookmark, X, FileText, Download, Printer } from "lucide-react";
import { companyTalentApi, type TalentItem } from "@/lib/api/company";
import ResumePreview from "@/components/profile/ResumePreview";

const JOB_FILTERS = ["전체", "마케팅", "MD", "영업", "디자인", "연구개발", "SCM", "경영지원", "HR"];
const CAREER_FILTERS = ["전체", "신입", "1-3년", "3-5년", "5년+"];
const AGE_FILTERS = ["전체", "10대", "20대", "30대", "40대+"];

// 경력 연수 → 표시 텍스트
function careerLabel(years: number | null, count: number): string {
  if (!count || years === null || years === 0) return "신입";
  return `경력 ${years}년`;
}

// 성별 약어
function genderLabel(gender: string | null): string | null {
  if (gender === "남성") return "남";
  if (gender === "여성") return "여";
  return null;
}

// 성별 + 나이 + 경력 한 줄
function metaLine(gender: string | null, age: number | null, years: number | null, count: number): string {
  const c = careerLabel(years, count);
  const parts: string[] = [];
  const g = genderLabel(gender);
  if (g) parts.push(g);
  if (age) parts.push(`${age}세`);
  parts.push(c);
  return parts.join(" · ");
}

export default function TalentPage() {
  const [talents, setTalents] = useState<TalentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("전체");
  const [careerFilter, setCareerFilter] = useState("전체");
  const [ageFilter, setAgeFilter] = useState("전체");
  const [selected, setSelected] = useState<TalentItem | null>(null);
  const [resumeData, setResumeData] = useState<any>(null);
  const [resumeLoading, setResumeLoading] = useState(false);
const previewRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPdf = async () => {
    if (!previewRef.current) return;
    setIsDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;
      await new Promise((r) => setTimeout(r, 300));
      const canvas = await html2canvas(previewRef.current, {
        scale: 2, useCORS: true, backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      let heightLeft = pdfHeight;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(selected?.name ? `${selected.name}_이력서.pdf` : "이력서.pdf");
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
      const canvas = await html2canvas(previewRef.current, {
        scale: 2, useCORS: true, backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const w = window.open("", "_blank");
      if (!w) return;
      w.document.write(`<html><head><title>이력서 인쇄</title></head><body style="margin:0"><img src="${imgData}" style="width:100%" onload="window.print();window.close()" /></body></html>`);
      w.document.close();
    } catch (e) {
      alert("인쇄 준비 중 오류가 발생했습니다.");
    }
  };
  // selected 변경 시 풀 이력서 fetch
  useEffect(() => {
    if (!selected) { setResumeData(null); return; }
    const token = localStorage.getItem("access_token");
    setResumeLoading(true);
    fetch(`/api/company/talent/${(selected as any).id}/resume`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => { if (res.success) setResumeData(res.data); })
      .catch((e) => console.error("[talent resume]", e))
      .finally(() => setResumeLoading(false));
  }, [selected]);

  const calcAgeFromBirth = (birth: string | null) => {
    if (!birth) return null;
    const y = Number(String(birth).slice(0, 4));
    return y ? new Date().getFullYear() - y : null;
  };

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

  // 목록 조회
  const fetchTalents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await companyTalentApi.list({
        search: search || undefined,
        jobGroup: jobFilter,
        careerFilter,
        ageGroup: ageFilter,
        page: 1,
        limit: 50,
      });
      if (res.success && res.data) {
        setTalents(res.data);
        setTotal(res.data.length);
      }
    } catch (e) {
      console.error("[talent fetch]", e);
    } finally {
      setLoading(false);
    }
  }, [search, jobFilter, careerFilter, ageFilter]);

  // 검색어 디바운스 + 필터 변경 시 재조회
  useEffect(() => {
    const t = setTimeout(fetchTalents, 300);
    return () => clearTimeout(t);
  }, [fetchTalents]);

  // 스크랩 토글 (낙관적 업데이트 + 실패 롤백)
  const toggleScrap = async (item: TalentItem) => {
    const next = !item.scrapped;
    setTalents((prev) => prev.map((t) => (t.id === item.id ? { ...t, scrapped: next } : t)));
    if (selected?.id === item.id) setSelected((prev) => (prev ? { ...prev, scrapped: next } : null));
    try {
      if (next) await companyTalentApi.scrap(item.id);
      else await companyTalentApi.unscrap(item.id);
    } catch (e) {
      setTalents((prev) => prev.map((t) => (t.id === item.id ? { ...t, scrapped: !next } : t)));
      if (selected?.id === item.id) setSelected((prev) => (prev ? { ...prev, scrapped: !next } : null));
      console.error("[talent scrap]", e);
    }
  };

  return (
    <CompanyLayout activePage="talent">
      {/* 검색 + 필터 */}
      <div className="company-toolbar">
        <div className="company-toolbar-left">
          <div className="admin-search-wrap">
            <Search size={16} className="admin-search-icon" />
            <input className="admin-search-input" placeholder="이름, 직군, 스킬 검색"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="admin-filter-group">
            <span className="admin-filter-label">직군</span>
            <select className="admin-form-select" style={{ fontSize: "13px", padding: "8px 12px" }}
              value={jobFilter} onChange={(e) => setJobFilter(e.target.value)}>
              {JOB_FILTERS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="admin-filter-group">
            <span className="admin-filter-label">경력</span>
            <div className="admin-filter-tabs">
              {CAREER_FILTERS.map((f) => (
                <button key={f} className={`admin-filter-tab ${careerFilter === f ? "active" : ""}`}
                  onClick={() => setCareerFilter(f)}>{f}</button>
              ))}
            </div>
          </div>
          <div className="admin-filter-group">
            <span className="admin-filter-label">연령</span>
            <div className="admin-filter-tabs">
              {AGE_FILTERS.map((f) => (
                <button key={f} className={`admin-filter-tab ${ageFilter === f ? "active" : ""}`}
                  onClick={() => setAgeFilter(f)}>{f}</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ fontSize: "13px", color: "#888" }}>
          총 <strong style={{ color: "#1a1a1a" }}>{total}</strong>명
        </div>
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="admin-empty">불러오는 중...</div>
      ) : talents.length === 0 ? (
        <div className="admin-empty">검색 결과가 없습니다.</div>
      ) : (
        <div className="talent-grid">
          {talents.map((t) => (
            <div key={t.id} className="talent-card">
              <div className="talent-card-head">
                <div className="talent-avatar" style={{ overflow: "hidden" }}>
                  {t.avatar_url ? (
                    <img src={t.avatar_url} alt={t.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    t.name?.slice(0, 1) || "?"
                  )}
                </div>
                <div className="talent-info">
                  <h3 className="talent-name">{t.name}</h3>
                  <p className="talent-meta">{metaLine(t.gender, t.age, t.careerYears, t.careerCount)}</p>
                  {t.regionPrefer && <p className="talent-location">{t.regionPrefer}</p>}
                </div>
                <button className={`talent-scrap-btn ${t.scrapped ? "scrapped" : ""}`}
                  onClick={() => toggleScrap(t)}>
                  {t.scrapped ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
                </button>
              </div>

              <p className="talent-title" onClick={() => setSelected(t)}>
                {t.intro || "한줄소개가 없습니다."}
              </p>

              <div className="talent-tags">
                {(t.skills || []).map((sk) => (
                  <span key={sk} className="talent-tag">{sk}</span>
                ))}
              </div>

              <div className="talent-card-footer">
                <div className="talent-detail">
                  {t.mainJobGroup && (<><span>{t.mainJobGroup}</span><span>·</span></>)}
                  <span>{t.education || "학력 미입력"}</span>
                </div>
                <button className="company-action-btn" onClick={() => setSelected(t)}>
                  <FileText size={14} /> 이력서 보기
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 이력서 상세 모달 */} 
      {selected && (
        <div className="rp-modal-overlay" onClick={() => setSelected(null)}>
          <div className="rp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rp-modal-header">
              <div className="rp-modal-actions">
                <button className="resume-action-btn" onClick={handleDownloadPdf} disabled={isDownloading || resumeLoading}>
                  <Download size={16} />
                  <span>{isDownloading ? "저장 중..." : "PDF 다운로드"}</span>
                </button>
                <button className="resume-action-btn" onClick={handlePrint}>
                  <Printer size={16} />
                  <span>인쇄</span>
                </button>
                <button
                  className={`resume-action-btn ${selected.scrapped ? "scrapped" : ""}`}
                  onClick={() => toggleScrap(selected)}>
                  {selected.scrapped
                    ? (<><BookmarkCheck size={16} /> <span>스크랩 해제</span></>)
                    : (<><Bookmark size={16} /> <span>스크랩</span></>)}
                </button>
                <button className="rp-modal-close" onClick={() => setSelected(null)}>
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="rp-modal-body">
              {resumeLoading ? (
                <div style={{ padding: "60px", textAlign: "center", color: "#888" }}>불러오는 중...</div>
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
                <div style={{ padding: "60px", textAlign: "center", color: "#888" }}>이력서 정보가 없습니다.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </CompanyLayout>
  );
}