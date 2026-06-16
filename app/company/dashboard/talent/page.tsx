"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import CompanyLayout from "@/components/company/CompanyLayout";
import {
  Search, BookmarkCheck, Bookmark, X, FileText,
  Download, Printer, MapPin, ChevronDown,
} from "lucide-react";
import { companyTalentApi, type TalentItem } from "@/lib/api/company";
import ResumePreview from "@/components/profile/ResumePreview";
import JobGroupSelectModal from "@/components/JobGroupSelectModal";
import RegionSelectModal from "@/components/RegionSelectModal";

type JobTab = "OFFICE" | "STORE";

const CAREER_OPTIONS  = ["전체", "신입", "1-3년", "3-5년", "5-10년", "10년+"];
const AGE_FILTERS     = ["전체", "20대", "30대", "40+"];
const GENDER_FILTERS  = ["무관", "여성", "남성"];

// 컬럼 flex 비율 (가로 반응형) — avatar/action만 고정폭
const FLEX = { name: 1.3, job: 1, region: 1.1, edu: 1.7, career: 1.8, skill: 1.8 };
const W_AVATAR = 60;
const W_ACTION = 150;
const ROW_H = 68;
const divider = "1px solid #f0f0f0";

function careerLabel(years: number | null, count: number): string {
  if (!count || years === null || years === 0) return "신입";
  return `경력 ${years}년`;
}
function genderLabel(gender: string | null): string | null {
  if (gender === "남성") return "남";
  if (gender === "여성") return "여";
  return null;
}

// 2줄 클램프
const clamp2: React.CSSProperties = {
  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
  overflow: "hidden", textOverflow: "ellipsis", wordBreak: "break-word", lineHeight: 1.35,
};
const clamp1: React.CSSProperties = {
  display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical",
  overflow: "hidden", textOverflow: "ellipsis", wordBreak: "break-word",
};

export default function TalentPage() {
  const [activeTab, setActiveTab]   = useState<JobTab>("STORE");
  const [companyType, setCompanyType] = useState<"OFFICE" | "STORE" | "BOTH">("BOTH");
  const [talents, setTalents]       = useState<TalentItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [total, setTotal]           = useState(0);

  const [search, setSearch]                     = useState("");
  const [careerFilter, setCareerFilter]         = useState("전체");
  const [jobGroupOpen, setJobGroupOpen]         = useState(false);
  const [selectedJobGroups, setSelectedJobGroups] = useState<string[]>([]);
  const [regionOpen, setRegionOpen]             = useState(false);
  const [selectedRegions, setSelectedRegions]   = useState<string[]>([]);
  const [ageFilter, setAgeFilter]               = useState("전체");
  const [genderFilter, setGenderFilter]         = useState("무관");

  const [selected, setSelected]           = useState<TalentItem | null>(null);
  const [resumeData, setResumeData]       = useState<any>(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleTabSwitch = (tab: JobTab) => {
    setActiveTab(tab);
    setSearch(""); setSelectedJobGroups([]); setSelectedRegions([]);
    setCareerFilter("전체"); setAgeFilter("전체"); setGenderFilter("무관");
  };

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
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      const pageH = pdf.internal.pageSize.getHeight();
      let left = pdfH, pos = 0;
      pdf.addImage(imgData, "PNG", 0, pos, pdfW, pdfH); left -= pageH;
      while (left > 0) { pos = left - pdfH; pdf.addPage(); pdf.addImage(imgData, "PNG", 0, pos, pdfW, pdfH); left -= pageH; }
      pdf.save(selected?.name ? `${selected.name}_이력서.pdf` : "이력서.pdf");
    } catch { alert("다운로드 중 오류가 발생했습니다."); }
    finally { setIsDownloading(false); }
  };

  const handlePrint = async () => {
    if (!previewRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      await new Promise((r) => setTimeout(r, 300));
      const canvas = await html2canvas(previewRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const w = window.open("", "_blank");
      if (!w) return;
      w.document.write(`<html><body style="margin:0"><img src="${canvas.toDataURL("image/png")}" style="width:100%" onload="window.print();window.close()"/></body></html>`);
      w.document.close();
    } catch { alert("인쇄 준비 중 오류가 발생했습니다."); }
  };

  useEffect(() => {
    if (!selected) { setResumeData(null); return; }
    const token = localStorage.getItem("access_token");
    setResumeLoading(true);
    fetch(`/api/company/talent/${(selected as any).id}/resume`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => { if (res.success) setResumeData(res.data); })
      .catch((e) => console.error("[talent resume]", e))
      .finally(() => setResumeLoading(false));
  }, [selected]);

  const calcAge = (birth: string | null) => {
    if (!birth) return null;
    const y = Number(String(birth).slice(0, 4));
    return y ? new Date().getFullYear() - y : null;
  };

  const mapResume = (data: any) => {
    const p = data?.profile || {};
    return {
      careers: (data?.careers || []).map((c: any) => ({ id: String(c.id), company: c.company || "", department: c.department || "", position: c.position || "", startDate: c.start_date || "", endDate: c.end_date || "", isVerified: c.is_verified || false, description: c.description || "" })),
      educations: (data?.educations || []).map((e: any) => ({ id: String(e.id), school: e.school || "", major: e.major || "", status: e.status || "", startDate: e.start_date || "", endDate: e.end_date || "", description: e.description || "" })),
      experiences: (data?.experiences || []).map((x: any) => ({ id: String(x.id), category: x.category || "", title: x.title || "", description: x.description || "" })),
      languages: (data?.languages || []).map((l: any) => ({ id: String(l.id), language: l.language || "", level: l.level || "", test: l.test || "" })),
      links: (data?.links || []).map((lk: any) => ({ id: String(lk.id), category: lk.category || "", url: lk.url || "" })),
      skills: p.skills || [], skillAreas: p.skill_areas || [], officeJobAreas: p.office_job_areas || [],
      certificates: p.certificates || [], intro: p.intro || "", coreCompetencies: p.core_competencies || "",
      workTypePrefer: p.work_type_prefer || "", regionPrefer: p.region_prefer || "",
    };
  };

  const fetchTalents = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        jobType: activeTab,
        search: search || undefined,
        jobGroups: selectedJobGroups.length > 0 ? selectedJobGroups.join(",") : undefined,
        careerFilter,
        page: 1, limit: 50,
      };
      if (activeTab === "STORE") {
        if (selectedRegions.length > 0) params.regions = selectedRegions.join(",");
        if (ageFilter !== "전체") params.ageGroup = ageFilter;
        if (genderFilter !== "무관") params.gender = genderFilter;
      }
      const res = await companyTalentApi.list(params);
      if (res.success && res.data) {
        setTalents(res.data);
        setTotal(res.meta?.total ?? res.data.length);
      }
    } catch (e) { console.error("[talent fetch]", e); }
    finally { setLoading(false); }
  }, [activeTab, search, selectedJobGroups, careerFilter, selectedRegions, ageFilter, genderFilter]);

  // 가입 업종 로드 → 탭 제어
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    fetch("/api/company/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        const ct = res?.data?.company_type as "OFFICE" | "STORE" | "BOTH" | undefined;
        if (ct) {
          setCompanyType(ct);
          if (ct === "OFFICE") setActiveTab("OFFICE");
          else setActiveTab("STORE");
        }
      })
      .catch((e) => console.error("[company me]", e));
  }, []);

  useEffect(() => {
    const t = setTimeout(fetchTalents, 300);
    return () => clearTimeout(t);
  }, [fetchTalents]);

  const toggleScrap = async (item: TalentItem) => {
    const next = !item.scrapped;
    const update = (on: boolean) => {
      setTalents((prev) => prev.map((t) => t.id === item.id ? { ...t, scrapped: on } : t));
      if (selected?.id === item.id) setSelected((prev) => prev ? { ...prev, scrapped: on } : null);
    };
    update(next);
    try { if (next) await companyTalentApi.scrap(item.id); else await companyTalentApi.unscrap(item.id); }
    catch { update(!next); }
  };

  const resetFilters = () => {
    setSearch(""); setSelectedJobGroups([]); setSelectedRegions([]);
    setCareerFilter("전체"); setAgeFilter("전체"); setGenderFilter("무관");
  };

  const jobGroupLabel = selectedJobGroups.length > 0
    ? selectedJobGroups.slice(0, 2).join(", ") + (selectedJobGroups.length > 2 ? ` 외 ${selectedJobGroups.length - 2}` : "")
    : "직군 선택";
  const regionLabel = selectedRegions.length > 0
    ? selectedRegions.slice(0, 2).join(", ") + (selectedRegions.length > 2 ? ` 외 ${selectedRegions.length - 2}` : "")
    : "지역 선택";

  // flex 셀: 비율 기반 + 고정 높이 + 가운데 정렬 + 구분선
  const cell = (flexVal: number, last = false): React.CSSProperties => ({
    flex: flexVal, minWidth: 0,
    height: ROW_H,
    display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
    padding: "0 12px",
    borderRight: last ? "none" : divider,
    textAlign: "center",
    overflow: "hidden",
  });
  const headCell = (flexVal: number, last = false): React.CSSProperties => ({
    flex: flexVal, minWidth: 0,
    height: 40,
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "0 12px",
    borderRight: last ? "none" : divider,
    textAlign: "center",
  });

  return (
    <CompanyLayout activePage="talent">

      {/* 탭 — BOTH만 둘 다 노출 */}
      {companyType === "BOTH" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {(["STORE", "OFFICE"] as JobTab[]).map((tab) => (
            <button key={tab} onClick={() => handleTabSwitch(tab)} style={{
              padding: "8px 20px", borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: "pointer",
              border: `1px solid ${activeTab === tab ? "#5f0080" : "#e0e0e0"}`,
              background: activeTab === tab ? "#5f0080" : "#fff",
              color: activeTab === tab ? "#fff" : "#555", transition: "all .15s",
            }}>
              {tab === "STORE" ? "🏪 매장직" : "🏢 사무직"}
            </button>
          ))}
        </div>
      )}

      {/* 필터 */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <button onClick={() => setJobGroupOpen(true)} className="admin-form-select"
            style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", minWidth: 130, color: selectedJobGroups.length > 0 ? "#1a1a1a" : "#999" }}>
            <span style={{ flex: 1, textAlign: "left" }}>{jobGroupLabel}</span>
            <ChevronDown size={14} />
          </button>

          {activeTab === "STORE" && (
            <button onClick={() => setRegionOpen(true)} className="admin-form-select"
              style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", minWidth: 130, color: selectedRegions.length > 0 ? "#1a1a1a" : "#999" }}>
              <MapPin size={14} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, textAlign: "left" }}>{regionLabel}</span>
              <ChevronDown size={14} />
            </button>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, color: "#555", whiteSpace: "nowrap" }}>경력</span>
            <select className="admin-form-select" style={{ fontSize: 13, padding: "8px 12px" }}
              value={careerFilter} onChange={(e) => setCareerFilter(e.target.value)}>
              {CAREER_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          {activeTab === "STORE" && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 13, color: "#555", whiteSpace: "nowrap" }}>연령</span>
                <div className="admin-filter-tabs">
                  {AGE_FILTERS.map((f) => (
                    <button key={f} className={`admin-filter-tab ${ageFilter === f ? "active" : ""}`} onClick={() => setAgeFilter(f)}>{f}</button>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 13, color: "#555", whiteSpace: "nowrap" }}>성별</span>
                <div className="admin-filter-tabs">
                  {GENDER_FILTERS.map((f) => (
                    <button key={f} className={`admin-filter-tab ${genderFilter === f ? "active" : ""}`} onClick={() => setGenderFilter(f)}>{f}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 16, marginLeft: "auto" }}>
            <button onClick={resetFilters} style={{ fontSize: 12, color: "#888", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>초기화</button>
            <span style={{ fontSize: 13, color: "#888" }}>총 <strong style={{ color: "#1a1a1a" }}>{total}</strong>명</span>
          </div>
        </div>

        <div className="admin-search-wrap" style={{ maxWidth: 400 }}>
          <Search size={16} className="admin-search-icon" />
          <input className="admin-search-input" placeholder="이름, 포지션, 스킬 검색"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {(selectedJobGroups.length > 0 || selectedRegions.length > 0) && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {selectedJobGroups.map((g) => (
            <span key={g} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", background: "#f3e8ff", color: "#5f0080", borderRadius: 20, fontSize: 12 }}>
              {g}<button onClick={() => setSelectedJobGroups((p) => p.filter((x) => x !== g))} style={{ background: "none", border: "none", cursor: "pointer", color: "#5f0080", padding: 0, lineHeight: 1 }}>×</button>
            </span>
          ))}
          {selectedRegions.map((r) => (
            <span key={r} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", background: "#e8f4ff", color: "#1a6fb5", borderRadius: 20, fontSize: 12 }}>
              {r}<button onClick={() => setSelectedRegions((p) => p.filter((x) => x !== r))} style={{ background: "none", border: "none", cursor: "pointer", color: "#1a6fb5", padding: 0, lineHeight: 1 }}>×</button>
            </span>
          ))}
        </div>
      )}

      {/* 리스트 */}
      {loading ? (
        <div className="admin-empty">불러오는 중...</div>
      ) : talents.length === 0 ? (
        <div className="admin-empty">검색 결과가 없습니다.</div>
      ) : (
        <div style={{ border: "1px solid #eee", borderRadius: 8, overflow: "hidden", background: "#fff" }}>

          {/* 헤더 */}
          <div style={{ display: "flex", alignItems: "stretch", background: "#fafafa", borderBottom: "1px solid #eee", fontSize: 12, color: "#999", fontWeight: 500 }}>
            <div style={{ width: W_AVATAR, flexShrink: 0, borderRight: divider }} />
            <div style={headCell(FLEX.name)}>이름</div>
            <div style={headCell(FLEX.job)}>직군</div>
            <div style={headCell(FLEX.region)}>지역</div>
            <div style={headCell(FLEX.edu)}>최종학력</div>
            <div style={headCell(FLEX.career)}>최근경력</div>
            <div style={headCell(FLEX.skill)}>스킬</div>
            <div style={{ width: W_ACTION, flexShrink: 0, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>관리</div>
          </div>

          {/* 바디 */}
          {talents.map((t, idx) => (
            <div key={t.id}
              style={{ display: "flex", alignItems: "stretch", borderBottom: idx < talents.length - 1 ? "1px solid #f2f2f2" : "none", cursor: "pointer", transition: "background .1s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
            >
              {/* 아바타 */}
              <div style={{ width: W_AVATAR, flexShrink: 0, height: ROW_H, display: "flex", alignItems: "center", justifyContent: "center", borderRight: divider }}>
                <div className="talent-avatar" style={{ width: 40, height: 40, overflow: "hidden" }}>
                  {t.avatarUrl
                    ? <img src={t.avatarUrl} alt={t.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : t.name?.slice(0, 1) || "?"}
                </div>
              </div>

              {/* 이름 */}
              <div style={cell(FLEX.name)}>
                <div style={{ ...clamp1, fontWeight: 600, fontSize: 14, color: "#1a1a1a" }}>{t.name}</div>
                <div style={{ ...clamp1, fontSize: 12, color: "#888", marginTop: 2 }}>
                  {[genderLabel(t.gender), t.age ? `${t.age}세` : null, careerLabel(t.careerYears, t.careerCount)].filter(Boolean).join(" · ")}
                </div>
              </div>

              {/* 직군 */}
              <div style={{ ...cell(FLEX.job), fontSize: 13, color: "#555" }}>
                <span style={clamp2}>{t.mainJobGroup || "—"}</span>
              </div>

              {/* 지역 */}
              <div style={{ ...cell(FLEX.region), fontSize: 12, color: "#999" }}>
                <span style={clamp2}>{t.regionPrefer || "—"}</span>
              </div>

              {/* 최종학력 */}
              <div style={{ ...cell(FLEX.edu), fontSize: 12 }}>
                {t.educationDetail ? (
                  <>
                    <div style={{ ...clamp1, fontWeight: 500, color: "#333" }}>{t.educationDetail.school}</div>
                    <div style={{ ...clamp1, color: "#999", marginTop: 2 }}>
                      {[t.educationDetail.major, t.educationDetail.status].filter(Boolean).join(" · ")}
                    </div>
                  </>
                ) : <span style={{ color: "#ccc" }}>—</span>}
              </div>

              {/* 최근경력 */}
              <div style={{ ...cell(FLEX.career), fontSize: 12 }}>
                {t.careerDetail ? (
                  <>
                    <div style={{ ...clamp1, fontWeight: 500, color: "#333" }}>{t.careerDetail.company}</div>
                    <div style={{ ...clamp1, color: "#999", marginTop: 2 }}>
                      {[t.careerDetail.department, t.careerDetail.end_date ? "퇴직" : "재직중"].filter(Boolean).join(" · ")}
                    </div>
                  </>
                ) : <span style={{ color: "#ccc" }}>—</span>}
              </div>

              {/* 스킬 */}
              <div style={{ ...cell(FLEX.skill), fontSize: 12, color: "#555" }}>
                <span style={clamp2}>{(t.skills || []).slice(0, 6).join(", ")}</span>
              </div>

              {/* 관리 버튼 */}
              <div style={{ width: W_ACTION, flexShrink: 0, height: ROW_H, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <button className="company-action-btn" style={{ whiteSpace: "nowrap" }} onClick={(e) => { e.stopPropagation(); setSelected(t); }}>
                  <FileText size={14} /> 이력서
                </button>
                <button className={`talent-scrap-btn ${t.scrapped ? "scrapped" : ""}`}
                  style={{ padding: "6px 8px" }}
                  onClick={(e) => { e.stopPropagation(); toggleScrap(t); }}>
                  {t.scrapped ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 직군 모달 */}
      <JobGroupSelectModal open={jobGroupOpen} onClose={() => setJobGroupOpen(false)}
        jobType={activeTab} selected={selectedJobGroups}
        onChange={(groups: string[]) => setSelectedJobGroups(groups)} />

      {/* 지역 모달 */}
      <RegionSelectModal open={regionOpen} onClose={() => setRegionOpen(false)}
        initial={selectedRegions}
        onApply={(regions: string[]) => { setSelectedRegions(regions); setRegionOpen(false); }} />

      {/* 이력서 모달 */}
      {selected && (
        <div className="rp-modal-overlay" onClick={() => setSelected(null)}>
          <div className="rp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rp-modal-header">
              <div className="rp-modal-actions">
                <button className="resume-action-btn" onClick={handleDownloadPdf} disabled={isDownloading || resumeLoading}>
                  <Download size={16} /><span>{isDownloading ? "저장 중..." : "PDF 다운로드"}</span>
                </button>
                <button className="resume-action-btn" onClick={handlePrint}>
                  <Printer size={16} /><span>인쇄</span>
                </button>
                <button className={`resume-action-btn ${selected.scrapped ? "scrapped" : ""}`} onClick={() => toggleScrap(selected)}>
                  {selected.scrapped ? (<><BookmarkCheck size={16} /><span>스크랩 해제</span></>) : (<><Bookmark size={16} /><span>스크랩</span></>)}
                </button>
                <button className="rp-modal-close" onClick={() => setSelected(null)}><X size={20} /></button>
              </div>
            </div>
            <div className="rp-modal-body">
              {resumeLoading ? (
                <div style={{ padding: 60, textAlign: "center", color: "#888" }}>불러오는 중...</div>
              ) : resumeData ? (
                <ResumePreview ref={previewRef}
                  name={resumeData.user?.name || selected.name}
                  birthDisplay={resumeData.user?.birth_date ? `${String(resumeData.user.birth_date).slice(0, 4)}년 (${calcAge(resumeData.user.birth_date)}세, ${resumeData.user.gender === "FEMALE" ? "여" : resumeData.user.gender === "MALE" ? "남" : ""})` : ""}
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
                <div style={{ padding: 60, textAlign: "center", color: "#888" }}>이력서 정보가 없습니다.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </CompanyLayout>
  );
}