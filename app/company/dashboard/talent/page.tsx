"use client";
import { useState } from "react";
import CompanyLayout from "@/components/company/CompanyLayout";
import { Search, BookmarkCheck, Bookmark, X, FileText } from "lucide-react";

const TALENTS = [
  { id: 1, name: "김지수", age: 28, gender: "여", job: "마케팅", career: "경력 3년", location: "서울 강남구", education: "대학교(4년제) 졸업", salary: "4,000만원", skills: ["SNS마케팅", "콘텐츠기획", "메타광고"], title: "뷰티 브랜드 마케터 김지수입니다", public: true, scrapped: false },
  { id: 2, name: "박민준", age: 31, gender: "남", job: "MD", career: "경력 5년", location: "서울 종로구", education: "대학교(4년제) 졸업", salary: "5,500만원", skills: ["상품기획", "바잉", "이커머스"], title: "글로벌 뷰티 MD 전문가", public: true, scrapped: true },
  { id: 3, name: "최유나", age: 29, gender: "여", job: "디자인", career: "경력 4년", location: "서울 마포구", education: "대학원 졸업", salary: "4,500만원", skills: ["패키지디자인", "브랜딩", "일러스트"], title: "뷰티 패키지 디자이너", public: true, scrapped: false },
  { id: 4, name: "이수진", age: 26, gender: "여", job: "영업", career: "신입", location: "경기 성남시", education: "대학교(4년제) 재학", salary: "회사내규", skills: ["영업관리", "고객응대"], title: "뷰티 영업 신입 지원자", public: true, scrapped: false },
  { id: 5, name: "정다은", age: 27, gender: "여", job: "마케팅", career: "경력 2년", location: "서울 성동구", education: "대학교(4년제) 졸업", salary: "3,800만원", skills: ["퍼포먼스마케팅", "메타광고", "구글애즈"], title: "디지털 마케터 정다은", public: true, scrapped: false },
  { id: 6, name: "한소희", age: 30, gender: "여", job: "SCM", career: "경력 6년", location: "경기 화성시", education: "대학교(4년제) 졸업", salary: "6,000만원", skills: ["SCM", "물류관리", "수입통관"], title: "뷰티 SCM 물류 전문가", public: true, scrapped: true },
  { id: 7, name: "이준혁", age: 33, gender: "남", job: "연구개발", career: "경력 7년", location: "경기 수원시", education: "대학원 졸업", salary: "협의", skills: ["제형개발", "원료분석", "RA"], title: "화장품 제형 연구원", public: true, scrapped: false },
  { id: 8, name: "박서연", age: 25, gender: "여", job: "마케팅", career: "경력 1년", location: "서울 강서구", education: "대학교(4년제) 졸업", salary: "3,200만원", skills: ["콘텐츠기획", "인스타그램", "틱톡"], title: "SNS 콘텐츠 마케터", public: true, scrapped: false },
];

const JOB_FILTERS = ["전체", "마케팅", "MD", "영업", "디자인", "연구개발", "SCM", "경영지원", "HR"];
const CAREER_FILTERS = ["전체", "신입", "1-3년", "3-5년", "5년+"];

type Talent = typeof TALENTS[0];

export default function TalentPage() {
  const [talents, setTalents] = useState(TALENTS);
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("전체");
  const [careerFilter, setCareerFilter] = useState("전체");
  const [selected, setSelected] = useState<Talent | null>(null);

  const filtered = talents.filter((t) => {
    const matchSearch = !search || t.name.includes(search) || t.title.includes(search) || t.skills.some(s => s.includes(search));
    const matchJob = jobFilter === "전체" || t.job === jobFilter;
    const matchCareer = careerFilter === "전체" ||
      (careerFilter === "신입" && t.career === "신입") ||
      (careerFilter === "1-3년" && (t.career.includes("1년") || t.career.includes("2년") || t.career.includes("3년"))) ||
      (careerFilter === "3-5년" && (t.career.includes("4년") || t.career.includes("5년"))) ||
      (careerFilter === "5년+" && parseInt(t.career) >= 5);
    return matchSearch && matchJob && matchCareer;
  });

  const toggleScrap = (id: number) => {
    setTalents(talents.map(t => t.id === id ? { ...t, scrapped: !t.scrapped } : t));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, scrapped: !prev.scrapped } : null);
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
            <select className="admin-form-select" style={{fontSize:"13px", padding:"8px 12px"}}
              value={jobFilter} onChange={(e) => setJobFilter(e.target.value)}>
              {JOB_FILTERS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="admin-filter-group">
            <span className="admin-filter-label">경력</span>
            <div className="admin-filter-tabs">
              {CAREER_FILTERS.map(f => (
                <button key={f} className={`admin-filter-tab ${careerFilter === f ? "active" : ""}`}
                  onClick={() => setCareerFilter(f)}>{f}</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{fontSize:"13px", color:"#888"}}>
          총 <strong style={{color:"#1a1a1a"}}>{filtered.length}</strong>명
        </div>
      </div>

      {/* 인재 카드 그리드 */}
      <div className="talent-grid">
        {filtered.map((t) => (
          <div key={t.id} className="talent-card">
            <div className="talent-card-head">
              <div className="talent-avatar">{t.name.slice(0, 1)}</div>
              <div className="talent-info">
                <h3 className="talent-name">{t.name}</h3>
                <p className="talent-meta">{t.gender} · {t.age}세 · {t.career}</p>
                <p className="talent-location">{t.location}</p>
              </div>
              <button className={`talent-scrap-btn ${t.scrapped ? "scrapped" : ""}`}
                onClick={() => toggleScrap(t.id)}>
                {t.scrapped ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
              </button>
            </div>

            <p className="talent-title" onClick={() => setSelected(t)}>{t.title}</p>

            <div className="talent-tags">
              {t.skills.map(sk => (
                <span key={sk} className="talent-tag">{sk}</span>
              ))}
            </div>

            <div className="talent-card-footer">
              <div className="talent-detail">
                <span>{t.job}</span>
                <span>·</span>
                <span>{t.education}</span>
                <span>·</span>
                <span>{t.salary}</span>
              </div>
              <button className="company-action-btn" onClick={() => setSelected(t)}>
                <FileText size={14} /> 이력서 보기
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="admin-empty">검색 결과가 없습니다.</div>
      )}

      {/* 이력서 상세 모달 */}
      {selected && (
        <div className="admin-modal-overlay" onClick={() => setSelected(null)}>
          <div className="admin-modal" style={{maxWidth:"520px"}} onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <h2 className="admin-modal-title">{selected.name}</h2>
                <p style={{fontSize:"13px", color:"#888", margin:"4px 0 0"}}>
                  {selected.gender} · {selected.age}세 · {selected.career}
                </p>
              </div>
              <button className="admin-modal-close" onClick={() => setSelected(null)}><X size={20} /></button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-detail-grid">
                {[
                  ["직군", selected.job],
                  ["경력", selected.career],
                  ["희망지역", selected.location],
                  ["학력", selected.education],
                  ["희망연봉", selected.salary],
                ].map(([label, value]) => (
                  <div key={label} className="admin-detail-row">
                    <span className="admin-detail-label">{label}</span>
                    <span className="admin-detail-value">{value}</span>
                  </div>
                ))}
                <div className="admin-detail-row">
                  <span className="admin-detail-label">스킬</span>
                  <div style={{display:"flex", gap:"6px", flexWrap:"wrap"}}>
                    {selected.skills.map(sk => (
                      <span key={sk} className="talent-tag">{sk}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="admin-modal-actions">
                <button
                  className={`company-action-btn ${selected.scrapped ? "scrapped" : "secondary"}`}
                  onClick={() => toggleScrap(selected.id)}>
                  {selected.scrapped ? <><BookmarkCheck size={15} /> 스크랩 해제</> : <><Bookmark size={15} /> 스크랩</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </CompanyLayout>
  );
}
