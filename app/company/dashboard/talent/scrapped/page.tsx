"use client";
import { useState } from "react";
import CompanyLayout from "@/components/company/CompanyLayout";
import { Search, BookmarkCheck, X, FileText } from "lucide-react";

const SCRAPPED_TALENTS = [
  { id: 2, name: "박민준", age: 31, gender: "남", job: "MD", career: "경력 5년", location: "서울 종로구", education: "대학교(4년제) 졸업", salary: "5,500만원", skills: ["상품기획", "바잉", "이커머스"], title: "글로벌 뷰티 MD 전문가", scrappedAt: "2025.01.20" },
  { id: 6, name: "한소희", age: 30, gender: "여", job: "SCM", career: "경력 6년", location: "경기 화성시", education: "대학교(4년제) 졸업", salary: "6,000만원", skills: ["SCM", "물류관리", "수입통관"], title: "뷰티 SCM 물류 전문가", scrappedAt: "2025.01.18" },
];

type Talent = typeof SCRAPPED_TALENTS[0];

export default function ScrappedTalentPage() {
  const [talents, setTalents] = useState(SCRAPPED_TALENTS);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Talent | null>(null);

  const filtered = talents.filter(t =>
    !search || t.name.includes(search) || t.job.includes(search) || t.skills.some(s => s.includes(search))
  );

  const handleUnscrap = (id: number) => {
    if (confirm("스크랩을 해제하시겠습니까?")) {
      setTalents(talents.filter(t => t.id !== id));
      if (selected?.id === id) setSelected(null);
    }
  };

  return (
    <CompanyLayout activePage="scrapped">
      <div className="company-toolbar">
        <div className="company-toolbar-left">
          <div className="admin-search-wrap">
            <Search size={16} className="admin-search-icon" />
            <input className="admin-search-input" placeholder="이름, 직군, 스킬 검색"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div style={{fontSize:"13px", color:"#888"}}>
          총 <strong style={{color:"#1a1a1a"}}>{filtered.length}</strong>명
        </div>
      </div>

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
              <button className="talent-scrap-btn scrapped" onClick={() => handleUnscrap(t.id)}>
                <BookmarkCheck size={20} />
              </button>
            </div>
            <p className="talent-title" onClick={() => setSelected(t)}>{t.title}</p>
            <div className="talent-tags">
              {t.skills.map(sk => <span key={sk} className="talent-tag">{sk}</span>)}
            </div>
            <div className="talent-card-footer">
              <div className="talent-detail">
                <span>{t.job}</span><span>·</span>
                <span>{t.salary}</span><span>·</span>
                <span className="talent-scrap-date">스크랩 {t.scrappedAt}</span>
              </div>
              <button className="company-action-btn" onClick={() => setSelected(t)}>
                <FileText size={14} /> 이력서 보기
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="admin-empty">스크랩한 인재가 없습니다.</div>}
      </div>

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
                  ["스크랩일", selected.scrappedAt],
                ].map(([label, value]) => (
                  <div key={label} className="admin-detail-row">
                    <span className="admin-detail-label">{label}</span>
                    <span className="admin-detail-value">{value}</span>
                  </div>
                ))}
              </div>
              <div className="admin-modal-actions">
                <button className="admin-danger-btn" onClick={() => handleUnscrap(selected.id)}>
                  스크랩 해제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </CompanyLayout>
  );
}
