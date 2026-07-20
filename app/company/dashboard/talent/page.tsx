"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import CompanyLayout from "@/components/company/CompanyLayout";
import {
  Search, BookmarkCheck, Bookmark, X, FileText, Paperclip,
  Download, Printer, MapPin, ChevronDown,
} from "lucide-react";
import { companyTalentApi, type TalentItem } from "@/lib/api/company";
import ResumePreview from "@/components/profile/ResumePreview";
import JobGroupSelectModal from "@/components/JobGroupSelectModal";
import FilterDropdown from "@/components/company/FilterDropdown";
import RegionSelectModal from "@/components/RegionSelectModal";
import { formatPhone } from "@/lib/phone";

type JobTab = "OFFICE" | "STORE";

const CAREER_OPTIONS = ["전체", "신입", "1-3년", "3-5년", "5-10년", "10년+"];
const AGE_FILTERS    = ["전체", "20대", "30대", "40+"];
const GENDER_FILTERS = ["무관", "여성", "남성"];

function shortenRegion(region: string | null | undefined): string {
  if (!region) return "—";
  return region
    .replace(/특별자치도|특별자치시|특별시|광역시/g, "")
    .replace(/\s+/g, " ")
    .trim() || region;
}

function jobTypeLabel(jobType: string | null | undefined): string | null {
  if (jobType === "STORE") return "매장직";
  if (jobType === "OFFICE") return "사무직";
  return null;
}

const FLEX = { name: 1.4, job: 1.1, region: 0.9, career: 1.8, contact: 1.4 };
const W_ACTION = 120;
const ROW_H = 68;
const divider = "1px solid #f0f0f0";

function careerLabel(years: number | null, count: number): string {
  if (!count || years === null || years === 0) return "신입";
  return `경력 ${years}년`;
}
function genderLabel(gender: string | null): string | null {
  if (gender === "남성" || gender === "MALE" || gender === "M") return "남";
  if (gender === "여성" || gender === "FEMALE" || gender === "F") return "여";
  return null;
}

const clamp2: React.CSSProperties = {
  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
  overflow: "hidden", textOverflow: "ellipsis", wordBreak: "break-word", lineHeight: 1.35,
};
const clamp1: React.CSSProperties = {
  display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical",
  overflow: "hidden", textOverflow: "ellipsis", wordBreak: "break-word",
};

export default function TalentPage() {
  const [activeTab, setActiveTab]     = useState<JobTab>("STORE");
  const [companyType, setCompanyType] = useState<"OFFICE" | "STORE" | "BOTH">("BOTH");
  const [talents, setTalents]         = useState<TalentItem[]>([]);
  const [loading, setLoading]         = useState(true);
  const [total, setTotal]             = useState(0);

  const [search, setSearch]                       = useState("");
  const [careerFilter, setCareerFilter]           = useState("전체");
  const [jobGroupOpen, setJobGroupOpen]           = useState(false);
  const [selectedJobGroups, setSelectedJobGroups] = useState<string[]>([]);
  const [regionOpen, setRegionOpen]               = useState(false);
  const [selectedRegions, setSelectedRegions]     = useState<string[]>([]);
  const [ageFilter, setAgeFilter]                 = useState("전체");
  const [genderFilter, setGenderFilter]           = useState("무관");

  const [selected, setSelected]           = useState<TalentItem | null>(null);
  const [resumeData, setResumeData]       = useState<any>(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleTabSwitch = (tab: JobTab) => {
    setActiveTab(tab);
    setSearch("");
    setSelectedJobGroups([]);
    setSelectedRegions([]);
    setCareerFilter("전체");
    setAgeFilter("전체");
    setGenderFilter("무관");
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
      pdf.addImage(imgData, "PNG", 0, pos, pdfW, pdfH);
      left -= pageH;
      while (left > 0) {
        pos = left - pdfH;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, pos, pdfW, pdfH);
        left -= pageH;
      }
      pdf.save(selected?.name ? `${selected.name}_이력서.pdf` : "이력서.pdf");
    } catch {
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
      const w = window.open("", "_blank");
      if (!w) return;
      w.document.write(`<html><body style="margin:0"><img src="${canvas.toDataURL("image/png")}" style="width:100%" onload="window.print();window.close()"/></body></html>`);
      w.document.close();
    } catch {
      alert("인쇄 준비 중 오류가 발생했습니다.");
    }
  };

  useEffect(() => {
    if (!selected) { setResumeData(null); return; }
    const token = localStorage.getItem("access_token");
    setResumeLoading(true);
    fetch(`/api/company/talent/${selected.id}/resume`, {
      headers: { Authorization: `Bearer ${token}` },
    })
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

  const fetchTalents = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        jobType: activeTab,
        search: search || undefined,
        jobGroups: selectedJobGroups.length > 0 ? selectedJobGroups.join(",") : undefined,
        careerFilter,
        page: 1,
        limit: 50,
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
    } catch (e) {
      console.error("[talent fetch]", e);
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, selectedJobGroups, careerFilter, selectedRegions, ageFilter, genderFilter]);

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
    try {
      if (next) await companyTalentApi.scrap(item.id);
      else await companyTalentApi.unscrap(item.id);
    } catch {
      update(!next);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setSelectedJobGroups([]);
    setSelectedRegions([]);
    setCareerFilter("전체");
    setAgeFilter("전체");
    setGenderFilter("무관");
  };

  const jobGroupLabel = selectedJobGroups.length > 0
    ? selectedJobGroups.slice(0, 2).join(", ") + (selectedJobGroups.length > 2 ? ` 외 ${selectedJobGroups.length - 2}` : "")
    : "직군 선택";
  const regionLabel = selectedRegions.length > 0
    ? selectedRegions.slice(0, 2).join(", ") + (selectedRegions.length > 2 ? ` 외 ${selectedRegions.length - 2}` : "")
    : "지역 선택";

  const cell = (flexVal: number, last = false): React.CSSProperties => ({
    flex: flexVal,
    minWidth: 0,
    height: ROW_H,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: "0 12px",
    borderRight: last ? "none" : divider,
    textAlign: "center",
    overflow: "hidden",
  });

  const headCell = (flexVal: number, last = false): React.CSSProperties => ({
    flex: flexVal,
    minWidth: 0,
    height: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
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
            <button
              key={tab}
              onClick={() => handleTabSwitch(tab)}
              style={{
                padding: "8px 20px", borderRadius: 6, fontSize: 15, fontWeight: 500, cursor: "pointer",
                border: `1px solid ${activeTab === tab ? "#5f0080" : "#e0e0e0"}`,
                background: activeTab === tab ? "#5f0080" : "#fff",
                color: activeTab === tab ? "#fff" : "#555",
                transition: "all .15s",
              }}
            >
              {tab === "STORE" ? "🏪 매장직" : "🏢 사무직"}
            </button>
          ))}
        </div>
      )}

      <div style={{ width: "fit-content", maxWidth: "100%" }}>
      {/* 필터 */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <button
            onClick={() => setJobGroupOpen(true)}
            className="admin-form-select"
            style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", minWidth: 130, color: selectedJobGroups.length > 0 ? "#1a1a1a" : "#999" }}
          >
            <span style={{ flex: 1, textAlign: "left" }}>{jobGroupLabel}</span>
            <ChevronDown size={14} />
          </button>

          {activeTab === "STORE" && (
            <button
              onClick={() => setRegionOpen(true)}
              className="admin-form-select"
              style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", minWidth: 130, color: selectedRegions.length > 0 ? "#1a1a1a" : "#999" }}
            >
              <MapPin size={14} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, textAlign: "left" }}>{regionLabel}</span>
              <ChevronDown size={14} />
            </button>
          )}

          <FilterDropdown label="경력" value={careerFilter}
            options={CAREER_OPTIONS as unknown as string[]} onChange={setCareerFilter} />

          {activeTab === "STORE" && (
            <>
              <FilterDropdown label="연령" value={ageFilter}
                options={AGE_FILTERS as unknown as string[]} onChange={setAgeFilter} />
              <FilterDropdown label="성별" value={genderFilter}
                options={GENDER_FILTERS as unknown as string[]} onChange={setGenderFilter} />
            </>
          )}

          <button onClick={resetFilters} style={{ marginLeft: "auto", fontSize: 13, color: "#888", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", whiteSpace: "nowrap" }}>필터 초기화</button>
        </div>

        <div className="admin-search-wrap" style={{ maxWidth: 400 }}>
          <Search size={16} className="admin-search-icon" />
          <input
            className="admin-search-input"
            placeholder="이름, 포지션, 스킬 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {(selectedJobGroups.length > 0 || selectedRegions.length > 0) && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {selectedJobGroups.map((g) => (
            <span key={g} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", background: "#f3e8ff", color: "#5f0080", borderRadius: 20, fontSize: 13 }}>
              {g}
              <button onClick={() => setSelectedJobGroups((p) => p.filter((x) => x !== g))} style={{ background: "none", border: "none", cursor: "pointer", color: "#5f0080", padding: 0, lineHeight: 1 }}>×</button>
            </span>
          ))}
          {selectedRegions.map((r) => (
            <span key={r} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", background: "#e8f4ff", color: "#1a6fb5", borderRadius: 20, fontSize: 13 }}>
              {r}
              <button onClick={() => setSelectedRegions((p) => p.filter((x) => x !== r))} style={{ background: "none", border: "none", cursor: "pointer", color: "#1a6fb5", padding: 0, lineHeight: 1 }}>×</button>
            </span>
          ))}
        </div>
      )}

      {/* 결과 수 */}
      <div style={{ fontSize: 14, color: "#888", margin: "0 0 8px" }}>총 <strong style={{ color: "#1a1a1a" }}>{total}</strong>명</div>

      {/* 리스트 */}
      <div style={{ width: "fit-content", maxWidth: "100%" }}>
      {loading ? (
        <div className="admin-empty">불러오는 중...</div>
      ) : talents.length === 0 ? (
        <div className="admin-empty">검색 결과가 없습니다.</div>
      ) : (
        <div className="company-card">
          <table className="company-table" style={{ whiteSpace: "nowrap" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>이름</th>
                <th>직군</th>
                <th>지역</th>
                <th style={{ textAlign: "left" }}>최근경력</th>
                <th>재직여부</th>
                <th style={{ textAlign: "left" }}>연락처</th>
                <th>이력서/포트폴리오</th>
              </tr>
            </thead>
            <tbody>
              {talents.map((t) => {
                const gl = genderLabel(t.gender);
                return (
                  <tr key={t.id} style={{ cursor: "pointer" }} onClick={() => setSelected(t)}>
                    <td style={{ textAlign: "left" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="talent-avatar" style={{ width: 28, height: 28, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: "#5f0080", color: "#fff", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {t.avatarUrl
                            ? <img src={t.avatarUrl} alt={t.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{t.name?.slice(0, 1) || "?"}</span>}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 400, fontSize: 15, color: "#1a1a1a", display: "flex", alignItems: "center", gap: 4 }}>
                            <span>{t.name}</span>
                            {gl && <span style={{ fontSize: 12, fontWeight: 400, color: "#999" }}>{gl}</span>}
                          </div>
                          <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>
                            {[t.age ? `${t.age}세` : null, careerLabel(t.careerYears, t.careerCount)].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="company-td-sub">{t.mainJobGroup || "—"}</td>
                    <td className="company-td-sub">{shortenRegion(t.regionPrefer)}</td>
                    <td className="company-td-sub" style={{ textAlign: "left" }}>
                      {t.careerDetail ? (
                        <>
                          <div style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }} title={t.careerDetail.company}>{t.careerDetail.company}</div>
                          {t.careerDetail.position && (
                            <div style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", color: "#aaa", marginTop: 2 }} title={t.careerDetail.position}>{t.careerDetail.position}</div>
                          )}
                        </>
                      ) : (
                        <span style={{ color: "#ccc" }}>—</span>
                      )}
                    </td>
                    <td className="company-td-sub">
                      {t.careerDetail ? (
                        t.careerDetail.end_date ? (
                          <>
                            <div style={{ color: "#888" }}>퇴직</div>
                            <div style={{ color: "#aaa", marginTop: 2 }}>{String(t.careerDetail.end_date).slice(0, 7).replace(/-/g, ".")}</div>
                          </>
                        ) : (
                          <span style={{ color: "#5f0080" }}>재직중</span>
                        )
                      ) : (
                        <span style={{ color: "#ccc" }}>—</span>
                      )}
                    </td>
                    <td className="company-td-sub" style={{ textAlign: "left" }}>
                      <div style={{ marginBottom: 2, ...(t.email ? {} : { color: "#ccc" }) }}>{t.email || "이메일 없음"}</div>
                      <div style={t.phone ? undefined : { color: "#ccc" }}>{t.phone ? formatPhone(t.phone) : "전화번호 없음"}</div>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <button
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: "#5f0080", fontSize: 14, fontWeight: 500, padding: "2px 4px" }}
                            onClick={(e) => { e.stopPropagation(); setSelected(t); }}
                          >
                            <FileText size={14} />
                            <span>이력서</span>
                          </button>
                          <button
                            className={`talent-scrap-btn ${t.scrapped ? "scrapped" : ""}`}
                            style={{ padding: "6px 8px" }}
                            onClick={(e) => { e.stopPropagation(); toggleScrap(t); }}
                          >
                            {t.scrapped ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                          </button>
                        </div>
                        {t.portfolioUrl ? (
                          <a
                            href={t.portfolioUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "#5f0080", fontSize: 13, textDecoration: "none", fontWeight: 500 }}
                          >
                            <Paperclip size={13} /><span>포트폴리오</span>
                          </a>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "#d0d0d0", fontSize: 13 }}>
                            <Paperclip size={13} /><span>포트폴리오</span>
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      </div>
      </div>

      {/* 직군 모달 */}
      <JobGroupSelectModal
        open={jobGroupOpen}
        onClose={() => setJobGroupOpen(false)}
        jobType={activeTab}
        selected={selectedJobGroups}
        onChange={(groups: string[]) => setSelectedJobGroups(groups)}
      />

      {/* 지역 모달 */}
      <RegionSelectModal
        open={regionOpen}
        onClose={() => setRegionOpen(false)}
        initial={selectedRegions}
        onApply={(regions: string[]) => { setSelectedRegions(regions); setRegionOpen(false); }}
      />

      {/* 이력서 모달 */}
      {selected && (
        <div className="rp-modal-overlay">
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
                  {selected.scrapped
                    ? <><BookmarkCheck size={16} /><span>스크랩 해제</span></>
                    : <><Bookmark size={16} /><span>스크랩</span></>}
                </button>
                <button className="rp-modal-close" onClick={() => setSelected(null)}><X size={20} /></button>
              </div>
            </div>
            <div className="rp-modal-body">
              {resumeLoading ? (
                <div style={{ padding: 60, textAlign: "center", color: "#888" }}>불러오는 중...</div>
              ) : resumeData ? (
                <ResumePreview
                  ref={previewRef}
                  name={resumeData.user?.name || selected.name}
                  birthDisplay={resumeData.user?.birth_date
                    ? `${String(resumeData.user.birth_date).slice(0, 4)}년 (${calcAge(resumeData.user.birth_date)}세, ${resumeData.user.gender === "FEMALE" ? "여" : resumeData.user.gender === "MALE" ? "남" : ""})`
                    : ""}
                  jobDisplay={resumeData.user?.job_type === "STORE" ? "매장직" : "사무직"}
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