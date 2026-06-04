"use client";
import { useState, useEffect, useCallback } from "react";
import CompanyLayout from "@/components/company/CompanyLayout";
import { Search, BookmarkCheck, Bookmark, X, FileText } from "lucide-react";
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

  // selected 변경 시 풀 이력서 fetch
  useEffect(() => {
    if (!selected) { setResumeData(null); return; }
    const token = localStorage.getItem("company_token") || localStorage.getItem("access_token");
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
                <div className="talent-avatar">{t.name?.slice(0, 1) || "?"}</div>
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
              <h2 className="rp-modal-title">이력서 미리보기</h2>
              <div className="rp-modal-actions">
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