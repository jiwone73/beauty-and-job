"use client";
import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import ResumeTabs from "@/components/admin/ResumeTabs";
import { Search, FileText, Trash2, Download, CheckSquare } from "lucide-react";

const RESUMES = [
  { id: 1, name: "김지수", gender: "여", age: 28, photo: null, job: "마케팅", career: "경력 3년", location: "서울 강남구", address: "서울 강남구", email: "jisoo@email.com", phone: "010-1234-5678", date: "2025.01.20", updated: "2025.01.20", lastLogin: "2025.01.20", complete: true, public: true, title: "뷰티 브랜드 마케터 김지수입니다", skills: ["SNS마케팅", "콘텐츠기획"], salary: "4,000만원", education: "대학교(4년제) 졸업", status: "정상" },
  { id: 2, name: "박민준", gender: "남", age: 31, photo: null, job: "MD", career: "경력 5년", location: "서울 종로구", address: "서울 종로구", email: "minjun@email.com", phone: "010-2345-6789", date: "2025.01.19", updated: "2025.01.19", lastLogin: "2025.01.19", complete: true, public: true, title: "글로벌 뷰티 MD 전문가", skills: ["상품기획", "바잉"], salary: "5,500만원", education: "대학교(4년제) 졸업", status: "정상" },
  { id: 3, name: "이수진", gender: "여", age: 26, photo: null, job: "영업", career: "신입", location: "경기 성남시", address: "경기 성남시", email: "sujin@email.com", phone: "010-3456-7890", date: "2025.01.19", updated: "2025.01.18", lastLogin: "2025.01.17", complete: false, public: false, title: "뷰티 영업 신입 지원자", skills: ["영업관리"], salary: "회사내규", education: "대학교(4년제) 재학", status: "정상" },
  { id: 4, name: "최유나", gender: "여", age: 29, photo: null, job: "디자인", career: "경력 4년", location: "서울 마포구", address: "서울 마포구", email: "yuna@email.com", phone: "010-4567-8901", date: "2025.01.17", updated: "2025.01.17", lastLogin: "2025.01.16", complete: true, public: true, title: "뷰티 패키지 디자이너", skills: ["패키지디자인", "브랜딩"], salary: "4,500만원", education: "대학원 졸업", status: "정상" },
  { id: 5, name: "정다은", gender: "여", age: 27, photo: null, job: "마케팅", career: "경력 2년", location: "서울 성동구", address: "서울 성동구", email: "daeun@email.com", phone: "010-5678-9012", date: "2025.01.16", updated: "2025.01.15", lastLogin: "2025.01.14", complete: true, public: false, title: "디지털 마케터 정다은", skills: ["퍼포먼스마케팅", "메타광고"], salary: "3,800만원", education: "대학교(4년제) 졸업", status: "정상" },
  { id: 6, name: "한소희", gender: "여", age: 30, photo: null, job: "SCM", career: "경력 6년", location: "경기 화성시", address: "경기 화성시", email: "sohee@email.com", phone: "010-6789-0123", date: "2025.01.15", updated: "2025.01.14", lastLogin: "2025.01.13", complete: true, public: true, title: "뷰티 SCM 물류 전문가", skills: ["SCM", "물류관리"], salary: "6,000만원", education: "대학교(4년제) 졸업", status: "정상" },
];

const STATS = {
  total: { value: "1,284", todayNew: "+20", todayUpdate: "+43" },
  complete: { complete: "987", incomplete: "297" },
  public: { public: "856", private: "428" },
  gender: { male: "312", female: "972" },
};

type Resume = typeof RESUMES[0];

export default function AdminResumesPage() {
  const [search, setSearch] = useState("");
  const [completeFilter, setCompleteFilter] = useState("전체");
  const [publicFilter, setPublicFilter] = useState("전체");
  const [resumes, setResumes] = useState(RESUMES);
  const [selected, setSelected] = useState<Resume | null>(null);
  const [sortBy, setSortBy] = useState("date");
  const [showSortDrop, setShowSortDrop] = useState(false);
  const [checked, setChecked] = useState<number[]>([]);
  const [sortLabel, setSortLabel] = useState("수정일");

  const toggleCheck = (id: number) => setChecked(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id]);
  const toggleAll = () => setChecked(checked.length === filtered.length ? [] : filtered.map(r => r.id));
  const handleBulkDelete = () => {
    if (checked.length === 0) return;
    if (confirm(`선택한 ${checked.length}건을 삭제하시겠습니까?`)) {
      setResumes(resumes.filter(r => !checked.includes(r.id)));
      setChecked([]);
    }
  };

  const SORT_OPTIONS = [
    { value: "lastLogin", label: "방문일" },
    { value: "updated", label: "수정일" },
    { value: "date", label: "등록일" },
    { value: "date", label: "가입일" },
  ];

  const sorted = [...resumes].sort((a, b) => {
    const aVal = sortBy === "lastLogin" ? a.lastLogin : sortBy === "updated" ? a.updated : a.date;
    const bVal = sortBy === "lastLogin" ? b.lastLogin : sortBy === "updated" ? b.updated : b.date;
    return bVal.localeCompare(aVal);
  });

  const filtered = sorted.filter((r) => {
    const matchSearch = !search || r.name.includes(search) || r.title.includes(search) || r.job.includes(search);
    const matchComplete = completeFilter === "전체" || (completeFilter === "완성" ? r.complete : !r.complete);
    const matchPublic = publicFilter === "전체" || (publicFilter === "공개" ? r.public : !r.public);
    return matchSearch && matchComplete && matchPublic;
  });

  return (
    <AdminLayout activeMenu="resumes">
      <ResumeTabs />

      {/* 통계 */}
      <div className="admin-resume-stat-grid">
        {/* 전체 */}
        <div className="admin-resume-stat-card main">
          <div className="admin-rsc-label">전체 이력서</div>
          <div className="admin-rsc-value">{STATS.total.value}<span className="admin-mini-unit">건</span></div>
          <div className="admin-rsc-subs">
            <span className="admin-rsc-sub green">오늘 등록 {STATS.total.todayNew}</span>
            <span className="admin-rsc-sub blue">오늘 수정 {STATS.total.todayUpdate}</span>
          </div>
        </div>
        {/* 완성여부 */}
        <div className="admin-resume-stat-card">
          <div className="admin-rsc-label">완성여부</div>
          <div className="admin-rsc-split">
            <div className="admin-rsc-split-item">
              <span className="admin-rsc-split-label">완성</span>
              <span className="admin-rsc-split-value green">{STATS.complete.complete}</span>
            </div>
            <div className="admin-rsc-divider" />
            <div className="admin-rsc-split-item">
              <span className="admin-rsc-split-label">미완성</span>
              <span className="admin-rsc-split-value orange">{STATS.complete.incomplete}</span>
            </div>
          </div>
          <div className="admin-rsc-bar">
            <div className="admin-rsc-bar-fill green" style={{width: `${Math.round(987/1284*100)}%`}} />
          </div>
        </div>
        {/* 공개여부 */}
        <div className="admin-resume-stat-card">
          <div className="admin-rsc-label">공개여부</div>
          <div className="admin-rsc-split">
            <div className="admin-rsc-split-item">
              <span className="admin-rsc-split-label">공개</span>
              <span className="admin-rsc-split-value blue">{STATS.public.public}</span>
            </div>
            <div className="admin-rsc-divider" />
            <div className="admin-rsc-split-item">
              <span className="admin-rsc-split-label">비공개</span>
              <span className="admin-rsc-split-value gray">{STATS.public.private}</span>
            </div>
          </div>
          <div className="admin-rsc-bar">
            <div className="admin-rsc-bar-fill blue" style={{width: `${Math.round(856/1284*100)}%`}} />
          </div>
        </div>
        {/* 성별 */}
        <div className="admin-resume-stat-card">
          <div className="admin-rsc-label">성별</div>
          <div className="admin-rsc-split">
            <div className="admin-rsc-split-item">
              <span className="admin-rsc-split-label">여성</span>
              <span className="admin-rsc-split-value purple">{STATS.gender.female}</span>
            </div>
            <div className="admin-rsc-divider" />
            <div className="admin-rsc-split-item">
              <span className="admin-rsc-split-label">남성</span>
              <span className="admin-rsc-split-value gray">{STATS.gender.male}</span>
            </div>
          </div>
          <div className="admin-rsc-bar">
            <div className="admin-rsc-bar-fill purple" style={{width: `${Math.round(972/1284*100)}%`}} />
          </div>
        </div>
      </div>

      {/* 툴바 */}
      <div className="admin-toolbar">
        <div className="admin-toolbar-left">
          <div className="admin-search-wrap">
            <Search size={16} className="admin-search-icon" />
            <input className="admin-search-input" placeholder="이름, 직군, 이력서 제목 검색"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="admin-filter-group">
            <span className="admin-filter-label">완성여부</span>
            <div className="admin-filter-tabs">
              {["전체", "완성", "미완성"].map((f) => (
                <button key={f} className={`admin-filter-tab ${completeFilter === f ? "active" : ""}`}
                  onClick={() => setCompleteFilter(f)}>{f}</button>
              ))}
            </div>
          </div>
          <div className="admin-filter-group">
            <span className="admin-filter-label">공개여부</span>
            <div className="admin-filter-tabs">
              {["전체", "공개", "비공개"].map((f) => (
                <button key={f} className={`admin-filter-tab ${publicFilter === f ? "active" : ""}`}
                  onClick={() => setPublicFilter(f)}>{f}</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{display:"flex", gap:"8px"}}>
          {checked.length > 0 && (
            <button className="admin-danger-btn" onClick={handleBulkDelete}>
              <Trash2 size={15} /> 선택삭제 ({checked.length})
            </button>
          )}
          <button className="admin-secondary-btn"><Download size={16} /> 엑셀 다운로드</button>
        </div>
      </div>

      {/* 테이블 */}
      <div className="admin-card">
        <div className="admin-table-meta">총 <strong>{filtered.length}</strong>건</div>
        <table className="admin-table">
            <thead>
              <tr>
                <th style={{width:"36px"}}>
                  <input type="checkbox"
                    checked={checked.length === filtered.length && filtered.length > 0}
                    onChange={toggleAll} />
                </th>
                <th>
                  <div className="admin-sort-wrap">
                    <button className="admin-sort-btn" onClick={() => setShowSortDrop(!showSortDrop)}>
                      {sortLabel} ▾
                    </button>
                    {showSortDrop && (
                      <div className="admin-sort-drop">
                        {[
                          { value: "lastLogin", label: "방문일" },
                          { value: "updated", label: "수정일" },
                          { value: "date", label: "등록일" },
                          { value: "date", label: "가입일" },
                        ].map((o) => (
                          <button key={o.label}
                            className={`admin-sort-drop-item ${sortBy === o.value ? "active" : ""}`}
                            onClick={() => { setSortBy(o.value); setSortLabel(o.label); setShowSortDrop(false); }}>
                            {o.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </th>
                <th>이름</th>
                <th>이력서 정보</th>
                <th>경력</th>
                <th>희망지역</th>
                <th>완성</th>
                <th>공개</th>
                <th>연봉</th>
                <th>학력</th>
                <th>연락처</th>
                <th>관리</th>
              </tr>
            </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} style={{background: checked.includes(r.id) ? "#faf5ff" : ""}}>
                <td>
                  <input type="checkbox"
                    checked={checked.includes(r.id)}
                    onChange={() => toggleCheck(r.id)} />
                </td>
                <td className="admin-td-date">
                  <div className="admin-date-cell">
                    <div className="admin-date-row">
                      <span className="admin-date-label">방문</span>
                      <span className="admin-date-val">{r.lastLogin}</span>
                    </div>
                    <div className="admin-date-row">
                      <span className="admin-date-label">수정</span>
                      <span className="admin-date-val">{r.updated}</span>
                    </div>
                    <div className="admin-date-row">
                      <span className="admin-date-label">등록</span>
                      <span className="admin-date-val">{r.date}</span>
                    </div>
                    <div className="admin-date-row">
                      <span className="admin-date-label">가입</span>
                      <span className="admin-date-val">{r.date}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="admin-resume-member">
                    <div className="admin-resume-photo">
                      {r.photo ? (
                        <img src={r.photo} alt={r.name} />
                      ) : (
                        <span>{r.name.slice(0, 1)}</span>
                      )}
                    </div>
                    <div className="admin-resume-member-info">
                      <strong>{r.name}</strong>
                      <span>{r.gender} · {r.age}세</span>
                      <span style={{fontSize:"10px",color:"#bbb"}}>{r.address}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="admin-resume-info">
                    <p className="admin-resume-title">{r.title}</p>
                    <div className="admin-resume-tags">
                      {r.skills.map((sk) => (
                        <span key={sk} className="admin-resume-tag">{sk}</span>
                      ))}
                    </div>
                    <span className="admin-resume-job">{r.job}</span>
                  </div>
                </td>
                <td className="admin-td-date">{r.career}</td>
                <td className="admin-td-date">{r.location}</td>
                <td>
                  <span className={`admin-badge ${r.complete ? "admin-badge-success" : "admin-badge-warning"}`}>
                    {r.complete ? "완성" : "미완성"}
                  </span>
                </td>
                <td>
                  <span className={`admin-badge ${r.public ? "admin-badge-info" : "admin-badge-neutral"}`}>
                    {r.public ? "공개" : "비공개"}
                  </span>
                </td>
                <td className="admin-td-date">{r.salary}</td>
                <td className="admin-td-date" style={{fontSize:"11px"}}>{r.education}</td>
                <td className="admin-td-date">
                  <div>{r.email}</div>
                  <div>{r.phone}</div>
                </td>
                <td>
                  <div className="admin-actions">
                    <button className="admin-action-icon" title="이력서 보기"
                      onClick={() => setSelected(r)}>
                      <FileText size={15} />
                    </button>
                    <button className="admin-action-icon danger" title="삭제"
                      onClick={() => { if(confirm("삭제하시겠습니까?")) setResumes(resumes.filter(x => x.id !== r.id)); }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="admin-empty">검색 결과가 없습니다.</div>}
      </div>

      {/* 상세 모달 */}
      {selected && (
        <div className="admin-modal-overlay" onClick={() => setSelected(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">이력서 상세</h2>
              <button className="admin-modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-resume-modal-profile">
                <div className="admin-resume-photo large">
                  <span>{selected.name.slice(0, 1)}</span>
                </div>
                <div>
                  <h3>{selected.name} · {selected.gender} · {selected.age}세</h3>
                  <p>{selected.job} · {selected.career}</p>
                </div>
              </div>
              <div className="admin-detail-grid">
                {[
                  ["이력서 제목", selected.title],
                  ["희망지역", selected.location],
                  ["이메일", selected.email],
                  ["연락처", selected.phone],
                  ["등록일", selected.date],
                  ["완성여부", selected.complete ? "완성" : "미완성"],
                  ["공개여부", selected.public ? "공개" : "비공개"],
                ].map(([label, value]) => (
                  <div key={label} className="admin-detail-row">
                    <span className="admin-detail-label">{label}</span>
                    <span className="admin-detail-value">{value}</span>
                  </div>
                ))}
              </div>
              <div className="admin-modal-actions">
                <a href={`/profile/resume`} target="_blank" className="admin-primary-btn">이력서 보기</a>
                <button className="admin-danger-btn" onClick={() => {
                  if(confirm("삭제하시겠습니까?")) {
                    setResumes(resumes.filter(x => x.id !== selected.id));
                    setSelected(null);
                  }
                }}><Trash2 size={15} /> 삭제</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
