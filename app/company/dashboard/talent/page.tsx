"use client";
import { useState, useEffect, useCallback } from "react";
import CompanyLayout from "@/components/company/CompanyLayout";
import { Search, BookmarkCheck, Bookmark, X, FileText } from "lucide-react";
import { companyTalentApi, type TalentItem } from "@/lib/api/company";

const JOB_FILTERS = ["전체", "마케팅", "MD", "영업", "디자인", "연구개발", "SCM", "경영지원", "HR"];
const CAREER_FILTERS = ["전체", "신입", "1-3년", "3-5년", "5년+"];
const AGE_FILTERS = ["전체", "10대", "20대", "30대", "40대+"];

// 경력 연수 → 표시 텍스트
function careerLabel(years: number | null, count: number): string {
  if (!count || years === null || years === 0) return "신입";
  return `경력 ${years}년`;
}

// 나이 + 경력 한 줄
function metaLine(age: number | null, years: number | null, count: number): string {
  const c = careerLabel(years, count);
  return age ? `${age}세 · ${c}` : c;
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
                  <p className="talent-meta">{metaLine(t.age, t.careerYears, t.careerCount)}</p>
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
        <div className="admin-modal-overlay" onClick={() => setSelected(null)}>
          <div className="admin-modal" style={{ maxWidth: "520px" }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <h2 className="admin-modal-title">{selected.name}</h2>
                <p style={{ fontSize: "13px", color: "#888", margin: "4px 0 0" }}>
                  {metaLine(selected.age, selected.careerYears, selected.careerCount)}
                </p>
              </div>
              <button className="admin-modal-close" onClick={() => setSelected(null)}><X size={20} /></button>
            </div>
            <div className="admin-modal-body">
              {selected.intro && (
                <p style={{ fontSize: "14px", color: "#444", lineHeight: 1.6, marginBottom: "16px" }}>
                  {selected.intro}
                </p>
              )}
              <div className="admin-detail-grid">
                {([
                  ["나이", selected.age ? `${selected.age}세` : null],
                  ["직군", selected.mainJobGroup],
                  ["세부직무", selected.subJob],
                  ["경력", careerLabel(selected.careerYears, selected.careerCount)],
                  ["희망지역", selected.regionPrefer],
                  ["희망고용형태", selected.workTypePrefer],
                  ["학력", selected.education],
                ] as [string, string | null][])
                  .filter(([, v]) => v)
                  .map(([label, value]) => (
                    <div key={label} className="admin-detail-row">
                      <span className="admin-detail-label">{label}</span>
                      <span className="admin-detail-value">{value}</span>
                    </div>
                  ))}
                {selected.skills?.length > 0 && (
                  <div className="admin-detail-row">
                    <span className="admin-detail-label">스킬</span>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {selected.skills.map((sk) => (
                        <span key={sk} className="talent-tag">{sk}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="admin-modal-actions">
                <button
                  className={`company-action-btn ${selected.scrapped ? "scrapped" : "secondary"}`}
                  onClick={() => toggleScrap(selected)}>
                  {selected.scrapped
                    ? (<><BookmarkCheck size={15} /> 스크랩 해제</>)
                    : (<><Bookmark size={15} /> 스크랩</>)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </CompanyLayout>
  );
}